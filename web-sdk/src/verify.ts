/**
 * Pure TypeScript / WebCrypto verifier for WroughtmarkSeal (PROTOCOL.md v0.1).
 * Matches `wroughtmark-core` (Rust) byte-for-byte for SHA-256, canonical JSON, and Ed25519.
 */

export interface ContributorAttestation {
  role: string;
  creator_key_id: string;
  creator_pubkey_hex: string;
  start_seq: number;
  end_seq: number;
  stage_output_sha256: string;
  stage_sig: string;
}

export interface TimeAnchor {
  authority_id: string;
  anchored_digest: string;
  wall_clock_utc: string;
  authority_pubkey_hex: string;
  authority_sig: string;
}

export interface SealSummary {
  discipline: "writing" | "music" | "visual" | "film" | "code" | "science" | "review";
  session_count: number;
  total_active_seconds: number;
  span_start_utc: string;
  span_end_utc: string;
  co_signed_devices: string[];
  process_score: number;
  anomaly_flags: string[];
  authorship_tier?: "HUMAN_WROUGHT" | "AI_ASSISTED_DISCLOSED" | "ANOMALY_FLAGGED";
  contributors?: ContributorAttestation[];
}

export interface WroughtmarkSeal {
  version: string;
  seal_id: string;
  project_id: string;
  creator_key_id: string;
  creator_pubkey_hex: string;
  final_output_sha256: string;
  chain_root: string;
  summary: SealSummary;
  time_anchor?: TimeAnchor;
  creator_sig: string;
}

export interface VerifyResult {
  valid: boolean;
  sealId?: string;
  reason?: string;
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const sorted: Record<string, unknown> = {};
    for (const [k, v] of entries) {
      sorted[k] = sortJsonValue(v);
    }
    return sorted;
  }
  return value;
}

export function canonicalJsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(sortJsonValue(value)));
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error("Invalid hex encoding");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(digest);
}

