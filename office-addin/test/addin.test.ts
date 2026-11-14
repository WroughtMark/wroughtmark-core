import { describe, expect, test } from "bun:test";
import {
  buildOpenXmlCustomPart,
  createM365SessionState,
  createWordSessionState,
  extractAndVerifyOpenXmlCustomPart,
  mintM365Seal,
  mintWordSeal,
  recordM365Snapshot,
  recordWordSnapshot,
} from "../src/taskpane";
import { verifySeal } from "../../web-sdk/src/verify";

describe("Microsoft Office (Word) Add-in Provenance", () => {
  test("tracks Word document snapshots and mints a verified seal", async () => {
    let state = createWordSessionState();
    state = await recordWordSnapshot(state, "Outline chapter 1", 1000, "2026-11-13T01:00:00Z");
    state = await recordWordSnapshot(
      state,
      "Outline chapter 1\n\nExpanded introduction with citations.",
      1000 + 360_000,
      "2026-11-13T01:06:00Z"
    );

    const finalDoc = "Outline chapter 1\n\nExpanded introduction with citations.";
    const seal = await mintWordSeal("word-assignment", state, finalDoc);
    expect(seal.summary.process_score).toBe(100);
    expect(seal.summary.anomaly_flags).toEqual([]);

    const verified = await verifySeal(new TextEncoder().encode(finalDoc), seal);
    expect(verified.valid).toBe(true);
    expect(verified.sealId).toBe(seal.seal_id);
  });

  test("flags sudden large paste into Word document", async () => {
    let state = createWordSessionState();
    state = await recordWordSnapshot(state, "Title", 1000, "2026-11-13T01:00:00Z");
    const hugePaste = "word ".repeat(15_000); // > 50 KB in 10 seconds
    state = await recordWordSnapshot(state, hugePaste, 11_000, "2026-11-13T01:00:10Z");

    const seal = await mintWordSeal("word-paste", state, hugePaste);
    expect(seal.summary.anomaly_flags).toContain("BULK_PASTE_SPIKE");
    expect(seal.summary.process_score).toBeLessThan(100);
  });

  test("Excel workbook with Copilot disclosure mints AI_ASSISTED_DISCLOSED seal and OpenXML part", async () => {
    let state = createM365SessionState("excel");
    state = await recordM365Snapshot(
      state,
      JSON.stringify({ sheet: "Cashflow", formulas: 12 }),
      { host: "excel", structuralUnits: 3, annotationEvents: 2 },
      1000,
      "2026-11-15T01:00:00Z"
    );
    state = await recordM365Snapshot(
      state,
      JSON.stringify({ sheet: "Cashflow", formulas: 28, notes: "Copilot summary table" }),
      { host: "excel", structuralUnits: 6, annotationEvents: 5, copilotAssisted: true },
      1000 + 360_000,
      "2026-11-15T01:06:00Z"
    );

    const finalWorkbook = JSON.stringify({ sheet: "Cashflow", formulas: 28, notes: "Copilot summary table" });
    const seal = await mintM365Seal("q4-financial-model", state, finalWorkbook);
    expect(seal.summary.discipline).toBe("science");
    expect(seal.summary.authorship_tier).toBe("AI_ASSISTED_DISCLOSED");
    expect(seal.summary.anomaly_flags).toContain("AI_ASSISTANCE_DISCLOSED");
    expect(seal.summary.co_signed_devices).toContain("m365-excel");
    expect(seal.summary.co_signed_devices).toContain("m365-copilot-disclosed");

    const customXml = buildOpenXmlCustomPart(seal);
    expect(customXml).toContain("https://wroughtmark.org/openxml/v0.3");
    const verified = await extractAndVerifyOpenXmlCustomPart(
      customXml,
      new TextEncoder().encode(finalWorkbook)
    );
    expect(verified.valid).toBe(true);
    expect(verified.sealId).toBe(seal.seal_id);

    const tampered = await extractAndVerifyOpenXmlCustomPart(
      customXml,
      new TextEncoder().encode(finalWorkbook + "tamper")
    );
    expect(tampered.valid).toBe(false);
  });

  test("Word / M365 HITL contract review flags rubber-stamp approvals", async () => {
    let state = createM365SessionState("word");
    state = await recordM365Snapshot(
      state,
      "60-page Master Services Agreement approved instantly",
      { host: "word", viewportCoverageBps: 1200, annotationEvents: 0 },
      1000,
      "2026-11-15T02:00:00Z"
    );
    const seal = await mintM365Seal(
      "msa-review",
      state,
      "60-page Master Services Agreement approved instantly"
    );
    expect(seal.summary.discipline).toBe("review");
    expect(seal.summary.anomaly_flags).toContain("RUBBER_STAMP_REVIEW");
    expect(seal.summary.authorship_tier).toBe("ANOMALY_FLAGGED");
  });
});
