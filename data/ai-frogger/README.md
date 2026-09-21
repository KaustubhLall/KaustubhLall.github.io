# AI Frogger bounded evaluation

Original evidence generated 2026-09-18T02:22:29.3824079Z; exported September 18, 2026. Source commit: 8c368f91e556e75a90356dbf3f9ffa47990c6f4a. This export performed no new training or evaluation.

Five named policies share 200 held-out environment seeds 20360918 through 20361117 and a 500-step horizon. Scripted and heuristic each win 159/200 and are behaviorally equivalent, not independent algorithms. The trained neuro policy wins 0/200: all 200 episodes time out. Its 100,000 actions are 49,400 left and 50,600 right, with no up, down or wait actions. This is a negative result, not improved learned-agent performance.

## Files

comparison.json is the page's data source. episodes.csv contains 1,000 episode rows with agent, seed, horizon, rounded reward, length and source/checkpoint provenance. Per-row seeds are derived from the declared CLI seed sequence, rather than independently logged by the native runner. summaries/ contains the five raw aggregate reports. experiment-plan.json records the declared training/evaluation plan. config.json is byte-for-byte the evaluated config; its seed 1337 is overridden by the evaluation seed schedule. provenance.json records export checks. SHA256SUMS.txt covers every exported file.

trained-weights.bin is the evaluated native checkpoint. heuristic-replay.bin is illustrative heuristic play on seed 20360918, not trained neuro play. Both are native project formats; the replay needs the project's viewer with --seed 20360918 because the viewer does not restore the recorded seed automatically. The separate replay-frames.json export now supports browser display of this recording; the binary itself is not a browser format or video.

One small GA run used population 12, 10 generations and eight episodes per candidate. In that run, training maps depended on population index, so candidates did not face identical maps. That run’s automatic post-training evaluation overlapped training seeds and is excluded. No tuning on this held-out set or statistical-significance claim is represented.

Export verification recomputed all episode counts, exact total steps, means from rounded CSV rewards and the shared seed/horizon contract. Checkpoint, config and replay SHA256 hashes match the handoff. CSV does not contain per-episode outcomes, so goal/death/timeout totals are taken from raw aggregate JSON and checked against the comparison; they cannot be independently reconstructed from this CSV alone. Use terminal_reasons.timeout for this historical source, since its separate CLI text counter double-counts runner timeouts. Scripted and heuristic reward/length records match row for row.

## September 20 seed-comparison repair

seed-fairness.json is separate software-maintenance evidence at locally committed source a55f80db9aadd345dd5c3dd49118b19b776522d2, not a new policy evaluation. Its recorded fixture calls the linked seed helper: candidates share the current generation’s eight episode seeds, and the retained incumbent is re-evaluated on that batch from generation 1 onward (zero-based). The batch changes between generations. Old candidate sequences are reconstructed from the historical formula; the old incumbent used a stored earlier score.

The owner reports 12/12 tests passing in both Release and Debug and rejection of four deliberate comparison defects. Independent coordinator checks ran the owner-built Release and Debug genetic tests, reproduced the fixture, checked its arithmetic and four source hashes, and confirmed the September 18 archive was unchanged. This was not an independent recompilation. No training campaign, new held-out evaluation, reward ablation, stronger-policy claim, source push or deployment is represented. All historical result files remain unchanged.

## September 20 timeout accounting repair

`timeout-accounting.json` records the later local source repair
`9628747e6dd6793c53cdeae1ef3a690a3fe0d5dd`. One timed-out episode now prints one
timeout, and an external runner cutoff is classified without inventing another
step or reward. Release and Debug each pass 13 tests. Independent execution used
the owner-built metrics tests and four tiny CLI fixtures per configuration;
matched JSON/CSV outputs and all 80 frozen handoff files retain their hashes.
The original JSON terminal totals, 0/200 result, weights and replay are unchanged.
No trained policy was rerun, and the repair remains local and unpushed.

## September 21 recorded-state browser viewer

`replay-frames.json` contains17 snapshots reconstructed from the existing
heuristic recording: reset state, then state after each of16 recorded actions.
The native exporter restores both configuration and seed and invokes only
`env_step` for those actions. No policy is consulted. It stops on `StepResult.done`,
including the final goal where `frog.alive` remains true. Two repeated native
exports, independently repeated by the portfolio integrator, match every state
and the retained summary: seed20360918,16steps,goal,frog(9,0),reward6.42000008.

All24 compiled/transitive core source files match accepted8c368f91 after newline
normalization. JSON retains source, replay and exporter hashes. Frames include
tiles[y][x], frog coordinates and active car/log positions and lengths. X increases
rightward; Y increases downward. Fractional object positions are retained.

The browser renders these states and supplies playback/step/scrub controls. It
does not simulate physics or run a policy. Fractional object extents are clipped
at the board boundary without extra wrapping. The native viewer truncates object
X into display cells, so this browser drawing is not native visual equivalence.
Playback timing is presentation only. This is one illustrative heuristic success,
not new held-out evidence or an improvement to the failed learned policy.
