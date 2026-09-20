"""Unpack the retained native v4 replay without loading a model or using a GPU."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="New .bin file for bomber_viz --replay")
    args = parser.parse_args()
    folder = Path(__file__).resolve().parent
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    packed = (folder / "champion65-vs-heuristic.bin.gz").read_bytes()
    if hashlib.sha256(packed).hexdigest() != manifest["gzip_sha256"]:
        raise SystemExit("Compressed replay hash mismatch")
    payload = gzip.decompress(packed)
    if len(payload) != manifest["replay_bytes"] or hashlib.sha256(payload).hexdigest() != manifest["replay_sha256"]:
        raise SystemExit("Replay identity mismatch")
    with args.output.open("xb") as output:
        output.write(payload)
    print(f"Verified native v4 replay: {args.output}")


if __name__ == "__main__":
    main()
