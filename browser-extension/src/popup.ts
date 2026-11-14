import { analyzeHeartbeats, mintBrowserSeal, type BrowserHeartbeat } from "./chain";

declare const chrome: {
  storage: {
    local: {
      get: (keys: string[]) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
};

const STORAGE_KEY = "wm_browser_beats";

async function loadBeats(): Promise<BrowserHeartbeat[]> {
  const stored = await chrome.storage.local.get([STORAGE_KEY]);
  return Array.isArray(stored[STORAGE_KEY])
    ? (stored[STORAGE_KEY] as BrowserHeartbeat[])
    : [];
}

async function render() {
  const beats = await loadBeats();
  const stats = document.getElementById("stats")!;
  if (!beats.length) {
    stats.textContent = "0 recorded heartbeats yet. Edit in Google Docs, Overleaf, or Canvas to begin.";
    return;
  }
  const { process_score, anomaly_flags } = analyzeHeartbeats(beats);
  const totalSecs = beats.reduce((a, b) => a + b.active_seconds, 0);
  const flags = anomaly_flags.length ? anomaly_flags.join(", ") : "CLEAN";
  stats.innerHTML =
    `<div>Sessions: <strong>${beats.length}</strong> (${totalSecs}s active)</div>` +
    `<div class="${process_score >= 80 ? "ok" : "warn"}">Score: <strong>${process_score}/100</strong> (${flags})</div>`;
}

document.getElementById("exportSealBtn")?.addEventListener("click", async () => {
  const beats = await loadBeats();
  if (!beats.length) return;
  const seal = await mintBrowserSeal(
    "browser-draft",
    beats,
    new TextEncoder().encode(JSON.stringify(beats))
  );
  const blob = new Blob([JSON.stringify(seal, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${seal.seal_id}.seal.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("resetBtn")?.addEventListener("click", async () => {
  await chrome.storage.local.set({ [STORAGE_KEY]: [] });
  await render();
});

void render();
