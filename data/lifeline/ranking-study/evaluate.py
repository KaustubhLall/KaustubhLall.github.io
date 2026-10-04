"""Frozen, local exploratory ranking comparison; never imports the owner app.

Use --self-test for synthetic evaluator checks without corpus/model access.
Full runs require all seven path arguments; outputs must not already exist.
"""
from __future__ import annotations

import argparse
import ast
import builtins
import hashlib
import importlib.metadata
import inspect
import json
import math
import platform
import sys
import warnings
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace as NS

MODEL_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
MODEL_SHA256 = "6fd5d72fe4589f189f8ebc006442dbb529bb7ce38f8082112682524616046452"
CONSTANTS = {
    "MEMORY_SIMILARITY_WEIGHT": .6, "MEMORY_IMPORTANCE_WEIGHT": .3,
    "MEMORY_RECENCY_WEIGHT": .1, "MEMORY_RECENCY_DAYS_DIVISOR": 30.,
    "MAX_MEMORIES_IN_CONTEXT": 8, "MAX_MEMORY_TITLE_CHARS": 50,
    "MAX_MEMORY_DISPLAY_CHARS": 100, "MEMORY_TRUNCATE_CHARS": 97,
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def write_json(path, value):
    with Path(path).open("x", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2, ensure_ascii=False, allow_nan=False)
        handle.write("\n")


def dcg(grades):
    return sum((2 ** grade - 1) / math.log2(index + 2)
               for index, grade in enumerate(grades[:5]))


def metrics(selected, labels, formatted):
    gold = {row["id"]: row for row in labels["memories"]}
    essential = {key for key, row in gold.items() if row["relevance"] == 2}
    facts = labels["essentialFacts"]
    retained = [fact["id"] for fact in facts if fact["quote"] in formatted]
    selected_facts = [fact["id"] for fact in facts if fact["memoryId"] in selected]
    lost = [key for key in selected_facts if key not in retained]
    answerable = labels["answerable"]
    ideal = dcg(sorted((row["relevance"] for row in gold.values()), reverse=True))
    return {
        "essentialRecall": len(set(selected) & essential) / len(essential) if answerable else None,
        "precisionAtReturnedCount": (sum(gold[key]["relevance"] >= 1 for key in selected) / len(selected)
                                     if selected else 0.) if answerable else None,
        "ndcgAt5": dcg([gold[key]["relevance"] for key in selected]) / ideal if answerable else None,
        "essentialFactRecallAfterFormat": len(retained) / len(facts) if answerable else None,
        "essentialFactIdsRetained": retained, "selectedEssentialFactIds": selected_facts,
        "selectedFactIdsLostToFormatter": lost, "selectedFactsLostToFormatter": len(lost),
        "supersededCount": sum(gold[key]["superseded"] for key in selected),
        "selectedCount": len(selected), "anySelection": bool(selected),
    }


def pool(hidden, mask):
    import numpy as np
    require(hidden.ndim == 3 and hidden.shape[:2] == mask.shape and hidden.shape[2] == 384,
            "Unexpected token embedding shape")
    require(hidden.dtype == np.float32, "Expected float32 token embeddings")
    require(np.isfinite(hidden).all() and (mask.sum(axis=1) > 0).all(), "Invalid hidden states/mask")
    float_mask = mask.astype(hidden.dtype)
    vectors = (hidden * float_mask[:, :, None]).sum(axis=1) / float_mask.sum(axis=1)[:, None]
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    require(np.isfinite(vectors).all() and (norms > 0).all(), "Nonfinite/zero embedding")
    vectors = vectors / norms
    require(np.isfinite(vectors).all(), "Nonfinite normalized embedding")
    return vectors


class Embedder:
    def __init__(self, directory):
        import onnxruntime as ort
        from tokenizers import Tokenizer
        ort.disable_telemetry_events()
        require(ort.__version__ == "1.30.0" and importlib.metadata.version("tokenizers") == "0.23.2",
                "Unexpected embedding runtime version")
        require(sha(directory / "model.onnx") == MODEL_SHA256, "ONNX model hash mismatch")
        self.tokenizer = Tokenizer.from_file(str(directory / "tokenizer.json"))
        self.tokenizer.no_truncation()
        self.tokenizer.no_padding()
        self.pad_id = self.tokenizer.token_to_id("[PAD]")
        require(self.pad_id is not None, "No PAD token")
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(directory / "model.onnx"), sess_options=options,
                                           providers=["CPUExecutionProvider"])
        require(self.session.get_providers() == ["CPUExecutionProvider"], "Unexpected execution provider")
        self.input_names = [item.name for item in self.session.get_inputs()]
        require(set(self.input_names) <= {"input_ids", "attention_mask", "token_type_ids"}
                and {"input_ids", "attention_mask"} <= set(self.input_names), "Unexpected ONNX inputs")

    def encode(self, texts):
        import numpy as np
        self.tokenizer.no_truncation()
        self.tokenizer.no_padding()
        full = self.tokenizer.encode_batch(texts)
        self.tokenizer.enable_truncation(max_length=256)
        self.tokenizer.enable_padding(pad_id=self.pad_id, pad_token="[PAD]")
        encodings = self.tokenizer.encode_batch(texts)
        feed = {
            "input_ids": np.asarray([x.ids for x in encodings], dtype=np.int64),
            "attention_mask": np.asarray([x.attention_mask for x in encodings], dtype=np.int64),
            "token_type_ids": np.asarray([x.type_ids for x in encodings], dtype=np.int64),
        }
        hidden = self.session.run(None, {name: feed[name] for name in self.input_names})[0]
        vectors = pool(hidden, feed["attention_mask"])
        require(vectors.shape == (len(texts), 384), "Unexpected pooled shape")
        info = [{"fullTokenCountIncludingSpecial": len(raw.ids),
                 "usedTokenCountIncludingSpecial": sum(item.attention_mask),
                 "paddedLength": len(item.ids), "truncated": len(raw.ids) > 256}
                for raw, item in zip(full, encodings)]
        return vectors, info


