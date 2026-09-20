# Pulse Court runtime evidence

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
