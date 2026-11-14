import { describe, expect, test } from "bun:test";
import {
  createObsidianSession,
  mintObsidianSeal,
  obsidianScoreSummary,
  recordVaultNoteChange,
} from "../src/main";
import { verifySeal } from "../../../web-sdk/src/verify";

describe("Obsidian Vault Provenance Plugin", () => {
  test("tracks markdown vault edits and mints a verified writing seal", async () => {
    let session = createObsidianSession(1000);
    session = await recordVaultNoteChange(
      session,
      "# Literature Review\n- Source A",
      180_000,
      "2026-11-13T05:00:00Z"
    );
    session = await recordVaultNoteChange(
      session,
      "# Literature Review\n- Source A\n- Synthesis paragraph.",
      400_000,
      "2026-11-13T05:06:00Z"
    );

    expect(obsidianScoreSummary(session).process_score).toBe(100);
    const finalMd = "# Literature Review\n- Source A\n- Synthesis paragraph.";
    const seal = await mintObsidianSeal("obsidian-thesis-vault", session, finalMd);
    const res = await verifySeal(new TextEncoder().encode(finalMd), seal);
    expect(res.valid).toBe(true);
    expect(res.sealId).toBe(seal.seal_id);
  });
});