class Rows(list):
    def exists(self):
        return bool(self)

    def order_by(self, *fields):
        require(fields == ("-importance_score", "-updated_at"), "Unexpected ORM ordering")
        rows = list(self)
        for field in reversed(fields):
            rows.sort(key=lambda row: getattr(row, field[1:]), reverse=True)
        return Rows(rows)


class Log:
    def __init__(self):
        self.entries = []

    def __getattr__(self, level):
        def record(message, **kwargs):
            self.entries.append({"level": level, "message": str(message)})
        return record


def extract(source):
    paths = {key: source / "backend/LifeLine/api/utils" / name for key, name in
             {"memory": "memory_utils.py", "constants": "constants.py", "prompts": "prompts.py"}.items()}
    hashes = {str(path): sha(path) for path in paths.values()}
    trees = {key: ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
             for key, path in paths.items()}
    literals = {}
    for key, names in (("constants", set(CONSTANTS)), ("prompts", {"MEMORY_CONTEXT_TEMPLATES"})):
        for node in trees[key].body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id in names:
                        literals[target.id] = ast.literal_eval(node.value)
    require(all(literals.get(key) == value for key, value in CONSTANTS.items()), "Source constants changed")
    functions, spans = [], []
    for key, names in (("memory", ("cosine_similarity", "get_relevant_memories")),
                       ("prompts", ("format_memory_context",))):
        for name in names:
            matches = [node for node in trees[key].body if isinstance(node, ast.FunctionDef) and node.name == name]
            require(len(matches) == 1, "Missing/duplicate source function " + name)
            node = matches[0]
            require(not node.decorator_list and not any(isinstance(x, (ast.Import, ast.ImportFrom))
                                                       for x in ast.walk(node)), "Unexpected source imports/decorators")
            functions.append(node)
            spans.append({"path": str(paths[key]), "function": name, "start": node.lineno, "end": node.end_lineno})
    import __future__
    code = compile(ast.Module(body=functions, type_ignores=[]), "<isolated-lifeline-ast>", "exec",
                   flags=__future__.annotations.compiler_flag)
    return code, literals, hashes, spans


