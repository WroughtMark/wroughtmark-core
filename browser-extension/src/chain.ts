export type BrowserAuthorshipTier =
  | "HUMAN_WROUGHT"
  | "AI_ASSISTED_DISCLOSED"
  | "ANOMALY_FLAGGED";

export type BrowserAdapterKind =
  | "text"
  | "daw"
  | "canvas"
  | "nle"
  | "physical"
  | "git"
  | "cad"
  | "inspection";

export interface BrowserTimeAnchor {
  authority_id: string;
  anchored_digest: string;
  wall_clock_utc: string;
  authority_pubkey_hex: string;
  authority_sig: string;
}

export interface BrowserContributorAttestation {
  role: string;
  creator_key_id: string;
  creator_pubkey_hex: string;
  start_seq: number;
  end_seq: number;
  stage_output_sha256: string;
  stage_sig: string;
}

export interface BrowserTelemetryOptions {
  synthetic_insert_bytes?: number;
  revision_events?: number;
  sampled_keystrokes?: number;
  focus_switch_inserts?: number;
  keystroke_variance_bps?: number;
  external_ai_markers?: number;
  ai_disclosed?: boolean;
  emg_motor_variance_bps?: number;
  spatial_6dof_entropy_bps?: number;
  viewport_coverage_bps?: number;
  annotation_events?: number;
  build_test_cycles?: number;
  clock_drift_seconds?: number;
  adapter?: BrowserAdapterKind;
}

export interface BrowserHeartbeat extends BrowserTelemetryOptions {
  seq: number;
  timestamp_utc: string;
  active_seconds: number;
  delta_bytes: number;
  paste_bytes: number;
  state_sha256: string;
  prev_hash: string;
}

export type BrowserDiscipline =
  | "writing"
  | "music"
  | "visual"
  | "film"
  | "code"
  | "science"
  | "review";

export interface BrowserSealSummary {
  discipline: BrowserDiscipline;
  session_count: number;
  total_active_seconds: number;
  span_start_utc: string;
  span_end_utc: string;
  co_signed_devices: string[];
  process_score: number;
  anomaly_flags: string[];
  authorship_tier?: BrowserAuthorshipTier;
  contributors?: BrowserContributorAttestation[];
}

export interface BrowserWroughtmarkSeal {
  version: string;
  seal_id: string;
  project_id: string;
  creator_key_id: string;
  creator_pubkey_hex: string;
  final_output_sha256: string;
  chain_root: string;
  summary: BrowserSealSummary;
  time_anchor?: BrowserTimeAnchor;
  creator_sig: string;
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const sorted: Record<string, unknown> = {};
    for (const [k, v] of entries) sorted[k] = sortJsonValue(v);
    return sorted;
  }
  return value;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return bytesToHex(new Uint8Array(digest));
}

export function classifyBrowserAuthorshipTier(
  processScore: number,
  anomalyFlags: string[],
  beats: BrowserHeartbeat[]
): BrowserAuthorshipTier {
  const hardFlags = new Set([
    "BULK_PASTE_SPIKE",
    "LINEAR_TRANSCRIPTION_PATTERN",
    "SYNTHETIC_CADENCE_BOT",
    "AI_ASSET_METADATA_DETECTED",
    "SYNTHETIC_EMG_REPLAY",
    "STATIC_6DOF_POSE_ANOMALY",
    "CLOCK_DRIFT_OR_BACKDATE",
    "RUBBER_STAMP_REVIEW",
    "OPAQUE_DROP_NO_TEST_CYCLE",
  ]);
  if (processScore < 70 || anomalyFlags.some((f) => hardFlags.has(f))) {
    return "ANOMALY_FLAGGED";
  }
  if (beats.some((b) => Boolean(b.ai_disclosed)) || anomalyFlags.length > 0) {
    return "AI_ASSISTED_DISCLOSED";
  }
  return "HUMAN_WROUGHT";
}

