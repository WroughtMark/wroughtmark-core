import {
  appendHeartbeat,
  mintBrowserSeal,
  type BrowserDiscipline,
  type BrowserHeartbeat,
  type BrowserWroughtmarkSeal,
} from "../../../browser-extension/src/chain";

export interface AdobeUxpSession {
  discipline: Extract<BrowserDiscipline, "visual" | "film">;
  beats: BrowserHeartbeat[];
  lastUnitCount: number;
  lastTimestampMs: number;
}

export function createAdobeSession(
  discipline: Extract<BrowserDiscipline, "visual" | "film">,
  nowMs = Date.now()
): AdobeUxpSession {
  return { discipline, beats: [], lastUnitCount: 0, lastTimestampMs: nowMs };
}

export async function recordAdobeUnitChange(
  session: AdobeUxpSession,
  unitCount: number,
  metadataJson: string,
  nowMs = Date.now(),
  timestampUtc = new Date(nowMs).toISOString()
): Promise<AdobeUxpSession> {
  const bytes = new TextEncoder().encode(metadataJson);
  const deltaUnits = Math.abs(unitCount - session.lastUnitCount);
  const deltaBytes = Math.max(bytes.length, deltaUnits * 128);
  const activeSeconds = Math.max(1, Math.round((nowMs - session.lastTimestampMs) / 1000));
  const beats = await appendHeartbeat(
    session.beats,
    bytes,
    activeSeconds,
    deltaBytes,
    0,
    timestampUtc
  );
  return {
    discipline: session.discipline,
    beats,
    lastUnitCount: unitCount,
    lastTimestampMs: nowMs,
  };
}

export async function mintAdobeSeal(
  projectId: string,
  session: AdobeUxpSession,
  finalExportBytes: Uint8Array
): Promise<BrowserWroughtmarkSeal> {
  return mintBrowserSeal(projectId, session.beats, finalExportBytes, session.discipline);
}
