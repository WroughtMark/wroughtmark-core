import { appendHeartbeat, type BrowserHeartbeat } from "./chain";

declare const chrome: {
  storage: {
    local: {
      get: (keys: string[]) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
};

const STORAGE_KEY = "wm_browser_beats";
const TEXT_KEY = "wm_last_snapshot_sha_len";

let lastSnapshotLen = 0;
let pendingPasteBytes = 0;
let pendingRevisionEvents = 0;
let pendingKeystrokes = 0;
let pendingFocusSwitchInserts = 0;
let lastKeydownMs = 0;
let lastFocusTimeMs = 0;
let flightTimesMs: number[] = [];
let lastBeatTime = Date.now();

function computeFlightTimeCvBps(samples: number[]): number {
  if (samples.length < 8) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  if (mean <= 0) return 0;
  const variance =
    samples.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / samples.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(1, Math.min(65535, Math.round((stdDev / mean) * 10000)));
}

function readVisibleEditorText(): string {
  const active = document.activeElement as HTMLElement | null;
  if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
    return (active as HTMLTextAreaElement).value || "";
  }
  if (active && active.isContentEditable) {
    return active.innerText || "";
  }
  const docSurface =
    document.querySelector(".kix-appview-editor") ||
    document.querySelector(".cm-content") ||
    document.body;
  return (docSurface as HTMLElement | null)?.innerText || "";
}

async function flushHeartbeat() {
  const now = Date.now();
  const activeSeconds = Math.max(1, Math.round((now - lastBeatTime) / 1000));
  const text = readVisibleEditorText();
  const bytes = new TextEncoder().encode(text);
  const deltaBytes = Math.abs(bytes.length - lastSnapshotLen);
  if (deltaBytes === 0 && pendingPasteBytes === 0) return;

  const netGrowth = Math.max(0, bytes.length - lastSnapshotLen);
  const accounted = pendingPasteBytes + pendingKeystrokes * 2;
  const syntheticInsertBytes =
    netGrowth - accounted >= 40 ? netGrowth - accounted : 0;
  const keystrokeVarianceBps = computeFlightTimeCvBps(flightTimesMs);

  const stored = await chrome.storage.local.get([STORAGE_KEY]);
  const beats = Array.isArray(stored[STORAGE_KEY])
    ? (stored[STORAGE_KEY] as BrowserHeartbeat[])
    : [];

  const updated = await appendHeartbeat(
    beats,
    bytes,
    activeSeconds,
    deltaBytes,
    pendingPasteBytes,
    new Date(now).toISOString(),
    {
      synthetic_insert_bytes: syntheticInsertBytes,
      revision_events: pendingRevisionEvents,
      sampled_keystrokes: pendingKeystrokes,
      focus_switch_inserts: pendingFocusSwitchInserts,
      keystroke_variance_bps: keystrokeVarianceBps,
    }
  );
  await chrome.storage.local.set({
    [STORAGE_KEY]: updated,
    [TEXT_KEY]: bytes.length,
  });

  lastSnapshotLen = bytes.length;
  pendingPasteBytes = 0;
  pendingRevisionEvents = 0;
  pendingKeystrokes = 0;
  pendingFocusSwitchInserts = 0;
  flightTimesMs = [];
  lastBeatTime = now;
}

window.addEventListener("focus", () => {
  lastFocusTimeMs = Date.now();
});

document.addEventListener("keydown", (ev) => {
  const now = Date.now();
  if (ev.key === "Backspace" || ev.key === "Delete") {
    pendingRevisionEvents += 1;
    pendingKeystrokes += 1;
  } else if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") {
    pendingRevisionEvents += 1;
  } else if (ev.key.length === 1 || ev.key === "Enter") {
    pendingKeystrokes += 1;
  }
  if (lastKeydownMs > 0) {
    const dt = now - lastKeydownMs;
    if (dt >= 15 && dt <= 2500) {
      flightTimesMs.push(dt);
    }
  }
  lastKeydownMs = now;
});

document.addEventListener("paste", (ev) => {
  const pasted = ev.clipboardData?.getData("text/plain") || "";
  const len = new TextEncoder().encode(pasted).length;
  pendingPasteBytes += len;
  if (len >= 80 && Date.now() - lastFocusTimeMs <= 5000) {
    pendingFocusSwitchInserts += 1;
  }
});

setInterval(() => {
  void flushHeartbeat();
}, 15_000);
