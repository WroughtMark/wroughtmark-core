import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { verifySeal, type WroughtmarkSeal } from "../src/verify";

const RUST_BIN = fileURLToPath(
  new URL(
    `../../core/target/debug/wroughtmark${process.platform === "win32" ? ".exe" : ""}`,
    import.meta.url
  )
);

describe("Cross-language Rust -> TypeScript/WebCrypto verification", () => {
  test("verifies a Rust-minted WroughtmarkSeal byte-for-byte", async () => {
    const dir = mkdtempSync(join(tmpdir(), "wm-web-test-"));
    try {
      const draftPath = join(dir, "draft.txt");
      const finalPath = join(dir, "master.wav");
      const keyPath = join(dir, "key.json");
      const chainPath = join(dir, "chain.json");
      const sealPath = join(dir, "seal.json");

      writeFileSync(draftPath, "stem_session_1");
      const finalBytes = new TextEncoder().encode("human_mastered_audio_bytes");
      writeFileSync(finalPath, finalBytes);

      const run = (args: string[]) => {
        const res = Bun.spawnSync([RUST_BIN, ...args]);
        if (res.exitCode !== 0) {
          throw new Error(new TextDecoder().decode(res.stderr));
        }
      };

      run(["keygen", keyPath]);
      run(["record", chainPath, keyPath, "daw", draftPath, "1800"]);
      run(["seal", chainPath, keyPath, "music", finalPath, sealPath]);

      const seal = JSON.parse(readFileSync(sealPath, "utf8")) as WroughtmarkSeal;

      const pass = await verifySeal(finalBytes, seal);
      expect(pass.valid).toBe(true);
      expect(pass.sealId).toBe(seal.seal_id);

      const tamperedFile = await verifySeal(new TextEncoder().encode("ai_slop_bytes"), seal);
      expect(tamperedFile.valid).toBe(false);

      const tamperedSeal: WroughtmarkSeal = {
        ...seal,
        summary: { ...seal.summary, total_active_seconds: 999999 },
      };
      const failSig = await verifySeal(finalBytes, tamperedSeal);
      expect(failSig.valid).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
