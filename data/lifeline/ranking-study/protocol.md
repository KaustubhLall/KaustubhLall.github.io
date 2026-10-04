# Lifeline ranking-policy exploration

Prepared October 3 Pacific / October 4 UTC 2026, before corpus embedding inference. This is a
small, intentionally diagnostic fictional-data experiment, not a production
retrieval benchmark, public preregistration or representative user sample.

## Question and decision

Does Lifeline's existing importance/recency weighting improve selection over
cosine-only ranking when both receive the same text embeddings and candidates?
An improvement would support investigating the weights in a later owner-approved
evaluation. Equal or worse results do not justify a quality claim or deploying a
changed policy. An unchanged selected set with changed ranking is distinguished
from better selection. This study does not choose or tune new weights.

## Frozen inputs and roles

- One Astra author creates 16 independent fictional cases, each with eight
  memories: 12 answerable and four unanswerable. Ordinary planning/preferences,
  paraphrases, plausible distractors, old durable facts, superseded facts and long
  entries are represented. Importance metadata is authored, not LLM-extracted.
- A separate Astra reviewer receives only queries, memory text, titles/types and
  dates. It does not receive importance values, intended answerability, slice
  labels, implementation, methods, embeddings or ranked results.
- The reviewer labels every memory 2 (essential), 1 (useful support) or 0
  (irrelevant/superseded), flags superseded claims, and supplies exact short
  supporting quotes for essential facts. These are model judgments; root checks
  the labels and any ambiguities before inference. Disagreements and changes
  remain in the record. Independent agents do not constitute human validation.
- Root integrates. `freeze.json` records SHA-256 for corpus, reviewed labels,
  this protocol and the runner before inference. The runner refuses changed
  inputs. Source and model identities are also captured. Local hashes document
  this run, not a signed audit or proof against all prior exposure.

Root's pre-freeze quote review included a deterministic formatter-prefix check,
which exposed quote survival conditional on selection. No labels or quotes were
changed afterward. Similarities and rankings remained unseen. The comparison is
exploratory; this secondary check was not fully blinded. See `label-review.md` for
the preserved q07 interpretation and exact-quote versus semantic-loss distinction.

## Matched comparison

Run the original `cosine_similarity`, `get_relevant_memories` and
`format_memory_context` functions through allowlisted AST extraction. Do not
import or start the application. A fake ORM supplies only fictional memories,
an identical clock and deterministic initial order. Access bookkeeping writes
go to isolated in-memory records. No real database, account, mailbox, provider,
credentials or owner source is changed.

The candidate uses the original defaults: cosine >= 0.3, at most five rows,
score = 0.6*cosine + 0.3*importance + 0.1*(1-min(1,ageDays/30)). The baseline
uses cosine alone with the same threshold, limit and stable initial order
(-importance, -updated_at, then corpus order). Run both through the same original
formatter. Its additional sorting and truncation are separately visible. This
isolates the ranking formula, not conversation supplementation or answer
generation. The fixed clock is 2026-10-04T00:00:00Z.

Embeddings come from the official `sentence-transformers/all-MiniLM-L6-v2`
ONNX model at revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`.
`model.onnx` SHA-256:
`6fd5d72fe4589f189f8ebc006442dbb529bb7ce38f8082112682524616046452`.
Use CPU, FP32 output, tokenizers 0.23.2, ONNX Runtime 1.30.0, max 256
wordpieces, attention-mask-aware mean pooling and L2 normalization. Embed each
query and memory content only. Record token counts and any truncation, package
versions, file hashes and raw vectors. This is a named surrogate for the owner's
`text-embedding-3-small`, not a reproduction of its embeddings. The inherited
0.3 cutoff is not calibrated for MiniLM; eligibility failures are reported
separately. No model selection, threshold sweep or relevance-driven tuning.

## Outcomes and denominators

For each of the 12 answerable cases report:

- Primary: essential-memory recall (selected grade-2 / all grade-2 memories) and
  precision at returned count (selected grade >= 1 / returned; empty = 0).
- Secondary: nDCG@5 with gain `2^grade-1`, log2 rank discount and ideal order over
  all eight memories, including those rejected by the threshold.
- Eligibility: candidate count, essential/relevant memories below threshold.
- Formatting: exact essential quotes retained in the formatted context / all
  essential quotes; selected essential quotes lost during formatting separately.
  Quote retention is a mechanical content-preservation check, not answer quality.
- Superseded rows selected, all raw scores, IDs/order and final formatted text.

Report macro means over the 12 answerable cases and paired win/tie/loss counts.
Do not pool memory rows as independent trials. Report all four unanswerable cases
separately: number of rows selected and cases returning any row. Their recall and
precision are undefined. Retrieval of a row does not mean a model fabricated an
answer. No statistical significance or population-superiority claim is planned.
Also count cases with more than five eligible memories, identical selected sets
and identical formatted contexts. If most pools fit under the limit, equality in
selection metrics gives little evidence about the relative ranking policies.

## Execution, controls and stopping

Before interpreting results, check metric arithmetic with a known ideal and
empty selection, unit norms and finite 384-dimensional embeddings, duplicate
text consistency and padding/batch invariance. Check source hash stability and
that both arms receive the same candidate scores and eligible pool. Independently
recompute metrics from preserved raw outcomes.

The budget is one frozen 16-pair exploratory run and necessary implementation or
reproducibility checks. Missing cases, exceptions, nonfinite vectors or unexpected
owner imports fail the run; do not drop failures. Preserve failed-run diagnostics.
Runner defects may be repaired with a versioned deviation before rerun, without
changing relevance labels or policy based on observed scores. If future tuning
uses these cases, they are development data and need new untouched confirmation.

## Limits and primary documentation

Authored corpus and metadata, model-based relevance judgment, small sample,
surrogate embeddings and fake persistence limit generalization. This does not
evaluate extraction, generation, deployment readiness, privacy guarantees or
agent productivity. Keep an honest null/negative result if one occurs.

The [official model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
specifies the embedding and pooling recipe. The
[Sentence Transformers ONNX documentation](https://www.sbert.net/docs/sentence_transformer/usage/efficiency.html#onnx)
explains that raw ONNX output needs pooling and normalization outside its wrapper.
