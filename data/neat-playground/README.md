# NEAT learning measurements and ablations

These downloads expose the retained measurements behind the portfolio figures
and champion-selection comparison. The learning and selection extracts were
prepared September 21, 2026, from commit
`ef5a8a0abab5b02960e3f91b8445ce5bcaf5d1d4`. No training, model execution or new
evaluation was performed. The export date is not an experiment execution date.

## Learning measurements

`learning-measurements.csv` contains 4,500 rows from all 20 saved learning logs.
It retains only `game`, the filename's `seed` label, zero-based `generation`, and
the original `test_mean`. No rows are filtered, filled, smoothed or interpolated.
All five seed series per game have aligned, contiguous generations:

| Game | Generations per run | Score unit | Final mean | Population SD |
| --- | ---: | --- | ---: | ---: |
| Flappy Bird | 100 | Pipes | 54.0 | 0.0 |
| Snake | 250 | Apples | 27.6 | 1.7 |
| 2048 | 300 | Maximum tile | 102.6 | 118.3 |
| Pac-Man | 250 | Pellets | 32.8 | 7.0 |

The trainer logs an integer-truncated batch mean for the chosen champion. That
same batch helps choose the champion from the top candidates and incumbent, so
these curves are selection measurements, not an independent final evaluation.
For each plotted generation, average the five logged values. The website shows
134 sampled points from those averages. Final mean and population SD use the
five last-generation values, with denominator five for variance. SD describes
these runs' spread, not a confidence interval.

For 2048, each episode's score is its largest tile, not accumulated merge points.
The final logged batch means are 42, 38, 339, 40 and 54. A logged average such as
339 need not be a legal tile, and the across-run mean conceals a large spread.
The curve does not establish a grokking transition.

To recompute the final table using Python's standard library, save the CSV next
to this snippet and run it there:

```python
import csv
from collections import defaultdict
from statistics import mean, pstdev

runs = defaultdict(list)
with open("learning-measurements.csv", newline="", encoding="utf-8") as stream:
    for row in csv.DictReader(stream):
        runs[(row["game"], int(row["seed"]))].append(
            (int(row["generation"]), int(row["test_mean"]))
        )
for game in ("flappy", "snake", "2048", "pacman"):
    final = [max(runs[(game, seed)])[1] for seed in range(1, 6)]
    print(game, final, round(mean(final), 1), round(pstdev(final), 1))
```

## Champion-selection comparison

`selection-comparison.csv` is a byte-for-byte copy of the complete 24-row source
table: four games, two methods, three run seeds. `testbatch` chooses using fresh
selection batches; `fitness` chooses using training fitness. `unseen_mean` is the
verifier's integer-truncated batch mean. Individual episode scores are absent.

Average the three `unseen_mean` values within each game/method to reproduce the
comparison. Testbatch has a higher mean in three games, but Snake seed 2 is
25 versus 28 and 2048 seed 3 is 33 versus 38, favoring fitness. Pac-Man's pairs are
identical: 33, 29, 29. Three runs do not establish a reliable advantage.

## Protocol and provenance

`measurements-provenance.json` records exact source and output SHA256 hashes,
projection rules, derived summaries, and committed protocol references. All 21
measurement files match the named commit byte for byte. Protocol references
identify committed bytes separately from any local working-tree changes.

The retained experiment script describes learning runs with 20 selection
episodes per generation, capped at 6,000 ticks each. Its separate selection
comparison trains for 150 generations and evaluates the saved champion on
30 seeds, 3000 through 3029, with the same 6,000-tick evaluation cap. Base configs
and per-game overrides also apply. These settings describe the committed
script; this export does not recover execution manifests proving how the saved
runs were produced. The two studies must not be combined as one evaluation.

## Earlier memorization extract

`memorization-ablation.json` is unchanged from its September 18 export. Its
source was last committed July 5, 2026 (Pacific), a version-control timestamp
rather than a verified experiment execution date. Its own JSON retains provenance.

The eight rows cover four games and two training regimes. Fixed-world Flappy scores are 6 on the training course and 2 unseen; random-world scores are 54 and 54. This is the data shown by the portfolio ablation figure. Game score units differ. These summaries do not establish uncertainty, identical evaluation horizons, or a causal explanation for differences. The 2048 values are source-reported aggregates, not necessarily literal tiles from one board.

This is an inspectable evidence extract, not a full reproduction package or a
public source release. Cross-game scores have different units. Source identity
and arithmetic checks do not prove prospective collection, causal effects,
model quality or a new generalization result. `SHA256SUMS.txt` covers every
exported data and guide file.
