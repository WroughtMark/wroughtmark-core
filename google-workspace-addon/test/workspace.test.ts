import { describe, expect, test } from "bun:test";
import {
  buildDriveAppProperties,
  buildWorkspaceCardUi,
  createWorkspaceSessionState,
  mintWorkspaceSeal,
  recordWorkspaceSnapshot,
  verifyDriveAppProperties,
} from "../src/addon";
import { verifySeal } from "../../web-sdk/src/verify";

describe("Native Google Workspace Add-on (Docs, Sheets, Slides, Drive, Gmail)", () => {
  test("Google Docs + Gemini disclosure mints AI_ASSISTED_DISCLOSED seal and Card UI", async () => {
    let state = createWorkspaceSessionState("docs");
    state = await recordWorkspaceSnapshot(
      state,
      "Policy memo draft section 1: human outline and empirical baseline.",
      { host: "docs", annotationEvents: 3 },
      1000,
      "2026-11-15T01:00:00Z"
    );
    state = await recordWorkspaceSnapshot(
      state,
      "Policy memo draft section 1 & 2: revised with Gemini executive summary edits.",
      { host: "docs", geminiDisclosed: true, annotationEvents: 5 },
      1000 + 360_000,
      "2026-11-15T01:06:00Z"
    );

    const finalDoc = "Policy memo draft section 1 & 2: revised with Gemini executive summary edits.";
    const seal = await mintWorkspaceSeal("gws-policy-memo", state, finalDoc);
    expect(seal.summary.discipline).toBe("writing");
    expect(seal.summary.authorship_tier).toBe("AI_ASSISTED_DISCLOSED");
    expect(seal.summary.anomaly_flags).toContain("AI_ASSISTANCE_DISCLOSED");
    expect(seal.summary.co_signed_devices).toContain("gws-docs");
    expect(seal.summary.co_signed_devices).toContain("gws-gemini-disclosed");

    const verified = await verifySeal(new TextEncoder().encode(finalDoc), seal);
    expect(verified.valid).toBe(true);

    const card = buildWorkspaceCardUi(state, seal);
    expect(card.header.title).toBe("Wroughtmark // gws-docs");
    expect(card.sections.length).toBe(2);
    expect(card.sections[0].widgets.some((w) => w.text === "AI_ASSISTED_DISCLOSED")).toBe(true);
    expect(card.sections[0].widgets.some((w) => w.text.includes("Gemini"))).toBe(true);
  });

  test("Google Sheets & Slides mint domain-typed HUMAN_WROUGHT seals with Drive appProperties round-trip", async () => {
    let sheetsState = createWorkspaceSessionState("sheets");
    sheetsState = await recordWorkspaceSnapshot(
      sheetsState,
      "A1:Revenue,B1:12000",
      { host: "sheets", structuralUnits: 2 },
      1000,
      "2026-11-15T02:00:00Z"
    );
    sheetsState = await recordWorkspaceSnapshot(
      sheetsState,
      "A1:Revenue,B1:12000,C1:=SUM(B1:B12)",
      { host: "sheets", structuralUnits: 4 },
      1000 + 360_000,
      "2026-11-15T02:06:00Z"
    );

    const sheetBytes = new TextEncoder().encode("A1:Revenue,B1:12000,C1:=SUM(B1:B12)");
    const sheetSeal = await mintWorkspaceSeal(
      "gws-budget-model",
      sheetsState,
      "A1:Revenue,B1:12000,C1:=SUM(B1:B12)"
    );
    expect(sheetSeal.summary.discipline).toBe("science");
    expect(sheetSeal.summary.authorship_tier).toBe("HUMAN_WROUGHT");

    const props = buildDriveAppProperties(sheetSeal);
    expect(props.wroughtmark_seal_id).toBe(sheetSeal.seal_id);
    expect(props.wroughtmark_tier).toBe("HUMAN_WROUGHT");

    const driveCheck = await verifyDriveAppProperties(props, sheetBytes);
    expect(driveCheck.valid).toBe(true);
    expect(driveCheck.sealId).toBe(sheetSeal.seal_id);

    const tamperedCheck = await verifyDriveAppProperties(
      props,
      new TextEncoder().encode("tampered sheet csv")
    );
    expect(tamperedCheck.valid).toBe(false);

    let slidesState = createWorkspaceSessionState("slides");
    slidesState = await recordWorkspaceSnapshot(
      slidesState,
      "Slide 1: Thesis",
      { host: "slides" },
      1000,
      "2026-11-15T03:00:00Z"
    );
    slidesState = await recordWorkspaceSnapshot(
      slidesState,
      "Slide 1: Thesis\nSlide 2: Architecture Diagram",
      { host: "slides" },
      1000 + 360_000,
      "2026-11-15T03:06:00Z"
    );
    const slidesSeal = await mintWorkspaceSeal(
      "gws-pitch-deck",
      slidesState,
      "Slide 1: Thesis\nSlide 2: Architecture Diagram"
    );
    expect(slidesSeal.summary.discipline).toBe("visual");
    expect(slidesSeal.summary.co_signed_devices).toContain("gws-slides");
  });
});
