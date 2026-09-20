# MMG public-site checkpoint

## Historical studies and subsequent audit

Added September 19, 2026: `daily-feasibility.json` and `horizon-audit.json`
are compact extracts of the July source reports, with report hashes, measurement
cohorts and limitations. They are not new experiments. The top-100 continuity
audit and the separate 789-item feature dataset cannot be compared as one
before/after row count.

`audit-summary.json` records the later source audit and controlled saved-data
reproduction. Future data availability affects rank features, and a global
timestamp masks some items' actual age. Historical scores need revalidation
after these issues are repaired. The effect on reported metrics is unmeasured.
The clock-controlled reproduction does not describe today's live UI. No project
code was repaired or experiment rerun for the original September 19 export.

## Per-item serving repair: September 20, 2026

`future-data-fixture.json` records an isolated synthetic reproduction of the
older feature builder at source `a9b99f4`. Removing only Item B's future bar
removes B's current row and changes Item A's present momentum percentile from
1 to 0, although both items' present histories stay fixed. The interactive
case-study figure switches between these measured outputs. These are feature
percentiles, not predictions, and this fixture does not measure the effect on
historical model scores or prove a later repair.

`serving-validity.json` separates two later checkpoints: read-only observations
of the public application and a local repair verified with synthetic fixtures.
The public snapshot was still dated July 11. Celastrus bark displayed stale risk
and margin-direction labels beside current prices; no expired forecast cone was
observed against its current price chart. Account liveness passed, but readiness
timed out after eight seconds. Tutorial dismissal worked in this later check.

The local repair gives daily and intraday records their own source, issue,
target and expiry times; republishing cannot renew source data. Expired,
incomplete or gated records withhold current ranks and model outputs. Invalid
records cannot change the relative-risk comparison group for current items.
Source availability uses an explicit interval-end assumption because the
archive has no observed ingestion timestamps.

Verification includes 27 independently run backend validity tests, the owning
task's broader suite (163 passed, 78 skipped), ten JavaScript contract groups,
and browser checks against the real consumer pages with synthetic data and
mocked service/auth responses. Browser checks cover automatic expiry, withheld
stale cones, keyboard focus, modal escape and an unsaved Notes draft. A narrow
375 by 812 viewport was also checked. The record includes source hashes and
the local Git checkpoint. Skipped tests and acceptance limits remain explicit.

This source repair has not been deployed to the public MMG application. It
does not establish model accuracy, authenticated service operation, account
sync, or point-in-time-safe feature construction. The labelled-row loader and
future-dependent features remain the next research-pipeline work. No new
training, holdout evaluation or historical metric recomputation was performed.

The original endpoint observations below retain their September 18 date and scope.

## Public-site observations

Observed September 18, 2026 UTC, approximately 02:22–02:33. Source checkpoint
`c55eace`; committed evidence `3375b59`. No deployment or production repair.

All five static pages opened directly. The money-making analyzer displayed 641
methods and live-price timestamps; the scanner displayed 4,508 items. The guest
planner and helper-dependent dashboard loaded their initial states. This does
not establish successful editing or completed workflows.

Trends showed the helper-unavailable state and separately rendered 12 published
research cards. The public snapshot manifest was dated July 11, 2026 at
00:44:11 UTC, source `bc3c804`. Those are old estimates, not current forecasts.

The accounts service answered its liveness endpoint, but database-backed
readiness first returned 503 and later timed out. The final timestamped probes
are preserved in `runtime-checks.json` with the infrastructure hostname omitted.
Anonymous state access was rejected and the frontend-origin registration
preflight passed. No registration was submitted. Successful login, refresh and
sync were not verified, and the cause of database unavailability was not diagnosed.

Tour dismissal, sign-in and planner setup did not visibly transition during the
browser session. Source inspection did not establish a causal product defect.
These actions need a separate browser acceptance check; page loading is not a
substitute for that check.

The actual Trends screenshot shows the public navigation and helper boundary.
Its exact hash is recorded in `runtime-checks.json`. No mock state or image edits
were used. The local source checkpoint separately passed 136 backend tests with
78 skips and a static-page smoke check. No credentials, account mutations,
payment actions or repository-visibility changes were part of this checkpoint.
