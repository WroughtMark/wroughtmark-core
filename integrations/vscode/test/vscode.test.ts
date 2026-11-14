import { describe, expect, test } from "bun:test";
import {
  createVsCodeSession,
  formatStatusBarText,
  mintVsCodeSeal,
  recordEditorDelta,
} from "../src/extension";
import { verifySeal } from "../../../web-sdk/src/verify";

describe("VS Code Provenance Extension", () => {
  test("records LaTeX/Markdown edits and mints a verified seal", async () => {
    let session = createVsCodeSession(1000);
    session = await recordEditorDelta(session, "\\section{Intro}", 15, 181_000, "2026-11-13T01:03:00Z");
    session = await recordEditorDelta(
      session,
      "\\section{Intro}\nCompleted proof.",
      18,
      400_000,
      "2026-11-13T01:06:40Z"
    );

    expect(formatStatusBarText(session)).toBe("Wroughtmark: 100/100 (CLEAN)");
    const finalText = "\\section{Intro}\nCompleted proof.";
    const seal = await mintVsCodeSeal("latex-paper", session, finalText);
    const res = await verifySeal(new TextEncoder().encode(finalText), seal);
    expect(res.valid).toBe(true);
    expect(res.sealId).toBe(seal.seal_id);
  });

  test("flags large single-edit paste in VS Code", async () => {
    let session = createVsCodeSession(1000);
    session = await recordEditorDelta(session, "# Notes", 7, 181_000, "2026-11-13T01:03:00Z");
    const pasted = "x".repeat(60_000);
    session = await recordEditorDelta(session, pasted, 60_000, 191_000, "2026-11-13T01:03:10Z");

    expect(formatStatusBarText(session)).toContain("BULK_PASTE_SPIKE");
    const seal = await mintVsCodeSeal("cs-assignment", session, pasted);
    expect(seal.summary.anomaly_flags).toContain("BULK_PASTE_SPIKE");
  });

  test("flags inline AI ghost-text autocomplete bursts in VS Code", async () => {
    let session = createVsCodeSession(1000);
    session = await recordEditorDelta(
      session,
      "function solve() {\n  // human scaffold\n}",
      420,
      220_000,
      "2026-11-14T02:00:00Z",
      { synthetic_insert_bytes: 180, sampled_keystrokes: 240, revision_events: 45 }
    );
    session = await recordEditorDelta(
      session,
      "function solve() {\n  // copilot completion block\n}",
      520,
      460_000,
      "2026-11-14T02:04:00Z",
      { synthetic_insert_bytes: 210, sampled_keystrokes: 300, revision_events: 50 }
    );

    expect(formatStatusBarText(session)).toContain("INLINE_AI_AUTOCOMPLETE");
    const seal = await mintVsCodeSeal("copilot-heavy-module", session, "final module");
    expect(seal.summary.anomaly_flags).toContain("INLINE_AI_AUTOCOMPLETE");
  });
});
