# PacMan AI: pinned software-state diagnostics

These files support source-derived before/after figures for two public revisions:

- [Main, 9ec4040](https://github.com/KaustubhLall/PacManAI/tree/9ec4040d006195cfce175ee3452df714e58cca5c)
- [Audited branch, 7a1c89b](https://github.com/KaustubhLall/PacManAI/tree/7a1c89bbc1c6ad3f35f5f93934980debc21aaff4)

The observations were recorded September 21, 2026 on Windows x64 with Python 3.12.14 and NumPy 2.3.5. They concern reset, board encoding, terminal predicates and small prioritized-replay containers. No model, game loop, gameplay UI, training, checkpoint or replay pickle was executed or loaded. The constructed three-by-five maze is a software-state fixture, not a policy evaluation course or a captured gameplay screenshot.

## Files

- `verification.json`: named observations, the seven deliberately selected contract checks, exact source commits and 23 Git-blob/SHA256 identities, runtime and limitations.
- `probe.py`: exact bytes of the reviewed pure-module probe, SHA256 `650d4e5b96fe89180b5514839d3ccad909ecfa3d7dc3900361d8c712e95ab83e`. It has no embedded private paths. It reads source and maze files from the current directory and prints JSON to stdout.
- `SHA256SUMS.txt`: SHA256 for this README, the JSON and the probe. These identify the published bytes and are not signed attestations.

## Inspect before reproducing

Use a separate disposable export of an already trusted clone pinned to one of the full commits above. Do not switch or modify an active checkout. Compare the source files against the `sourceFiles` identities in the JSON. In a local clone, `git show <full-commit>:<path>` retrieves a pinned blob and `git rev-parse <full-commit>:<path>` identifies it. Export byte-for-byte rather than relying on shell text redirection that might change encoding. There is no automatic download, installation or execution step in this bundle.

Preserve this relative layout in the disposable directory:

```text
game/__init__.py
game/entities.py
game/game_state.py
ai/__init__.py
ai/environments/__init__.py
ai/environments/sumtree.py
ai/deepQL.py
mazes/1.txt
mazes/2.txt
mazes/3.txt
```

For the audited branch, also export `tests/test_game_state.py` if reproducing the direct invocation of its four pure tests. `tests/test_sumtree.py` and `tests/test_deepql_cli.py` were inspected and hashed, but are not executed by this probe. All exported source should be inspected before execution. The package initializers used here are empty or contain comments, and the imported modules only use NumPy and passive entity classes.

The runtime must already provide Python and NumPy. No TensorFlow, Keras, pygame or model files are needed. This recording had neither pytest nor tqdm available. The original main `ai/deepQL.py` contains module-level training code: **do not import it**. The probe only parses that file's AST. The branch moves training behind a main guard, but actual CLI import/help was not verified.

## Run the bounded probe

In the disposable export, manually create `tiny.txt` containing exactly the following UTF-8 bytes, with LF line endings and a trailing newline:

```text
#####
#P.G#
#####
```

After reviewing `probe.py`, invoke it from that export directory. Replace `/path/to/probe.py` with the downloaded file's path:

```sh
python -B -c "import sys,runpy;sys.path.insert(0,'.');runpy.run_path(sys.argv[1],run_name='__main__')" /path/to/probe.py
```

Run separately against each pinned export. `-B` avoids bytecode writes. The original verification bounded each process to 20 seconds. The probe prints observations and per-contract booleans even when an expected regression is present. Exit 0 means the diagnostic report completed, not that every contract passed. It does not fetch code or invoke the training CLI.

The branch's four GameState test functions are executed directly when that exact test file is present. They overlap four selected checks and are not four additional independent checks. The three SumTree contracts are mirrored against the actual module because pytest is absent. The CLI import test is not run. This is not an eight-test pytest result or an aggregate quality score.

## Separate unresolved capacity-one case

The following direct module operation was isolated in a subprocess with a five-second timeout, once per revision:

```python
from ai.environments.sumtree import SumTree
tree = SumTree(1)
tree.add(1.0, 'only')
```

Both exited with `RecursionError: maximum recursion depth exceeded`, before the timeout. `_propagate` recurses through parent index -1 when the updated index is zero. This unresolved edge case is reported separately and is not exercised by `probe.py`. If reproducing it, retain a subprocess timeout. Positive observations cover capacities 2 and 3, not arbitrary capacities or valid sampling across all priorities.

The public bundle omits machine paths and raw tracebacks. Neither these tests nor their figures establish learned Pac-Man skill, historical score reproducibility, generalization, graphics acceptance or production readiness.
