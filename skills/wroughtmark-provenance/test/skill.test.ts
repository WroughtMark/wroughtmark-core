import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { handleMcpToolCall, WROUGHTMARK_MCP_TOOLS } from "../src/mcp-server";
import type { WroughtmarkSeal } from "../../../web-sdk/src/verify";

describe("Wroughtmark Agent Skill & MCP Server (MS365, Google Workspace & CLI)", () => {
  test("SKILL.md declares valid YAML frontmatter and suite workflow instructions", () => {
    const skillMd = readFileSync(new URL("../SKILL.md", import.meta.url), "utf8");
    expect(skillMd.startsWith("---\nname: wroughtmark-provenance\n")).toBe(true);
    expect(skillMd).toContain("ai_disclosed: true");
    expect(skillMd).toContain("customXml/wroughtmark.xml");
    expect(skillMd).toContain("appProperties");
    expect(WROUGHTMARK_MCP_TOOLS.map((t) => t.name)).toEqual([
      "wroughtmark_record_step",
      "wroughtmark_mint_suite_seal",
      "wroughtmark_verify_suite_artifact",
      "wroughtmark_usco_manifest",
    ]);
  });

  test("handles step recording, suite sealing, cross-format verification, and USCO manifest tools", async () => {
    const rec1 = await handleMcpToolCall("wroughtmark_record_step", {
      contentText: "Agent-assisted module init",
      activeSeconds: 200,
      aiDisclosed: true,
    });
    expect(rec1.ok).toBe(true);
    expect(rec1.count).toBe(1);

    const m365Minted = await handleMcpToolCall("wroughtmark_mint_suite_seal", {
      suite: "m365",
      host: "powerpoint",
      projectId: "m365-deck-demo",
      steps: [
        { content: "Slide 1: Agenda", activeSeconds: 220 },
        { content: "Slide 1: Agenda\nSlide 2: Copilot Chart", activeSeconds: 240, aiDisclosed: true },
      ],
    });
    expect(m365Minted.ok).toBe(true);
    expect(typeof m365Minted.customXml).toBe("string");

    const m365Verify = await handleMcpToolCall("wroughtmark_verify_suite_artifact", {
      contentText: "Slide 1: Agenda\nSlide 2: Copilot Chart",
      customXml: m365Minted.customXml,
    });
    expect(m365Verify.valid).toBe(true);
    expect(m365Verify.format).toBe("m365-openxml");

    const gwsMinted = await handleMcpToolCall("wroughtmark_mint_suite_seal", {
      suite: "google-workspace",
      host: "docs",
      projectId: "gws-brief-demo",
      steps: [
        { content: "Draft v1 paragraph", activeSeconds: 200 },
        { content: "Draft v2 human edit", activeSeconds: 200 },
      ],
    });
    expect(gwsMinted.ok).toBe(true);
    expect(gwsMinted.driveAppProperties).toBeDefined();

    const gwsVerify = await handleMcpToolCall("wroughtmark_verify_suite_artifact", {
      contentText: "Draft v2 human edit",
      driveAppProperties: gwsMinted.driveAppProperties,
    });
    expect(gwsVerify.valid).toBe(true);
    expect(gwsVerify.format).toBe("gws-drive-app-properties");

    const usco = await handleMcpToolCall("wroughtmark_usco_manifest", {
      seal: m365Minted.seal as WroughtmarkSeal,
    });
    expect(usco.ok).toBe(true);
    expect(usco.corpus_100_percent_human).toBe(false);
    expect(String(usco.disclosure_statement)).toContain("Hybrid USCO Authorship Disclosure");
  });
});
