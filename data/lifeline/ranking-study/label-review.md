# Label adjudication before embedding inference

Root inspected all 128 authored memory texts and the blinded reviewer's 16 case
judgments before any corpus embeddings, similarities or rankings were computed.
The reviewer found 12 answerable cases and four without the requested factual
answer, matching the withheld author classification. It assigned 15 essential
memories, 12 useful-context memories and 101 irrelevant memories. No labels,
queries, metadata or supporting quotes were changed.

One ambiguity is retained explicitly: q07 asks for the Harbor Lantern scale
"as opposed to" the Harbor Market model. The judge treats this as a comparison
requiring both scales. Root accepts that defensible reading. A disambiguation-only
reading could make the Market scale optional; this case is not unambiguous ground
truth. q10 correctly treats the June wording as essential to a historical query,
even though it has been replaced for current use. Only q03-m02 is flagged as an
outdated answer for its actual query.

The four unanswerable questions include useful context explaining uncertainty.
Returning those rows is not automatically inappropriate retrieval, and no answer
generation is evaluated. Report selection counts without relabeling them as
hallucinations, answer failures or false-positive rates.

Root also calculated the existing formatter's character truncation on the 15
supporting quotes while reviewing their scope, before the freeze manifest was
written. That exposed the secondary formatting outcome conditional on each
memory being selected. Eight quotes would not survive intact; labels and quotes
were not changed. Corpus similarities and ranking outcomes were still unseen.
This is an explicitly exploratory run, not a fully blind confirmatory study.

Exact-quote loss is stricter than semantic loss. A partially visible word may be
guessable, and some surviving words can still support part of an answer. Public
copy must say exact supporting spans/quotes, show an unambiguous missing-fact
example and avoid equating this metric with answer accuracy. In q05 and q12 the
answer-bearing clause is entirely outside the displayed prefix. This distinction
is more useful than calling every nonmatching quote an unusable answer.

Author: Astra corpus author. Judge: a separate Astra context receiving only
queries, titles, text, memory types and dates. Root adjudication is another model
review, not human validation. The author later reviews evaluator code; that is
independence from the runner author, not independent validation of its own corpus.
