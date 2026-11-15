import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifySealSignature, type WroughtmarkSeal } from "./verify";

function escHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class SealRegistry {
  private db: Database;

  constructor(dbPath?: string) {
    const resolved = dbPath ?? SealRegistry.defaultDbPath();
    this.db = new Database(resolved);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS public_seals (
        seal_id TEXT PRIMARY KEY,
        discipline TEXT NOT NULL,
        process_score INTEGER NOT NULL,
        seal_json TEXT NOT NULL,
        registered_at_utc TEXT NOT NULL
      )
    `);
  }

  private static defaultDbPath(): string {
    const envDir = process.env.WROUGHTMARK_DATA_DIR?.trim();
    if (envDir) {
      mkdirSync(envDir, { recursive: true });
      return join(envDir, "wroughtmark.db");
    }
    return join(tmpdir(), "wroughtmark-seals.db");
  }

  /**
   * Verify a seal's Ed25519 signature over canonical JSON and persist ONLY
   * non-content seal metadata for public shareable `/v/:sealId` lookup.
   */
  async registerSeal(seal: WroughtmarkSeal): Promise<{ ok: boolean; sealId?: string; reason?: string }> {
    const sigCheck = await verifySealSignature(seal);
    if (!sigCheck.valid) {
      return { ok: false, sealId: seal?.seal_id, reason: sigCheck.reason };
    }

    this.db
      .prepare(
        `INSERT INTO public_seals (seal_id, discipline, process_score, seal_json, registered_at_utc)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(seal_id) DO UPDATE SET
           discipline = excluded.discipline,
           process_score = excluded.process_score,
           seal_json = excluded.seal_json,
           registered_at_utc = excluded.registered_at_utc`
      )
      .run(
        seal.seal_id,
        seal.summary.discipline,
        seal.summary.process_score,
        JSON.stringify(seal),
        new Date().toISOString()
      );

    return { ok: true, sealId: seal.seal_id };
  }

  getSeal(sealId: string): { seal: WroughtmarkSeal; registeredAtUtc: string } | null {
    const row = this.db
      .prepare("SELECT seal_json, registered_at_utc FROM public_seals WHERE seal_id = ?1")
      .get(sealId) as { seal_json: string; registered_at_utc: string } | null;
    if (!row) return null;
    return {
      seal: JSON.parse(row.seal_json) as WroughtmarkSeal,
      registeredAtUtc: row.registered_at_utc,
    };
  }
}

/** Render a standalone Obsidian/Stone cryptographic verification page for `/v/:sealId`. */
export function renderPublicReceiptHtml(
  seal: WroughtmarkSeal,
  registeredAtUtc: string,
  origin: string
): string {
  const cleanOrigin = origin.replace(/\/+$/, "");
  const flags = seal.summary.anomaly_flags?.length
    ? seal.summary.anomaly_flags.map(escHtml).join(" · ")
    : "CLEAN";
  const tier = escHtml(
    seal.summary.authorship_tier ??
      (seal.summary.anomaly_flags?.length ? "ANOMALY_FLAGGED" : "HUMAN_WROUGHT")
  );
  const devices = seal.summary.co_signed_devices?.length
    ? seal.summary.co_signed_devices.map(escHtml).join(" · ")
    : "Workstation Key Only";
  const badgeTone = seal.summary.anomaly_flags?.length ? "#9D6616" : "#0F6E43";
  const badgeSnippet = `<script type="module" src="${cleanOrigin}/sdk/wroughtmark-badge.js"></script>\n<wroughtmark-badge seal-id="${escHtml(seal.seal_id)}" discipline="${escHtml(seal.summary.discipline)}" sessions="${escHtml(seal.summary.session_count)}" active-seconds="${escHtml(seal.summary.total_active_seconds)}" verify-url="${cleanOrigin}/v/${escHtml(seal.seal_id)}"></wroughtmark-badge>`;

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Wroughtmark Receipt — ${escHtml(seal.seal_id)}</title>
  <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/brand/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/brand/apple-touch-icon.png" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Sans:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <script type="module" src="/sdk/wroughtmark-badge.js"></script>
  <style>
    :root {
      --bg: #090A0D; --surface: #111318; --border: #2C3240; --rule: #222630;
      --ink: #F2F4F8; --ash: #A1A8B6; --brass: #E2AC55;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: "Plus Jakarta Sans", sans-serif; line-height: 1.55; padding: 32px 20px; }
    .wrap { max-width: 880px; margin: 0 auto; border: 1px solid var(--border); background: var(--surface); padding: 32px; }
    .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--rule); padding-bottom: 14px; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
    .kicker { font-family: "IBM Plex Mono", monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--brass); }
    a.back { color: var(--ash); font-family: "IBM Plex Mono", monospace; font-size: 11px; text-decoration: none; text-transform: uppercase; }
    a.back:hover { color: var(--brass); }
    h1 { font-family: "Instrument Sans", sans-serif; font-size: 32px; letter-spacing: -0.03em; margin: 0 0 12px; }
    .pill { display: inline-block; padding: 6px 12px; font-family: "IBM Plex Mono", monospace; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; background: ${badgeTone}; color: #FFFFFF; margin-bottom: 22px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 24px; }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
    .cell { border: 1px solid var(--rule); background: var(--bg); padding: 14px; }
    .lbl { font-family: "IBM Plex Mono", monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ash); }
    .val { font-family: "IBM Plex Mono", monospace; font-size: 12px; margin-top: 6px; word-break: break-all; }
    .box { border-top: 1px solid var(--rule); padding-top: 20px; margin-top: 20px; }
    pre { background: var(--bg); border: 1px solid var(--rule); padding: 12px; font-family: "IBM Plex Mono", monospace; font-size: 11px; overflow-x: auto; color: var(--ash); }
    input[type=file] { margin-top: 8px; font-family: "IBM Plex Mono", monospace; font-size: 12px; color: var(--ink); }
    #hashResult { margin-top: 10px; font-family: "IBM Plex Mono", monospace; font-size: 12px; }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="top">
      <span class="kicker">Wroughtmark // Public Verification Receipt</span>
      <a class="back" href="/#instrument">← Open Assay Console</a>
    </div>
    <h1>${escHtml(seal.seal_id)}</h1>
    <div class="pill">Ed25519 Signature Valid · ${tier} · Score ${escHtml(seal.summary.process_score)}/100 · ${flags}</div>
    <div class="grid">
      <div class="cell"><div class="lbl">Authorship Tier</div><div class="val">${tier}</div></div>
      <div class="cell"><div class="lbl">Co-Signed Hardware</div><div class="val">${devices}</div></div>
      <div class="cell"><div class="lbl">Discipline &amp; Project</div><div class="val">${escHtml(seal.summary.discipline)} / ${escHtml(seal.project_id)}</div></div>
      <div class="cell"><div class="lbl">Sessions / Active Time</div><div class="val">${escHtml(seal.summary.session_count)} session(s) · ${escHtml(seal.summary.total_active_seconds)}s</div></div>
      <div class="cell"><div class="lbl">Deliverable SHA-256</div><div class="val">${escHtml(seal.final_output_sha256)}</div></div>
      <div class="cell"><div class="lbl">Chain Merkle Root</div><div class="val">${escHtml(seal.chain_root)}</div></div>
      <div class="cell"><div class="lbl">Creator Public Key</div><div class="val">${escHtml(seal.creator_pubkey_hex)}</div></div>
      <div class="cell"><div class="lbl">Registered (Zero Raw Uploads)</div><div class="val">${escHtml(registeredAtUtc)}</div></div>
    </div>

    <div class="box">
      <div class="lbl">Verify Downloaded File Locally Against This Receipt (WebCrypto SHA-256)</div>
      <input id="localFileInput" type="file" />
      <div id="hashResult" style="color:var(--ash);">Drop or select the exported file on your machine; 0 bytes leave your browser.</div>
    </div>

    <div class="box">
      <div class="lbl">Embeddable Badge &amp; Markup</div>
      <div style="margin: 12px 0;">
        <wroughtmark-badge seal-id="${escHtml(seal.seal_id)}" discipline="${escHtml(seal.summary.discipline)}" sessions="${escHtml(seal.summary.session_count)}" active-seconds="${escHtml(seal.summary.total_active_seconds)}" verify-url="${cleanOrigin}/v/${escHtml(seal.seal_id)}"></wroughtmark-badge>
      </div>
      <pre>${escHtml(badgeSnippet)}</pre>
    </div>

    <div style="margin-top: 22px; padding-top: 14px; border-top: 1px solid var(--rule); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ash);">
      <span>wroughtmark.com · Open Protocol v0.3</span>
      <a class="back" href="/#cookie-settings">Cookie Settings</a>
    </div>
  </main>
  <script>
    const expected = ${JSON.stringify(seal.final_output_sha256)};
    document.getElementById('localFileInput').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      const out = document.getElementById('hashResult');
      if (!f) return;
      const buf = await f.arrayBuffer();
      const dig = await crypto.subtle.digest('SHA-256', buf);
      const hex = Array.from(new Uint8Array(dig)).map((b) => b.toString(16).padStart(2, '0')).join('');
      if (hex === expected) {
        out.style.color = '#34D399';
        out.textContent = 'MATCH VERIFIED: local file SHA-256 matches sealed receipt (' + hex + ')';
      } else {
        out.style.color = '#F87171';
        out.textContent = 'HASH MISMATCH: file is ' + hex + ', expected ' + expected;
      }
    });
  </script>
</body>
</html>`;
}
