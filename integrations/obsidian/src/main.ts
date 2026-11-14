import {
  analyzeHeartbeats,
  appendHeartbeat,
  mintBrowserSeal,
  type BrowserHeartbeat,
  type BrowserWroughtmarkSeal,
} from "../../../browser-extension/src/chain";

export interface ObsidianVaultSession {
  beats: BrowserHeartbeat[];
  lastBytesLen: number;
  lastTimestampMs: number;
}

export function createObsidianSession(nowMs = Date.now()): ObsidianVaultSession {
  return { beats: [], lastBytesLen: 0, lastTimestampMs: nowMs };
}

export async function recordVaultNoteChange(
  session: ObsidianVaultSession,
  noteMarkdown: string,
  nowMs = Date.now(),
  timestampUtc = new Date(nowMs).toISOString()
): Promise<ObsidianVaultSession> {
  const bytes = new TextEncoder().encode(noteMarkdown);
  const deltaBytes = Math.abs(bytes.length - session.lastBytesLen);
  const activeSeconds = Math.max(1, Math.round((nowMs - session.lastTimestampMs) / 1000));
  const pasteSpikeBytes = deltaBytes > 50_000 && activeSeconds < 120 ? deltaBytes : 0;
  const beats = await appendHeartbeat(
    session.beats,
    bytes,
    activeSeconds,
    deltaBytes,
    pasteSpikeBytes,
    timestampUtc
  );
  return { beats, lastBytesLen: bytes.length, lastTimestampMs: nowMs };
}

export async function mintObsidianSeal(
  vaultNoteId: string,
  session: ObsidianVaultSession,
  finalMarkdown: string
): Promise<BrowserWroughtmarkSeal> {
  return mintBrowserSeal(vaultNoteId, session.beats, new TextEncoder().encode(finalMarkdown), "writing");
}

export function obsidianScoreSummary(session: ObsidianVaultSession) {
  return analyzeHeartbeats(session.beats);
}
