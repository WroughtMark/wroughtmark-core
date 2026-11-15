import {
  buildUscoManifestPayload,
  canonicalJsonBytes,
  sha256Hex,
  verifySeal,
  verifySealSignature,
  type TimeAnchor,
  type UscoEventSummaryInput,
  type WroughtmarkSeal,
} from "./verify";
import { handleMcpToolCall } from "../../skills/wroughtmark-provenance/src/mcp-server";

export { buildUscoManifestPayload, type UscoEventSummaryInput };

let cachedAuthorityKeyPair: {
  keyPair: CryptoKeyPair;
  pubkeyHex: string;
} | null = null;

async function getAuthorityKey(): Promise<{ keyPair: CryptoKeyPair; pubkeyHex: string }> {
  if (cachedAuthorityKeyPair) return cachedAuthorityKeyPair;
  const keyPair = (await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;
  const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const pubkeyHex = Array.from(rawPub)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  cachedAuthorityKeyPair = { keyPair, pubkeyHex };
  return cachedAuthorityKeyPair;
}

function decodeBase64Bytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function resolveTier(seal: WroughtmarkSeal): "HUMAN_WROUGHT" | "AI_ASSISTED_DISCLOSED" | "ANOMALY_FLAGGED" {
  if (seal.summary.authorship_tier) return seal.summary.authorship_tier;
  return seal.summary.anomaly_flags.length === 0 ? "HUMAN_WROUGHT" : "ANOMALY_FLAGGED";
}

/**
 * Issue a blind Ed25519 wall-clock TimeAnchor over a 32-byte digest (`0B` content uploaded).
 */
export async function mintBlindTimeAnchor(
  digestHex: string,
  wallClockUtc = new Date().toISOString()
): Promise<{ ok: true; anchor: TimeAnchor } | { ok: false; error: string }> {
  const cleaned = (digestHex || "").trim();
  const hexPart = cleaned.startsWith("blake3:") ? cleaned.slice("blake3:".length) : cleaned;
  if (!/^[0-9a-fA-F]{64}$/.test(hexPart)) {
    return {
      ok: false,
      error: "digestHex must be a 64-character hex SHA-256 or blake3:<64-hex> digest (raw content forbidden)",
    };
  }

  const { keyPair, pubkeyHex } = await getAuthorityKey();
  const authority_id = "wroughtmark-blind-tsa-v03";
  const payload = {
    anchored_digest: cleaned,
    authority_id,
    wall_clock_utc: wallClockUtc,
  };
  const sigBuf = await crypto.subtle.sign(
    "Ed25519",
    keyPair.privateKey,
    canonicalJsonBytes(payload)
  );
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    ok: true,
    anchor: {
      authority_id,
      anchored_digest: cleaned,
      wall_clock_utc: wallClockUtc,
      authority_pubkey_hex: pubkeyHex,
      authority_sig: `ed25519:${sigHex}`,
    },
  };
}

/** Verify a Git commit / PR Wroughtmark seal bundle and return CI merge gate verdict. */
export async function verifyGitPrRequest(body: {
  outputBase64?: string;
  prDiffBase64?: string;
  seal: WroughtmarkSeal;
}) {
  const b64 = body.outputBase64 ?? body.prDiffBase64 ?? "";
  if (!b64 || !body.seal) {
    return {
      verified: false,
      ci_gate: "BLOCK" as const,
      reason: "Missing outputBase64/prDiffBase64 or seal payload",
      seal_id: body.seal?.seal_id,
      authorship_tier: "ANOMALY_FLAGGED" as const,
      process_score: 0,
      anomaly_flags: [],
      contributors: [],
    };
  }
  const bytes = decodeBase64Bytes(b64);
  const check = await verifySeal(bytes, body.seal);
  const flags = body.seal.summary?.anomaly_flags ?? [];
  const tier = resolveTier(body.seal);
  const blocked = !check.valid || tier === "ANOMALY_FLAGGED";

  return {
    verified: check.valid,
    reason: check.reason,
    ci_gate: blocked ? ("BLOCK" as const) : ("PASS" as const),
    seal_id: body.seal.seal_id,
    authorship_tier: tier,
    process_score: body.seal.summary.process_score,
    anomaly_flags: flags,
    contributors: body.seal.summary.contributors ?? [],
  };
}

