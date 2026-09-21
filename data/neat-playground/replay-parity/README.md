# NEAT replay consistency: four diagnostic episodes

These checks compare the published JavaScript engine with four C recorder traces
on seed 12345. Each genome occurs in the public evolution histories, but this seed
is not one of their recorded courses. This tests software agreement for these
cases, not agent strength or every replay in the viewer. No training or new
holdout evaluation was performed.

Extract replay-parity.zip and, from its directory with Node.js installed, run:

```sh
node check.mjs flappy/record.json flappy/champion.txt flappy/config.cfg engine.cjs
node check.mjs snake/record.json snake/champion.txt snake/config.cfg engine.cjs
node check.mjs 2048/record.json 2048/champion.txt 2048/config.cfg engine.cjs
node check.mjs pacman/record.json pacman/champion.txt pacman/config.cfg engine.cjs
```

Each command must exit 0 and print status PASS. Frame counts are 1000, 1000, 30, 9.
The checker compares every recorded pre-step observation, action, score, neuron
activation and rendered game-state field, then the final post-step score. It
rejects malformed/nonfinite data, wrong dimensions, noncontiguous ticks and
unsupported network modes. Floating tolerances account for the C recorder's
decimal serialization; discrete fields are exact. Maximum differences appear
in report.json. Observation label contents are intentionally unchecked.

The current C recorder was rebuilt from a hashed working-source snapshot with
GCC 13.3.0. Replaying the same existing champions/configs/seed reproduces every
historical frame and numeric value. Snake/2048/Pac-Man now have meaningful
observation labels where historical traces had empty strings. The historical
executable remains unidentified. Private C sources are not included, so these
commands reproduce comparison against the traces, not the native build itself.

No final state or terminal flag is recorded. A 1000-frame trace may be capped;
do not infer episode completion from trace length. The evidence does not certify
all history networks/seeds or cross-platform determinism. Checkpoint identities,
full source-file hashes, history-genome matches and limitations are in report.json.
SHA256SUMS.txt covers all bundle files except itself and the ZIP archive.
