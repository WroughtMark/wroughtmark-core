import {
  analyzeHeartbeats,
  appendHeartbeat,
  mintBrowserSeal,
  type BrowserDiscipline,
  type BrowserHeartbeat,
  type BrowserTelemetryOptions,
  type BrowserWroughtmarkSeal,
} from "../../browser-extension/src/chain";
import { verifySeal, type VerifyResult, type WroughtmarkSeal } from "../../web-sdk/src/verify";

export type WorkspaceHost = "docs" | "sheets" | "slides" | "drive" | "gmail";

export interface WorkspaceSnapshotOptions {
  host?: WorkspaceHost;
  geminiDisclosed?: boolean;
  annotationEvents?: number;
  viewportCoverageBps?: number;
  structuralUnits?: number;
}

export interface WorkspaceSessionState {
  host: WorkspaceHost;
  beats: BrowserHeartbeat[];
  lastBytesLen: number;
  lastTimestampMs: number;
  geminiUsed: boolean;
}

export interface WorkspaceCardWidget {
  type: "KEY_VALUE" | "TEXT_PARAGRAPH" | "TEXT_BUTTON";
  label?: string;
  text: string;
  onClickAction?: string;
}

export interface WorkspaceCardSection {
  header: string;
  widgets: WorkspaceCardWidget[];
}

export interface WorkspaceCardUi {
  header: {
    title: string;
    subtitle: string;
  };
  sections: WorkspaceCardSection[];
}

export function createWorkspaceSessionState(host: WorkspaceHost = "docs"): WorkspaceSessionState {
  return {
    host,
    beats: [],
    lastBytesLen: 0,
    lastTimestampMs: Date.now(),
    geminiUsed: false,
  };
}

export async function recordWorkspaceSnapshot(
  state: WorkspaceSessionState,
  contentText: string,
  options: WorkspaceSnapshotOptions = {},
  nowMs = Date.now(),
  timestampUtc = new Date(nowMs).toISOString()
): Promise<WorkspaceSessionState> {
  const host = options.host ?? state.host;
  const bytes = new TextEncoder().encode(contentText);
  const deltaBytes = Math.abs(bytes.length - state.lastBytesLen);
  if (deltaBytes === 0 && state.beats.length > 0 && !options.viewportCoverageBps) {
    return state;
  }

  const activeSeconds = Math.max(1, Math.round((nowMs - state.lastTimestampMs) / 1000));
  const pasteBytes = deltaBytes > 50_000 && activeSeconds < 120 ? deltaBytes : 0;

  const telemetry: BrowserTelemetryOptions = {
    adapter: host === "sheets" ? "git" : options.viewportCoverageBps ? "inspection" : "text",
    annotation_events: options.annotationEvents,
    viewport_coverage_bps: options.viewportCoverageBps,
    ai_disclosed: options.geminiDisclosed ? true : undefined,
    build_test_cycles: host === "sheets" ? Math.max(1, options.structuralUnits ?? 1) : undefined,
  };

  const beats = await appendHeartbeat(
    state.beats,
    bytes,
    activeSeconds,
    deltaBytes,
    pasteBytes,
    timestampUtc,
    telemetry
  );

  return {
    host,
    beats,
    lastBytesLen: bytes.length,
    lastTimestampMs: nowMs,
    geminiUsed: state.geminiUsed || Boolean(options.geminiDisclosed),
  };
}

function resolveWorkspaceDiscipline(state: WorkspaceSessionState): BrowserDiscipline {
  if (state.beats.some((b) => (b.viewport_coverage_bps ?? 0) > 0)) {
    return "review";
  }
  switch (state.host) {
    case "sheets":
      return "science";
    case "slides":
      return "visual";
    case "docs":
    case "drive":
    case "gmail":
    default:
      return "writing";
  }
}

export async function mintWorkspaceSeal(
  projectId: string,
  state: WorkspaceSessionState,
  contentText: string
): Promise<BrowserWroughtmarkSeal> {
  const bytes = new TextEncoder().encode(contentText);
  const coSigned = [`gws-${state.host}`];
  if (state.geminiUsed || state.beats.some((b) => Boolean(b.ai_disclosed))) {
    coSigned.push("gws-gemini-disclosed");
  }
  return mintBrowserSeal(
    projectId,
    state.beats,
    bytes,
    resolveWorkspaceDiscipline(state),
    coSigned
  );
}

/**
 * Format signed Google Drive v3 `appProperties` metadata for attaching a Wroughtmark
 * provenance receipt directly onto a Drive file without modifying document body bytes.
 */
