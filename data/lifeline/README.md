# Lifeline memory selection: source and fictional arithmetic

This package explains the ordinary-chat memory path inspected September 20, 2026.
It does not contain a captured conversation, embeddings, a model result, or a
runtime test report. All memory descriptions and inputs are invented.

## Source identity

The repository base is `399c253edb36fda18df11ca869953feeea02bc57`.
The inspected working tree includes uncommitted changes to
`backend/LifeLine/api/views/views.py`. The base commit alone does not identify
the inspected implementation. `memory-selection.json` records SHA-256 hashes
of the exact bytes of six inspected files, with the modified file marked.
Source files, personal data, and deployment configuration are not redistributed.

## What to recompute

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
- `api/views/views.py:429-441,532-540,566-572`: separate agent call, ordinary
  text call with enhanced prompt, and later background extraction.
- `api/models/chat.py`: stored memory fields and prompt-debug schema.
- `api/utils/llm.py:291-387`: LLM extraction of the user/assistant pair.

All paths above are relative to `backend/LifeLine/`. The JSON retains full paths
for hashes. Retrieval selection is not final prompt order. Conversation-memory
selection does not use the semantic threshold, so a rejected semantic candidate
could enter through that branch. The inspected Gmail-agent call receives the
question and history, not the enhanced memory prompt. Memory-related response
metadata must not be treated as proof of agent consumption.

## Evidence limits

The package establishes inspectable source choices and example arithmetic only.
It does not establish extraction accuracy, persistence reliability, isolation,
retrieval quality, response quality, latency, privacy, or current hosted availability.
The historical EC2 deployment is not a current live-service claim. No new
application execution, model calls, deployment, or scientific evaluation occurred.
The broader product plan is not used as evidence of implemented integrations.
