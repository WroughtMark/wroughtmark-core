"""Wroughtmark Reaper ReaScript — local-first provenance recorder for .rpp DAW sessions."""

import json
import subprocess
from pathlib import Path


def record_reaper_save(
    cli_bin: str,
    chain_path: Path,
    key_path: Path,
    rpp_path: Path,
    active_seconds: int = 300,
) -> str:
    """Append a signed DAW heartbeat to the local Wroughtmark chain via the Rust CLI."""
    cmd = [
        cli_bin,
        "record",
        str(chain_path),
        str(key_path),
        "daw",
        str(rpp_path),
        str(active_seconds),
    ]
    res = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return res.stdout.strip()


def mint_reaper_seal(
    cli_bin: str,
    chain_path: Path,
    key_path: Path,
    master_wav_path: Path,
    out_seal_path: Path,
) -> dict:
    """Mint a music WroughtmarkSeal for an exported Reaper mixdown/master."""
    cmd = [
        cli_bin,
        "seal",
        str(chain_path),
        str(key_path),
        "music",
        str(master_wav_path),
        str(out_seal_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    return json.loads(out_seal_path.read_text(encoding="utf-8"))
