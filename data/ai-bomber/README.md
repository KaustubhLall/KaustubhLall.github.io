# AI Bomber champion audit and replay

Recorded September 18, 2026. This bundle joins a six-scenario tactical diagnostic
with one illustrative native replay. It is not a new strength evaluation.

## Tactical comparison

`gate-audit.json` preserves checkpoint hashes, per-scenario outcomes and native
binary identity from the serial champion audit. The iteration-65 champion passes
4/6 search-mode gates; iteration 110 passes 3/6. Stall-breaking is the difference.
Both pass bomb escape, corridor clearing and trapping, and fail chase and flame timing.

Both checkpoints use the same binary, six seeds (5000001 through 5000006) and
96-simulation search. These seeds differ from the historical training canary.
Training-only semantic differences are recorded. This is an observational
checkpoint comparison, not a causal ablation or a full-game win rate. No training
or reserved holdout was run, and the July decision to stop training still stands.

The audit wrapper is committed at `70fa8b8`; the native executable embeds
`d75f8b98b6c3`. The original report and wrapper hashes are preserved in the JSON.
Local filesystem paths were removed from this public extract.

## Replay

`champion65-vs-heuristic.bin.gz` contains the actual 121-frame native v4 replay,
recorded with the iteration-65 champion on the first predetermined diagnostic
seed, 900001, against a trained-on heuristic opponent. It ends in an arena-crush
win at step 121, with no bomb-kill. This is not evidence of combat mastery.

Download `unpack.py`, `manifest.json` and the gzip into one directory, then run:

```text
python unpack.py champion65-demo.bin
bomber_viz.exe --replay champion65-demo.bin
```

The unpacker verifies compressed and decompressed identities and requires a new
output file. Playback requires the project's native viewer, but no model or GPU
inference. The native viewer loaded the replay and the retained screenshot shows
frame index 40, simulation step 41. Separate deterministic resimulation was not
performed. The replay manifest records the exact scope and artifact identities.

`SHA256SUMS.txt` covers this public bundle. The viewer screenshot is served from
`/images/ai-bomber/champion65-frame40.png`; its hash is in `manifest.json`.
