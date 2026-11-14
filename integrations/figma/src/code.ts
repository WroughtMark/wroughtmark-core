import {
  analyzeHeartbeats,
  appendHeartbeat,
  mintBrowserSeal,
  type BrowserHeartbeat,
  type BrowserWroughtmarkSeal,
} from "../../../browser-extension/src/chain";

export interface FigmaCanvasSession {
  beats: BrowserHeartbeat[];
  lastNodeCount: number;
  lastTimestampMs: number;
}

export function createFigmaSession(nowMs = Date.now()): FigmaCanvasSession {
  return { beats: [], lastNodeCount: 0, lastTimestampMs: nowMs };
}

export async function recordFigmaDelta(
  session: FigmaCanvasSession,
  nodeCount: number,
  structuralSummaryJson: string,
  nowMs = Date.now(),
  timestampUtc = new Date(nowMs).toISOString()
): Promise<FigmaCanvasSession> {
  const bytes = new TextEncoder().encode(structuralSummaryJson);
  const deltaNodes = Math.abs(nodeCount - session.lastNodeCount);
  const deltaBytes = Math.max(bytes.length, deltaNodes * 64);
  const activeSeconds = Math.max(1, Math.round((nowMs - session.lastTimestampMs) / 1000));
  const beats = await appendHeartbeat(
    session.beats,
    bytes,
    activeSeconds,
    deltaBytes,
    0,
    timestampUtc
  );
  return { beats, lastNodeCount: nodeCount, lastTimestampMs: nowMs };
}

export async function mintFigmaSeal(
  projectId: string,
  session: FigmaCanvasSession,
  exportedAssetBytes: Uint8Array
): Promise<BrowserWroughtmarkSeal> {
  return mintBrowserSeal(projectId, session.beats, exportedAssetBytes, "visual");
}

export function figmaScoreSummary(session: FigmaCanvasSession) {
  return analyzeHeartbeats(session.beats);
}
