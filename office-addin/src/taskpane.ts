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

declare const Word:
  | {
      run: <T>(
        fn: (context: {
          document: { body: { text: string; load: (p: string) => void } };
          sync: () => Promise<void>;
        }) => Promise<T>
      ) => Promise<T>;
    }
  | undefined;

declare const Excel:
  | {
      run: <T>(
        fn: (context: {
          workbook: {
            worksheets: {
              getActiveWorksheet: () => {
                name: string;
                getUsedRange: () => { values: unknown[][]; load: (p: string) => void };
                load: (p: string) => void;
              };
            };
          };
          sync: () => Promise<void>;
        }) => Promise<T>
      ) => Promise<T>;
    }
  | undefined;

declare const Office:
  | {
      onReady: (cb: () => void) => void;
      context?: {
        mailbox?: {
          item?: {
            subject?: string;
            body?: { getAsync: (coercion: string, cb: (r: { value: string }) => void) => void };
          };
        };
      };
    }
  | undefined;

export type M365HostKind = "word" | "excel" | "powerpoint" | "outlook";

export interface WordSessionState {
  beats: BrowserHeartbeat[];
  lastBytesLen: number;
  lastTimestampMs: number;
}

export interface M365SessionState extends WordSessionState {
  host: M365HostKind;
  copilotUsed: boolean;
}

export interface M365SnapshotOptions {
  host?: M365HostKind;
  annotationEvents?: number;
  viewportCoverageBps?: number;
  copilotAssisted?: boolean;
  structuralUnits?: number;
}

export function createWordSessionState(): WordSessionState {
  return { beats: [], lastBytesLen: 0, lastTimestampMs: Date.now() };
}

export function createM365SessionState(host: M365HostKind = "word"): M365SessionState {
  return { host, copilotUsed: false, ...createWordSessionState() };
}

async function appendOfficeSnapshot<T extends WordSessionState>(
  state: T,
  contentText: string,
  nowMs: number,
  timestampUtc: string,
  telemetry?: BrowserTelemetryOptions
): Promise<{ beats: BrowserHeartbeat[]; lastBytesLen: number; lastTimestampMs: number } | null> {
  const bytes = new TextEncoder().encode(contentText);
  const deltaBytes = Math.abs(bytes.length - state.lastBytesLen);
  if (deltaBytes === 0 && state.beats.length > 0 && !telemetry?.viewport_coverage_bps) {
    return null;
  }
  const activeSeconds = Math.max(1, Math.round((nowMs - state.lastTimestampMs) / 1000));
  const pasteSpikeBytes = deltaBytes > 50_000 && activeSeconds < 120 ? deltaBytes : 0;
  const beats = await appendHeartbeat(
    state.beats,
    bytes,
    activeSeconds,
    deltaBytes,
    pasteSpikeBytes,
    timestampUtc,
    telemetry
  );
  return {
    beats,
    lastBytesLen: bytes.length,
    lastTimestampMs: nowMs,
  };
}

export async function recordWordSnapshot(
  state: WordSessionState,
  documentText: string,
  nowMs = Date.now(),
  timestampUtc = new Date(nowMs).toISOString()
): Promise<WordSessionState> {
  const updated = await appendOfficeSnapshot(state, documentText, nowMs, timestampUtc);
  return updated ?? state;
}

export async function recordM365Snapshot(
  state: M365SessionState,
  contentText: string,
  options: M365SnapshotOptions = {},
  nowMs = Date.now(),
  timestampUtc = new Date(nowMs).toISOString()
): Promise<M365SessionState> {
  const host = options.host ?? state.host;
  const telemetry: BrowserTelemetryOptions = {
    adapter: host === "excel" ? "git" : options.viewportCoverageBps ? "inspection" : "text",
    annotation_events: options.annotationEvents,
    viewport_coverage_bps: options.viewportCoverageBps,
    ai_disclosed: options.copilotAssisted ? true : undefined,
    build_test_cycles: host === "excel" ? Math.max(1, options.structuralUnits ?? 1) : undefined,
  };
  const updated = await appendOfficeSnapshot(state, contentText, nowMs, timestampUtc, telemetry);
  if (!updated) return state;
  return {
    ...updated,
    host,
    copilotUsed: state.copilotUsed || Boolean(options.copilotAssisted),
  };
}

function resolveM365Discipline(state: M365SessionState): BrowserDiscipline {
  if (state.beats.some((b) => (b.viewport_coverage_bps ?? 0) > 0)) {
    return "review";
  }
  switch (state.host) {
    case "excel":
      return "science";
    case "powerpoint":
      return "visual";
    case "word":
    case "outlook":
    default:
      return "writing";
  }
}

export async function mintWordSeal(
  projectId: string,
  state: WordSessionState,
  documentText: string
): Promise<BrowserWroughtmarkSeal> {
  const bytes = new TextEncoder().encode(documentText);
  return mintBrowserSeal(projectId, state.beats, bytes);
}

export async function mintM365Seal(
  projectId: string,
  state: M365SessionState,
  contentText: string
): Promise<BrowserWroughtmarkSeal> {
  const bytes = new TextEncoder().encode(contentText);
  const coSigned = [`m365-${state.host}`];
  if (state.copilotUsed || state.beats.some((b) => Boolean(b.ai_disclosed))) {
    coSigned.push("m365-copilot-disclosed");
  }
  return mintBrowserSeal(
    projectId,
    state.beats,
    bytes,
    resolveM365Discipline(state),
    coSigned
  );
}

