import { describe, expect, test } from "bun:test";
import { appendHeartbeat, mintBrowserSeal, type BrowserHeartbeat } from "../src/chain";
import { verifySeal } from "../../web-sdk/src/verify";

describe("Browser Extension Provenance Chain", () => {
  test("mints a clean seal that verifies against web-sdk verifySeal()", async () => {
    let beats: BrowserHeartbeat[] = [];
    beats = await appendHeartbeat(
      beats,
      new TextEncoder().encode("outline v1"),
      180,
      400,
      0,
      "2026-11-13T01:00:00Z"
    );
    beats = await appendHeartbeat(
      beats,
      new TextEncoder().encode("final essay draft"),
      240,
      620,
      0,
      "2026-11-13T01:15:00Z"
    );

    const finalBytes = new TextEncoder().encode("final essay draft");
    const seal = await mintBrowserSeal("google-docs-essay", beats, finalBytes);
    expect(seal.summary.process_score).toBe(100);
    expect(seal.summary.anomaly_flags).toEqual([]);

    const result = await verifySeal(finalBytes, seal);
    expect(result.valid).toBe(true);
    expect(result.sealId).toBe(seal.seal_id);
  });

  test("flags bulk paste spikes in browser drafting sessions", async () => {
    let beats: BrowserHeartbeat[] = [];
    beats = await appendHeartbeat(beats, new TextEncoder().encode("start"), 200, 120, 0);
    beats = await appendHeartbeat(
      beats,
      new TextEncoder().encode("pasted essay"),
      25,
      65_000,
      65_000
    );

    const finalBytes = new TextEncoder().encode("pasted essay");
    const seal = await mintBrowserSeal("canvas-essay", beats, finalBytes);
    expect(seal.summary.anomaly_flags).toContain("BULK_PASTE_SPIKE");
    expect(seal.summary.process_score).toBeLessThan(100);
    expect(seal.summary.authorship_tier).toBe("ANOMALY_FLAGGED");
  });

  test("flags chat-loop micro-pastes and split-screen linear retyping", async () => {
    let beats: BrowserHeartbeat[] = [];
    beats = await appendHeartbeat(
      beats,
      new TextEncoder().encode("part 1"),
      240,
      900,
      360,
      "2026-11-14T01:00:00Z",
      {
        sampled_keystrokes: 900,
        revision_events: 4,
        focus_switch_inserts: 2,
      }
    );
    beats = await appendHeartbeat(
      beats,
      new TextEncoder().encode("part 2"),
      240,
      900,
      340,
      "2026-11-14T01:05:00Z",
      {
        sampled_keystrokes: 900,
        revision_events: 5,
        focus_switch_inserts: 2,
      }
    );

    const finalBytes = new TextEncoder().encode("part 1\npart 2");
    const seal = await mintBrowserSeal("retyped-ai-essay", beats, finalBytes);
    expect(seal.summary.anomaly_flags).toContain("CLIPBOARD_RATIO_HIGH");
    expect(seal.summary.anomaly_flags).toContain("FOCUS_SWITCH_PASTE_LOOP");
    expect(seal.summary.anomaly_flags).toContain("LINEAR_TRANSCRIPTION_PATTERN");
    expect(seal.summary.authorship_tier).toBe("ANOMALY_FLAGGED");
  });
});
