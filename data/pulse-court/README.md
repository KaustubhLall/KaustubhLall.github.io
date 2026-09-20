# Pulse Court runtime evidence

## Ruleset comparison, September 20, 2026

`ruleset-comparison.json` records a synthetic contract audit of native v2 inputs
at `3a3fe53030fb71e60f26c0e969462e825985bffd` and reference v4 inputs at
`9a5dfef3cecf82ca985425852036c3fdc4bbefe5`. Audit tooling is
`0e28c2217590c05776e059fd6af9ef0ff0c7481a`; the final evidence checkpoint is
`057528df4a749154abceb1eaa617567430262814`. The compact public record includes
source, tooling, binary and raw-probe hashes plus selected actual records.

Across 32 fixtures and 40 snapshots, all 648 decoded action mappings and 80
mask comparisons matched. There were 78 differing observation-slot entries and
16 differing state/touch records. These counts describe diagnostics, not a
success rate or model strength. The comparison table shows identical velocity
encoded differently, different ordinary-strike motion, and matching body-contact
motion with different ownership. Velocity values use raw fixed-point units.
Transitions cover one tick; normalization is measured before stepping.

The owner built four Release/Debug probe binaries and checked repeated output
and configuration agreement. Separately, the coordinator verified 17 source
hashes, three tooling hashes and four binary hashes, reran all four binaries
with exact matching output, and performed 12 read-only replay checks. It did
not independently recompile the binaries. Own-ruleset replays verify and
cross-ruleset replays reject. The historical v2 replay remains byte-identical.

The probe directly links the existing core and observation encoder. It does
not execute the policy adapter or C ABI wrapper. v2 touch-kind values come
from a compatibility shim. Raw state hashes include ruleset identity and are
not used as semantic equality criteria. This is measured non-parity on synthetic
fixtures, not a core migration, full parity proof, policy evaluation, training,
fresh holdout, certification or graphical acceptance. Historical September 18
preview evidence and September 20 replay-admission evidence retain their scopes.

## Historical preview, September 18, 2026

Synthetic, untrained development-policy preview. Not certified and not a learned-strength evaluation. Observed 2026-09-18T02:27:14.426091+00:00; exported September 18, 2026. Executable source commit 661f35dba583d51bb33a32e398b3471b29b48e12.

Six preview games exercised both seats and recorded 9,483 native network decisions. All six recorded replay-verification commands succeeded. Six explicitly scripted control games recorded zero network decisions. A missing-input strict load returned exit 1 without creating session evidence. Release and Debug each passed four suites. These are execution and regression-test results, not performance, graphical acceptance or certification.

results.json preserves sanitized commands, exit codes, per-game counts and hashes. release-tests.txt and debug-tests.txt are sanitized source logs. provenance.json distinguishes checks performed while exporting from the owning project's native run evidence. SHA256SUMS.txt covers every exported file. No new native runs occurred during export.

## Native replay

synthetic-preview.pulse is game index 4, selected because it is the smallest artifact. It contains 5,720 ticks and 478 network decisions. The synthetic policy lost. It is not trained-policy play, a browser demo, a video or a screenshot. Use the project's native replay viewer or headless verifier after building the matching source:

```powershell
& 'build/release/Release/pulse_headless.exe' --replay 'synthetic-preview.pulse'
.\scripts\run_viewer.ps1 -Replay 'synthetic-preview.pulse'
```

Run from the project root with the downloaded replay there, or supply its actual path. No policy bundle is needed for replay verification. Only this replay is packaged; hashes and outcomes for all six remain in results.json.

The runtime uses ruleset 2. Strict trained-policy play still needs ruleset-v4 integration and deployment parity, latency, certification and human testing. The self-play replay browser and full D2D gameplay migration remain unfinished. The preview policy bundle hash identifies the source fixture but the bundle itself is not included.

## Local replay admission repair, September 20, 2026

replay-admission.json records a separate repair at source commit 596d1f5e8d139bfb39c981e2296f0e8430a7e889, with final evidence documentation at 3a3fe53030fb71e60f26c0e969462e825985bffd. The owning source and documentation are locally committed and unpushed. Their source-file hashes were checked against the working files and Git blobs before this export.

The loader requires exactly `34 + 18 * tick_count` bytes before allocating tick storage, rejects malformed files including trailing bytes, and preserves the caller's destination on failure. The old, preexisting binary accepted an appended byte; it was identified by hash but was not independently rebuilt from the baseline commit. No huge-count probe ran against that old binary.

The owning project passed 4/4 Release and 4/4 Debug suites plus 14 native checks across both builds. Separately, the portfolio coordinator reran 4/4 Release suites and seven native cases: the unchanged historical replay, a zero-tick replay, trailing bytes, truncated header/frame/hash, and a forged maximum count. Caller-state preservation is covered by core regression tests rather than observable through the CLI. These scopes are recorded separately, not added together.

This is structural admission evidence. It adds no semantic input validator, file-size quota, allocation-exception policy or concurrent-file snapshot guarantee. It establishes no physics validation, ruleset-v4 certification, graphical acceptance or learned strength. No training, fresh holdout or new gameplay evaluation occurred. The September 18 replay, results, provenance and test logs remain unchanged; the new JSON contains a compact whitelist of identities and checks rather than raw build logs. SHA256SUMS.txt covers all packaged files except itself.
