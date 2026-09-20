# AI Frogger bounded evaluation

Original evidence generated 2026-09-18T02:22:29.3824079Z; exported September 18, 2026. Source commit: 8c368f91e556e75a90356dbf3f9ffa47990c6f4a. This export performed no new training or evaluation.

Five named policies share 200 held-out environment seeds 20360918 through 20361117 and a 500-step horizon. Scripted and heuristic each win 159/200 and are behaviorally equivalent, not independent algorithms. The trained neuro policy wins 0/200: all 200 episodes time out. Its 100,000 actions are 49,400 left and 50,600 right, with no up, down or wait actions. This is a negative result, not improved learned-agent performance.

## Files

comparison.json is the page's data source. episodes.csv contains 1,000 episode rows with agent, seed, horizon, rounded reward, length and source/checkpoint provenance. Per-row seeds are derived from the declared CLI seed sequence, rather than independently logged by the native runner. summaries/ contains the five raw aggregate reports. experiment-plan.json records the declared training/evaluation plan. config.json is byte-for-byte the evaluated config; its seed 1337 is overridden by the evaluation seed schedule. provenance.json records export checks. SHA256SUMS.txt covers every exported file.

trained-weights.bin is the evaluated native checkpoint. heuristic-replay.bin is illustrative heuristic play on seed 20360918, not trained neuro play. Both are native project formats; the replay needs the project's viewer with --seed 20360918 because the viewer does not restore the recorded seed automatically. It is not a browser-playable demo or video.

One small GA run used population 12, 10 generations and eight episodes per candidate. Training maps depend on population index, so candidates did not face identical maps. Automatic post-training evaluation overlaps training seeds and is excluded. No tuning on this held-out set or statistical-significance claim is represented.

Export verification recomputed all episode counts, exact total steps, means from rounded CSV rewards and the shared seed/horizon contract. Checkpoint, config and replay SHA256 hashes match the handoff. CSV does not contain per-episode outcomes, so goal/death/timeout totals are taken from raw aggregate JSON and checked against the comparison; they cannot be independently reconstructed from this CSV alone. Use terminal_reasons.timeout, since the separate CLI text counter double-counts runner timeouts. Scripted and heuristic reward/length records match row for row.