export function analyzeHeartbeats(beats: BrowserHeartbeat[]): {
  process_score: number;
  anomaly_flags: string[];
  authorship_tier: BrowserAuthorshipTier;
} {
  const flags: string[] = [];
  let score = 100;

  if (beats.length < 2) {
    flags.push("SINGLE_SESSION_SUBMISSION");
    score -= 25;
  }

  const totalSecs = beats.reduce((acc, b) => acc + b.active_seconds, 0);
  if (totalSecs < 300) {
    flags.push("SHORT_DURATION");
    score -= 20;
  }

  const hasBulkSpike = beats.some(
    (b) =>
      b.seq > 0 &&
      (b.delta_bytes > 50_000 || b.paste_bytes > 50_000) &&
      b.active_seconds < 120
  );
  if (hasBulkSpike) {
    flags.push("BULK_PASTE_SPIKE");
    score -= 35;
  }

  const totalDelta = beats.reduce((acc, b) => acc + b.delta_bytes, 0);
  const totalPaste = beats.reduce((acc, b) => acc + (b.paste_bytes || 0), 0);
  const totalSynthetic = beats.reduce(
    (acc, b) => acc + (b.synthetic_insert_bytes || 0),
    0
  );
  const totalRevisions = beats.reduce(
    (acc, b) => acc + (b.revision_events || 0),
    0
  );
  const totalKeystrokes = beats.reduce(
    (acc, b) => acc + (b.sampled_keystrokes || 0),
    0
  );
  const totalFocusInserts = beats.reduce(
    (acc, b) => acc + (b.focus_switch_inserts || 0),
    0
  );
  const totalAiMarkers = beats.reduce(
    (acc, b) => acc + (b.external_ai_markers || 0),
    0
  );
  const hasCadenceBot = beats.some(
    (b) =>
      (b.sampled_keystrokes || 0) >= 200 &&
      (b.keystroke_variance_bps || 0) > 0 &&
      (b.keystroke_variance_bps || 0) < 800
  );
  const hasSyntheticEmg = beats.some(
    (b) =>
      (b.emg_motor_variance_bps || 0) > 0 &&
      (b.emg_motor_variance_bps || 0) < 500
  );
  const hasStatic6Dof = beats.some(
    (b) =>
      (b.spatial_6dof_entropy_bps || 0) > 0 &&
      (b.spatial_6dof_entropy_bps || 0) < 600
  );
  const hasClockDrift = beats.some((b) => (b.clock_drift_seconds || 0) > 300);
  const hasRubberStampReview = beats.some(
    (b) =>
      (b.viewport_coverage_bps || 0) > 0 &&
      (b.viewport_coverage_bps || 0) < 4000
  );
  const hasOpaqueGitDrop = beats.some(
    (b) =>
      b.adapter === "git" &&
      b.delta_bytes > 5000 &&
      (b.build_test_cycles || 0) === 0
  );
  const anyDisclosed = beats.some((b) => Boolean(b.ai_disclosed));
  const organicRevisions =
    totalKeystrokes >= 200 && totalRevisions / totalKeystrokes >= 0.12;

  if (totalPaste >= 250 && totalDelta > 0 && totalPaste / totalDelta > 0.25) {
    flags.push("CLIPBOARD_RATIO_HIGH");
    score -= anyDisclosed && organicRevisions ? 15 : 30;
  }

  if (totalFocusInserts >= 3) {
    flags.push("FOCUS_SWITCH_PASTE_LOOP");
    score -= 25;
  }

  if (
    totalSynthetic >= 150 &&
    totalDelta > 0 &&
    totalSynthetic / totalDelta > 0.15
  ) {
    flags.push("INLINE_AI_AUTOCOMPLETE");
    score -= anyDisclosed && organicRevisions ? 15 : 30;
  }

  if (
    totalKeystrokes >= 300 &&
    totalDelta >= 1500 &&
    totalRevisions / totalKeystrokes < 0.03
  ) {
    flags.push("LINEAR_TRANSCRIPTION_PATTERN");
    score -= 35;
  }

  if (hasCadenceBot) {
    flags.push("SYNTHETIC_CADENCE_BOT");
    score -= 45;
  }

  if (totalAiMarkers > 0) {
    flags.push("AI_ASSET_METADATA_DETECTED");
    score -= 40;
  }

  if (hasSyntheticEmg) {
    flags.push("SYNTHETIC_EMG_REPLAY");
    score -= 45;
  }

  if (hasStatic6Dof) {
    flags.push("STATIC_6DOF_POSE_ANOMALY");
    score -= 35;
  }

  if (hasClockDrift) {
    flags.push("CLOCK_DRIFT_OR_BACKDATE");
    score -= 45;
  }

  if (hasRubberStampReview) {
    flags.push("RUBBER_STAMP_REVIEW");
    score -= 50;
  }

  if (hasOpaqueGitDrop) {
    flags.push("OPAQUE_DROP_NO_TEST_CYCLE");
    score -= 40;
  }

  if (anyDisclosed) {
    flags.push("AI_ASSISTANCE_DISCLOSED");
  }

  const process_score = Math.max(0, Math.min(100, score));
  const authorship_tier = classifyBrowserAuthorshipTier(
    process_score,
    flags,
    beats
  );

  return {
    process_score,
    anomaly_flags: flags,
    authorship_tier,
  };
}

