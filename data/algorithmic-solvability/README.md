# Algorithmic Solvability evidence extract

Exported 2026-09-18 UTC from the existing publication data pinned by the case study at commit 42aa8ac684766f5c544aa94b5af73af0613dc0e8. The scored-results file was last committed March 27, 2026 (Pacific). This is a source timestamp, not an independently verified execution date. No training, evaluation or scientific rerun was performed.

## Files and protocol

- scored-results.csv: the original 30 task-level baseline rows, with source column names and values preserved. Accuracy fields are fractions, not percentages. The label is the source evidence-rubric verdict and score is its reported rubric score, not accuracy.
- registry.csv: 32 task definitions extracted from the pinned registry source, with a scored flag showing membership in the results CSV. This is a registry inventory, not a trial manifest.
- provenance.json: source commits, dates, equivalence check, recomputed counts and means, excluded/unscored tasks and limitations.
- SHA256SUMS.txt: checksums of the exported files.

There are 17 sequence and 15 classification tasks in the registry, with 16 and 14 scored respectively. Sequence verdicts are 0 STRONG, 1 MODERATE, 2 WEAK, 11 NEGATIVE and 2 INCONCLUSIVE. Classification verdicts are 3 STRONG, 9 MODERATE, 0 WEAK, 1 NEGATIVE and 1 INCONCLUSIVE.

Recompute headline accuracy by taking the arithmetic mean of best_iid_accuracy or best_ood_accuracy within each track, excluding blank cells. IID uses all 16/14 scored tasks: 38.070833% sequence and 93.561905% classification. OOD uses 15/13 tasks: 25.911662% and 97.017041%. The two random-label controls have no OOD value. Do not treat blanks as zero or compare these means as though their task denominators were identical. Best IID and best OOD can select different models; this is not one model's paired transfer score.

These are existing synthetic-task research results. They do not prove general algorithmic understanding outside the implemented tasks and models. The extract does not contain seeds, predictions, tuning histories or trained checkpoints and is not a standalone experiment reproduction package. Code and the full methodology remain available through the public project link on the case study.

The three source files used here are identical at local comparison commit 1381a60134a5c0b28a3f801b108cab3245a76a00 and the site's pinned commit. Export used pinned Git objects, not modified working-tree code.
