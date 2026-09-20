# Drug Transporter ML: software verification, September 20, 2026

This package records a bounded maintenance repair, not a new scientific result.
The public default branch was 4cd3f66. The repair is a88149c3dbd70ae66c33538e0cf7d7deb5f9c8cc on codex/reproducibility-repair, proposed at https://github.com/KaustubhLall/drug-transporter-ml/pull/1. It is not merged.

The old subset loop named selected columns but evaluated the full matrix. Its final incomplete CSV batch was not written. Three synthetic regressions fail against the original source and pass after repair. The full repaired suite has ten passing tests, including both actual GA entrypoints on tiny synthetic inputs with graphics intercepted. See verification.json for exact scope and limits.

## Reproduce the repaired checks

Clone https://github.com/KaustubhLall/drug-transporter-ml and check out the full repair commit above. From its root, create an isolated Python 3.12 environment, then run:

    python -m pip install -r requirements-lock.txt
    python -B -m unittest discover -s tests -v

The tests use temporary outputs. The ordinary interactive program still requires Graphviz on PATH and a graphical environment for its final visualizations; those were not verified here.

The two Python test files and dependency lock in this package are byte-identical to the repair commit. baseline-failures.txt retains the three pre-repair failures with machine paths reduced to filenames. The clean source snapshot reused the same isolated dependency installation. SHA256SUMS.json identifies every file in this package except itself.

The 2020 publication is a separate source: https://doi.org/10.1074/jbc.RA119.010729. This maintenance audit neither replicates nor invalidates its experimental results. Tests and code are covered by the repository's MIT license.

## Additional local visualization check

The separately dated visualization-checks.json covers local commit 6f1dfac9830c197760b4fc06755d66f7e37f82c2, which has not been pushed and is not included in the public draft PR. It fixes the optional prune_unused mode for current NEAT connection genes and removes disconnected nodes and edges. Both ordinary GA callers leave that optional mode off. Five additional synthetic tests pass; all 15 software tests were independently rerun.

A separate native check used the official portable Graphviz 16.1.0 binary and Matplotlib Agg to render hand-constructed graphs and artificial statistics. SVG node/edge sets were checked and the six rendered files inspected in a browser. Required output paths and disabled-edge policy are preserved. This is file-rendering acceptance with view=False, not interactive desktop plotting, trained-network evaluation or a reproduction of the paper. The original downloadable tests and verification.json above remain pinned to a88149c.