export async function verifyTimeAnchor(
  anchor: TimeAnchor,
  expectedDigest?: string
): Promise<VerifyResult> {
  if (expectedDigest && anchor.anchored_digest !== expectedDigest) {
    return {
      valid: false,
      reason: `TimeAnchor digest mismatch: expected ${expectedDigest}, got ${anchor.anchored_digest}`,
    };
  }
  if (!anchor.authority_sig?.startsWith("ed25519:")) {
    return { valid: false, reason: "TimeAnchor missing ed25519: signature prefix" };
  }
  try {
    const pubBytes = hexToBytes(anchor.authority_pubkey_hex);
    const sigBytes = hexToBytes(anchor.authority_sig.slice("ed25519:".length));
    const canonical = canonicalJsonBytes({
      anchored_digest: anchor.anchored_digest,
      authority_id: anchor.authority_id,
      wall_clock_utc: anchor.wall_clock_utc,
    });
    const key = await crypto.subtle.importKey("raw", pubBytes, { name: "Ed25519" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("Ed25519", key, sigBytes, canonical);
    return ok ? { valid: true } : { valid: false, reason: "TimeAnchor Ed25519 signature failed" };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : "TimeAnchor verification error",
    };
  }
}

/** Verify only the Ed25519 signature over canonical JSON seal metadata (zero raw deliverable bytes). */
export async function verifySealSignature(seal: WroughtmarkSeal): Promise<VerifyResult> {
  if (!seal || !seal.seal_id || !seal.creator_pubkey_hex || !seal.final_output_sha256) {
    return { valid: false, sealId: seal?.seal_id, reason: "Missing required seal fields" };
  }
  if (!seal.creator_sig?.startsWith("ed25519:")) {
    return { valid: false, sealId: seal.seal_id, reason: "Missing ed25519: signature prefix" };
  }

  try {
    const pubBytes = hexToBytes(seal.creator_pubkey_hex);
    const sigBytes = hexToBytes(seal.creator_sig.slice("ed25519:".length));
    const { creator_sig: _ignored, ...payload } = seal;
    const canonical = canonicalJsonBytes(payload);

    const key = await crypto.subtle.importKey(
      "raw",
      pubBytes,
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify("Ed25519", key, sigBytes, canonical);
    if (!ok) {
      return { valid: false, sealId: seal.seal_id, reason: "Ed25519 signature verification failed" };
    }
    if (seal.time_anchor) {
      const anchorCheck = await verifyTimeAnchor(seal.time_anchor, seal.chain_root);
      if (!anchorCheck.valid) {
        return { valid: false, sealId: seal.seal_id, reason: anchorCheck.reason };
      }
    }
    return { valid: true, sealId: seal.seal_id };
  } catch (err) {
    return {
      valid: false,
      sealId: seal.seal_id,
      reason: err instanceof Error ? err.message : "Verification error",
    };
  }
}

export async function verifySeal(
  outputBytes: Uint8Array,
  seal: WroughtmarkSeal
): Promise<VerifyResult> {
  const actualSha = await sha256Hex(outputBytes);
  if (actualSha !== seal.final_output_sha256) {
    return {
      valid: false,
      sealId: seal.seal_id,
      reason: `SHA-256 mismatch: expected ${seal.final_output_sha256}, got ${actualSha}`,
    };
  }

  return verifySealSignature(seal);
}

/** Extract a Wroughtmark v0.3 container-embedded seal envelope (`%%WROUGHTMARK_SEAL_V03:...%%END_WROUGHTMARK_SEAL`) and verify it. */
export async function verifyEmbeddedContainerBytes(
  containerBytes: Uint8Array
): Promise<VerifyResult & { seal?: WroughtmarkSeal; originalByteLength?: number; containerKind?: string }> {
  const text = new TextDecoder().decode(containerBytes);
  const prefix = "\n%%WROUGHTMARK_SEAL_V03:";
  const suffix = "%%END_WROUGHTMARK_SEAL";
  const idx = text.lastIndexOf(prefix);
  if (idx !== -1 && text.endsWith(suffix)) {
    try {
      const jsonStr = text.slice(idx + prefix.length, text.length - suffix.length);
      const seal = JSON.parse(jsonStr) as WroughtmarkSeal;
      const prefixBytes = new TextEncoder().encode(text.slice(0, idx));
      const verified = await verifySeal(prefixBytes, seal);
      return {
        ...verified,
        seal,
        originalByteLength: prefixBytes.length,
        containerKind: "generic_envelope",
      };
    } catch (err) {
      return {
        valid: false,
        reason: err instanceof Error ? err.message : "Malformed embedded seal",
      };
    }
  }
  return { valid: false, reason: "No Wroughtmark v0.3 embedded seal envelope found" };
}

export interface UscoEventSummaryInput {
  ai_disclosed?: boolean;
  structural_units?: number;
}

function resolveAuthorshipTier(
  seal: WroughtmarkSeal
): "HUMAN_WROUGHT" | "AI_ASSISTED_DISCLOSED" | "ANOMALY_FLAGGED" {
  if (seal.summary.authorship_tier) return seal.summary.authorship_tier;
  return seal.summary.anomaly_flags.length === 0 ? "HUMAN_WROUGHT" : "ANOMALY_FLAGGED";
}

/** Build a USCO hybrid copyright disclosure & AI-training corpus cleanliness manifest. */
export async function buildUscoManifestPayload(body: {
  seal: WroughtmarkSeal;
  events?: UscoEventSummaryInput[];
}) {
  const sigCheck = await verifySealSignature(body.seal);
  if (!sigCheck.valid) {
    return {
      ok: false as const,
      error: sigCheck.reason ?? "Invalid seal signature",
    };
  }

  const tier = resolveAuthorshipTier(body.seal);
  const flags = body.seal.summary.anomaly_flags ?? [];
  const totalSessions = body.seal.summary.session_count;

  let human_events = 0;
  let ai_disclosed_events = 0;
  if (Array.isArray(body.events) && body.events.length > 0) {
    for (const ev of body.events) {
      if (ev.ai_disclosed) ai_disclosed_events += 1;
      else human_events += 1;
    }
  } else if (tier === "HUMAN_WROUGHT" && !flags.includes("AI_ASSISTANCE_DISCLOSED")) {
    human_events = totalSessions;
    ai_disclosed_events = 0;
  } else {
    ai_disclosed_events = 1;
    human_events = Math.max(0, totalSessions - 1);
  }

  const corpus_100_percent_human =
    tier === "HUMAN_WROUGHT" && ai_disclosed_events === 0;

  const disclosure_statement = corpus_100_percent_human
    ? `100% HUMAN_WROUGHT corpus lineage verified for ${body.seal.project_id} (${human_events} unassisted sessions, ${body.seal.summary.total_active_seconds}s active time, chain_root ${body.seal.chain_root}). Eligible for clean training-corpus licensing.`
    : `Hybrid USCO Authorship Disclosure for ${body.seal.project_id}: ${human_events} unassisted human sessions and ${ai_disclosed_events} AI-assisted disclosed sessions (${body.seal.summary.total_active_seconds}s active duration, tier ${tier}, chain_root ${body.seal.chain_root}). Applicant claims copyright solely in human selection, arrangement, and original expressive modifications.`;

  return {
    ok: true as const,
    seal_id: body.seal.seal_id,
    project_id: body.seal.project_id,
    discipline: body.seal.summary.discipline,
    authorship_tier: tier,
    process_score: body.seal.summary.process_score,
    corpus_100_percent_human,
    human_events,
    ai_disclosed_events,
    disclosure_statement,
    digest_sha256_prefix: await sha256Hex(canonicalJsonBytes(body.seal)),
  };
}
