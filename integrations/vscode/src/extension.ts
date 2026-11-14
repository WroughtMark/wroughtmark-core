import {
  analyzeHeartbeats,
  appendHeartbeat,
  mintBrowserSeal,
  type BrowserHeartbeat,
  type BrowserTelemetryOptions,
  type BrowserWroughtmarkSeal,
} from "../../../browser-extension/src/chain";

export interface VsCodeSession {
  beats: BrowserHeartbeat[];
  lastTimestampMs: number;
}

export function createVsCodeSession(nowMs = Date.now()): VsCodeSession {
  return { beats: [], lastTimestampMs: nowMs };
}

export async function recordEditorDelta(
  session: VsCodeSession,
  fullText: string,
  deltaBytes: number,
  nowMs = Date.now(),
  timestampUtc = new Date(nowMs).toISOString(),
  telemetry?: BrowserTelemetryOptions
): Promise<VsCodeSession> {
  const bytes = new TextEncoder().encode(fullText);
  const activeSeconds = Math.max(1, Math.round((nowMs - session.lastTimestampMs) / 1000));
  const pasteSpikeBytes = deltaBytes > 50_000 && activeSeconds < 120 ? deltaBytes : 0;
  const beats = await appendHeartbeat(
    session.beats,
    bytes,
    activeSeconds,
    deltaBytes,
    pasteSpikeBytes,
    timestampUtc,
    telemetry
  );
  return { beats, lastTimestampMs: nowMs };
}

export async function mintVsCodeSeal(
  projectId: string,
  session: VsCodeSession,
  finalText: string
): Promise<BrowserWroughtmarkSeal> {
  return mintBrowserSeal(projectId, session.beats, new TextEncoder().encode(finalText));
}

export function formatStatusBarText(session: VsCodeSession): string {
  if (!session.beats.length) return "Wroughtmark: 0 beats";
  const { process_score, anomaly_flags } = analyzeHeartbeats(session.beats);
  const tag = anomaly_flags.length ? anomaly_flags.join(", ") : "CLEAN";
  return `Wroughtmark: ${process_score}/100 (${tag})`;
}