def run_arm(case, vectors, now, extracted, arm):
    import numpy as np
    code, literals, _, _ = extracted
    log, writes, filters = Log(), [], []
    user = NS(id="fictional-user", username="fictional-user")
    rows = Rows()
    for index, item in enumerate(case["memories"]):
        row = NS(id=item["id"], title=item["title"], content=item["content"], memory_type=item["memoryType"],
                 importance_score=item["importance"], updated_at=now-timedelta(days=item["ageDays"]),
                 created_at=now-timedelta(days=item["createdDays"]), embedding=vectors[index+1].tolist(),
                 tags=[], access_count=0, last_accessed_at=None, user=user)
        def save(*, update_fields, row=row):
            require(update_fields == ["access_count", "last_accessed_at"], "Unexpected fake write")
            writes.append({"id": row.id, "update_fields": update_fields, "access_count": row.access_count,
                           "last_accessed_at": row.last_accessed_at.isoformat()})
        row.save = save
        rows.append(row)
    def filter_rows(**kwargs):
        require(kwargs == {"user": user, "embedding__isnull": False}, "Unexpected ORM filter")
        filters.append({"user": user.id, "embedding__isnull": False})
        return Rows(rows)
    def embedding(query):
        require(query == case["query"], "Unexpected query embedding request")
        return vectors[0].tolist()
    def blocked_import(*args, **kwargs):
        raise RuntimeError("Owner-source imports are forbidden")
    env = {**literals, "np": np, "logger": log, "timezone": NS(now=lambda: now),
           "Memory": NS(objects=NS(filter=filter_rows)), "call_llm_embedding": embedding,
           "__builtins__": {**vars(builtins), "__import__": blocked_import}}
    exec(code, env)
    signature = inspect.signature(env["get_relevant_memories"])
    require(signature.parameters["limit"].default == 5 and signature.parameters["min_similarity"].default == .3,
            "Retrieval defaults changed")
    ordered = rows.order_by("-importance_score", "-updated_at")
    scores = []
    for row in ordered:
        cosine = float(env["cosine_similarity"](vectors[0].tolist(), row.embedding))
        composite = cosine*.6 + row.importance_score*.3 + (1-min(1., (now-row.updated_at).days/30.))*.1
        require(math.isfinite(cosine) and math.isfinite(composite), "Nonfinite ranking score")
        scores.append({"id": row.id, "cosine": cosine, "composite": composite, "eligible": cosine >= .3})
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        if arm == "composite":
            selected = env["get_relevant_memories"](user, case["query"])
        else:
            eligible = [item for item in scores if item["eligible"]]
            ids = [item["id"] for item in sorted(eligible, key=lambda item: item["cosine"], reverse=True)[:5]]
            selected = [next(row for row in ordered if row.id == key) for key in ids]
            for row in selected:
                row.access_count += 1
                row.last_accessed_at = now
                row.save(update_fields=["access_count", "last_accessed_at"])
        dictionaries = [{"content": row.content, "title": row.title, "memory_type": row.memory_type,
                         "importance_score": row.importance_score, "created_at": row.created_at.isoformat(),
                         "tags": row.tags} for row in selected]
        formatted = env["format_memory_context"](dictionaries, "personal_context")
    require(not any(entry["level"] in ("error", "exception", "critical") for entry in log.entries),
            "Source logged an error: " + json.dumps(log.entries))
    expected = sorted([item for item in scores if item["eligible"]], key=lambda item: item[arm], reverse=True)[:5]
    require([row.id for row in selected] == [item["id"] for item in expected], "Ranking oracle disagreement")
    return {"initialOrmOrder": [row.id for row in ordered], "scores": scores,
            "eligibleIds": [item["id"] for item in scores if item["eligible"]],
            "selectedIds": [row.id for row in selected], "formattedContext": formatted,
            "fakeAccessWrites": writes, "fakeFilters": filters, "logs": log.entries,
            "runtimeWarnings": [str(item.message) for item in caught]}


