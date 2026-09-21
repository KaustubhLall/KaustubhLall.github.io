# Lifeline memory selection and prompt consumption

This package explains the ordinary-chat memory path inspected September 20, 2026,
and exercised in an isolated source probe on September 21. All records, queries,
history and embedding inputs are fictional. No real conversation or model answer
is included. The two JSON files have different verification scopes below.

## Source identity

The repository base is `399c253edb36fda18df11ca869953feeea02bc57`.
The inspected working tree includes uncommitted changes to
`backend/LifeLine/api/views/views.py`. The base commit alone does not identify
the inspected implementation. `memory-selection.json` records SHA-256 hashes
of the exact bytes of six inspected files, with the modified file marked.
Source files, personal data, and deployment configuration are not redistributed.

## Seven-row arithmetic example: memory-selection.json

For each fictional row, use the stipulated cosine similarity, importance, and
nonnegative whole-day age. No vector similarity calculation or embedding call
was performed. Drop similarity below 0.3, then calculate:

```
recency = 1 - min(1, age_days / 30)
score = 0.6 * similarity + 0.3 * importance + 0.1 * recency
```

Expected descending order: B (0.84), C (0.67), A (0.60), D (0.56), E (0.46),
F (0.27). The ordinary chat caller's limit of five selects B, C, A, D, E.
G has similarity 0.29 and is excluded before scoring. There are no score ties.
Arithmetic was recomputed separately in JavaScript. The Lifeline retrieval
function was not invoked, and no Django process, database, provider, or mailbox
was accessed. This is an explanatory fixture, not a regression-test pass.

## Source map and downstream meaning

- `api/utils/constants.py:34-36,46-51,62-65`: caller limits 5 and 3,
  similarity threshold 0.3, scoring weights, 30-day recency, formatting limits.
- `api/utils/memory_utils.py:33-115`: conversation-pair extraction, embedding,
  user/source-linked persistence, and logged failure returning no memory.
- `api/utils/memory_utils.py:177-261`: per-user embedded candidates, cosine
  filter, composite ranking, limit, access bookkeeping, and empty-list fallback.
  Recency uses `updated_at`, not `last_accessed_at`.
- `api/utils/memory_utils.py:291-319`: the separate conversation-memory branch,
  restricted by user and conversation, ordered by importance and creation time.
- `api/views/views.py:302-359`: relevant limit 5 plus conversation limit 3,
  deduplication by memory ID, and enhanced-prompt construction.
- `api/utils/prompts.py:196-247`: combined entries reordered by importance and
  creation time, at most 8 entries, each shortened to at most 100 characters.
- `api/utils/prompts.py:338-405`: ordinary prompt assembly uses recent-message
  and character limits, not the supplied history-token parameter as a guarantee.
- `api/views/views.py:435-442,527,568-572`: separate agent call, ordinary
  text call with enhanced prompt, and later background extraction.
- `api/models/chat.py`: stored memory fields and prompt-debug schema.
- `api/utils/llm.py:291-387`: LLM extraction of the user/assistant pair.

All paths above are relative to `backend/LifeLine/`. The JSON retains full paths
for hashes. Retrieval selection is not final prompt order. Conversation-memory
selection does not use the semantic threshold, so a rejected semantic candidate
could enter through that branch. The inspected Gmail-agent call receives the
question and history, not the enhanced memory prompt. Memory-related response
metadata must not be treated as proof of agent consumption.

## Four-record consumer trace: prompt-trace.json

This separate fixture executes exact source functions and the original
`MessageListCreateView.post` method extracted from Python AST. Only its schema
decorators are removed. Literal constants/templates are taken from the same
hashed source. In-memory querysets, records, clock and embedding provider replace
external dependencies. The original selection, deduplication, formatting and
branching logic runs unchanged. A sentinel stops at `call_llm_text` or `run_agent`
before any response, extraction or agent internals run. Debug-only history
formatting exercises its existing missing-tokenizer fallback.

The query embedding is [1,0]; each invented memory vector is
[similarity,sqrt(1-similarity squared)]. Actual cosine comparison selects A,C,B.
Conversation selection adds D,B. Deduplication yields A,C,B,D, and the actual
formatter emits D,B,C,A. C is shortened to100 characters including title/ellipsis.
D's similarity0.29 fails semantic retrieval but its conversation membership
admits it. The JSON stores the exact ordinary prompt intercepted at the consumer.

Two more ordinary cases have no conversation-associated memories. One makes all
similarities fall below threshold; the other injects an embedding exception.
Their captured prompts are identical, while the failure has an error log.
Empty-match mean-score logging also emits two NumPy warnings, retained in JSON.
The agent case receives the raw query/history, without the assembled prompt.
Independent execution reproduced all four cases and reconciled exact source
hashes before and after. This is source execution with test doubles, not a Django
or database integration test. The inspected chat view remains locally modified.

## Evidence limits

The package establishes source choices, example arithmetic and the specific
isolated prompt-consumption paths described above.
It does not establish extraction accuracy, persistence reliability, isolation,
retrieval quality, response quality, latency, privacy, or current hosted availability.
The historical EC2 deployment is not a current live-service claim. No new
application-server execution, model calls, deployment, or scientific evaluation occurred.
The broader product plan is not used as evidence of implemented integrations.