export const analyzeBrowserChain = analyzeHeartbeats;

export async function appendHeartbeat(
  beats: BrowserHeartbeat[],
  editorTextBytes: Uint8Array,
  activeSeconds: number,
  deltaBytes: number,
  pasteBytes: number,
  timestampUtc = new Date().toISOString(),
  telemetry?: BrowserTelemetryOptions
): Promise<BrowserHeartbeat[]> {
  const state_sha256 = await sha256Hex(editorTextBytes);
  const prev_hash = beats.length
    ? await sha256Hex(
        new TextEncoder().encode(JSON.stringify(sortJsonValue(beats[beats.length - 1])))
      )
    : "0".repeat(64);

  const next: BrowserHeartbeat = {
    seq: beats.length,
    timestamp_utc: timestampUtc,
    active_seconds: Math.max(1, Math.round(activeSeconds)),
    delta_bytes: Math.max(0, Math.round(deltaBytes)),
    paste_bytes: Math.max(0, Math.round(pasteBytes)),
    state_sha256,
    prev_hash,
    ...(telemetry ? telemetry : {}),
  };
  return [...beats, next];
}

export async function mintBrowserSeal(
  projectId: string,
  beats: BrowserHeartbeat[],
  finalOutputBytes: Uint8Array,
  discipline: BrowserDiscipline = "writing",
  coSignedDevices: string[] = ["browser-extension"],
  extraSummary?: Partial<BrowserSealSummary>,
  timeAnchor?: BrowserTimeAnchor
): Promise<BrowserWroughtmarkSeal> {
  if (!beats.length) {
    throw new Error("cannot mint seal from empty heartbeat chain");
  }

  const keyPair = (await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;

  const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const creator_pubkey_hex = bytesToHex(rawPub);
  const keyDigest = await sha256Hex(rawPub);
  const creator_key_id = `wm_key_${keyDigest.slice(0, 16)}`;

  const chain_root = await sha256Hex(
    new TextEncoder().encode(JSON.stringify(sortJsonValue(beats)))
  );
  const final_output_sha256 = await sha256Hex(finalOutputBytes);
  const { process_score, anomaly_flags, authorship_tier } = analyzeHeartbeats(beats);

  const summary: BrowserSealSummary = {
    discipline,
    session_count: beats.length,
    total_active_seconds: beats.reduce((acc, b) => acc + b.active_seconds, 0),
    span_start_utc: beats[0].timestamp_utc,
    span_end_utc: beats[beats.length - 1].timestamp_utc,
    co_signed_devices: coSignedDevices,
    process_score,
    anomaly_flags,
    authorship_tier,
    ...(extraSummary ? extraSummary : {}),
  };

  const payload = {
    version: "0.1",
    seal_id: `wm_seal_${chain_root.slice(0, 22)}`,
    project_id: projectId,
    creator_key_id,
    creator_pubkey_hex,
    final_output_sha256,
    chain_root,
    summary,
    ...(timeAnchor ? { time_anchor: timeAnchor } : {}),
  };

  const canonical = new TextEncoder().encode(JSON.stringify(sortJsonValue(payload)));
  const sigBuf = await crypto.subtle.sign("Ed25519", keyPair.privateKey, canonical);
  const creator_sig = `ed25519:${bytesToHex(new Uint8Array(sigBuf))}`;

  return { ...payload, creator_sig };
}