def validate(corpus, labels):
    require(corpus.get("fictional") is True and len(corpus["cases"]) == 16, "Expected 16 fictional cases")
    require(len(labels["cases"]) == 16, "Expected 16 labeled cases")
    by_id = {case["id"]: case for case in labels["cases"]}
    require(len(by_id) == 16 and len({case["id"] for case in corpus["cases"]}) == 16
            and set(by_id) == {case["id"] for case in corpus["cases"]}, "Case IDs mismatch/duplicate")
    require(sum(case["answerable"] is True for case in labels["cases"]) == 12
            and sum(case["answerable"] is False for case in labels["cases"]) == 4, "Answerability must be 12/4")
    for case in corpus["cases"]:
        gold = by_id[case["id"]]
        require(type(case["intendedAnswerable"]) is bool and case["intendedAnswerable"] == gold["answerable"],
                "Intended and independently labeled answerability disagree")
        memories = {row["id"]: row for row in case["memories"]}
        grades = {row["id"]: row for row in gold["memories"]}
        require(len(case["memories"]) == len(memories) == len(gold["memories"]) == len(grades) == 8
                and set(memories) == set(grades), "Memory IDs/count mismatch")
        for row in memories.values():
            require(all(isinstance(row[key], str) for key in ("title", "content", "memoryType")), "Bad memory text")
            require(all(isinstance(row[key], (int, float)) and math.isfinite(row[key])
                        for key in ("importance", "ageDays", "createdDays")), "Bad metadata")
            require(0 <= row["importance"] <= 1 and 0 <= row["ageDays"] <= row["createdDays"], "Invalid age/importance")
        for grade in grades.values():
            require(type(grade["relevance"]) is int and grade["relevance"] in (0, 1, 2)
                    and type(grade["superseded"]) is bool and bool(grade["reason"]), "Invalid label")
            require(not grade["superseded"] or grade["relevance"] == 0, "Superseded memory must be grade zero")
        essential = {key for key, row in grades.items() if row["relevance"] == 2}
        require(bool(essential) == gold["answerable"], "Answerability/essential labels disagree")
        facts = gold["essentialFacts"]
        require(len({fact["id"] for fact in facts}) == len(facts), "Duplicate fact ID")
        for fact in facts:
            require(fact["memoryId"] in essential, "Fact must belong to essential memory")
            row = memories[fact["memoryId"]]
            require(bool(fact["quote"]) and (fact["quote"] in row["content"] or fact["quote"] in row["title"]),
                    "Fact quote is not an exact source substring")
        require({fact["memoryId"] for fact in facts} == essential, "Essential memory lacks fact")
    return by_id


