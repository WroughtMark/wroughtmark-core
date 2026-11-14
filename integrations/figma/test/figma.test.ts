import { describe, expect, test } from "bun:test";
import {
  createFigmaSession,
  figmaScoreSummary,
  mintFigmaSeal,
  recordFigmaDelta,
} from "../src/code";
import { verifySeal } from "../../../web-sdk/src/verify";

describe("Figma Provenance Plugin", () => {
  test("records canvas node growth and mints a verified visual seal", async () => {
    let session = createFigmaSession(1000);
    session = await recordFigmaDelta(
      session,
      14,
      JSON.stringify({ pages: 1, frames: 2, nodes: 14 }),
      200_000,
      "2026-11-13T02:00:00Z"
    );
    session = await recordFigmaDelta(
      session,
      48,
      JSON.stringify({ pages: 2, frames: 6, nodes: 48 }),
      420_000,
      "2026-11-13T02:04:00Z"
    );

    expect(figmaScoreSummary(session).process_score).toBe(100);
    const pngExport = new TextEncoder().encode("PNG_EXPORT_BYTES");
    const seal = await mintFigmaSeal("brand-system-figma", session, pngExport);
    expect(seal.summary.discipline).toBe("visual");

    const verified = await verifySeal(pngExport, seal);
    expect(verified.valid).toBe(true);
    expect(verified.sealId).toBe(seal.seal_id);
  });
});
