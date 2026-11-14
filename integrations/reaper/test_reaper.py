import subprocess
import tempfile
import unittest
from pathlib import Path

from wroughtmark_reaper import mint_reaper_seal, record_reaper_save


class ReaperScriptTest(unittest.TestCase):
    def test_records_rpp_sessions_and_mints_verified_music_seal(self):
        root = Path(__file__).resolve().parents[2]
        cli_bin = str(root / "core" / "target" / "debug" / "wroughtmark")

        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            key_path = tmp_dir / "key.json"
            chain_path = tmp_dir / "chain.json"
            rpp_path = tmp_dir / "track.rpp"
            wav_path = tmp_dir / "master.wav"
            seal_path = tmp_dir / "master.seal.json"

            subprocess.run([cli_bin, "keygen", str(key_path)], check=True, capture_output=True)

            rpp_path.write_text("<REAPER_PROJECT 0.1\n  <TRACK\n    NAME \"Drums\"\n  >\n>", encoding="utf-8")
            out1 = record_reaper_save(cli_bin, chain_path, key_path, rpp_path, active_seconds=240)
            self.assertIn("seq=0", out1)

            rpp_path.write_text("<REAPER_PROJECT 0.1\n  <TRACK\n    NAME \"Drums\"\n  >\n  <TRACK\n    NAME \"Bass\"\n  >\n>", encoding="utf-8")
            out2 = record_reaper_save(cli_bin, chain_path, key_path, rpp_path, active_seconds=300)
            self.assertIn("seq=1", out2)

            wav_path.write_bytes(b"RIFF_MASTER_WAV_EXPORT")
            seal = mint_reaper_seal(cli_bin, chain_path, key_path, wav_path, seal_path)
            self.assertEqual(seal["summary"]["discipline"], "music")
            self.assertEqual(seal["summary"]["process_score"], 100)

            verify_res = subprocess.run(
                [cli_bin, "verify", str(wav_path), str(seal_path), str(chain_path)],
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn("VERIFIED", verify_res.stdout)


if __name__ == "__main__":
    unittest.main()
