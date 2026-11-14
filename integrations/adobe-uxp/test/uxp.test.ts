import { describe, expect, test } from "bun:test";
import { createAdobeSession, mintAdobeSeal, recordAdobeUnitChange } from "../src/panel";
import { verifySeal } from "../../../web-sdk/src/verify";

describe("Adobe UXP Provenance Plugin (Photoshop & Premiere)", () => {
  test("tracks Photoshop layer growth and mints verified visual seal", async () => {
    let ps = createAdobeSession("visual", 1000);
    ps = await recordAdobeUnitChange(ps, 12, '{"layers":12}', 200_000, "2026-11-13T03:00:00Z");
    ps = await recordAdobeUnitChange(ps, 34, '{"layers":34}', 410_000, "2026-11-13T03:05:00Z");

    const psdRender = new TextEncoder().encode("FINAL_ILLUSTRATION_PNG");
    const seal = await mintAdobeSeal("photoshop-poster", ps, psdRender);
    expect(seal.summary.discipline).toBe("visual");
    expect(seal.summary.process_score).toBe(100);
    expect((await verifySeal(psdRender, seal)).valid).toBe(true);
  });

  test("tracks Premiere Pro timeline cuts and mints verified film seal", async () => {
    let pr = createAdobeSession("film", 1000);
    pr = await recordAdobeUnitChange(pr, 8, '{"clips":8}', 250_000, "2026-11-13T04:00:00Z");
    pr = await recordAdobeUnitChange(pr, 29, '{"clips":29}', 500_000, "2026-11-13T04:05:00Z");

    const mp4 = new TextEncoder().encode("FINAL_TIMELINE_MP4");
    const seal = await mintAdobeSeal("premiere-short-film", pr, mp4);
    expect(seal.summary.discipline).toBe("film");
    expect((await verifySeal(mp4, seal)).valid).toBe(true);
  });
});