export function buildDriveAppProperties(seal: BrowserWroughtmarkSeal): Record<string, string> {
  const tier =
    seal.summary.authorship_tier ??
    (seal.summary.anomaly_flags.length === 0 ? "HUMAN_WROUGHT" : "ANOMALY_FLAGGED");
  return {
    wroughtmark_seal_id: seal.seal_id,
    wroughtmark_tier: tier,
    wroughtmark_score: String(seal.summary.process_score),
    wroughtmark_sha256: seal.final_output_sha256,
    wroughtmark_chain_root: seal.chain_root,
    wroughtmark_seal_json: JSON.stringify(seal),
  };
}

/**
 * Verify a Google Drive file's `appProperties` Wroughtmark seal against local file bytes.
 */
export async function verifyDriveAppProperties(
  props: Record<string, string>,
  fileBytes: Uint8Array
): Promise<VerifyResult & { seal?: WroughtmarkSeal }> {
  const raw = props?.wroughtmark_seal_json;
  if (!raw) {
    return { valid: false, reason: "Missing wroughtmark_seal_json in Drive appProperties" };
  }
  try {
    const seal = JSON.parse(raw) as WroughtmarkSeal;
    if (props.wroughtmark_seal_id && props.wroughtmark_seal_id !== seal.seal_id) {
      return { valid: false, sealId: seal.seal_id, reason: "Drive appProperties seal_id mismatch" };
    }
    if (props.wroughtmark_sha256 && props.wroughtmark_sha256 !== seal.final_output_sha256) {
      return { valid: false, sealId: seal.seal_id, reason: "Drive appProperties sha256 mismatch" };
    }
    const verified = await verifySeal(fileBytes, seal);
    return { ...verified, seal };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : "Failed to verify Drive appProperties seal",
    };
  }
}

/**
 * Build deterministic Google Workspace `CardService`-compatible Card UI state for
 * Docs, Sheets, Slides, Drive, and Gmail sidebars.
 */
export function buildWorkspaceCardUi(
  state: WorkspaceSessionState,
  latestSeal?: BrowserWroughtmarkSeal
): WorkspaceCardUi {
  const stats = state.beats.length
    ? analyzeHeartbeats(state.beats)
    : { process_score: 0, anomaly_flags: [] as string[], authorship_tier: "HUMAN_WROUGHT" as const };
  const tier = latestSeal?.summary.authorship_tier ?? stats.authorship_tier;
  const score = latestSeal?.summary.process_score ?? stats.process_score;
  const geminiStatus =
    state.geminiUsed || state.beats.some((b) => Boolean(b.ai_disclosed))
      ? "DISCLOSED (Gemini for Workspace)"
      : "NONE DETECTED";

  return {
    header: {
      title: `Wroughtmark // gws-${state.host}`,
      subtitle: "Zero-Upload Human-Origin Ledger",
    },
    sections: [
      {
        header: "Session Telemetry & Authorship",
        widgets: [
          {
            type: "KEY_VALUE",
            label: "Process Score",
            text: state.beats.length ? `${score}/100` : "Standby",
          },
          {
            type: "KEY_VALUE",
            label: "Authorship Tier",
            text: tier,
          },
          {
            type: "KEY_VALUE",
            label: "Gemini Disclosure",
            text: geminiStatus,
          },
          {
            type: "TEXT_PARAGRAPH",
            text: `Recorded heartbeats: ${state.beats.length} (0 raw characters uploaded)`,
          },
        ],
      },
      {
        header: "Workspace & Drive Actions",
        widgets: [
          {
            type: "TEXT_BUTTON",
            text: "Record Snapshot",
            onClickAction: "onRecordWorkspaceSnapshot",
          },
          {
            type: "TEXT_BUTTON",
            text: "Attach Drive appProperties Seal",
            onClickAction: "onDriveItemsSelected",
          },
          {
            type: "TEXT_BUTTON",
            text: "Verify Gmail Attachment Seal",
            onClickAction: "onGmailMessageOpen",
          },
        ],
      },
    ],
  };
}

export function onHomepage(): WorkspaceCardUi {
  return buildWorkspaceCardUi(createWorkspaceSessionState("docs"));
}

export function onDriveItemsSelected(): WorkspaceCardUi {
  return buildWorkspaceCardUi(createWorkspaceSessionState("drive"));
}

export function onGmailMessageOpen(): WorkspaceCardUi {
  return buildWorkspaceCardUi(createWorkspaceSessionState("gmail"));
}
