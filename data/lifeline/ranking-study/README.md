# Lifeline: ranking and the context that survives

Exploratory portfolio follow-up, October 3 Pacific / October 4 UTC 2026.
The application and retrieval weights were not changed or deployed.

Sixteen fictional questions each have eight candidate memories. A separate
Astra reviewer assigned relevance labels without seeing importance metadata,
the ranking methods or outputs. Twelve questions have recorded answers and four
do not. This is an authored diagnostic sample with model judgments, not real
user data or a representative benchmark.

## Comparison and findings

The original weighted retrieval function and a cosine-only baseline use the
same text-derived vectors, 0.3 cutoff, five-row limit, fixed clock and candidate
order. Both then use the original formatter. Mean precision and nDCG below are
averaged over the 12 answerable questions. The fraction counts pool their 15
essential memories or supporting quotes and are not macro averages.

| Outcome | Original weighted rule | Cosine-only |
|---|---:|---:|
| Essential memories selected | 15 / 15 | 15 / 15 |
| Mean precision at returned count | 28.75% | 28.75% |
| Mean nDCG@5 before formatting | 0.768949 | 0.878643 |
| Exact supporting quotes surviving formatting | 7 / 15 | 7 / 15 |

The weighted rule improves nDCG in two answerable cases, ties in four and loses
in six. Only six of the 12 answerable pools have more than five eligible rows.
No essential memory is rejected by the threshold. Different distractors enter
the selected set in five answerable cases; the essential recall and precision
are unchanged. Across all 16 cases, nine selected sets and nine final contexts
are identical between methods.

These observations do not establish equivalence or a production winner. The
formatter sorts by importance and creation time, so retrieval rank is not final
context order. In the borrowed-jigsaw and moon-sketch cases, the selected note
contains the answer but its answer-bearing clause lies beyond the displayed
prefix. Exact quote loss is stricter than semantic loss; partially visible
phrases can still convey information. This study does not evaluate an answer
model's ability to infer missing words or use the context correctly.

Both methods return memories for all four questions without a recorded factual
answer. Some memories explicitly explain that a decision has not been made or
information is missing. Selection alone is not evidence of hallucination.

## Model and execution boundary

Embeddings use the official
[all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/tree/1110a243fdf4706b3f48f1d95db1a4f5529b4d41)
ONNX model at revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`.
The runner applies masked mean pooling, L2 normalization and a 256-wordpiece
limit on CPU. All fictional corpus texts fit inside that limit. Package versions
and download hashes are in `runtime-setup.json`.

This is a named local surrogate for the owner's `text-embedding-3-small`.
Its inherited similarity cutoff was not calibrated or tuned. Source functions
were extracted without importing the application, and the ORM, clock and access
writes were isolated in memory. No application service, live database, provider
API, Gmail account or real user data was used. No answer was generated.

The corpus, labels, protocol and runner were hashed before embedding inference.
The pre-freeze label review also inspected deterministic formatter prefixes,
without changing labels or quotes. That secondary check was not fully blinded.
The q07 label interprets an explicit contrast as requesting both model scales;
a narrower interpretation could treat the second scale as optional. These are
disclosed exploratory limitations, not a confirmatory preregistration.

## Files and reproduction

- `summary.json`: small display projection with definitions in this guide.
- `corpus.json`: all fictional texts, queries and authored metadata.
- `labels.json`: relevance, exact supporting quotes and judge rationale.
- `embeddings.json`: the 144 query/memory vectors and token counts.
- `results.json`: every score, selected ID, formatted context, metric and source
  hash. This is a public projection of the private run report: machine paths and
  command-line arguments are removed, all numeric results are unchanged.
- `check.py`: standard-library recomputation from these preserved artifacts.
  Run `python check.py --directory . --output independent-check.json` after
  downloading the data files into one folder. It requires no model or provider.
- `evaluate.py`: the frozen runner. A fresh inference run additionally requires
  matching application source, the pinned model files and isolated dependencies.
- `protocol.md`, `label-review.md`, `freeze.json`, `runtime-setup.json`: methods,
  adjudication and acquisition identities. Hashes provide byte identity, not a
  signature, guaranteed privacy review or human validation.
- `SHA256SUMS.txt`: checksums for this public bundle, excluding the checksum file.

The independent checker does not rerun embeddings or the application. Future
formatting or ranking changes evaluated on these cases are development work and
need new untouched cases before making a broader quality claim.
