"""Wroughtmark Blender 3D Add-on — local-first provenance recorder for .blend scenes."""

bl_info = {
    "name": "Wroughtmark Provenance",
    "author": "Wroughtmark",
    "version": (0, 1, 0),
    "blender": (3, 6, 0),
    "location": "File > Export > Wroughtmark Seal",
    "description": "Records scene save heartbeats and mints Wroughtmark provenance seals via wroughtmark CLI.",
    "category": "Import-Export",
}

import json
import subprocess
from pathlib import Path


def record_scene_save(
    cli_bin: str,
    chain_path: Path,
    key_path: Path,
    blend_path: Path,
    active_seconds: int = 300,
) -> str:
    """Invoke the local wroughtmark CLI to append a canvas/3D heartbeat for a .blend file."""
    cmd = [
        cli_bin,
        "record",
        str(chain_path),
        str(key_path),
        "canvas",
        str(blend_path),
        str(active_seconds),
    ]
    res = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return res.stdout.strip()


def mint_scene_seal(
    cli_bin: str,
    chain_path: Path,
    key_path: Path,
    final_render_path: Path,
    out_seal_path: Path,
) -> dict:
    """Mint a visual WroughtmarkSeal for an exported Blender render/asset."""
    cmd = [
        cli_bin,
        "seal",
        str(chain_path),
        str(key_path),
        "visual",
        str(final_render_path),
        str(out_seal_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    return json.loads(out_seal_path.read_text(encoding="utf-8"))


try:
    import bpy  # type: ignore

    def _on_save_post(_dummy):
        blend_file = Path(bpy.data.filepath)
        if not blend_file.exists():
            return
        meta_dir = blend_file.parent / ".wroughtmark"
        meta_dir.mkdir(exist_ok=True)
        key_path = meta_dir / "key.json"
        chain_path = meta_dir / "chain.json"
        if not key_path.exists():
            subprocess.run(["wroughtmark", "keygen", str(key_path)], check=False)
        try:
            record_scene_save("wroughtmark", chain_path, key_path, blend_file)
        except Exception:
            pass

    def register():
        if _on_save_post not in bpy.app.handlers.save_post:
            bpy.app.handlers.save_post.append(_on_save_post)

    def unregister():
        if _on_save_post in bpy.app.handlers.save_post:
            bpy.app.handlers.save_post.remove(_on_save_post)
except ImportError:
    # Outside Blender runtime (unit tests / headless tooling)
    def register():
        pass

    def unregister():
        pass
