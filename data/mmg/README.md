# MMG public-site checkpoint

## Local evaluator contract repair: September 20, 2026

`evaluator-contract.json` records source `b8d32393a5f37d20e7c4f98920e453e57c421d4b`,
following `dd7b361`. Evaluation now requires an explicit validated PIT training
artifact and a new output path. Exclusive output creation precedes fitting;
results bind input, configuration, source and runtime identities. Failed runs
leave an incomplete reservation instead of replacing a historical result.

The owner reports 203 software tests passed and 78 skipped. An independent run
passed all nine focused evaluator cases in 2.05 seconds; these are overlapping
checks, not additive totals. Fitting is intercepted and inputs are synthetic.
No actual evaluation, new compatible model, historical metric recomputation or
displayed-rank validation occurred. The repair remains local and undeployed.
These checks do not guarantee power-loss durability or protect against concurrent
changes to input/source files. The other dated evidence below remains unchanged.

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
1 to 0, although both items' present histories stay fixed. These are feature
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
sync, or point-in-time-safe feature construction. The subsequent feature repair
below addresses the labelled-row loader and future-dependent features. No new
training, holdout evaluation or historical metric recomputation was performed.

## Subsequent point-in-time repair: September 20, 2026

`feature-timing-comparison.json` independently reruns the old builder and the
repaired shared transform on the same synthetic current histories. The figure
switches between the two future-bar cases and shows both source versions.
Removing B's future bar now keeps A at 1 and B at 0 while leaving B's training
target unknown. All 26 current rows, including feature values and missingness,
remain identical across four tested variants: both future bars, only A's future
bar, no future bars, and a later volume observation. The original builder fails
when neither future bar exists. These short histories have missing longer-window
features, so the comparison proves no model-ready or predictive result.

`point-in-time-repair.json` records local source commit
`dd7b36122354da8984be73c228bc5dc47d814d28` and 11 verified source-file hashes.
Current features, eligible rank cohorts and the market factor are constructed
before exact four-hour labels are attached. Rolling extras use full current
history before selecting training rows. Unknown labels remain unknown, and
extreme future returns are retained and flagged.

Serving reads a separate unlabelled inference artifact. New immutable artifacts
carry manifests and content hashes. Schema, feature order, horizon, configuration
and missingness mismatches fail closed before model loading or prediction.
The `reject_nonfinite` policy makes the whole requested batch unavailable if a
latest row is ineligible or nonfinite. It does not fall back to older rows.
Historical weights cannot serve under this contract; missing new compatible
artifacts intentionally leave research unavailable.

The owner reports 194 passed, 78 skipped and two warnings, including 31 synthetic
point-in-time cases. The coordinator independently reran those 31 cases in 4.42
seconds with one warning. A separate read-only review passed nine in-memory
checks, including future-tail invariance and complete feature/NaN-mask parity.
These overlapping runs are recorded separately. They are software-contract
evidence, not model-performance measurements.

Bar availability assumes interval end. Daily volumes and guides assume date end,
with backward per-item joins and a 24-hour age limit. Item metadata is known only
from its observed snapshot timestamp, without historical backfill. No real
dataset rebuild, retraining, metric recomputation, fresh holdout or public MMG
deployment occurred. Real-data and real-model readiness remain unverified.
Earlier browser checks cover the per-item validity repair only. Historical
studies, weights, scores and evidence bundles remain unchanged. The older
`future-data-fixture.json` remains baseline-only evidence and does not itself
prove the repair.

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

## Displayed ranking: September 20, 2026

`displayed-ranking.json` records the hand-constructed six-row fixture from local
source `5be207f479c4a2185c7f60db2b6d474d59f99a14`. It explains the displayed
score, probability / (1 + 20 × volatility), and the fixed probability >= 0.55,
daily volume >= 5,000 and current-time validity gates. Volume counts items traded
in completed daily observations. Invalid numeric predictions
are rejected before calibration or clipping. Equal scores use ascending item ID.

The eligible fixture order is 1, 3, 2: item 2 has higher probability but also a
larger volatility penalty. Items 4, 5 and 6 fail the probability, expiry and
volume gates respectively. The probability and volatility columns retain raw
fixture inputs, including inputs whose displayed outputs are withheld. Item 4
still has a served score of approximately 0.450 but no rank; scores alone do not
confer eligibility. Expiry and liquidity gates clear served scores for items 5
and 6. Top-2 selection happens before outcome labels are
attached; missing outcomes do not trigger backfill. A spread-only baseline uses
the same eligible universe, so it compares ordering conditional on those gates,
not the gates’ independent usefulness. Synthetic outcome scores are omitted
from this public extract because they are not evidence of predictive gains.

The owner reports 234 passed and 78 skipped tests. The coordinator independently
ran 45 focused synthetic ranking/validity checks and verified six source hashes.
These checks overlap and their totals must not be added. No real-data evaluation,
model fitting or deserialization, prospective collection, historical metric
recomputation or MMG deployment occurred. This is a local implementation and
evaluation-contract repair, not validation of a trading recommendation. All
earlier dated studies and evidence retain their original scope.
