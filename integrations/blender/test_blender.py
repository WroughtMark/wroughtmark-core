import subprocess
import tempfile
import unittest
from pathlib import Path

from wroughtmark_blender import mint_scene_seal, record_scene_save


class BlenderAddonTest(unittest.TestCase):
    def test_records_blend_saves_and_mints_verified_visual_seal(self):
        root = Path(__file__).resolve().parents[2]
        cli_bin = str(root / "core" / "target" / "debug" / "wroughtmark")

        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            key_path = tmp_dir / "key.json"
            chain_path = tmp_dir / "chain.json"
            blend_path = tmp_dir / "character.blend"
            render_path = tmp_dir / "final_render.png"
            seal_path = tmp_dir / "final_render.seal.json"

            subprocess.run([cli_bin, "keygen", str(key_path)], check=True, capture_output=True)

            blend_path.write_bytes(b"BLENDER-v306-SCENE-BLOCKMESH")
            out1 = record_scene_save(cli_bin, chain_path, key_path, blend_path, active_seconds=240)
            self.assertIn("seq=0", out1)

            blend_path.write_bytes(b"BLENDER-v306-SCENE-SCULPT-MATERIALS")
            out2 = record_scene_save(cli_bin, chain_path, key_path, blend_path, active_seconds=360)
            self.assertIn("seq=1", out2)

            render_path.write_bytes(b"PNG_RENDER_OUTPUT_BYTES")
            seal = mint_scene_seal(cli_bin, chain_path, key_path, render_path, seal_path)
            self.assertEqual(seal["summary"]["discipline"], "visual")
            self.assertEqual(seal["summary"]["process_score"], 100)

            verify_res = subprocess.run(
                [cli_bin, "verify", str(render_path), str(seal_path), str(chain_path)],
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn("VERIFIED", verify_res.stdout)


if __name__ == "__main__":
    unittest.main()