def self_test():
    import numpy as np
    labels = {"answerable": True, "memories": [{"id": "a", "relevance": 2, "superseded": False},
              {"id": "b", "relevance": 1, "superseded": False}, {"id": "c", "relevance": 0, "superseded": True}],
              "essentialFacts": [{"id": "f", "memoryId": "a", "quote": "fact"}]}
    ideal = metrics(["a", "b", "c"], labels, "fact")
    require(ideal["ndcgAt5"] == ideal["essentialRecall"] == ideal["essentialFactRecallAfterFormat"] == 1,
            "Ideal self-check failed")
    empty = metrics([], labels, "")
    require(empty["ndcgAt5"] == empty["essentialRecall"] == empty["precisionAtReturnedCount"] == 0,
            "Empty self-check failed")
    hidden = np.zeros((1, 3, 384), dtype=np.float32)
    hidden[0, 0, 0] = 1; hidden[0, 1, 1] = 1; hidden[0, 2] = 1000
    vector = pool(hidden, np.array([[1, 1, 0]]))[0]
    require(np.allclose(vector[:2], [1/math.sqrt(2)]*2) and np.all(vector[2:] == 0), "Padding self-check failed")
    require(metrics(["a"], labels, "")['selectedFactsLostToFormatter'] == 1, "Fact-loss self-check failed")
    print(json.dumps({"selfTests": "PASS", "checks": ["ideal", "empty", "padding", "fact-loss"]}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("source", "model-dir", "corpus", "labels", "freeze", "output", "embeddings-output"):
        parser.add_argument("--" + name, type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    require(all(getattr(args, name) is not None for name in
                ("source", "model_dir", "corpus", "labels", "freeze", "output", "embeddings_output")), "Missing path argument")
    require(not args.output.exists() and not args.embeddings_output.exists()
            and args.output.resolve() != args.embeddings_output.resolve(), "Output exists or paths collide")
    started = datetime.now(timezone.utc).isoformat()
    freeze = read_json(args.freeze)
    frozen_paths = {"corpus.json": args.corpus, "labels.json": args.labels,
                    "protocol.md": args.freeze.parent / "protocol.md", "evaluate.py": Path(__file__)}
    require(set(freeze["files"]) == set(frozen_paths), "Freeze must contain exactly four required files")
    for name, path in frozen_paths.items():
        require(sha(path) == freeze["files"][name], "Frozen input hash mismatch: " + name)
    freeze_hash = sha(args.freeze)
    corpus, labels = read_json(args.corpus), read_json(args.labels)
    by_id = validate(corpus, labels)
    now = datetime.fromisoformat(corpus["clock"].replace("Z", "+00:00"))
    require(now.tzinfo is not None, "Clock must include timezone")
    extracted = extract(args.source)
    model_hashes = {str(path.relative_to(args.model_dir)): sha(path)
                    for path in sorted(args.model_dir.rglob("*")) if path.is_file()}
    embedder = Embedder(args.model_dir)
    cases, embeddings = [], []
    import numpy as np
    control_text = "A ceramic teapot sits beside a blue cup."
    control_batch, control_tokens = embedder.encode([control_text, control_text, "padding control " * 400])
    control_single, _ = embedder.encode([control_text])
    require(np.allclose(control_batch[0], control_batch[1], atol=1e-7, rtol=1e-7), "Duplicate text invariant failed")
    require(np.allclose(control_batch[0], control_single[0], atol=2e-5, rtol=2e-5), "Control batch/single invariant failed")
    require(control_tokens[2]["truncated"] and control_tokens[2]["usedTokenCountIncludingSpecial"] == 256,
            "Control truncation invariant failed")
    for case in corpus["cases"]:
        texts = [case["query"]] + [row["content"] for row in case["memories"]]
        vectors, tokens = embedder.encode(texts)
        single, _ = embedder.encode([texts[0]])
        require(np.allclose(vectors[0], single[0], atol=2e-5, rtol=2e-5), "Batch/single query embedding mismatch")
        embeddings.append({"id": case["id"], "query": {"vector": vectors[0].tolist(), **tokens[0]},
                           "memories": [{"id": row["id"], "vector": vectors[i+1].tolist(), **tokens[i+1]}
                                        for i, row in enumerate(case["memories"])]})
        result = {"id": case["id"], "designSlice": case["designSlice"], "answerable": by_id[case["id"]]["answerable"],
                  "intendedAnswerable": case["intendedAnswerable"], "arms": {}}
        for arm in ("composite", "cosine"):
            outcome = run_arm(case, vectors, now, extracted, arm)
            gold = by_id[case["id"]]
            outcome["metrics"] = metrics(outcome["selectedIds"], gold, outcome["formattedContext"])
            outcome["relevantExcludedByThreshold"] = [row["id"] for row in gold["memories"]
                if row["relevance"] >= 1 and row["id"] not in outcome["eligibleIds"]]
            outcome["essentialExcludedByThreshold"] = [row["id"] for row in gold["memories"]
                if row["relevance"] == 2 and row["id"] not in outcome["eligibleIds"]]
            result["arms"][arm] = outcome
        require(result["arms"]["composite"]["scores"] == result["arms"]["cosine"]["scores"]
                and result["arms"]["composite"]["eligibleIds"] == result["arms"]["cosine"]["eligibleIds"],
                "Matched arms disagree on raw scores or eligible IDs")
        result["moreThanFiveEligible"] = len(result["arms"]["composite"]["eligibleIds"]) > 5
        result["identicalSelectedSets"] = (set(result["arms"]["composite"]["selectedIds"])
                                            == set(result["arms"]["cosine"]["selectedIds"]))
        result["identicalFormattedContexts"] = (result["arms"]["composite"]["formattedContext"]
                                                == result["arms"]["cosine"]["formattedContext"])
        cases.append(result)
    metric_names = ("essentialRecall", "precisionAtReturnedCount", "ndcgAt5", "essentialFactRecallAfterFormat",
                    "selectedFactsLostToFormatter", "supersededCount")
    answerable = [case for case in cases if case["answerable"]]
    macro = {arm: {name: sum(case["arms"][arm]["metrics"][name] for case in answerable)/12
                   for name in metric_names} for arm in ("composite", "cosine")}
    paired = {}
    for name in metric_names:
        deltas = [case["arms"]["composite"]["metrics"][name] - case["arms"]["cosine"]["metrics"][name]
                  for case in answerable]
        direction = -1 if name in ("selectedFactsLostToFormatter", "supersededCount") else 1
        paired[name] = {"compositeWins": sum(delta*direction > 1e-12 for delta in deltas),
                        "ties": sum(abs(delta) <= 1e-12 for delta in deltas),
                        "compositeLosses": sum(delta*direction < -1e-12 for delta in deltas)}
    for name, path in frozen_paths.items():
        require(sha(path) == freeze["files"][name], "Frozen input changed during run")
    require(sha(args.freeze) == freeze_hash, "Freeze changed during run")
    require(all(sha(path) == digest for path, digest in extracted[2].items()), "Owner source changed during run")
    require(all(sha(args.model_dir/path) == digest for path, digest in model_hashes.items()), "Model changed during run")
    write_json(args.embeddings_output, {"schema": "lifeline-ranking-embeddings-v1", "modelRevision": MODEL_REVISION,
                                      "inputText": "query and memory content only", "cases": embeddings})
    report = {"schema": "lifeline-ranking-results-v1", "status": "COMPLETE", "stage": "exploratory",
              "startedAt": started, "endedAt": datetime.now(timezone.utc).isoformat(), "clock": now.isoformat(),
              "matchedPairs": len(cases), "answerableCount": 12, "unanswerableCount": 4,
              "model": "sentence-transformers/all-MiniLM-L6-v2", "modelRevision": MODEL_REVISION,
              "modelFilesSha256": model_hashes, "sourceSha256": extracted[2], "sourceSpans": extracted[3],
              "frozenInputsSha256": freeze["files"], "freezeSha256": freeze_hash,
              "embeddingsSha256": sha(args.embeddings_output), "allInputsUnchangedAfter": True,
              "runtime": {"python": sys.version, "executable": sys.executable, "platform": platform.platform(),
                          "packages": {name: importlib.metadata.version(name) for name in ("numpy", "onnxruntime", "tokenizers")},
                          "providers": embedder.session.get_providers(), "threads": 1, "ortTelemetryDisabled": True},
              "embeddingControls": {"duplicateText": "PASS", "batchVsSingle": "PASS", "truncation": "PASS",
                                    "batchVsSingleTolerance": {"atol": 2e-5, "rtol": 2e-5}},
              "argv": sys.argv, "macroAnswerable": macro, "pairedAnswerable": paired,
              "selectionOpportunity": {"moreThanFiveEligibleCaseIds": [case["id"] for case in cases if case["moreThanFiveEligible"]],
                  "identicalSelectedSetsCaseIds": [case["id"] for case in cases if case["identicalSelectedSets"]],
                  "identicalFormattedContextsCaseIds": [case["id"] for case in cases if case["identicalFormattedContexts"]]},
              "unanswerable": {arm: {"anySelectionCount": sum(case["arms"][arm]["metrics"]["anySelection"]
                 for case in cases if not case["answerable"]), "selectedMemoryCount": sum(case["arms"][arm]["metrics"]["selectedCount"]
                 for case in cases if not case["answerable"])} for arm in ("composite", "cosine")},
              "cases": cases, "limits": ["16 authored fictional cases; exploratory only, no confidence or generalization claim.",
                  "Surrogate local MiniLM embeddings, not the application's embedding provider.",
                  "No application imports, live database, network, account, or answer generation.",
                  "Fact retention is exact quote presence, not semantic answer correctness.",
                  "Fake ORM and access writes; extracted source ranking and formatter execute unchanged."]}
    write_json(args.output, report)
    print(json.dumps({"status": "COMPLETE", "matchedPairs": len(cases), "output": str(args.output)}))


if __name__ == "__main__":
    main()