function escapeXmlAttr(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Serialize a deterministic OpenXML Custom XML Part (`customXml/wroughtmark.xml`) suitable
 * for embedding inside `.docx`, `.xlsx`, or `.pptx` packages.
 */
export function buildOpenXmlCustomPart(seal: BrowserWroughtmarkSeal): string {
  const safeJson = JSON.stringify(seal).replaceAll("]]>", "]]]]><![CDATA[>");
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<wroughtmark:seal xmlns:wroughtmark="https://wroughtmark.org/openxml/v0.3" sealId="${escapeXmlAttr(seal.seal_id)}" chainRoot="${escapeXmlAttr(seal.chain_root)}" sha256="${escapeXmlAttr(seal.final_output_sha256)}">`,
    `<![CDATA[${safeJson}]]>`,
    "</wroughtmark:seal>",
  ].join("\n");
}

/**
 * Parse a `customXml/wroughtmark.xml` payload and verify its embedded Ed25519 seal
 * against the exported Office content bytes.
 */
export async function extractAndVerifyOpenXmlCustomPart(
  xml: string,
  documentBytes: Uint8Array
): Promise<VerifyResult & { seal?: WroughtmarkSeal }> {
  const match = xml.match(/<!\[CDATA\[([\s\S]*)\]\]>/);
  if (!match) {
    return { valid: false, reason: "Missing OpenXML CDATA seal payload" };
  }
  try {
    const rawJson = match[1].replaceAll("]]]]><![CDATA[>", "]]>");
    const seal = JSON.parse(rawJson) as WroughtmarkSeal;
    const result = await verifySeal(documentBytes, seal);
    return { ...result, seal };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : "Failed to parse OpenXML Wroughtmark part",
    };
  }
}

let liveState = createM365SessionState("word");

async function readActiveM365Text(host: M365HostKind): Promise<string> {
  if (host === "word" && typeof Word !== "undefined") {
    return Word.run(async (context) => {
      const body = context.document.body;
      body.load("text");
      await context.sync();
      return body.text || "";
    });
  }
  if (host === "excel" && typeof Excel !== "undefined") {
    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      sheet.load("name");
      const range = sheet.getUsedRange();
      range.load("values");
      await context.sync();
      return JSON.stringify({ sheet: sheet.name, values: range.values });
    });
  }
  if (host === "outlook" && Office?.context?.mailbox?.item?.body) {
    return new Promise((resolve) => {
      Office.context?.mailbox?.item?.body?.getAsync("text", (res) => {
        resolve(res?.value || Office?.context?.mailbox?.item?.subject || "");
      });
    });
  }
  return "";
}

function renderStats() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("stats");
  if (!el) return;
  if (!liveState.beats.length) {
    el.textContent = `0 recorded heartbeats on m365-${liveState.host}. Edit to begin.`;
    return;
  }
  const { process_score, anomaly_flags, authorship_tier } = analyzeHeartbeats(liveState.beats);
  const totalSecs = liveState.beats.reduce((a, b) => a + b.active_seconds, 0);
  const flags = anomaly_flags.length ? anomaly_flags.join(", ") : "CLEAN";
  el.innerHTML =
    `<div>Host: <strong>m365-${liveState.host}</strong> (${authorship_tier})</div>` +
    `<div>Sessions: <strong>${liveState.beats.length}</strong> (${totalSecs}s active)</div>` +
    `<div class="${process_score >= 80 ? "ok" : "warn"}">Score: <strong>${process_score}/100</strong> (${flags})</div>`;
}

if (typeof document !== "undefined") {
  const hostSelect = document.getElementById("hostSelect") as HTMLSelectElement | null;
  const copilotToggle = document.getElementById("copilotToggle") as HTMLInputElement | null;

  hostSelect?.addEventListener("change", () => {
    const nextHost = (hostSelect.value as M365HostKind) || "word";
    liveState = createM365SessionState(nextHost);
    renderStats();
  });

  const sampleAndRender = async () => {
    const text = await readActiveM365Text(liveState.host);
    if (text) {
      liveState = await recordM365Snapshot(liveState, text, {
        host: liveState.host,
        copilotAssisted: Boolean(copilotToggle?.checked),
      });
      renderStats();
    }
  };

  document.getElementById("sampleBtn")?.addEventListener("click", () => {
    void sampleAndRender();
  });

  document.getElementById("exportSealBtn")?.addEventListener("click", async () => {
    if (!liveState.beats.length) return;
    const text = await readActiveM365Text(liveState.host);
    const seal = await mintM365Seal(
      `m365-${liveState.host}-doc`,
      liveState,
      text || JSON.stringify(liveState.beats)
    );
    const blob = new Blob([JSON.stringify(seal, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${seal.seal_id}.seal.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById("exportCustomXmlBtn")?.addEventListener("click", async () => {
    if (!liveState.beats.length) return;
    const text = await readActiveM365Text(liveState.host);
    const seal = await mintM365Seal(
      `m365-${liveState.host}-doc`,
      liveState,
      text || JSON.stringify(liveState.beats)
    );
    const xml = buildOpenXmlCustomPart(seal);
    const blob = new Blob([xml], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wroughtmark.xml";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById("resetBtn")?.addEventListener("click", () => {
    const curHost = (hostSelect?.value as M365HostKind) || liveState.host;
    liveState = createM365SessionState(curHost);
    renderStats();
  });

  if (typeof Office !== "undefined") {
    Office.onReady(() => {
      renderStats();
      setInterval(() => {
        void sampleAndRender();
      }, 15_000);
    });
  }
}