/** Verify a privacy-first technical hiring take-home assessment without proctoring spyware. */
export async function verifyHiringAssessmentRequest(body: {
  outputBase64: string;
  seal: WroughtmarkSeal;
  challengeStartUtc?: string;
}) {
  if (!body.outputBase64 || !body.seal) {
    return {
      verified: false,
      assessment_verdict: "FLAGGED_REVIEW" as const,
      reason: "Missing outputBase64 or seal payload",
      seal_id: body.seal?.seal_id,
      authorship_tier: "ANOMALY_FLAGGED" as const,
      process_score: 0,
      total_active_seconds: 0,
      anomaly_flags: [],
    };
  }
  const bytes = decodeBase64Bytes(body.outputBase64);
  const check = await verifySeal(bytes, body.seal);
  const tier = resolveTier(body.seal);
  const spanValid =
    !body.challengeStartUtc ||
    Date.parse(body.seal.summary.span_start_utc) >= Date.parse(body.challengeStartUtc) - 60_000;
  const pass =
    check.valid &&
    spanValid &&
    tier !== "ANOMALY_FLAGGED" &&
    body.seal.summary.total_active_seconds >= 60;

  return {
    verified: check.valid,
    reason: !spanValid
      ? "Process chain started before challenge Start anchor"
      : check.reason,
    assessment_verdict: pass ? ("AUTHENTIC_ITERATIVE" as const) : ("FLAGGED_REVIEW" as const),
    seal_id: body.seal.seal_id,
    authorship_tier: tier,
    process_score: body.seal.summary.process_score,
    total_active_seconds: body.seal.summary.total_active_seconds,
    anomaly_flags: body.seal.summary.anomaly_flags,
  };
}

export type SuiteDemoKind = "m365" | "google-workspace" | "agent-mcp";

/**
 * Execute an interactive live round-trip across the Microsoft 365 OpenXML add-in,
 * Google Workspace CardService / Drive add-on, or Wroughtmark Agent Skill MCP tools.
 */
export async function runSuiteBridgeDemo(kind: SuiteDemoKind) {
  if (kind === "m365") {
    const finalText = JSON.stringify({
      sheet: "Q4_Forecast",
      formulas: 28,
      notes: "Reviewed Copilot variance table",
    });
    const minted = await handleMcpToolCall("wroughtmark_mint_suite_seal", {
      suite: "m365",
      host: "excel",
      projectId: "q4-m365-forecast",
      steps: [
        { content: "Initial workbook model", activeSeconds: 210, structuralUnits: 3, annotationEvents: 2 },
        { content: finalText, activeSeconds: 240, aiDisclosed: true, structuralUnits: 6, annotationEvents: 5 },
      ],
    });
    const seal = minted.seal as WroughtmarkSeal;
    const verified = await handleMcpToolCall("wroughtmark_verify_suite_artifact", {
      contentText: finalText,
      customXml: minted.customXml,
    });
    return {
      suite: "m365",
      host: "excel",
      seal_id: seal.seal_id,
      authorship_tier: seal.summary.authorship_tier,
      process_score: seal.summary.process_score,
      co_signed_devices: seal.summary.co_signed_devices,
      verified: verified.valid,
      format: verified.format,
      customXmlPreview: String(minted.customXml).slice(0, 140) + "...",
    };
  }

  if (kind === "google-workspace") {
    const finalText = "Workspace Policy Brief v2: refined executive overview with Gemini disclosure.";
    const minted = await handleMcpToolCall("wroughtmark_mint_suite_seal", {
      suite: "google-workspace",
      host: "docs",
      projectId: "gws-brief-2026",
      steps: [
        { content: "Policy Brief v1 human outline", activeSeconds: 200, annotationEvents: 2 },
        { content: finalText, activeSeconds: 230, aiDisclosed: true, annotationEvents: 4 },
      ],
    });
    const seal = minted.seal as WroughtmarkSeal;
    const verified = await handleMcpToolCall("wroughtmark_verify_suite_artifact", {
      contentText: finalText,
      driveAppProperties: minted.driveAppProperties,
    });
    return {
      suite: "google-workspace",
      host: "docs",
      seal_id: seal.seal_id,
      authorship_tier: seal.summary.authorship_tier,
      process_score: seal.summary.process_score,
      co_signed_devices: seal.summary.co_signed_devices,
      verified: verified.valid,
      format: verified.format,
      cardTitle: (minted.cardUi as { header?: { title?: string } })?.header?.title,
      driveAppPropertiesKeys: Object.keys((minted.driveAppProperties as Record<string, string>) ?? {}),
    };
  }

  const finalCode = "export const provenanceReady = true; // verified agent-skill edit";
  const minted = await handleMcpToolCall("wroughtmark_mint_suite_seal", {
    suite: "agent-cli",
    projectId: "agent-skill-task",
    steps: [
      { content: "Initial stub module", activeSeconds: 190, aiDisclosed: true },
      { content: finalCode, activeSeconds: 220, aiDisclosed: true },
    ],
  });
  const seal = minted.seal as WroughtmarkSeal;
  const ver = await handleMcpToolCall("wroughtmark_verify_suite_artifact", {
    contentText: finalCode,
    seal,
  });
  const usco = await handleMcpToolCall("wroughtmark_usco_manifest", { seal });
  return {
    suite: "agent-mcp",
    seal_id: seal.seal_id,
    authorship_tier: seal.summary.authorship_tier,
    verified: ver.valid,
    corpus_100_percent_human: usco.corpus_100_percent_human,
    disclosure_statement: usco.disclosure_statement,
  };
}

