import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BADGE_SCRIPT } from "./badge";
import {
  buildCohortDemo,
  buildSingleScenario,
  type DemoScenarioKind,
  type DemoSubmissionBundle,
} from "./demos";
import {
  authorizeLmsRequest,
  buildLtiToolConfig,
  verifyLmsBatch,
  verifyLmsSubmission,
  type LmsVerifyRequest,
} from "./lms";
import {
  buildUscoManifestPayload,
  mintBlindTimeAnchor,
  runSuiteBridgeDemo,
  verifyGitPrRequest,
  verifyHiringAssessmentRequest,
  type SuiteDemoKind,
} from "./enterprise";
import { renderPublicReceiptHtml, SealRegistry } from "./registry";
import { renderBlogIndexHtml, renderBlogPostHtml, BLOG_POSTS } from "./blog";
import { renderPrivacyPolicyHtml, renderTermsOfUseHtml } from "./legal";
import { verifyEmbeddedContainerBytes, verifySeal, type WroughtmarkSeal } from "./verify";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");

function resolveRustBin(): string | null {
  const candidates = [
    process.env.WROUGHTMARK_BIN,
    join(REPO_ROOT, "core/target/release/wroughtmark"),
    join(REPO_ROOT, "core/target/debug/wroughtmark"),
    "/usr/local/bin/wroughtmark",
  ].filter((p): p is string => Boolean(p));
  return candidates.find((p) => existsSync(p)) ?? null;
}

function resolveBrandDir(): string {
  const candidates = [
    process.env.WROUGHTMARK_BRAND_DIR,
    join(REPO_ROOT, "brand"),
    resolve(HERE, "../brand"),
  ].filter((p): p is string => Boolean(p));
  return candidates.find((p) => existsSync(p)) ?? join(REPO_ROOT, "brand");
}

const RUST_BIN = resolveRustBin();
const BRAND_DIR = resolveBrandDir();
const registry = new SealRegistry();

function mintRustFilmSample(): DemoSubmissionBundle {
  if (!RUST_BIN) {
    throw new Error("wroughtmark binary unavailable");
  }
  const dir = mkdtempSync(join(tmpdir(), "wm-sample-"));
  try {
    const draftPath = join(dir, "rough_cut.drp");
    const finalPath = join(dir, "wroughtmark_sample_reel.txt");
    const keyPath = join(dir, "key.json");
    const chainPath = join(dir, "chain.json");
    const sealPath = join(dir, "seal.json");

    writeFileSync(draftPath, "timeline_v1_human_edit");
    const finalText = "Wroughtmark sample deliverable: scored, cut, and mastered by human hands.";
    const finalBytes = new TextEncoder().encode(finalText);
    writeFileSync(finalPath, finalBytes);

    Bun.spawnSync([RUST_BIN, "keygen", keyPath]);
    Bun.spawnSync([RUST_BIN, "record", chainPath, keyPath, "nle", draftPath, "2700"]);
    Bun.spawnSync([RUST_BIN, "seal", chainPath, keyPath, "film", finalPath, sealPath]);

    const seal = JSON.parse(readFileSync(sealPath, "utf8")) as WroughtmarkSeal;
    return {
      scenario: "SINGLE_SESSION_REEL",
      fileName: "wroughtmark_sample_reel.txt",
      fileBase64: Buffer.from(finalBytes).toString("base64"),
      seal,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Wroughtmark — Kinetic Assay Foundry</title>
  <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg?v=3" />
  <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32x32.png?v=3" />
  <link rel="icon" type="image/png" sizes="16x16" href="/brand/favicon-16x16.png?v=3" />
  <link rel="apple-touch-icon" sizes="180x180" href="/brand/apple-touch-icon.png?v=3" />
  <link rel="shortcut icon" href="/favicon.ico?v=3" />
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
  <script>
    (function () {
      try {
        var consentRaw = localStorage.getItem('wroughtmark-cookie-consent');
        var consent = consentRaw ? JSON.parse(consentRaw) : null;
        var allowFunctional = Boolean(consent && consent.version === '1.0' && consent.functional === true);
        var saved = allowFunctional ? localStorage.getItem('wroughtmark-theme') : null;
        var sys = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', saved || (allowFunctional ? sys : 'dark') || 'dark');
      } catch (e) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Sans:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root,
    html[data-theme="dark"] {
      color-scheme: dark;
      --bg: #090A0D;
      --surface: #111318;
      --surface-hi: #171A21;
      --surface-lo: #0E1015;
      --ink: #F2F4F8;
      --ash: #A1A8B6;
      --dim: #6D7586;
      --rule: #222630;
      --border: #2C3240;
      --brass: #E2AC55;
      --brass-hi: #F0C477;
      --brass-ink: #090A0D;
      --btn-bg: #F2F4F8;
      --btn-ink: #090A0D;
      --verdigris: #34D399;
      --ok-bg: #0B2218;
      --ok-border: #34D399;
      --crimson: #F87171;
      --bad-bg: #281115;
      --bad-border: #F87171;
      --chamber-bg: radial-gradient(circle at 52% 44%, #151820 0%, #090A0D 74%);
      --chamber-rail-bg: #0D0F14;
      --chamber-rail-border: #1E2128;
      --chamber-rail-ink: var(--brass-hi);
      --chamber-rail-muted: #8A8F99;
      --wire-bg: #111318;
      --wire-ink: #9BA2B0;
      --inst-bg: #0D0F13;
      --inst-panel: #13161D;
      --inst-input: #171B24;
      --inst-border: #282D3A;
      --inst-muted: #8B92A1;
      --badge-mount: #090A0D;
      --grain-opacity: 0.022;
      --display: "Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      --sans: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    html[data-theme="light"] {
      color-scheme: light;
      --bg: #F7F7F5;
      --surface: #FFFFFF;
      --surface-hi: #ECECE9;
      --surface-lo: #F1F2F4;
      --ink: #0F1218;
      --ash: #49505E;
      --dim: #6E7686;
      --rule: #D7DBE3;
      --border: #171A21;
      --brass: #9D6616;
      --brass-hi: #C98B2B;
      --brass-ink: #FFFFFF;
      --btn-bg: #0F1218;
      --btn-ink: #FFFFFF;
      --verdigris: #0F6E43;
      --ok-bg: #E9F5EE;
      --ok-border: #0F6E43;
      --crimson: #B91C1C;
      --bad-bg: #FEF2F2;
      --bad-border: #B91C1C;
      --chamber-bg: radial-gradient(circle at 52% 44%, #FFFFFF 0%, #ECECE6 70%, #DFE1DA 100%);
      --chamber-rail-bg: #ECECE8;
      --chamber-rail-border: var(--rule);
      --chamber-rail-ink: var(--brass);
      --chamber-rail-muted: var(--dim);
      --wire-bg: #0F1218;
      --wire-ink: #A1A8B6;
      --inst-bg: #EFEFEA;
      --inst-panel: #FFFFFF;
      --inst-input: #F7F7F5;
      --inst-border: #C9CED8;
      --inst-muted: #596170;
      --badge-mount: #ECECE9;
      --grain-opacity: 0.028;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: var(--sans);
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
      position: relative;
      overflow-x: hidden;
      transition: background 180ms ease, color 180ms ease;
    }
    .paper-grain {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 900;
      opacity: var(--grain-opacity);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }
    .reg-mark {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--dim);
      user-select: none;
      line-height: 1;
    }
    .mast {
      border-bottom: 1px solid var(--border);
      background: var(--bg);
      position: sticky;
      top: 0;
      z-index: 200;
      backdrop-filter: blur(8px);
    }
    .mast-inner {
      max-width: 1360px;
      margin: 0 auto;
      padding: 13px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .mast-right {
      display: flex;
      align-items: center;
      gap: 22px;
      flex-wrap: wrap;
    }
    .theme-switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--surface);
      color: var(--ink);
      border: 1px solid var(--border);
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
    }
    .theme-switch:hover {
      border-color: var(--brass);
      color: var(--brass);
    }
    .theme-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--brass);
      box-shadow: inset -3px 0 0 var(--bg);
      transition: transform 200ms ease;
    }
    html[data-theme="light"] .theme-dot {
      box-shadow: none;
      background: var(--brass);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--ink);
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .brand img {
      width: 24px;
      height: 24px;
      object-fit: cover;
      border: 1px solid var(--border);
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      background: var(--verdigris);
      display: inline-block;
      margin-right: 6px;
    }
    .mast-links {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .mast-links a {
      color: var(--ash);
      text-decoration: none;
      font-family: var(--mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transition: color 120ms ease;
    }
    .mast-links a:hover { color: var(--brass); }

    .stage-split {
      max-width: 1360px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1.08fr 0.92fr;
      border-bottom: 1px solid var(--border);
      min-height: 640px;
    }
    @media (max-width: 960px) {
      .stage-split { grid-template-columns: 1fr; min-height: auto; }
    }
    .stage-copy {
      padding: 44px 40px 36px 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 1px solid var(--border);
      position: relative;
    }
    @media (max-width: 960px) {
      .stage-copy { border-right: none; border-bottom: 1px solid var(--border); padding: 32px 24px; }
    }
    .copy-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
    }
    .eyebrow {
      font-family: var(--mono);
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--brass);
      font-weight: 600;
    }
    h1 {
      font-family: var(--display);
      font-weight: 700;
      font-size: clamp(44px, 5vw, 76px);
      line-height: 0.96;
      letter-spacing: -0.04em;
      margin: 0 0 22px;
      max-width: 12ch;
    }
    h1 em {
      font-style: normal;
      color: var(--brass);
      font-weight: 600;
    }
    .lead {
      font-size: 16px;
      color: var(--ash);
      max-width: 50ch;
      margin: 0 0 28px;
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 36px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid var(--border);
      border-radius: 0;
      transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
    }
    .btn-primary { background: var(--btn-bg); color: var(--btn-ink); border-color: var(--btn-bg); }
    .btn-primary:hover { background: var(--brass); border-color: var(--brass); color: var(--brass-ink); }
    .btn-ghost { background: var(--surface); color: var(--ink); border-color: var(--border); }
    .btn-ghost:hover { background: var(--ink); color: var(--bg); border-color: var(--ink); }
    .spec-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      border-top: 1px solid var(--border);
      padding-top: 14px;
      gap: 14px;
    }
    @media (max-width: 760px) { .spec-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .spec-cell-k {
      font-family: var(--mono);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--dim);
      margin-bottom: 3px;
    }
    .spec-cell-v {
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 600;
      color: var(--ink);
      font-variant-numeric: tabular-nums;
    }

    .stage-chamber {
      background: var(--chamber-bg);
      color: var(--ink);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      min-height: 540px;
      transition: background 200ms ease, color 200ms ease;
    }
    .chamber-viewport {
      position: relative;
      flex: 1 1 auto;
      min-height: 460px;
    }
    #seal3dCanvas {
      width: 100%;
      height: 100%;
      display: block;
      cursor: grab;
    }
    #seal3dCanvas:active { cursor: grabbing; }
    .chamber-rail {
      background: var(--chamber-rail-bg);
      border-top: 1px solid var(--chamber-rail-border);
      padding: 10px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: nowrap;
      white-space: nowrap;
      overflow: hidden;
      font-family: var(--mono);
      font-size: 9.5px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--chamber-rail-ink);
      font-variant-numeric: tabular-nums;
      transition: background 200ms ease, border-color 200ms ease, color 200ms ease;
    }
    .chamber-rail-muted {
      color: var(--chamber-rail-muted);
      transition: color 200ms ease;
    }

    /* Protocol Wire Ticker Strip */
    .wire-strip {
      background: var(--wire-bg);
      color: var(--wire-ink);
      border-bottom: 1px solid var(--border);
      font-family: var(--mono);
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      overflow: hidden;
    }
    .wire-inner {
      max-width: 1360px;
      margin: 0 auto;
      padding: 10px 28px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }
    .wire-inner strong { color: var(--brass-hi); font-weight: 500; }

    /* Broadsheet Editorial Counter-Thesis Spread */
    .broadsheet {
      max-width: 1360px;
      margin: 0 auto;
      padding: 68px 28px 64px;
      border-bottom: 1px solid var(--border);
      display: grid;
      grid-template-columns: 1.45fr 0.55fr;
      gap: 56px;
      align-items: start;
    }
    @media (max-width: 920px) { .broadsheet { grid-template-columns: 1fr; padding: 48px 20px; gap: 36px; } }
    .thesis-pull {
      font-family: var(--display);
      font-size: clamp(26px, 3vw, 40px);
      line-height: 1.14;
      letter-spacing: -0.032em;
      margin: 0 0 26px;
      font-weight: 600;
    }
    .thesis-pull em { font-style: normal; color: var(--brass); }
    .newspaper-cols {
      column-count: 2;
      column-gap: 36px;
      column-rule: 1px solid var(--rule);
      font-size: 14.5px;
      color: var(--ash);
      line-height: 1.68;
    }
    @media (max-width: 680px) { .newspaper-cols { column-count: 1; } }
    .newspaper-cols p { margin: 0 0 14px; }
    .schematic-folio {
      border-left: 1px solid var(--border);
      padding-left: 26px;
    }
    @media (max-width: 920px) { .schematic-folio { border-left: none; border-top: 1px solid var(--border); padding: 24px 0 0; } }
    .folio-kicker {
      font-family: var(--mono);
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--brass);
      margin-bottom: 16px;
      font-weight: 600;
    }
    .chain-node {
      position: relative;
      padding: 0 0 18px 20px;
      border-left: 1px dashed var(--rule);
    }
    .chain-node:last-child { border-left: 1px solid transparent; padding-bottom: 0; }
    .chain-node::before {
      content: "";
      position: absolute;
      left: -4.5px;
      top: 4px;
      width: 8px;
      height: 8px;
      background: var(--bg);
      border: 1.5px solid var(--ink);
    }
    .chain-node.sealed::before { background: var(--brass); border-color: var(--brass); }
    .chain-t {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--dim);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .chain-label {
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 600;
      color: var(--ink);
      margin: 2px 0;
    }
    .chain-hash {
      font-family: var(--mono);
      font-size: 10.5px;
      color: var(--ash);
    }

    /* Full-Bleed Assay Instrument (Themed Hardware Console) */
    .darkroom {
      background: var(--inst-bg);
      color: var(--ink);
      border-bottom: 1px solid var(--border);
    }
    .darkroom-inner {
      max-width: 1360px;
      margin: 0 auto;
      padding: 56px 28px 68px;
    }
    @media (max-width: 640px) { .darkroom-inner { padding: 40px 20px; } }
    .console-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      border-bottom: 1px solid var(--rule);
      padding-bottom: 18px;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }
    .console-title {
      font-family: var(--display);
      font-size: clamp(26px, 2.8vw, 38px);
      font-weight: 600;
      margin: 6px 0 0;
      letter-spacing: -0.032em;
      color: var(--ink);
    }
    .console-tabs {
      display: flex;
      gap: 0;
      border: 1px solid var(--inst-border);
      background: var(--inst-panel);
      flex-wrap: wrap;
    }
    .ctab {
      background: transparent;
      color: var(--inst-muted);
      border: none;
      border-right: 1px solid var(--inst-border);
      padding: 11px 18px;
      font-family: var(--mono);
      font-size: 10.5px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease;
    }
    .ctab:last-child { border-right: none; }
    .ctab:hover { color: var(--ink); background: var(--surface-hi); }
    .ctab.active {
      background: var(--brass);
      color: var(--brass-ink);
      font-weight: 600;
    }
    .cpane { display: none; }
    .cpane.active { display: block; }

    .bench-grid {
      display: grid;
      grid-template-columns: 0.92fr 1.08fr;
      gap: 32px;
      align-items: start;
    }
    @media (max-width: 860px) { .bench-grid { grid-template-columns: 1fr; } }
    .dark-label {
      display: block;
      font-family: var(--mono);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--inst-muted);
      margin-bottom: 8px;
    }
    .darkroom input[type=file],
    .darkroom textarea,
    .darkroom pre {
      width: 100%;
      background: var(--inst-input);
      color: var(--ink);
      border: 1px solid var(--inst-border);
      border-radius: 0;
      padding: 12px;
      font-family: var(--mono);
      font-size: 12px;
      outline: none;
    }
    .darkroom textarea:focus,
    .darkroom input[type=file]:focus { border-color: var(--brass); }
    .darkroom textarea { min-height: 178px; resize: vertical; }
    .drop-hint {
      margin-top: 8px;
      font-family: var(--mono);
      font-size: 11px;
      color: var(--dim);
    }
    .btn-brass {
      background: var(--brass);
      color: var(--brass-ink);
      border-color: var(--brass);
    }
    .btn-brass:hover { background: var(--ink); border-color: var(--ink); color: var(--bg); }
    .btn-dark-ghost {
      background: transparent;
      color: var(--ink);
      border: 1px solid var(--inst-border);
    }
    .btn-dark-ghost:hover { border-color: var(--brass); color: var(--brass); }

    .oscilloscope {
      background: var(--inst-panel);
      border: 1px solid var(--inst-border);
      padding: 24px;
      min-height: 296px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .scope-standby {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--dim);
      letter-spacing: 0.06em;
    }
    .verify-result-bar {
      display: none;
      margin-top: 14px;
      padding: 18px;
      border: 1px solid var(--inst-border);
      background: var(--surface-lo);
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .verify-result-bar.visible { display: flex; }
    .verify-result-bar.ok { border-color: var(--ok-border); background: var(--ok-bg); }
    .verify-result-bar.bad { border-color: var(--bad-border); background: var(--bad-bg); }
    .gauge-wrap {
      width: 72px;
      height: 72px;
      position: relative;
      flex-shrink: 0;
    }
    .gauge-num {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-family: var(--mono);
      font-size: 16px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--ink);
    }
    .status {
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 500;
      flex: 1 1 240px;
      line-height: 1.55;
      color: var(--ink);
    }
    .dossier-frame {
      display: none;
      margin-top: 20px;
      width: 100%;
      height: 440px;
      border: 1px solid var(--inst-border);
      background: #FFFFFF;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--mono);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: var(--ink);
    }
    th {
      text-align: left;
      padding: 11px 10px;
      border-bottom: 1px solid var(--inst-border);
      color: var(--inst-muted);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    td {
      padding: 11px 10px;
      border-bottom: 1px solid var(--rule);
    }

    /* Interactive Type & Merkle Specimen Matrix */
    .specimen-band {
      max-width: 1360px;
      margin: 0 auto;
      padding: 68px 28px;
      border-bottom: 1px solid var(--border);
    }
    @media (max-width: 640px) { .specimen-band { padding: 48px 20px; } }
    .specimen-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 20px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .discipline-ledger {
      display: grid;
      grid-template-columns: 0.78fr 1.22fr;
    }
    @media (max-width: 860px) { .discipline-ledger { grid-template-columns: 1fr; } }
    .disc-nav { border-right: 1px solid var(--border); }
    @media (max-width: 860px) { .disc-nav { border-right: none; border-bottom: 1px solid var(--border); } }
    .disc-row {
      width: 100%;
      text-align: left;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--rule);
      padding: 22px 18px 22px 0;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 14px;
      cursor: pointer;
      color: var(--ash);
      transition: background 120ms ease, padding-left 140ms ease, color 120ms ease;
    }
    .disc-row:last-child { border-bottom: none; }
    .disc-row:hover { color: var(--ink); padding-left: 8px; }
    .disc-row.active {
      color: var(--ink);
      background: var(--surface);
      padding-left: 14px;
      border-left: 3px solid var(--brass);
    }
    .disc-row-idx {
      font-family: var(--mono);
      font-size: 11px;
      letter-spacing: 0.1em;
      color: var(--brass);
      min-width: 32px;
    }
    .disc-row-name {
      font-family: var(--display);
      font-size: 23px;
      font-weight: 600;
      letter-spacing: -0.025em;
      flex: 1 1 auto;
    }
    .disc-row-tag {
      font-family: var(--mono);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--dim);
    }
    .disc-detail {
      padding: 32px 0 12px 42px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 24px;
    }
    @media (max-width: 860px) { .disc-detail { padding: 28px 0 8px; } }
    .disc-detail h3 {
      font-family: var(--display);
      font-size: clamp(30px, 3.3vw, 44px);
      font-style: normal;
      font-weight: 700;
      line-height: 1.04;
      margin: 8px 0 14px;
      letter-spacing: -0.035em;
    }
    .disc-detail p { margin: 0 0 20px; color: var(--ash); font-size: 15px; max-width: 58ch; }
    .adapter-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 22px;
    }
    .adapter-tag {
      font-family: var(--mono);
      font-size: 10.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 5px 10px;
      border: 1px solid var(--rule);
      color: var(--ink);
      background: var(--surface);
    }
    .merkle-sim {
      border-top: 1px solid var(--border);
      padding-top: 16px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }
    @media (max-width: 680px) { .merkle-sim { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .ms-step {
      font-family: var(--mono);
      font-size: 11px;
    }
    .ms-seq { color: var(--brass); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
    .ms-ev { color: var(--ink); font-weight: 600; margin: 3px 0; }
    .ms-meta { color: var(--dim); font-size: 10px; }

    /* Footer & Privacy Controls */
    .colophon-band {
      max-width: 1360px;
      margin: 0 auto;
      padding: 32px 28px 48px;
    }
    @media (max-width: 640px) { .colophon-band { padding: 24px 20px 36px; } }

    footer {
      border-top: 2px solid var(--border);
      padding-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      color: var(--ash);
      font-family: var(--mono);
      font-size: 10.5px;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }
    .footer-right {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .footer-cookie-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--surface);
      color: var(--ink);
      border: 1px solid var(--border);
      padding: 7px 12px;
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      min-height: 34px;
      transition: border-color 140ms ease, color 140ms ease, background 140ms ease;
    }
    .footer-cookie-btn:hover {
      border-color: var(--brass);
      color: var(--brass);
    }
    .footer-cookie-btn:focus-visible,
    .cookie-close-btn:focus-visible,
    .cookie-checkbox:focus-visible,
    .cookie-banner .btn:focus-visible,
    .cookie-modal .btn:focus-visible {
      outline: 2px solid var(--brass);
      outline-offset: 2px;
    }
    .cookie-banner[hidden],
    .cookie-modal-backdrop[hidden],
    .cookie-modal[hidden] {
      display: none !important;
    }
    .cookie-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9998;
      background: var(--surface);
      color: var(--ink);
      border-top: 2px solid var(--brass);
      box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.35);
      padding: 18px 28px;
    }
    .cookie-banner-inner {
      max-width: 1360px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .cookie-banner-copy {
      flex: 1 1 440px;
      min-width: 240px;
    }
    .cookie-banner-title {
      margin: 0 0 4px;
      font-family: var(--display);
      font-size: 16px;
      font-weight: 600;
      color: var(--ink);
    }
    .cookie-banner-desc {
      margin: 0;
      font-size: 13px;
      color: var(--ash);
      line-height: 1.5;
    }
    .cookie-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .cookie-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      z-index: 9999;
    }
    .cookie-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      width: min(580px, calc(100vw - 24px));
      max-height: 90vh;
      overflow-y: auto;
      background: var(--surface);
      color: var(--ink);
      border: 1.5px solid var(--border);
      border-top: 3px solid var(--brass);
      padding: 24px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
    }
    .cookie-modal-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      border-bottom: 1px solid var(--rule);
      padding-bottom: 14px;
      margin-bottom: 14px;
    }
    .cookie-modal-title {
      margin: 0;
      font-family: var(--display);
      font-size: 20px;
      font-weight: 600;
      color: var(--ink);
    }
    .cookie-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--surface-hi);
      color: var(--ink);
      border: 1px solid var(--border);
      cursor: pointer;
    }
    .cookie-close-btn:hover {
      border-color: var(--brass);
      color: var(--brass);
    }
    .cookie-status {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--ash);
      background: var(--surface-hi);
      border: 1px solid var(--rule);
      padding: 8px 12px;
      margin-bottom: 14px;
    }
    .cookie-cat-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 18px;
    }
    .cookie-cat-card {
      display: block;
      background: var(--surface-hi);
      border: 1px solid var(--rule);
      padding: 14px;
    }
    .cookie-cat-card.is-toggle {
      cursor: pointer;
      transition: border-color 140ms ease;
    }
    .cookie-cat-card.is-toggle:hover {
      border-color: var(--brass);
    }
    .cookie-cat-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }
    .cookie-cat-name {
      font-family: var(--display);
      font-size: 15px;
      font-weight: 600;
      color: var(--ink);
    }
    .cookie-cat-desc {
      margin: 0;
      font-size: 13px;
      color: var(--ash);
      line-height: 1.5;
    }
    .cookie-badge-always {
      font-family: var(--mono);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--verdigris);
      background: var(--ok-bg);
      border: 1px solid var(--ok-border);
      padding: 3px 8px;
    }
    .cookie-checkbox {
      width: 20px;
      height: 20px;
      accent-color: var(--brass);
      cursor: pointer;
      flex-shrink: 0;
    }
    @media (max-width: 640px) {
      .cookie-banner { padding: 16px 18px; }
      .cookie-modal { padding: 18px; }
      .cookie-actions .btn { flex: 1 1 auto; justify-content: center; }
    }

    /* Capacity Bands: Multi-Vector Behavioral Assay & Hardware Ecosystem */
    .cap-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
      margin-top: 24px;
    }
    @media (max-width: 900px) { .cap-grid-3 { grid-template-columns: 1fr; } }
    .cap-card {
      border: 1px solid var(--border);
      background: var(--surface);
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
    }
    .cap-card.tier-human { border-top: 3px solid var(--verdigris); }
    .cap-card.tier-hybrid { border-top: 3px solid var(--brass); }
    .cap-card.tier-flagged { border-top: 3px solid var(--crimson); }
    .cap-kicker {
      font-family: var(--mono);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--brass);
      font-weight: 600;
    }
    .cap-title {
      font-family: var(--display);
      font-size: 20px;
      font-weight: 600;
      margin: 4px 0 8px;
      color: var(--ink);
      letter-spacing: -0.02em;
    }
    .cap-desc {
      font-size: 13.5px;
      color: var(--ash);
      margin: 0;
      line-height: 1.55;
    }
    .cap-meta {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--dim);
      border-top: 1px solid var(--rule);
      padding-top: 10px;
    }
    .hw-pill-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .hw-pill-bar .btn.active {
      background: var(--brass);
      color: var(--brass-ink);
      border-color: var(--brass);
    }
  </style>
  <script type="module" src="/sdk/wroughtmark-badge.js"></script>
</head>
<body>
  <div class="paper-grain" aria-hidden="true"></div>

  <header class="mast">
    <div class="mast-inner">
      <a class="brand" href="/">
        <img src="/brand/wroughtmark-logo-mark.jpg" alt="Wroughtmark Hallmark" />
        <span><i class="pulse-dot"></i>Wroughtmark // Assay Foundry</span>
      </a>
      <div class="mast-right">
        <nav class="mast-links">
          <a href="#thesis">Thesis</a>
          <a href="#detection">AI Assay</a>
          <a href="#hardware">Mobile &amp; XR</a>
          <a href="#instrument">Console</a>
          <a href="#specimens">Specimens</a>
          <a href="#licensing">Licensing</a>
          <a href="#contact">Contact</a>
          <a href="/blog">Dispatches</a>
        </nav>
        <button id="themeToggleBtn" class="theme-switch" type="button" aria-label="Toggle light or dark theme">
          <span class="theme-dot" aria-hidden="true"></span>
          <span id="themeToggleLabel">Dark</span>
        </button>
      </div>
    </div>
  </header>

  <section class="stage-split">
    <div class="stage-copy">
      <div>
        <div class="copy-meta">
          <span class="eyebrow">Protocol v0.3 · Local-First Provenance · Behavioral AI Assay · Spatial &amp; Suite Witness</span>
          <span class="reg-mark">+ REG 01/A</span>
        </div>
        <h1>Proof of craft, <em>forged</em> while you work.</h1>
        <p class="lead">Post-hoc AI detectors guess from prose style and punish fluent writers. Wroughtmark stamps local Ed25519 process chains, 9-vector behavioral AI telemetry, and hardware enclave co-signs across desktop, iOS, Android, watchOS, Wear OS, Apple Vision Pro, Meta Quest, and Meta Ray-Ban Display with zero raw-draft uploads.</p>
        <div class="actions">
          <button id="loadSampleBtn" class="btn btn-primary" type="button">Run Live Sample &amp; Stamp</button>
          <a class="btn btn-ghost" href="#instrument">Open Assay Console</a>
        </div>
      </div>

      <div class="spec-strip">
        <div>
          <div class="spec-cell-k">Hash &amp; Envelope</div>
          <div class="spec-cell-v">BLAKE3 + SHA-256 · Ed25519</div>
        </div>
        <div>
          <div class="spec-cell-k">Behavioral AI Assay</div>
          <div class="spec-cell-v">9 Vectors · 3 Authorship Tiers</div>
        </div>
        <div>
          <div class="spec-cell-k">Hardware Co-Signers</div>
          <div class="spec-cell-v">Watch · Phone · VisionOS · Meta HUD</div>
        </div>
        <div>
          <div class="spec-cell-k">Raw Uploads</div>
          <div class="spec-cell-v">0 Bytes Transmitted</div>
        </div>
      </div>
    </div>

    <aside class="stage-chamber" id="specimenPlate">
      <div class="chamber-viewport">
        <canvas id="seal3dCanvas"></canvas>
      </div>
      <div class="chamber-rail">
        <span id="seal3dStatus">PARTICLE FIELD // WROUGHTMARK MONOGRAM</span>
        <span id="seal3dMode" class="chamber-rail-muted">MODE 04 // FILM SHIMMER</span>
      </div>
    </aside>
  </section>

  <div class="wire-strip">
    <div class="wire-inner">
      <span><strong>SPEC 0.3</strong> // ZERO-UPLOAD LOCAL CRYPTOGRAPHY</span>
      <span>AI ASSAY: <strong>9 BEHAVIORAL VECTORS · 3 AUTHORSHIP TIERS</strong></span>
      <span>COMPANIONS: <strong>IOS · ANDROID · WATCHOS · WEAR OS · VISIONOS · HORIZON OS · ANDROID XR</strong></span>
      <span>HUD WITNESS: <strong>META RAY-BAN DISPLAY (600x600) + NEURAL BAND sEMG · 8 STUDIO ADAPTERS</strong></span>
    </div>
  </div>

  <!-- Band 1: Broadsheet Editorial Counter-Thesis Spread -->
  <section class="broadsheet" id="thesis">
    <div>
      <blockquote class="thesis-pull">
        "Post-hoc detectors guess from surface style and punish fluent writers. <em>Process provenance</em> settles origin before a file ever leaves your desk."
      </blockquote>
      <div class="newspaper-cols">
        <p>Academic honesty panels, commissioning editors, and streaming platforms face an impossible verification gap: probabilistic AI detectors generate documented false positives on structured technical prose, multilingual students, and heavily edited creative drafts. Inspecting final pixels or polished text after export arrives too late to measure authorship.</p>
        <p>Wroughtmark records incremental, non-content cryptographic heartbeats locally while you write, score, paint, or cut. Each save hashes only structural metadata and time-spaced edit deltas into an append-only chain signed by your workstation key or companion wearable slate, proving human labor with zero bytes of raw unpublished work ever touching an external server.</p>
      </div>
    </div>

    <aside class="schematic-folio" aria-label="Cryptographic Process Chain Anatomy">
      <div class="folio-kicker">+ FOLIO // CHAIN ANATOMY</div>
      <div class="chain-node">
        <div class="chain-t">T+00M · SEQ 00</div>
        <div class="chain-label">Initial Draft Hash</div>
        <div class="chain-hash">blake3:8f41c0 · 0B uploaded</div>
      </div>
      <div class="chain-node">
        <div class="chain-t">T+18M · SEQ 01</div>
        <div class="chain-label">Behavioral &amp; Revision Delta</div>
        <div class="chain-hash">+412 words · 19% edit ratio · 0 focus-switch pastes</div>
      </div>
      <div class="chain-node">
        <div class="chain-t">T+42M · CO-SIGN</div>
        <div class="chain-label">Enclave, Spatial &amp; Neural Witness</div>
        <div class="chain-hash">WatchOS · VisionOS Optic ID · Meta Neural sEMG</div>
      </div>
      <div class="chain-node sealed">
        <div class="chain-t">EXPORT · SEAL MINTED</div>
        <div class="chain-label">Canonical 3-Tier Receipt</div>
        <div class="chain-hash">score: 100/100 · HUMAN_WROUGHT</div>
      </div>
    </aside>
  </section>

  <!-- Band 1.25: Multi-Vector Behavioral AI Detection & 3-Tier Authorship Taxonomy -->
  <section class="specimen-band" id="detection">
    <div class="specimen-head">
      <div>
        <span class="eyebrow">Behavioral Assay // 9 Anomaly Vectors &amp; 3-Tier Authorship Taxonomy</span>
      </div>
      <span class="reg-mark">ZERO PROSE PROFILING · 100% PROCESS TELEMETRY</span>
    </div>

    <div class="cap-grid-3">
      <article class="cap-card tier-human">
        <div>
          <div class="cap-kicker" style="color:var(--verdigris);">TIER 01 // HUMAN_WROUGHT</div>
          <h3 class="cap-title">Verified Organic Craft</h3>
          <p class="cap-desc">Multi-session revision progression, natural keystroke and motor variance, optional Watch, Phone, or XR hardware co-signing, and zero undisclosed synthetic insertions.</p>
        </div>
        <div class="cap-meta">Requires score &gt;= 70 · zero hard evasion flags · full human chain</div>
      </article>

      <article class="cap-card tier-hybrid">
        <div>
          <div class="cap-kicker">TIER 02 // AI_ASSISTED_DISCLOSED</div>
          <h3 class="cap-title">Transparent Hybrid Workflow</h3>
          <p class="cap-desc">Creator explicitly declares AI assistance (<code>AI_ASSISTANCE_DISCLOSED</code>) alongside verifiable human outlining, curation, and &gt;=12% editorial revision depth.</p>
        </div>
        <div class="cap-meta">Capped at 85/100 in hybrid preset · honest disclosure rewarded over evasion</div>
      </article>

      <article class="cap-card tier-flagged">
        <div>
          <div class="cap-kicker" style="color:var(--crimson);">TIER 03 // ANOMALY_FLAGGED</div>
          <h3 class="cap-title">Evasion or Synthetic Pattern</h3>
          <p class="cap-desc">Triggered when telemetry catches bulk clipboard drops, split-screen LLM retyping, chat-loop focus switching, inline ghost-text bursts, or replayed sEMG/6DoF vectors.</p>
        </div>
        <div class="cap-meta">Score &lt; 70 or hard vector match · sorted first for human reviewer triage</div>
      </article>
    </div>

    <div style="overflow-x:auto;margin-top:28px;">
      <table>
        <thead>
          <tr>
            <th>Vector Flag</th>
            <th>Score Impact</th>
            <th>Behavioral Signal Captured (0B Content Uploaded)</th>
            <th>Interactive Test</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>BULK_PASTE_SPIKE</code></td>
            <td style="color:var(--crimson);">-35 pts</td>
            <td>Sudden &gt;50 KB clipboard/delta drop after seq 0 within &lt;120s active editing</td>
            <td><button class="btn btn-dark-ghost vector-jump-btn" type="button" data-preset="paste" style="padding:5px 10px;">Run Paste Preset</button></td>
          </tr>
          <tr>
            <td><code>LINEAR_TRANSCRIPTION_PATTERN</code></td>
            <td style="color:var(--crimson);">-35 pts</td>
            <td>Split-screen LLM retyping with &lt;3% revision/backtracking across &gt;=300 keystrokes</td>
            <td><button class="btn btn-dark-ghost vector-jump-btn" type="button" data-preset="retype" style="padding:5px 10px;">Run Retype Preset</button></td>
          </tr>
          <tr>
            <td><code>SYNTHETIC_CADENCE_BOT</code></td>
            <td style="color:var(--crimson);">-45 pts</td>
            <td>Metronomic inter-keystroke timing (<code>0 &lt; keystroke_variance_bps &lt; 800</code>) matching scripted injectors</td>
            <td><button class="btn btn-dark-ghost vector-jump-btn" type="button" data-preset="retype" style="padding:5px 10px;">Run Bot Cadence</button></td>
          </tr>
          <tr>
            <td><code>CLIPBOARD_RATIO_HIGH</code></td>
            <td style="color:var(--brass);">-30 pts (-15 disclosed)</td>
            <td>Cumulative pasted bytes exceed 25% of total authoring deltas across sessions</td>
            <td><button class="btn btn-dark-ghost vector-jump-btn" type="button" data-preset="chatloop" style="padding:5px 10px;">Run Chat-Loop</button></td>
          </tr>
          <tr>
            <td><code>FOCUS_SWITCH_PASTE_LOOP</code></td>
            <td style="color:var(--crimson);">-25 pts</td>
            <td>3+ window focus switches followed immediately by paragraph-sized clipboard insertions</td>
            <td><button class="btn btn-dark-ghost vector-jump-btn" type="button" data-preset="chatloop" style="padding:5px 10px;">Inspect Loop</button></td>
          </tr>
          <tr>
            <td><code>INLINE_AI_AUTOCOMPLETE</code></td>
            <td style="color:var(--brass);">-30 pts (-15 disclosed)</td>
            <td>Multi-token ghost-text completions exceeding 15% of total authored delta bytes</td>
            <td><button class="btn btn-dark-ghost vector-jump-btn" type="button" data-preset="chatloop" style="padding:5px 10px;">Inspect Inline AI</button></td>
          </tr>
          <tr>
            <td><code>SYNTHETIC_EMG_REPLAY</code></td>
            <td style="color:var(--crimson);">-45 pts</td>
            <td>Meta Neural Band sEMG pinch motor variance below biological threshold (<code>&lt;500 bps</code>)</td>
            <td><button class="btn btn-dark-ghost vector-jump-btn" type="button" data-preset="spatial" style="padding:5px 10px;">Run Spatial XR</button></td>
          </tr>
          <tr>
            <td><code>STATIC_6DOF_POSE_ANOMALY</code></td>
            <td style="color:var(--crimson);">-35 pts</td>
            <td>Headset/brush 6DoF trajectory entropy too flat for live spatial work (<code>&lt;600 bps</code>)</td>
            <td><button class="btn btn-dark-ghost vector-jump-btn" type="button" data-preset="spatial" style="padding:5px 10px;">Inspect 6DoF</button></td>
          </tr>
          <tr>
            <td><code>SHORT_DURATION</code> / <code>AI_ASSISTANCE_DISCLOSED</code></td>
            <td style="color:var(--brass);">-20 pts / 85 cap</td>
            <td>Suspiciously brief sitting (&lt;300s) vs transparent declared hybrid AI workflow</td>
            <td><button class="btn btn-dark-ghost vector-jump-btn" type="button" data-preset="hybrid" style="padding:5px 10px;">Run Hybrid Preset</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Band 1.5: Mobile, Wrist, Smart Glasses & Spatial XR Ecosystem -->
  <section class="specimen-band" id="hardware">
    <div class="specimen-head">
      <div>
        <span class="eyebrow">Hardware Witness Ecosystem // Mobile, Wrist, Spatial Headsets &amp; Smart Glasses</span>
      </div>
      <span class="reg-mark">SECURE ENCLAVE · STRONGBOX · OPTIC ID · NEURAL BAND sEMG</span>
    </div>

    <div class="cap-grid-3">
      <article class="cap-card">
        <div>
          <div class="cap-kicker">APPLE MOBILE // iOS &amp; iPadOS</div>
          <h3 class="cap-title">WroughtmarkKit Phone Witness</h3>
          <p class="cap-desc">CryptoKit Secure Enclave Ed25519 keys, Face ID / Touch ID biometric gate, local camera desk and sketchbook SHA-256 frame hashing, and 30s studio acoustic fingerprints.</p>
        </div>
        <div class="cap-meta">Zero cloud frames · co-signs physical sketchbooks &amp; studio takes</div>
      </article>

      <article class="cap-card">
        <div>
          <div class="cap-kicker">APPLE WRIST // watchOS</div>
          <h3 class="cap-title">Ultra &amp; Series Studio Slate</h3>
          <p class="cap-desc">Wrist Double-Tap gesture and Digital Crown session marker (<code>WroughtmarkWatchCompanionView</code>) with low-BLE desktop heartbeat relay and haptic seal confirmation.</p>
        </div>
        <div class="cap-meta">Hands-free chapter &amp; take co-signing without leaving the instrument</div>
      </article>

      <article class="cap-card">
        <div>
          <div class="cap-kicker">ANDROID &amp; WEAR OS // com.wroughtmark</div>
          <h3 class="cap-title">StrongBox &amp; Rotary Bezel</h3>
          <p class="cap-desc">Hardware Keystore / StrongBox co-signing paired with Jetpack Compose rotary bezel gestures, Wear OS Tile (<code>WroughtmarkTileSummary</code>), and local studio sync.</p>
        </div>
        <div class="cap-meta">Cross-vendor hardware attestation across phone and wrist</div>
      </article>

      <article class="cap-card">
        <div>
          <div class="cap-kicker">SMART GLASSES // META RAY-BAN DISPLAY</div>
          <h3 class="cap-title">600x600 Right-Lens HUD</h3>
          <p class="cap-desc">Monocular waveguide HUD (<code>WroughtmarkMetaDisplayHudView</code> / <code>WroughtmarkMetaDisplayHudController</code>) showing live session status while hashing POV frames locally.</p>
        </div>
        <div class="cap-meta">Zero raw glasses video uploaded · digest-only POV physical witness</div>
      </article>

      <article class="cap-card">
        <div>
          <div class="cap-kicker">WRIST BIOMETRICS // META NEURAL BAND</div>
          <h3 class="cap-title">Surface-EMG Pinch Witness</h3>
          <p class="cap-desc">Meta Wearables DAT surface-electromyography wrist pinch and thumb-sweep witness capturing biological motor recruitment variance (<code>emg_motor_variance_bps &gt;= 500</code>).</p>
        </div>
        <div class="cap-meta">Separates live neuromuscular intent from synthetic replay scripts</div>
      </article>

      <article class="cap-card">
        <div>
          <div class="cap-kicker">SPATIAL HEADSETS // VISIONOS · HORIZON OS · ANDROID XR</div>
          <h3 class="cap-title">Optic ID &amp; 6DoF Sculpt Telemetry</h3>
          <p class="cap-desc">Floating <code>WroughtmarkVisionOSOrnamentView</code> with Optic ID iris witness plus OpenXR/Kotlin 6DoF brush and camera entropy (<code>spatial_6dof_entropy_bps &gt;= 600</code>).</p>
        </div>
        <div class="cap-meta">Covers Apple Vision Pro, Meta Quest Horizon OS, Android XR &amp; WebXR</div>
      </article>
    </div>
  </section>

  <!-- Band 2: Full-Bleed Obsidian Darkroom Instrument -->
  <section class="darkroom" id="instrument">
    <div class="darkroom-inner" id="verifier">
      <div class="console-bar">
        <div>
          <span class="eyebrow">Instrument // WebCrypto Zero-Upload Workbench</span>
          <h2 class="console-title">Local Assay Console</h2>
        </div>
        <div class="console-tabs" role="tablist">
          <button class="ctab active" type="button" data-pane="pane-single">01 Single Seal</button>
          <button class="ctab" type="button" data-pane="pane-batch">02 Cohort LMS</button>
          <button class="ctab" type="button" data-pane="pane-embed">03 Embed &amp; LTI API</button>
          <button class="ctab" type="button" data-pane="pane-xr">04 Spatial XR &amp; Meta HUD</button>
          <button class="ctab" type="button" data-pane="pane-enterprise">05 Enterprise, Git &amp; HITL</button>
        </div>
      </div>

      <!-- Pane 1: Single Seal Verifier -->
      <div class="cpane active" id="pane-single">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--rule);">
          <span class="dark-label" style="margin:0 6px 0 0;">Live Presets:</span>
          <button class="btn btn-dark-ghost preset-btn" type="button" data-preset="clean" style="padding:7px 12px;">Clean Essay (100/100)</button>
          <button class="btn btn-dark-ghost preset-btn" type="button" data-preset="hybrid" style="padding:7px 12px;">Disclosed Hybrid AI (85/100)</button>
          <button class="btn btn-dark-ghost preset-btn" type="button" data-preset="retype" style="padding:7px 12px;">Split-Screen Retype (20/100)</button>
          <button class="btn btn-dark-ghost preset-btn" type="button" data-preset="chatloop" style="padding:7px 12px;">Chat-Loop + Copilot (15/100)</button>
          <button class="btn btn-dark-ghost preset-btn" type="button" data-preset="paste" style="padding:7px 12px;">Paste Spike (45/100)</button>
          <button class="btn btn-dark-ghost preset-btn" type="button" data-preset="spatial" style="padding:7px 12px;">Spatial XR + Meta HUD (100/100)</button>
          <button class="btn btn-dark-ghost preset-btn" type="button" data-preset="film" style="padding:7px 12px;">Film Cut (75/100)</button>
          <button class="btn btn-dark-ghost preset-btn" type="button" data-preset="gitpr" style="padding:7px 12px;">Clean Git PR (100/100)</button>
          <button class="btn btn-dark-ghost preset-btn" type="button" data-preset="hitlrubber" style="padding:7px 12px;">Rubber-Stamp HITL (5/100)</button>
          <button class="btn btn-dark-ghost preset-btn" type="button" data-preset="handoff" style="padding:7px 12px;">Multi-Author Handoff (100/100)</button>
        </div>
        <div class="bench-grid">
          <div>
            <div style="margin-bottom:18px;">
              <label class="dark-label" for="fileInput">1. Exported Deliverable Artifact</label>
              <input id="fileInput" type="file" />
              <div class="drop-hint">Any exported PDF, DOCX, TXT, WAV, PNG, or MP4 stays 100% local in WebCrypto memory.</div>
            </div>
            <div>
              <label class="dark-label" for="sealInput">2. Wroughtmark Seal JSON (*.seal.json)</label>
              <textarea id="sealInput" placeholder='Paste *.seal.json or pick a live preset above...'></textarea>
            </div>
            <div style="display:flex;gap:12px;align-items:center;margin-top:18px;flex-wrap:wrap;">
              <button id="verifyBtn" class="btn btn-brass" type="button">Verify Seal</button>
              <button id="previewDossierBtn" class="btn btn-dark-ghost" type="button" style="display:none;">Preview Dossier</button>
              <button id="downloadDossierBtn" class="btn btn-dark-ghost" type="button" style="display:none;">Export Dossier (.html)</button>
              <button id="publishReceiptBtn" class="btn btn-dark-ghost" type="button" style="display:none;">Publish Receipt Link</button>
            </div>
          </div>

          <div class="oscilloscope">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--rule);padding-bottom:10px;">
              <span class="dark-label" style="margin:0;">Assay Oscilloscope // Receipt Output</span>
              <span class="scope-standby">SHA-256 + ED25519</span>
            </div>
            <div id="verifyResultBar" class="verify-result-bar">
              <div class="gauge-wrap">
                <svg viewBox="0 0 72 72" width="72" height="72" aria-label="Process Score Gauge">
                  <circle cx="36" cy="36" r="29" fill="none" stroke="var(--rule)" stroke-width="5"></circle>
                  <circle id="gaugeArc" cx="36" cy="36" r="29" fill="none" stroke="var(--verdigris)" stroke-width="5" stroke-linecap="butt"
                          stroke-dasharray="182.21" stroke-dashoffset="182.21" transform="rotate(-90 36 36)"
                          style="transition: stroke-dashoffset 450ms cubic-bezier(0.22,1,0.36,1), stroke 200ms ease;"></circle>
                </svg>
                <div id="gaugeNum" class="gauge-num">--</div>
              </div>
              <div id="status" class="status"></div>
            </div>
            <div id="shareLinkRow" style="display:none;padding-top:12px;font-family:var(--mono);font-size:11.5px;color:var(--brass);">
              Public Receipt Ready: <a id="shareLinkAnchor" href="#" target="_blank" rel="noopener noreferrer" style="color:var(--ink);text-decoration:underline;"></a>
            </div>
            <div style="font-family:var(--mono);font-size:11px;color:var(--dim);padding-top:16px;">
              Ready to verify deliverable hash against canonical seal payload and inspect anomaly flags without network roundtrips.
            </div>
          </div>
        </div>
        <iframe id="dossierFrame" class="dossier-frame" title="Verification Dossier Preview"></iframe>
      </div>

      <!-- Pane 2: Cohort Batch LMS Triage -->
      <div class="cpane" id="pane-batch">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:18px;">
          <div>
            <label class="dark-label" for="batchFiles">Drop Multiple *.seal.json Files &amp; Optional Deliverables</label>
            <input id="batchFiles" type="file" multiple style="max-width:420px;" />
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button id="loadCohortDemoBtn" class="btn btn-brass" type="button">Load 5-Student Cohort Demo</button>
            <button id="downloadCsvBtn" class="btn btn-dark-ghost" type="button" style="display:none;">Download Triage CSV</button>
          </div>
        </div>
        <div id="batchSummary" style="margin-bottom:14px;font-family:var(--mono);font-size:12px;color:var(--brass-hi);">
          Load the 5-student university assignment demo or drop cohort files above to sort lowest process_score first.
        </div>
        <div style="overflow-x:auto;">
          <table id="batchTable" style="display:none;">
            <thead>
              <tr>
                <th>File</th>
                <th>Seal ID</th>
                <th>Score</th>
                <th>Tier</th>
                <th>Flags</th>
                <th>Sessions / Active</th>
                <th>Co-Signed</th>
                <th>Signature</th>
                <th>Deliverable</th>
              </tr>
            </thead>
            <tbody id="batchBody"></tbody>
          </table>
        </div>
      </div>

      <!-- Pane 3: Embed Web Component & LTI 1.3 API -->
      <div class="cpane" id="pane-embed">
        <div class="bench-grid">
          <div>
            <label class="dark-label">Live Custom Element Mount</label>
            <div style="padding:20px;background:var(--badge-mount);border:1px solid var(--inst-border);margin-bottom:16px;">
              <wroughtmark-badge id="liveEmbedBadge" seal-id="wm_seal_sample" discipline="film" sessions="4" active-seconds="5400" verify-url="http://localhost:3434/#instrument"></wroughtmark-badge>
            </div>
            <div class="drop-hint">Drop one module tag into Substack, Bandcamp, Ghost, WordPress, or university courseware. LTI 1.3 tool manifest: <a href="/api/lms/lti-config.json" target="_blank" style="color:var(--brass);">/api/lms/lti-config.json</a></div>
          </div>
          <div>
            <label class="dark-label">HTML Embed &amp; LTI 1.3 Batch Contract</label>
            <pre style="margin:0 0 14px;overflow-x:auto;">&lt;script type="module" src="https://wroughtmark.com/sdk/wroughtmark-badge.js"&gt;&lt;/script&gt;
&lt;wroughtmark-badge seal-id="wm_seal_..." discipline="music" sessions="4" active-seconds="3600"&gt;&lt;/wroughtmark-badge&gt;</pre>
            <pre style="margin:0;overflow-x:auto;color:var(--ash);">POST /api/lms/batch  (Header: Authorization: Bearer $WROUGHTMARK_LMS_API_KEY)
{ "assignmentId": "CANVAS-ENG-304", "submissions": [ { "studentId": "stu_9910", "outputBase64": "...", "seal": { ... } } ] }</pre>
            <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;font-family:var(--mono);font-size:11px;">
              <span class="adapter-tag">MS365 Multi-Host Add-in (Word · Excel · PowerPoint · Outlook)</span>
              <span class="adapter-tag">Google Workspace Add-on (Docs · Sheets · Slides · Drive · Gmail)</span>
              <span class="adapter-tag">wroughtmark-provenance Agent Skill &amp; MCP</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pane 4: Spatial XR, Smart Glasses & 600x600 Meta Display HUD -->
      <div class="cpane" id="pane-xr">
        <div class="bench-grid">
          <div>
            <div class="hw-pill-bar" role="group" aria-label="Hardware Profile Switcher">
              <button class="btn btn-dark-ghost hw-profile-btn active" type="button" data-hw="meta-hud" style="padding:6px 10px;">Meta Display HUD</button>
              <button class="btn btn-dark-ghost hw-profile-btn" type="button" data-hw="visionos" style="padding:6px 10px;">VisionOS Optic ID</button>
              <button class="btn btn-dark-ghost hw-profile-btn" type="button" data-hw="watch-wear" style="padding:6px 10px;">watchOS / Wear OS</button>
              <button class="btn btn-dark-ghost hw-profile-btn" type="button" data-hw="quest-xr" style="padding:6px 10px;">Quest / Android XR</button>
            </div>
            <div style="border:1px solid var(--brass);background:radial-gradient(circle at 50% 40%, #151923 0%, #090A0D 80%);padding:18px;max-width:340px;width:100%;margin:0 auto;">
              <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;color:var(--verdigris);border-bottom:1px solid var(--rule);padding-bottom:8px;margin-bottom:12px;">
                <span id="hudHeaderTitle">META DISPLAY // 600x600 RIGHT-LENS HUD</span>
                <span id="hudHeaderMetric">sEMG 2680bps</span>
              </div>
              <div id="hudReadout" style="font-family:var(--mono);font-size:11px;color:var(--ink);line-height:1.55;min-height:110px;">
                NEURAL BAND DAT READY.<br />
                6DoF ENTROPY: 3420 bps<br />
                PRIVACY: 0 RAW PIXELS UPLOADED<br />
                STATUS: STANDBY FOR EMG PINCH
              </div>
              <button id="hudPinchBtn" class="btn btn-brass" type="button" style="width:100%;margin-top:12px;">
                Simulate Neural Band Pinch + Verify Seal
              </button>
            </div>
          </div>
          <div>
            <label class="dark-label">Spatial &amp; Smart-Glasses Co-Signing Matrix</label>
            <div style="display:grid;gap:10px;font-family:var(--mono);font-size:11.5px;">
              <div style="padding:10px;border:1px solid var(--inst-border);background:var(--inst-panel);">
                <strong style="color:var(--brass);">Meta Ray-Ban Display + Neural Band DAT</strong>
                <div style="color:var(--ash);margin-top:4px;">Right-lens 600x600 monocular HUD + surface-EMG pinch motor variance (<code>emg_motor_variance_bps</code>) + local POV frame hashing.</div>
              </div>
              <div style="padding:10px;border:1px solid var(--inst-border);background:var(--inst-panel);">
                <strong style="color:var(--ink);">Apple Vision Pro (visionOS)</strong>
                <div style="color:var(--ash);margin-top:4px;">Floating Spatial Studio Ornament (<code>WroughtmarkVisionOSOrnamentView</code>) with Optic ID iris witness &amp; Mac Virtual Display pairing.</div>
              </div>
              <div style="padding:10px;border:1px solid var(--inst-border);background:var(--inst-panel);">
                <strong style="color:var(--ink);">Meta Quest (Horizon OS) &amp; Android XR</strong>
                <div style="color:var(--ash);margin-top:4px;">Kotlin JNI bridge (<code>libwroughtmark_core.so</code>) capturing 6DoF brush/camera trajectory entropy (<code>spatial_6dof_entropy_bps</code>).</div>
              </div>
              <div style="padding:10px;border:1px solid var(--inst-border);background:var(--inst-panel);">
                <strong style="color:var(--verdigris);">OpenXR &amp; WebXR Studio Witness</strong>
                <div style="color:var(--ash);margin-top:4px;">Shared Blender viewport + WebCrypto Ed25519 signing proving 3D scenes were hand-authored rather than single-prompt text-to-3D.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pane 5: Enterprise Provenance, Git PR Supply Chain, HITL Review & USCO -->
      <div class="cpane" id="pane-enterprise">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">
          <div style="padding:16px;border:1px solid var(--inst-border);background:var(--inst-panel);">
            <span class="dark-label" style="color:var(--brass);">1. Blind Time-Anchor Witness (0B Content)</span>
            <p style="font-size:13px;color:var(--ash);margin:0 0 12px;">Pins a 32-byte digest to a cryptographic wall-clock witness via <code>POST /api/anchor/stamp</code> without sending source drafts.</p>
            <button id="entStampBtn" class="btn btn-brass" type="button" style="width:100%;">Stamp 32-Byte Digest Anchor</button>
            <pre id="entAnchorOut" style="margin:12px 0 0;font-family:var(--mono);font-size:11px;color:var(--ink);white-space:pre-wrap;word-break:break-all;">Standby // 0 raw bytes transmitted</pre>
          </div>
          <div style="padding:16px;border:1px solid var(--inst-border);background:var(--inst-panel);">
            <span class="dark-label" style="color:var(--verdigris);">2. Git PR Supply-Chain Gate (/api/git/verify-pr)</span>
            <p style="font-size:13px;color:var(--ash);margin:0 0 12px;">Audits <code>build_test_cycles</code> and diff iterations to block opaque single-drop PRs while passing genuine code edits.</p>
            <button id="entGitPrBtn" class="btn btn-dark-ghost" type="button" style="width:100%;">Verify Clean Iterative Git PR</button>
            <pre id="entGitOut" style="margin:12px 0 0;font-family:var(--mono);font-size:11px;color:var(--ink);white-space:pre-wrap;word-break:break-all;">Standby // CI merge gate ready</pre>
          </div>
          <div style="padding:16px;border:1px solid var(--inst-border);background:var(--inst-panel);">
            <span class="dark-label" style="color:var(--crimson);">3. HITL Review &amp; Hiring Gate</span>
            <p style="font-size:13px;color:var(--ash);margin:0 0 12px;">Detects 4-second rubber-stamp approvals (<code>RUBBER_STAMP_REVIEW</code>) and validates zero-spyware take-home code tests.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="entHitlRubberBtn" class="btn btn-dark-ghost" type="button" style="flex:1;padding:7px 10px;">4s Rubber-Stamp</button>
              <button id="entHiringBtn" class="btn btn-dark-ghost" type="button" style="flex:1;padding:7px 10px;">Hiring Verify</button>
            </div>
            <pre id="entHitlOut" style="margin:12px 0 0;font-family:var(--mono);font-size:11px;color:var(--ink);white-space:pre-wrap;word-break:break-all;">Standby // Viewport dwell + test gate ready</pre>
          </div>
          <div style="padding:16px;border:1px solid var(--inst-border);background:var(--inst-panel);">
            <span class="dark-label" style="color:var(--brass);">4. Multi-Author Handoff &amp; USCO Manifest</span>
            <p style="font-size:13px;color:var(--ash);margin:0 0 12px;">Validates multi-key relay custody (<code>field_journalist -&gt; compliance_reviewer</code>) and computes USCO disclosure statements.</p>
            <button id="entUscoBtn" class="btn btn-dark-ghost" type="button" style="width:100%;">Verify Handoff + Generate USCO Manifest</button>
            <pre id="entUscoOut" style="margin:12px 0 0;font-family:var(--mono);font-size:11px;color:var(--ink);white-space:pre-wrap;word-break:break-all;">Standby // Custody &amp; copyright disclosure ready</pre>
          </div>
          <div style="padding:16px;border:1px solid var(--inst-border);background:var(--inst-panel);">
            <span class="dark-label" style="color:var(--verdigris);">5. Embedded Container Seal Inspector</span>
            <p style="font-size:13px;color:var(--ash);margin:0 0 12px;">Extracts self-contained <code>%%WROUGHTMARK_SEAL_V03:</code> container envelopes and checks pre-seal SHA-256 + Ed25519.</p>
            <button id="entContainerBtn" class="btn btn-dark-ghost" type="button" style="width:100%;">Run Container Embed &amp; Extract Check</button>
            <pre id="entContainerOut" style="margin:12px 0 0;font-family:var(--mono);font-size:11px;color:var(--ink);white-space:pre-wrap;word-break:break-all;">Standby // Container inspector ready</pre>
          </div>
          <div style="padding:16px;border:1px solid var(--inst-border);background:var(--inst-panel);">
            <span class="dark-label" style="color:var(--brass);">6. MS365, Google Workspace &amp; Agent Skill</span>
            <p style="font-size:13px;color:var(--ash);margin:0 0 12px;">Mints and verifies OpenXML <code>customXml</code>, Drive <code>appProperties</code>, Copilot/Gemini disclosures, and <code>wroughtmark-provenance</code> MCP tools.</p>
            <div style="display:grid;gap:8px;">
              <button id="entM365Btn" class="btn btn-dark-ghost" type="button" style="width:100%;">MS365 OpenXML + Copilot Seal</button>
              <button id="entGwsBtn" class="btn btn-dark-ghost" type="button" style="width:100%;">Google Workspace + Gemini Seal</button>
              <button id="entSkillMcpBtn" class="btn btn-dark-ghost" type="button" style="width:100%;">Agent Skill MCP Round-Trip</button>
            </div>
            <pre id="entSuiteOut" style="margin:12px 0 0;font-family:var(--mono);font-size:11px;color:var(--ink);white-space:pre-wrap;word-break:break-all;">Standby // MS365, Google Workspace &amp; Agent MCP ready</pre>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Band 3: Interactive Type & Merkle Specimen Index (Dinamo Foundry Spread) -->
  <section class="specimen-band" id="specimens">
    <div class="specimen-head">
      <div>
        <span class="eyebrow">Specimen Matrix // 01–05 Telemetry &amp; Spatial Adapters</span>
      </div>
      <span class="reg-mark">SELECT ROW TO SHIFT PARTICLE CADENCE ↑</span>
    </div>

    <div class="discipline-ledger">
      <div class="disc-nav" id="discNav">
        <button class="disc-row" type="button" data-disc="writing">
          <span class="disc-row-idx">01</span>
          <span class="disc-row-name">Writing &amp; Academic</span>
          <span class="disc-row-tag">Line Sweep</span>
        </button>
        <button class="disc-row" type="button" data-disc="music">
          <span class="disc-row-idx">02</span>
          <span class="disc-row-name">Music &amp; Audio</span>
          <span class="disc-row-tag">Harmonic Wave</span>
        </button>
        <button class="disc-row" type="button" data-disc="visual">
          <span class="disc-row-idx">03</span>
          <span class="disc-row-name">Visual Art &amp; 3D</span>
          <span class="disc-row-tag">Depth Strata</span>
        </button>
        <button class="disc-row active" type="button" data-disc="film">
          <span class="disc-row-idx">04</span>
          <span class="disc-row-name">Film &amp; Video</span>
          <span class="disc-row-tag">Optical Shimmer</span>
        </button>
        <button class="disc-row" type="button" data-disc="spatial">
          <span class="disc-row-idx">05</span>
          <span class="disc-row-name">Spatial XR &amp; Wearables</span>
          <span class="disc-row-tag">6DoF Lattice</span>
        </button>
      </div>

      <div class="disc-detail" id="discDetail">
        <div>
          <span class="eyebrow" id="discKicker">04 / NLE Adapter Active</span>
          <h3 id="discTitle">Film &amp; Video Post-Production</h3>
          <p id="discDesc">Tracks non-destructive timeline cuts, color grades, render checkpoints, and Apple Watch / Android Wear slate co-signs without reading a single frame of raw footage.</p>
          <div class="adapter-pills" id="discPills"></div>
        </div>

        <div>
          <div class="merkle-sim" id="merkleSim"></div>
          <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <span id="discSignalMeta" style="font-family:var(--mono);font-size:11px;color:var(--ash);"></span>
            <button id="morphPreviewBtn" class="btn btn-ghost" type="button">Pulse Particle Field ↑</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Band 3.5: Licensing & Institutional Volume Schedule -->
  <section class="specimen-band" id="licensing">
    <div class="specimen-head">
      <div>
        <span class="eyebrow">Licensing &amp; Volume Deployment // Open Core + Institutional SaaS</span>
      </div>
      <span class="reg-mark">ZERO RAW DRAFTS EVER UPLOADED</span>
    </div>
    <div style="overflow-x:auto;margin-top:20px;">
      <table>
        <thead>
          <tr>
            <th>Tier</th>
            <th>Pricing</th>
            <th>Audience</th>
            <th>Capabilities Unlocked</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Open Core</td>
            <td style="color:var(--verdigris);font-weight:600;">\$0</td>
            <td>Students &amp; Indie Creators</td>
            <td>Local folder watch, macOS MenuBarExtra + Windows/Linux desktop apps, CLI &amp; editor plugins, 9-vector AI assay, 3-tier *.seal.json minting &amp; printable dossier</td>
          </tr>
          <tr>
            <td>Creator Pro</td>
            <td style="color:var(--brass);font-weight:600;">\$12/mo · \$99/yr</td>
            <td>Writers, Musicians, Designers</td>
            <td>iOS/Android &amp; watchOS/Wear OS hardware co-signing, Meta Ray-Ban Display HUD + Neural Band witness, custom badge domains &amp; /v/receipt links</td>
          </tr>
          <tr>
            <td>Studio / Publisher</td>
            <td style="color:var(--brass);font-weight:600;">\$299/mo</td>
            <td>Labels, Agencies, Publishers</td>
            <td>Up to 25 seats, shared keyrings, visionOS / Horizon OS / Android XR spatial witnesses, Batch Triage CSV exports &amp; API quota</td>
          </tr>
          <tr>
            <td>Higher-Ed Dept</td>
            <td style="color:var(--brass);font-weight:600;">\$1,500/mo · \$15k/yr</td>
            <td>University Faculties</td>
            <td>Up to 2,500 students, 3-tier Canvas / Moodle / Blackboard LTI 1.3 triage &amp; /api/lms/batch SLA</td>
          </tr>
          <tr>
            <td>Enterprise / FTE</td>
            <td style="color:var(--ink);font-weight:600;">\$3–\$6 FTE/yr (\$35k+ floor)</td>
            <td>Whole Universities &amp; Media</td>
            <td>Unlimited seats, SSO/SAML, custom compliance retention, full XR fleet attestation &amp; high-volume LTI webhooks</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div id="downloads" style="margin-top:20px;border:1px solid var(--border);background:var(--surface);padding:20px;display:flex;flex-direction:column;gap:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <span class="eyebrow">Open Core Direct Downloads // MIT License</span>
          <p style="margin:6px 0 0;font-size:13.5px;color:var(--ash);">
            Download prebuilt local desktop watchers, the CLI binary, and all 10 single-user plugins directly from GitHub Releases. macOS builds are Apple Developer ID signed and notarized; Windows and Linux builds publish SHA-256 checksums and VirusTotal scan reports. Zero telemetry or raw file uploads.
          </p>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <a class="btn btn-ghost" href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/SHA256SUMS.txt" target="_blank" rel="noopener noreferrer">SHA256SUMS.txt</a>
          <a class="btn btn-ghost" href="https://github.com/WroughtMark/wroughtmark-core" target="_blank" rel="noopener noreferrer">GitHub Repo (WroughtMark/wroughtmark-core)</a>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        <a class="btn btn-primary" href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.dmg" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3"/></svg>
          <span>macOS (.dmg)</span>
        </a>
        <a class="btn btn-ghost" href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.tar.gz" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3"/></svg>
          <span>macOS (.tar.gz)</span>
        </a>
        <a class="btn btn-ghost" href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-windows-x86_64.zip" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3"/></svg>
          <span>Windows (.zip)</span>
        </a>
        <a class="btn btn-ghost" href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-linux-x86_64.tar.gz" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3"/></svg>
          <span>Linux (.tar.gz)</span>
        </a>
        <a class="btn btn-ghost" href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-plugins-bundle.zip" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3"/></svg>
          <span>All 10 Plugins (.zip)</span>
        </a>
      </div>
      <div style="overflow-x:auto;margin-top:4px;border-top:1px solid var(--border);padding-top:12px;">
        <table aria-label="Open Core Release Verification Checksums and VirusTotal Reports">
          <thead>
            <tr>
              <th>Package</th>
              <th>Verification Status</th>
              <th>SHA-256 Digest</th>
              <th>Scan &amp; Checksum</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.dmg" target="_blank" rel="noopener noreferrer" style="color:var(--ink);font-weight:600;text-decoration:underline;">Wroughtmark-macOS-arm64.dmg</a></td>
              <td style="color:var(--verdigris);font-weight:600;">Apple Developer ID Signed &amp; Notarized</td>
              <td><code style="font-size:11px;word-break:break-all;color:var(--ink);">a44eeebe8559cd671b178926fb8df4a74406b9736fb407cdac5a12855223c53d</code></td>
              <td><a href="https://www.virustotal.com/gui/file/a44eeebe8559cd671b178926fb8df4a74406b9736fb407cdac5a12855223c53d" target="_blank" rel="noopener noreferrer" style="color:var(--ink);text-decoration:underline;">VirusTotal Scan</a></td>
            </tr>
            <tr>
              <td><a href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.tar.gz" target="_blank" rel="noopener noreferrer" style="color:var(--ink);font-weight:600;text-decoration:underline;">Wroughtmark-macOS-arm64.tar.gz</a></td>
              <td style="color:var(--verdigris);font-weight:600;">Apple Developer ID Signed &amp; Notarized</td>
              <td><code style="font-size:11px;word-break:break-all;color:var(--ink);">9d77ee4331094abe829312c3d604335175cdedd0cc5768546f699c7ed45b0f41</code></td>
              <td><a href="https://www.virustotal.com/gui/file/9d77ee4331094abe829312c3d604335175cdedd0cc5768546f699c7ed45b0f41" target="_blank" rel="noopener noreferrer" style="color:var(--ink);text-decoration:underline;">VirusTotal Scan</a></td>
            </tr>
            <tr>
              <td><a href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-windows-x86_64.zip" target="_blank" rel="noopener noreferrer" style="color:var(--ink);font-weight:600;text-decoration:underline;">wroughtmark-windows-x86_64.zip</a></td>
              <td style="color:var(--brass);font-weight:600;">SHA-256 &amp; VirusTotal Verified</td>
              <td><code style="font-size:11px;word-break:break-all;color:var(--ink);">b1e3264396b18f262f2264a4711a188940713656c921dea710fd1a827582e78f</code></td>
              <td><a href="https://www.virustotal.com/gui/file/b1e3264396b18f262f2264a4711a188940713656c921dea710fd1a827582e78f" target="_blank" rel="noopener noreferrer" style="color:var(--ink);text-decoration:underline;">VirusTotal Scan</a></td>
            </tr>
            <tr>
              <td><a href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-linux-x86_64.tar.gz" target="_blank" rel="noopener noreferrer" style="color:var(--ink);font-weight:600;text-decoration:underline;">wroughtmark-linux-x86_64.tar.gz</a></td>
              <td style="color:var(--brass);font-weight:600;">SHA-256 &amp; VirusTotal Verified</td>
              <td><code style="font-size:11px;word-break:break-all;color:var(--ink);">aba4083224d97b42d23afe1817c59019258875b0b353a16a4e6f2080b301f3ff</code></td>
              <td><a href="https://www.virustotal.com/gui/file/aba4083224d97b42d23afe1817c59019258875b0b353a16a4e6f2080b301f3ff" target="_blank" rel="noopener noreferrer" style="color:var(--ink);text-decoration:underline;">VirusTotal Scan</a></td>
            </tr>
            <tr>
              <td><a href="https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-plugins-bundle.zip" target="_blank" rel="noopener noreferrer" style="color:var(--ink);font-weight:600;text-decoration:underline;">wroughtmark-plugins-bundle.zip</a></td>
              <td style="color:var(--brass);font-weight:600;">SHA-256 &amp; VirusTotal Verified</td>
              <td><code style="font-size:11px;word-break:break-all;color:var(--ink);">14b84d470f3a255aaf37a785db1aac70646fe91fc49750c1cefb9733fae460e1</code></td>
              <td><a href="https://www.virustotal.com/gui/file/14b84d470f3a255aaf37a785db1aac70646fe91fc49750c1cefb9733fae460e1" target="_blank" rel="noopener noreferrer" style="color:var(--ink);text-decoration:underline;">VirusTotal Scan</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Band 3.75: Direct Inquiries & Foundry Communications -->
  <section class="specimen-band" id="contact">
    <div class="specimen-head">
      <div>
        <span class="eyebrow">Direct Contact // Foundry Communications &amp; Institutional Partnerships</span>
      </div>
      <span class="reg-mark">RESPONSE WITHIN 24 HOURS</span>
    </div>

    <div class="cap-grid-3" style="margin-top:20px;">
      <article class="cap-card">
        <div>
          <div class="cap-kicker">DIRECT EMAIL // INQUIRIES &amp; ASSISTANCE</div>
          <h3 class="cap-title">hello@wroughtmark.com</h3>
          <p class="cap-desc">Direct line for technical inquiries, integration pilots, university compliance trials, security audits, and creator licensing.</p>
        </div>
        <div class="cap-meta" style="margin-top:16px;">
          <a class="btn btn-primary" href="mailto:hello@wroughtmark.com" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>
            <span>Email hello@wroughtmark.com</span>
          </a>
        </div>
      </article>

      <article class="cap-card">
        <div>
          <div class="cap-kicker">OPEN SOURCE // GITHUB COMMUNITY</div>
          <h3 class="cap-title">Public Repositories &amp; Discussions</h3>
          <p class="cap-desc">Track protocol development, inspect RFCs, submit pull requests, or file issues in our public GitHub repositories.</p>
        </div>
        <div class="cap-meta" style="margin-top:16px;">
          <a class="btn btn-ghost" href="https://github.com/WroughtMark/wroughtmark-core" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
            <span>GitHub: WroughtMark/wroughtmark-core</span>
          </a>
        </div>
      </article>

      <article class="cap-card">
        <div>
          <div class="cap-kicker">CORPORATE ATTRIBUTION // ILLAWARRA, AUSTRALIA</div>
          <h3 class="cap-title">Crampton IT Solutions</h3>
          <p class="cap-desc">Wroughtmark is developed and maintained by Crampton IT Solutions. Based in the Illawarra region of New South Wales, Australia.</p>
        </div>
        <div class="cap-meta" style="margin-top:16px;">ABN &amp; institutional enterprise SLA agreements available upon request.</div>
      </article>
    </div>
  </section>

  <!-- Footer & Privacy Controls -->
  <section class="colophon-band" id="colophon">
    <footer>
      <div class="footer-left">
        <div>wroughtmark.com · Kinetic Assay Foundry · Open Protocol v0.3 · <a href="/blog" style="color:var(--brass);text-decoration:none;">Dispatches &amp; Guides</a> · <a href="mailto:hello@wroughtmark.com" style="color:var(--brass);text-decoration:none;">hello@wroughtmark.com</a></div>
        <div style="margin-top:4px;color:var(--dim);font-size:10px;letter-spacing:0.04em;">&copy; 2026 Crampton IT Solutions. All rights reserved. Core suite licensed under MIT. · <a href="/privacy" style="color:inherit;text-decoration:underline;">Privacy Policy</a> · <a href="/terms" style="color:inherit;text-decoration:underline;">Terms of Use</a> · <a href="#contact" style="color:inherit;text-decoration:underline;">Contact</a></div>
      </div>
      <div class="footer-right">
        <span>Rust Core · Swift · Kotlin · Meta Display HUD · TypeScript SDK</span>
        <button type="button" class="footer-cookie-btn" id="footerCookieSettingsBtn" aria-haspopup="dialog" aria-controls="cookiePreferencesModal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <circle cx="9" cy="6" r="2" fill="currentColor"></circle>
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <circle cx="15" cy="12" r="2" fill="currentColor"></circle>
            <line x1="4" y1="18" x2="20" y2="18"></line>
            <circle cx="10" cy="18" r="2" fill="currentColor"></circle>
          </svg>
          <span>Cookie Settings</span>
        </button>
      </div>
    </footer>
  </section>

  <div id="cookieBanner" class="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-banner-title" aria-describedby="cookie-banner-description" hidden>
    <div class="cookie-banner-inner">
      <div class="cookie-banner-copy">
        <h2 id="cookie-banner-title" class="cookie-banner-title">Privacy &amp; Cookie Controls</h2>
        <p id="cookie-banner-description" class="cookie-banner-desc">
          We use essential cookies to keep Wroughtmark secure and functional. With your consent, we also use functional storage to remember your display theme and privacy-focused analytics to improve the foundry. Zero raw document bytes or keystroke streams ever leave your browser.
        </p>
      </div>
      <div class="cookie-actions">
        <button type="button" class="btn btn-ghost" id="cookieManageBtn">Manage Preferences</button>
        <button type="button" class="btn btn-ghost" id="cookieRejectBtn">Reject All</button>
        <button type="button" class="btn btn-primary" id="cookieAcceptBtn">Accept All</button>
      </div>
    </div>
  </div>

  <div id="cookieModalBackdrop" class="cookie-modal-backdrop" hidden aria-hidden="true"></div>
  <div id="cookiePreferencesModal" class="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title" aria-describedby="cookie-preferences-desc" tabindex="-1" hidden>
    <div class="cookie-modal-head">
      <div>
        <h2 id="cookie-preferences-title" class="cookie-modal-title">Cookie Preferences</h2>
        <p id="cookie-preferences-desc" class="cookie-banner-desc" style="margin-top:6px;">
          Choose which optional browser storage and cookie categories you allow on wroughtmark.com.
        </p>
      </div>
      <button type="button" class="cookie-close-btn" id="cookieModalCloseBtn" aria-label="Close cookie preferences">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true">
          <line x1="5" y1="5" x2="19" y2="19"></line>
          <line x1="19" y1="5" x2="5" y2="19"></line>
        </svg>
      </button>
    </div>

    <div id="cookieConsentStatus" class="cookie-status" role="status" aria-live="polite">
      No saved preference yet. Only strictly necessary cookies are active.
    </div>

    <div class="cookie-cat-list">
      <div class="cookie-cat-card">
        <div class="cookie-cat-row">
          <span class="cookie-cat-name">Essential</span>
          <span class="cookie-badge-always">Always On</span>
        </div>
        <p class="cookie-cat-desc">
          Required for core site security, Cloudflare edge protection, LTI 1.3 verification handshakes, and client-side WebCrypto seal verification. These cannot be disabled.
        </p>
      </div>

      <label class="cookie-cat-card is-toggle" for="cookieToggleFunctional">
        <div class="cookie-cat-row">
          <span class="cookie-cat-name">Functional</span>
          <input id="cookieToggleFunctional" class="cookie-checkbox" type="checkbox" />
        </div>
        <p class="cookie-cat-desc">
          Remember your interface preferences such as Dark or Light studio mode (wroughtmark-theme) across visits.
        </p>
      </label>

      <label class="cookie-cat-card is-toggle" for="cookieToggleAnalytics">
        <div class="cookie-cat-row">
          <span class="cookie-cat-name">Analytics</span>
          <input id="cookieToggleAnalytics" class="cookie-checkbox" type="checkbox" />
        </div>
        <p class="cookie-cat-desc">
          Help us understand aggregate feature usage using privacy-focused, self-hosted telemetry. Never captures document content or biometric streams.
        </p>
      </label>

      <label class="cookie-cat-card is-toggle" for="cookieToggleMarketing">
        <div class="cookie-cat-row">
          <span class="cookie-cat-name">Marketing</span>
          <input id="cookieToggleMarketing" class="cookie-checkbox" type="checkbox" />
        </div>
        <p class="cookie-cat-desc">
          Used to measure campaign attribution and enterprise outreach effectiveness. Currently inactive on wroughtmark.com.
        </p>
      </label>
    </div>

    <div class="cookie-actions">
      <button type="button" class="btn btn-primary" id="cookieSavePrefsBtn">Save Preferences</button>
      <button type="button" class="btn btn-ghost" id="cookieModalRejectBtn">Reject Optional</button>
      <button type="button" class="btn btn-ghost" id="cookieModalAcceptBtn">Accept All</button>
      <button type="button" class="btn btn-ghost" id="cookieWithdrawBtn">Withdraw Consent</button>
    </div>
  </div>

  <script type="module">
    const sortVal = (v) => Array.isArray(v) ? v.map(sortVal) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>[k,sortVal(x)])) : v;
    const hexToBytes = (h) => new Uint8Array(h.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
    const bytesToHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    const CONSENT_COOKIE_NAME = 'wroughtmark-cookie-consent';
    const CONSENT_VERSION = '1.0';
    const CONSENT_EXPIRY_DAYS = 365;
    const DEFAULT_CONSENT = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: 0,
      version: CONSENT_VERSION,
    };

    function getConsent() {
      try {
        const stored = localStorage.getItem(CONSENT_COOKIE_NAME);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        if (!parsed || parsed.version !== CONSENT_VERSION) return null;
        return parsed;
      } catch (_) {
        return null;
      }
    }

    function hasConsentDecision() {
      return getConsent() !== null;
    }

    function isCategoryAllowed(category) {
      if (category === 'essential') return true;
      const consent = getConsent();
      if (!consent) return false;
      return Boolean(consent[category]);
    }

    function saveConsent(partial) {
      const fullConsent = {
        essential: true,
        functional: Boolean(partial && partial.functional),
        analytics: Boolean(partial && partial.analytics),
        marketing: Boolean(partial && partial.marketing),
        timestamp: Date.now(),
        version: CONSENT_VERSION,
      };
      try {
        localStorage.setItem(CONSENT_COOKIE_NAME, JSON.stringify(fullConsent));
        if (fullConsent.functional) {
          const curTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
          localStorage.setItem('wroughtmark-theme', curTheme);
        } else {
          localStorage.removeItem('wroughtmark-theme');
        }
      } catch (_) {}
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + CONSENT_EXPIRY_DAYS);
      const securePart = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = CONSENT_COOKIE_NAME + '=accepted; expires=' + expiryDate.toUTCString() + '; path=/; SameSite=Lax' + securePart;
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: fullConsent }));
      return fullConsent;
    }

    function acceptAllCookies() {
      return saveConsent({ essential: true, functional: true, analytics: true, marketing: true });
    }

    function rejectOptionalCookies() {
      return saveConsent({ essential: true, functional: false, analytics: false, marketing: false });
    }

    function clearConsent() {
      try {
        localStorage.removeItem(CONSENT_COOKIE_NAME);
        localStorage.removeItem('wroughtmark-theme');
      } catch (_) {}
      document.cookie = CONSENT_COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: null }));
    }

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeToggleLabel = document.getElementById('themeToggleLabel');
    function applyTheme(next) {
      const mode = next === 'light' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', mode);
      if (isCategoryAllowed('functional')) {
        try { localStorage.setItem('wroughtmark-theme', mode); } catch (_) {}
      }
      if (themeToggleLabel) themeToggleLabel.textContent = mode === 'dark' ? 'Dark' : 'Light';
      if (window.__wmSetTheme) {
        window.__wmSetTheme(mode);
      }
      const oldBadge = document.getElementById('liveEmbedBadge');
      if (oldBadge && oldBadge.parentElement) {
        const fresh = document.createElement('wroughtmark-badge');
        fresh.id = 'liveEmbedBadge';
        fresh.setAttribute('seal-id', oldBadge.getAttribute('seal-id') || 'wm_seal_sample');
        fresh.setAttribute('discipline', oldBadge.getAttribute('discipline') || 'film');
        fresh.setAttribute('sessions', oldBadge.getAttribute('sessions') || '4');
        fresh.setAttribute('active-seconds', oldBadge.getAttribute('active-seconds') || '5400');
        fresh.setAttribute('verify-url', oldBadge.getAttribute('verify-url') || (window.location.origin + '/#instrument'));
        fresh.setAttribute('theme', mode);
        oldBadge.replaceWith(fresh);
      }
    }
    applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(cur === 'dark' ? 'light' : 'dark');
      });
    }

    (function initCookieControls() {
      const bannerEl = document.getElementById('cookieBanner');
      const backdropEl = document.getElementById('cookieModalBackdrop');
      const modalEl = document.getElementById('cookiePreferencesModal');
      const statusEl = document.getElementById('cookieConsentStatus');
      const functionalToggle = document.getElementById('cookieToggleFunctional');
      const analyticsToggle = document.getElementById('cookieToggleAnalytics');
      const marketingToggle = document.getElementById('cookieToggleMarketing');
      const manageBtn = document.getElementById('cookieManageBtn');
      const footerSettingsBtn = document.getElementById('footerCookieSettingsBtn');
      const closeBtn = document.getElementById('cookieModalCloseBtn');
      const rejectBtn = document.getElementById('cookieRejectBtn');
      const acceptBtn = document.getElementById('cookieAcceptBtn');
      const savePrefsBtn = document.getElementById('cookieSavePrefsBtn');
      const modalRejectBtn = document.getElementById('cookieModalRejectBtn');
      const modalAcceptBtn = document.getElementById('cookieModalAcceptBtn');
      const withdrawBtn = document.getElementById('cookieWithdrawBtn');
      let lastFocusedCookieTrigger = null;

      function syncConsentUi() {
        const consent = getConsent();
        const active = consent || DEFAULT_CONSENT;
        if (functionalToggle) functionalToggle.checked = Boolean(active.functional);
        if (analyticsToggle) analyticsToggle.checked = Boolean(active.analytics);
        if (marketingToggle) marketingToggle.checked = Boolean(active.marketing);
        if (statusEl) {
          if (!consent) {
            statusEl.textContent = 'No saved preference yet. Only essential cookies are active.';
          } else {
            const enabled = ['essential'];
            if (consent.functional) enabled.push('functional');
            if (consent.analytics) enabled.push('analytics');
            if (consent.marketing) enabled.push('marketing');
            const updatedAt = consent.timestamp ? new Date(consent.timestamp).toLocaleString() : 'saved';
            statusEl.textContent = 'Active categories: ' + enabled.join(', ') + ' (updated ' + updatedAt + ')';
          }
        }
      }

      function hideBanner() {
        if (bannerEl) bannerEl.hidden = true;
      }

      function showBanner() {
        if (bannerEl) bannerEl.hidden = false;
      }

      function openPreferencesModal(trigger) {
        lastFocusedCookieTrigger = trigger || document.activeElement;
        syncConsentUi();
        if (backdropEl) backdropEl.hidden = false;
        if (modalEl) {
          modalEl.hidden = false;
          const focusable = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (focusable.length > 0) focusable[0].focus();
          else modalEl.focus();
        }
      }

      function closePreferencesModal(restoreFocus) {
        if (modalEl) modalEl.hidden = true;
        if (backdropEl) backdropEl.hidden = true;
        if (restoreFocus && lastFocusedCookieTrigger && typeof lastFocusedCookieTrigger.focus === 'function') {
          lastFocusedCookieTrigger.focus();
        }
      }

      if (modalEl) {
        modalEl.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            closePreferencesModal(true);
            return;
          }
          if (e.key === 'Tab') {
            const focusable = Array.from(
              modalEl.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
            ).filter((el) => el.offsetParent !== null);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        });
      }

      if (manageBtn) manageBtn.addEventListener('click', () => openPreferencesModal(manageBtn));
      if (footerSettingsBtn) footerSettingsBtn.addEventListener('click', () => openPreferencesModal(footerSettingsBtn));
      if (closeBtn) closeBtn.addEventListener('click', () => closePreferencesModal(true));
      if (backdropEl) backdropEl.addEventListener('click', () => closePreferencesModal(true));

      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
          acceptAllCookies();
          syncConsentUi();
          hideBanner();
        });
      }
      if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
          rejectOptionalCookies();
          syncConsentUi();
          hideBanner();
        });
      }
      if (modalAcceptBtn) {
        modalAcceptBtn.addEventListener('click', () => {
          acceptAllCookies();
          syncConsentUi();
          hideBanner();
          closePreferencesModal(true);
        });
      }
      if (modalRejectBtn) {
        modalRejectBtn.addEventListener('click', () => {
          rejectOptionalCookies();
          syncConsentUi();
          hideBanner();
          closePreferencesModal(true);
        });
      }
      if (savePrefsBtn) {
        savePrefsBtn.addEventListener('click', () => {
          saveConsent({
            essential: true,
            functional: Boolean(functionalToggle && functionalToggle.checked),
            analytics: Boolean(analyticsToggle && analyticsToggle.checked),
            marketing: Boolean(marketingToggle && marketingToggle.checked),
          });
          syncConsentUi();
          hideBanner();
          closePreferencesModal(true);
        });
      }
      if (withdrawBtn) {
        withdrawBtn.addEventListener('click', () => {
          clearConsent();
          syncConsentUi();
          closePreferencesModal(false);
          showBanner();
        });
      }

      syncConsentUi();
      if (!hasConsentDecision()) showBanner();
      if (window.location.hash === '#cookie-settings') {
        openPreferencesModal(footerSettingsBtn);
      }
      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#cookie-settings') openPreferencesModal(footerSettingsBtn);
      });
    })();

    function activateConsoleTab(paneId) {
      document.querySelectorAll('.ctab').forEach((b) => b.classList.toggle('active', b.dataset.pane === paneId));
      document.querySelectorAll('.cpane').forEach((p) => p.classList.toggle('active', p.id === paneId));
    }
    document.querySelectorAll('.ctab').forEach((btn) => {
      btn.addEventListener('click', () => activateConsoleTab(btn.dataset.pane));
    });

    const DISCIPLINES = {
      writing: {
        modeLabel: 'MODE 01 // LINE SWEEP',
        kicker: '01 / Text Adapter Active',
        title: 'Writing & Academic Integrity',
        desc: 'Defends students against false-positive AI accusations by signing organic revision progression, cursor cadence, and source draft hashes locally across long-form essays and code.',
        pills: ['Microsoft Word', 'Google Docs', 'Canvas LMS', 'VS Code', 'Obsidian', 'LaTeX'],
        signalMeta: 'Anomaly flag if bulk paste >35% of total words without revision chain.',
        steps: [
          { seq: 'SEQ 00 · T+00M', ev: 'Outline Seeded', meta: '214 words · local blake3' },
          { seq: 'SEQ 01 · T+24M', ev: 'Draft Expansion', meta: '+680 words · paste 0%' },
          { seq: 'SEQ 02 · T+51M', ev: 'Citation Edits', meta: '+390 words · native typing' },
          { seq: 'SEAL · ED25519', ev: 'Receipt Minted', meta: 'score 96/100 · CLEAN' }
        ]
      },
      music: {
        modeLabel: 'MODE 02 // HARMONIC WAVE',
        kicker: '02 / DAW Adapter Active',
        title: 'Music Production & Stem Ledger',
        desc: 'Captures incremental project file mutations, MIDI composition sessions, and mixdown stem digests so labels, sync houses, and DSPs verify human authorship.',
        pills: ['Reaper ReaScript', 'Ableton Live', 'Logic Pro', 'FL Studio', 'Pro Tools'],
        signalMeta: 'Anomaly flag on single-pass master bounce with zero session depth.',
        steps: [
          { seq: 'SEQ 00 · T+00M', ev: 'MIDI Motif Init', meta: '4 tracks · 118 BPM' },
          { seq: 'SEQ 01 · T+38M', ev: 'Vocal Overdubs', meta: '14 tracks · mix deltas' },
          { seq: 'SEQ 02 · CO-SIGN', ev: 'Studio Watch Tap', meta: 'watchOS hardware key' },
          { seq: 'SEAL · ED25519', ev: 'Stem + Master Seal', meta: 'score 99/100 · CLEAN' }
        ]
      },
      visual: {
        modeLabel: 'MODE 03 // DEPTH STRATA',
        kicker: '03 / Canvas & 3D Adapter Active',
        title: 'Visual Art, Design & 3D Mesh',
        desc: 'Hashes layered artwork files, Photoshop/Figma component commits, and Blender scene saves along an immutable timeline that separates hand-crafted layering from one-prompt outputs.',
        pills: ['Figma Plugin', 'Photoshop UXP', 'Blender Add-on', 'Procreate', 'Affinity'],
        signalMeta: 'Anomaly flag when flattened raster drops without layer mutation tree.',
        steps: [
          { seq: 'SEQ 00 · T+00M', ev: 'Wireframe / Blocking', meta: '18 nodes · 4 layers' },
          { seq: 'SEQ 01 · T+44M', ev: 'Shader & Type Refinement', meta: '64 layers · viewport saves' },
          { seq: 'SEQ 02 · T+85M', ev: 'Lighting Pass Commit', meta: 'non-destructive graph' },
          { seq: 'SEAL · ED25519', ev: 'Artwork Seal Minted', meta: 'score 94/100 · CLEAN' }
        ]
      },
      film: {
        modeLabel: 'MODE 04 // FILM SHIMMER',
        kicker: '04 / NLE Adapter Active',
        title: 'Film & Video Post-Production',
        desc: 'Tracks non-destructive timeline cuts, color grades, render checkpoints, and Apple Watch / Android Wear slate co-signs without reading a single frame of raw footage.',
        pills: ['DaVinci Resolve', 'Premiere Pro UXP', 'Final Cut', 'Watch Slate'],
        signalMeta: 'Anomaly flag on instant single-shot export with zero assembly edits.',
        steps: [
          { seq: 'SEQ 00 · T+00M', ev: 'Assembly Cut Imported', meta: '24 clips · .drp state' },
          { seq: 'SEQ 01 · T+52M', ev: 'Pacing & J-Cuts Locked', meta: '112 timeline deltas' },
          { seq: 'SEQ 02 · CO-SIGN', ev: 'Render Slate Verified', meta: 'DaVinci + Watch witness' },
          { seq: 'SEAL · ED25519', ev: 'Final Master Seal', meta: 'score 97/100 · CLEAN' }
        ]
      },
      spatial: {
        modeLabel: 'MODE 05 // 6DOF SPATIAL LATTICE',
        kicker: '05 / Spatial XR, Smart Glasses & Wrist Adapter Active',
        title: 'Spatial Sculpting, Vision Pro & Meta Display HUD',
        desc: 'Combines Apple Vision Pro Optic ID ornaments, Meta Ray-Ban Display 600x600 POV frame hashes, Meta Neural Band sEMG pinch variance, watchOS / Wear OS wrist taps, and Horizon OS / Android XR 6DoF brush telemetry.',
        pills: ['Meta Ray-Ban Display', 'Neural Band sEMG', 'Apple Vision Pro', 'Meta Quest Horizon OS', 'Android XR', 'watchOS / Wear OS'],
        signalMeta: 'Anomaly flag when Neural Band sEMG (<500 bps) or 6DoF trajectory entropy (<600 bps) looks replayed.',
        steps: [
          { seq: 'SEQ 00 · GLASSES', ev: 'POV Frame Digested', meta: '600x600 HUD · 0B pixels out' },
          { seq: 'SEQ 01 · sEMG', ev: 'Neural Band Pinch Witness', meta: 'variance 2680 bps · human' },
          { seq: 'SEQ 02 · 6DOF', ev: 'Optic ID & Sculpt Delta', meta: '3580 bps trajectory entropy' },
          { seq: 'SEAL · ED25519', ev: 'Multi-Device Spatial Seal', meta: 'score 100/100 · HUMAN_WROUGHT' }
        ]
      }
    };

    function selectDiscipline(key, pulse = true) {
      const d = DISCIPLINES[key];
      if (!d) return;
      document.querySelectorAll('.disc-row').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.disc === key);
      });
      document.getElementById('discKicker').textContent = d.kicker;
      document.getElementById('discTitle').textContent = d.title;
      document.getElementById('discDesc').textContent = d.desc;
      document.getElementById('discSignalMeta').textContent = d.signalMeta;
      document.getElementById('discPills').innerHTML = d.pills.map((p) => '<span class="adapter-tag">' + esc(p) + '</span>').join('');
      document.getElementById('merkleSim').innerHTML = d.steps.map((s) =>
        '<div class="ms-step"><div class="ms-seq">' + esc(s.seq) + '</div><div class="ms-ev">' + esc(s.ev) + '</div><div class="ms-meta">' + esc(s.meta) + '</div></div>'
      ).join('');
      const modeEl = document.getElementById('seal3dMode');
      if (modeEl) modeEl.textContent = d.modeLabel;
      if (window.__wmSetDiscipline) window.__wmSetDiscipline(key, pulse);
    }

    selectDiscipline('film', false);

    document.querySelectorAll('.disc-row').forEach((btn) => {
      btn.addEventListener('click', () => selectDiscipline(btn.dataset.disc, true));
    });
    document.getElementById('morphPreviewBtn').addEventListener('click', () => {
      if (window.__wmTriggerStamp) window.__wmTriggerStamp('morph');
      document.getElementById('specimenPlate').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    let sampleBytes = null;
    let verifiedSeal = null;
    const downloadDossierBtn = document.getElementById('downloadDossierBtn');
    const previewDossierBtn = document.getElementById('previewDossierBtn');
    const publishReceiptBtn = document.getElementById('publishReceiptBtn');
    const shareLinkRow = document.getElementById('shareLinkRow');
    const shareLinkAnchor = document.getElementById('shareLinkAnchor');
    const dossierFrame = document.getElementById('dossierFrame');
    const verifyResultBar = document.getElementById('verifyResultBar');
    const gaugeArc = document.getElementById('gaugeArc');
    const gaugeNum = document.getElementById('gaugeNum');

    function updateGauge(score, ok) {
      const circ = 182.21;
      const clamped = Math.max(0, Math.min(100, Number(score) || 0));
      const offset = circ * (1 - clamped / 100);
      gaugeArc.style.strokeDashoffset = String(offset);
      gaugeArc.style.stroke = !ok ? 'var(--crimson)' : (clamped >= 80 ? 'var(--verdigris)' : 'var(--brass)');
      gaugeNum.textContent = ok ? String(clamped) : 'ERR';
      gaugeNum.style.color = !ok ? 'var(--crimson)' : (clamped >= 80 ? 'var(--verdigris)' : 'var(--brass)');
    }

    function buildDossierHtml(seal) {
      const flags = (seal.summary.anomaly_flags && seal.summary.anomaly_flags.length)
        ? seal.summary.anomaly_flags.map(esc).join(', ')
        : 'CLEAN';
      const tier = seal.summary.authorship_tier || (flags === 'CLEAN' ? 'HUMAN_WROUGHT' : 'ANOMALY_FLAGGED');
      const devices = (seal.summary.co_signed_devices && seal.summary.co_signed_devices.length)
        ? seal.summary.co_signed_devices.map(esc).join(', ')
        : 'none';
      return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Wroughtmark Dossier - ' + esc(seal.seal_id) + '</title>' +
        '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Plus Jakarta Sans",sans-serif;background:#FFFFFF;color:#0F1218;max-width:800px;margin:28px auto;padding:28px;border:1px solid #171A21;}h1{margin:0 0 4px;font-size:23px;letter-spacing:-0.025em;}.sub{color:#49505E;font-family:"IBM Plex Mono",monospace;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:18px;}.badge{display:inline-block;padding:6px 12px;background:#0F6E43;color:#FFFFFF;font-family:"IBM Plex Mono",monospace;font-size:11px;margin-bottom:18px;}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}.card{background:#F7F7F5;border:1px solid #D7DBE3;padding:12px;}.label{font-family:"IBM Plex Mono",monospace;font-size:10px;text-transform:uppercase;color:#49505E;}.val{font-family:"IBM Plex Mono",monospace;font-size:12px;margin-top:4px;word-break:break-all;}.privacy{margin-top:18px;padding:12px;border-left:3px solid #9D6616;background:#F7F7F5;font-size:13px;}@media print{body{border:none;margin:0;background:#fff;}}</style>' +
        '</head><body><h1>Wroughtmark Human-Origin Verification Dossier</h1><div class="sub">Cryptographic Process Provenance Receipt</div>' +
        '<div class="badge">VERIFIED ' + esc(tier) + ' | SCORE ' + esc(seal.summary.process_score) + '/100 | ' + flags + '</div>' +
        '<div class="grid">' +
        '<div class="card"><div class="label">Authorship Tier</div><div class="val">' + esc(tier) + '</div></div>' +
        '<div class="card"><div class="label">Seal ID</div><div class="val">' + esc(seal.seal_id) + '</div></div>' +
        '<div class="card"><div class="label">Discipline &amp; Project</div><div class="val">' + esc(seal.summary.discipline) + ' / ' + esc(seal.project_id) + '</div></div>' +
        '<div class="card"><div class="label">Sessions / Active Time</div><div class="val">' + esc(seal.summary.session_count) + ' session(s) / ' + esc(seal.summary.total_active_seconds) + 's</div></div>' +
        '<div class="card"><div class="label">Timeline Span</div><div class="val">' + esc(seal.summary.span_start_utc) + ' -&gt; ' + esc(seal.summary.span_end_utc) + '</div></div>' +
        '<div class="card"><div class="label">Co-Signed Devices</div><div class="val">' + devices + '</div></div>' +
        '<div class="card"><div class="label">Deliverable SHA-256</div><div class="val">' + esc(seal.final_output_sha256) + '</div></div>' +
        '<div class="card"><div class="label">Chain Merkle Root</div><div class="val">' + esc(seal.chain_root) + '</div></div>' +
        '<div class="card"><div class="label">Creator Public Key</div><div class="val">' + esc(seal.creator_pubkey_hex) + '</div></div>' +
        '</div><div class="privacy"><strong>Privacy Attestation:</strong> Zero raw drafts or unpublished files were uploaded or stored in this dossier.</div></body></html>';
    }

    previewDossierBtn.addEventListener('click', () => {
      if (!verifiedSeal) return;
      const open = dossierFrame.style.display === 'block';
      if (open) {
        dossierFrame.style.display = 'none';
        previewDossierBtn.textContent = 'Preview Dossier';
      } else {
        dossierFrame.srcdoc = buildDossierHtml(verifiedSeal);
        dossierFrame.style.display = 'block';
        previewDossierBtn.textContent = 'Hide Dossier';
      }
    });

    downloadDossierBtn.addEventListener('click', () => {
      if (!verifiedSeal) return;
      const html = buildDossierHtml(verifiedSeal);
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = verifiedSeal.seal_id + '-dossier.html';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    async function runVerify(bytes, rawSeal) {
      activateConsoleTab('pane-single');
      const status = document.getElementById('status');
      verifiedSeal = null;
      downloadDossierBtn.style.display = 'none';
      previewDossierBtn.style.display = 'none';
      if (publishReceiptBtn) publishReceiptBtn.style.display = 'none';
      if (shareLinkRow) shareLinkRow.style.display = 'none';
      dossierFrame.style.display = 'none';
      verifyResultBar.className = 'verify-result-bar visible';
      try {
        const seal = JSON.parse(rawSeal);
        const digest = bytesToHex(await crypto.subtle.digest('SHA-256', bytes));
        if (digest !== seal.final_output_sha256) {
          verifyResultBar.className = 'verify-result-bar visible bad';
          updateGauge(0, false);
          status.textContent = 'FAILED: File SHA-256 does not match this seal.';
          if (window.__wmSet3DState) window.__wmSet3DState('failed', 0, 'HASH_MISMATCH');
          return;
        }
        const { creator_sig, ...payload } = seal;
        const canonical = new TextEncoder().encode(JSON.stringify(sortVal(payload)));
        const key = await crypto.subtle.importKey('raw', hexToBytes(seal.creator_pubkey_hex), { name: 'Ed25519' }, false, ['verify']);
        const ok = await crypto.subtle.verify('Ed25519', key, hexToBytes(creator_sig.replace('ed25519:', '')), canonical);
        if (ok) {
          verifiedSeal = seal;
          downloadDossierBtn.style.display = 'inline-flex';
          previewDossierBtn.style.display = 'inline-flex';
          if (publishReceiptBtn) {
            publishReceiptBtn.style.display = 'inline-flex';
            publishReceiptBtn.textContent = 'Publish Receipt Link';
            publishReceiptBtn.disabled = false;
          }
          const flags = (seal.summary.anomaly_flags && seal.summary.anomaly_flags.length)
            ? seal.summary.anomaly_flags.join(', ')
            : 'CLEAN';
          const tier = seal.summary.authorship_tier || (flags === 'CLEAN' ? 'HUMAN_WROUGHT' : 'ANOMALY_FLAGGED');
          verifyResultBar.className = 'verify-result-bar visible ok';
          updateGauge(seal.summary.process_score, true);
          status.textContent = 'VERIFIED ' + seal.seal_id + ' | ' + tier + ' | ' + seal.summary.discipline + ' | score ' + seal.summary.process_score + '/100 (' + flags + ') | ' + seal.summary.session_count + ' session(s) | ' + seal.summary.total_active_seconds + 's active';
          if (seal.summary && seal.summary.discipline) selectDiscipline(seal.summary.discipline, false);
          if (window.__wmSet3DState) window.__wmSet3DState('verified', seal.summary.process_score, tier);
        } else {
          verifyResultBar.className = 'verify-result-bar visible bad';
          updateGauge(0, false);
          status.textContent = 'FAILED: Invalid Ed25519 signature.';
          if (window.__wmSet3DState) window.__wmSet3DState('failed', 0, 'INVALID_SIG');
        }
      } catch (e) {
        verifyResultBar.className = 'verify-result-bar visible bad';
        updateGauge(0, false);
        status.textContent = 'Error: ' + (e.message || e);
      }
    }

    if (publishReceiptBtn) {
      publishReceiptBtn.addEventListener('click', async () => {
        if (!verifiedSeal) return;
        publishReceiptBtn.disabled = true;
        publishReceiptBtn.textContent = 'Publishing...';
        try {
          const resp = await fetch('/api/seals/register', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ seal: verifiedSeal })
          });
          const data = await resp.json();
          if (resp.ok && data.shareUrl) {
            shareLinkAnchor.href = data.shareUrl;
            shareLinkAnchor.textContent = window.location.origin + data.shareUrl;
            shareLinkRow.style.display = 'block';
            publishReceiptBtn.textContent = 'Published ✓';
          } else {
            publishReceiptBtn.textContent = 'Retry Publish';
            publishReceiptBtn.disabled = false;
          }
        } catch (_) {
          publishReceiptBtn.textContent = 'Retry Publish';
          publishReceiptBtn.disabled = false;
        }
      });
    }

    async function loadPresetScenario(kind) {
      const res = await fetch('/api/demo/scenario?kind=' + encodeURIComponent(kind));
      const data = await res.json();
      const binStr = atob(data.fileBase64);
      sampleBytes = Uint8Array.from(binStr, (c) => c.charCodeAt(0));
      document.getElementById('sealInput').value = JSON.stringify(data.seal, null, 2);
      await runVerify(sampleBytes, document.getElementById('sealInput').value);
    }

    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => loadPresetScenario(btn.dataset.preset));
    });

    document.querySelectorAll('.vector-jump-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await loadPresetScenario(btn.dataset.preset);
        const inst = document.getElementById('instrument');
        if (inst) inst.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const hudPinchBtn = document.getElementById('hudPinchBtn');
    const hudReadout = document.getElementById('hudReadout');
    const hudHeaderTitle = document.getElementById('hudHeaderTitle');
    const hudHeaderMetric = document.getElementById('hudHeaderMetric');
    const HW_PROFILES = {
      'meta-hud': {
        title: 'META DISPLAY // 600x600 RIGHT-LENS HUD',
        metric: 'sEMG 2680bps',
        html: 'NEURAL BAND DAT READY.<br />6DoF ENTROPY: 3420 bps<br />PRIVACY: 0 RAW PIXELS UPLOADED<br />STATUS: STANDBY FOR EMG PINCH'
      },
      'visionos': {
        title: 'APPLE VISION PRO // VISIONOS ORNAMENT',
        metric: 'OPTIC ID VERIFIED',
        html: 'OPTIC ID ENCLAVE LOCKED.<br />MAC VIRTUAL DISPLAY: PAIRED<br />SPATIAL SCULPT DEPTH: 3580 bps<br />STATUS: WroughtmarkVisionOSOrnamentView READY'
      },
      'watch-wear': {
        title: 'WATCHOS & WEAR OS // WRIST SLATE',
        metric: 'STRONGBOX / ENCLAVE',
        html: 'DOUBLE-TAP / ROTARY BEZEL ARMED.<br />BLE STUDIO HEARTBEAT: CONNECTED<br />ACOUSTIC DIGEST: 30s LOCAL HASH<br />STATUS: STANDBY FOR WRIST CO-SIGN'
      },
      'quest-xr': {
        title: 'META QUEST HORIZON OS & ANDROID XR',
        metric: '6DoF 3580bps',
        html: 'OPENXR + KOTLIN JNI BRIDGE ACTIVE.<br />BRUSH POSE ENTROPY: 3580 bps<br />REPLAY GUARD: NO STATIC POSE ANOMALY<br />STATUS: READY TO CO-SIGN SPATIAL MESH'
      }
    };

    document.querySelectorAll('.hw-profile-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.hw;
        const prof = HW_PROFILES[key];
        if (!prof) return;
        document.querySelectorAll('.hw-profile-btn').forEach((b) => b.classList.toggle('active', b === btn));
        if (hudHeaderTitle) hudHeaderTitle.textContent = prof.title;
        if (hudHeaderMetric) hudHeaderMetric.textContent = prof.metric;
        if (hudReadout) hudReadout.innerHTML = prof.html;
      });
    });

    if (hudPinchBtn) {
      hudPinchBtn.addEventListener('click', async () => {
        if (hudReadout) {
          hudReadout.innerHTML = 'NEURAL BAND PINCH DETECTED // sEMG 2680bps<br />MINTING BLAKE3 + ED25519 SPATIAL SEAL...';
        }
        await loadPresetScenario('spatial');
      });
    }

    (function bindEnterprisePane() {
      const entStampBtn = document.getElementById('entStampBtn');
      const entAnchorOut = document.getElementById('entAnchorOut');
      const entGitPrBtn = document.getElementById('entGitPrBtn');
      const entGitOut = document.getElementById('entGitOut');
      const entHitlRubberBtn = document.getElementById('entHitlRubberBtn');
      const entHiringBtn = document.getElementById('entHiringBtn');
      const entHitlOut = document.getElementById('entHitlOut');
      const entUscoBtn = document.getElementById('entUscoBtn');
      const entUscoOut = document.getElementById('entUscoOut');
      const entContainerBtn = document.getElementById('entContainerBtn');
      const entContainerOut = document.getElementById('entContainerOut');

      if (entStampBtn && entAnchorOut) {
        entStampBtn.addEventListener('click', async () => {
          const digest = bytesToHex(await crypto.subtle.digest('SHA-256', sampleBytes || new TextEncoder().encode('wroughtmark-v03-anchor')));
          const res = await fetch('/api/anchor/stamp', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ digestHex: digest })
          });
          const data = await res.json();
          entAnchorOut.textContent = JSON.stringify(data, null, 2);
        });
      }

      if (entGitPrBtn && entGitOut) {
        entGitPrBtn.addEventListener('click', async () => {
          const s = await (await fetch('/api/demo/scenario?kind=gitpr')).json();
          const ver = await (await fetch('/api/git/verify-pr', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ outputBase64: s.fileBase64, seal: s.seal })
          })).json();
          entGitOut.textContent = JSON.stringify(ver, null, 2);
        });
      }

      if (entHitlRubberBtn && entHitlOut) {
        entHitlRubberBtn.addEventListener('click', async () => {
          const s = await (await fetch('/api/demo/scenario?kind=hitlrubber')).json();
          entHitlOut.textContent = 'VERDICT: ' + s.seal.summary.authorship_tier + ' | SCORE ' + s.seal.summary.process_score + '/100 | FLAGS: ' + s.seal.summary.anomaly_flags.join(', ');
        });
      }

      if (entHiringBtn && entHitlOut) {
        entHiringBtn.addEventListener('click', async () => {
          const s = await (await fetch('/api/demo/scenario?kind=gitpr')).json();
          const res = await (await fetch('/api/hiring/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ outputBase64: s.fileBase64, seal: s.seal })
          })).json();
          entHitlOut.textContent = JSON.stringify(res, null, 2);
        });
      }

      if (entUscoBtn && entUscoOut) {
        entUscoBtn.addEventListener('click', async () => {
          const s = await (await fetch('/api/demo/scenario?kind=handoff')).json();
          const res = await (await fetch('/api/usco/manifest', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ seal: s.seal })
          })).json();
          entUscoOut.textContent = 'CONTRIBUTORS: ' + (s.seal.summary.contributors || []).map((c) => c.role).join(' -> ') + String.fromCharCode(10) + JSON.stringify(res, null, 2);
        });
      }

      if (entContainerBtn && entContainerOut) {
        entContainerBtn.addEventListener('click', async () => {
          const s = await (await fetch('/api/demo/scenario?kind=clean')).json();
          const rawText = new TextDecoder().decode(Uint8Array.from(atob(s.fileBase64), (c) => c.charCodeAt(0)));
          const nl = String.fromCharCode(10);
          const embeddedStr = rawText + nl + '%%WROUGHTMARK_SEAL_V03:' + JSON.stringify(s.seal) + '%%END_WROUGHTMARK_SEAL';
          const u8 = new TextEncoder().encode(embeddedStr);
          let bin = '';
          for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
          const embeddedB64 = btoa(bin);
          const res = await (await fetch('/api/container/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ containerBase64: embeddedB64 })
          })).json();
          entContainerOut.textContent = JSON.stringify(res, null, 2);
        });
      }

      const entSuiteOut = document.getElementById('entSuiteOut');
      const suiteButtons = [
        ['entM365Btn', 'm365'],
        ['entGwsBtn', 'google-workspace'],
        ['entSkillMcpBtn', 'agent-mcp']
      ];
      for (const [btnId, kind] of suiteButtons) {
        const el = document.getElementById(btnId);
        if (el && entSuiteOut) {
          el.addEventListener('click', async () => {
            const res = await (await fetch('/api/suite/demo', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ kind })
            })).json();
            entSuiteOut.textContent = JSON.stringify(res, null, 2);
          });
        }
      }
    })();

    document.getElementById('verifyBtn').addEventListener('click', async () => {
      const status = document.getElementById('status');
      const file = document.getElementById('fileInput').files[0];
      const rawSeal = document.getElementById('sealInput').value.trim();
      if (!file && sampleBytes && rawSeal) {
        await runVerify(sampleBytes, rawSeal);
        return;
      }
      if (!file || !rawSeal) {
        verifyResultBar.className = 'verify-result-bar visible bad';
        updateGauge(0, false);
        status.textContent = 'Select a deliverable file and paste a Wroughtmark Seal JSON.';
        return;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      await runVerify(bytes, rawSeal);
    });

    document.getElementById('loadSampleBtn').addEventListener('click', () => loadPresetScenario('film'));

    let batchRows = [];
    const batchFilesEl = document.getElementById('batchFiles');
    const batchTableEl = document.getElementById('batchTable');
    const batchBodyEl = document.getElementById('batchBody');
    const batchSummaryEl = document.getElementById('batchSummary');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const loadCohortDemoBtn = document.getElementById('loadCohortDemoBtn');

    async function processBatchPairs(seals, digestMap) {
      const rows = [];
      for (const item of seals) {
        const s = item.seal;
        let sigValid = false;
        try {
          const { creator_sig, ...payload } = s;
          const canonical = new TextEncoder().encode(JSON.stringify(sortVal(payload)));
          const key = await crypto.subtle.importKey('raw', hexToBytes(s.creator_pubkey_hex), { name: 'Ed25519' }, false, ['verify']);
          sigValid = await crypto.subtle.verify('Ed25519', key, hexToBytes(creator_sig.replace('ed25519:', '')), canonical);
        } catch {}
        const matchedFile = digestMap.get(s.final_output_sha256);
        const delivStatus = matchedFile ? 'MATCHED (' + matchedFile + ')' : (digestMap.size ? 'NO MATCH' : 'SEAL ONLY');
        const flags = (s.summary && s.summary.anomaly_flags && s.summary.anomaly_flags.length)
          ? s.summary.anomaly_flags.join(', ')
          : 'CLEAN';
        const tier = (s.summary && s.summary.authorship_tier)
          ? s.summary.authorship_tier
          : (flags === 'CLEAN' ? 'HUMAN_WROUGHT' : 'ANOMALY_FLAGGED');
        const devices = (s.summary && s.summary.co_signed_devices && s.summary.co_signed_devices.length)
          ? s.summary.co_signed_devices.join(', ')
          : 'workstation';
        rows.push({
          file: item.file,
          seal_id: s.seal_id,
          score: s.summary ? Number(s.summary.process_score ?? 100) : 0,
          tier,
          flags,
          sessions: (s.summary ? s.summary.session_count : 0) + ' / ' + (s.summary ? s.summary.total_active_seconds : 0) + 's',
          devices,
          sig: sigValid ? 'VALID' : 'INVALID',
          deliverable: delivStatus
        });
      }

      rows.sort((a, b) => a.score - b.score);
      batchRows = rows;
      batchBodyEl.innerHTML = '';
      for (const r of rows) {
        const tr = document.createElement('tr');
        const scoreColor = r.score >= 80 && r.sig === 'VALID' ? 'var(--verdigris)' : 'var(--brass)';
        tr.innerHTML =
          '<td>' + esc(r.file) + '</td>' +
          '<td>' + esc(r.seal_id) + '</td>' +
          '<td style="color:' + scoreColor + ';font-weight:600;">' + esc(r.score) + '/100</td>' +
          '<td>' + esc(r.tier) + '</td>' +
          '<td>' + esc(r.flags) + '</td>' +
          '<td>' + esc(r.sessions) + '</td>' +
          '<td>' + esc(r.devices) + '</td>' +
          '<td>' + esc(r.sig) + '</td>' +
          '<td>' + esc(r.deliverable) + '</td>';
        batchBodyEl.appendChild(tr);
      }

      const flaggedCount = rows.filter((r) => r.flags !== 'CLEAN' || r.sig !== 'VALID').length;
      batchSummaryEl.textContent = rows.length + ' seal(s) checked | ' + flaggedCount + ' flagged or invalid | ' + digestMap.size + ' deliverable(s) paired';
      batchTableEl.style.display = rows.length ? 'table' : 'none';
      downloadCsvBtn.style.display = rows.length ? 'inline-flex' : 'none';
    }

    if (loadCohortDemoBtn) {
      loadCohortDemoBtn.addEventListener('click', async () => {
        activateConsoleTab('pane-batch');
        const res = await fetch('/api/demo/cohort');
        const data = await res.json();
        const digestMap = new Map();
        const seals = [];
        for (const sub of data.submissions || []) {
          const bin = atob(sub.fileBase64);
          const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
          const sha = bytesToHex(await crypto.subtle.digest('SHA-256', bytes));
          digestMap.set(sha, sub.fileName);
          seals.push({ file: (sub.studentId || sub.fileName) + '.seal.json', seal: sub.seal });
        }
        await processBatchPairs(seals, digestMap);
      });
    }

    batchFilesEl.addEventListener('change', async (ev) => {
      const files = Array.from(ev.target.files || []);
      if (!files.length) return;
      const digestMap = new Map();
      const seals = [];
      for (const f of files) {
        const buf = await f.arrayBuffer();
        if (f.name.endsWith('.json')) {
          try {
            const parsed = JSON.parse(new TextDecoder().decode(buf));
            if (parsed && parsed.seal_id && parsed.creator_sig) {
              seals.push({ file: f.name, seal: parsed });
              continue;
            }
          } catch {}
        }
        const sha = bytesToHex(await crypto.subtle.digest('SHA-256', buf));
        digestMap.set(sha, f.name);
      }
      await processBatchPairs(seals, digestMap);
    });

    downloadCsvBtn.addEventListener('click', () => {
      if (!batchRows.length) return;
      const header = ['file', 'seal_id', 'process_score', 'authorship_tier', 'anomaly_flags', 'sessions_active', 'co_signed_devices', 'signature', 'deliverable'];
      const csv = [header.join(',')].concat(batchRows.map((r) =>
        [r.file, r.seal_id, r.score, r.tier, r.flags, r.sessions, r.devices, r.sig, r.deliverable]
          .map((v) => '"' + String(v).replace(/"/g, '""') + '"')
          .join(',')
      )).join(String.fromCharCode(10));
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'wroughtmark-batch-triage.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    (async function init3DAssayChamber() {
      const canvas = document.getElementById('seal3dCanvas');
      const statusEl = document.getElementById('seal3dStatus');
      if (!canvas) return;

      let pointerActive = false;
      let pointerNx = 0, pointerNy = 0;
      canvas.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        pointerNx = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
        pointerNy = -((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
        pointerActive = true;
      });
      canvas.addEventListener('pointerleave', () => {
        pointerActive = false;
      });
      canvas.addEventListener('pointerdown', () => {
        if (window.__wmTriggerStamp) window.__wmTriggerStamp('touch');
      });

      function sampleLogoPixels() {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const S = 300;
            const c = document.createElement('canvas');
            c.width = S; c.height = S;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, S, S);
            const data = ctx.getImageData(0, 0, S, S).data;
            const pts = [];
            let minX = S, maxX = 0, minY = S, maxY = 0;
            for (let y = 0; y < S; y += 2) {
              for (let x = 0; x < S; x += 2) {
                const idx = (y * S + x) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                if (lum > 46) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                  pts.push({ x, y, r, g, b, lum });
                }
              }
            }
            resolve({ pts, minX, maxX, minY, maxY, fallback: false });
          };
          img.onerror = () => resolve({ pts: [], fallback: true });
          img.src = '/brand/wroughtmark-logo-mark.jpg';
        });
      }

      try {
        const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
        const sampled = await sampleLogoPixels();

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
        camera.position.set(0, 0, 5.1);

        const resize = () => {
          const w = canvas.parentElement ? canvas.parentElement.clientWidth : 520;
          const h = canvas.parentElement ? canvas.parentElement.clientHeight : 480;
          renderer.setSize(w, h, false);
          camera.aspect = w / Math.max(1, h);
          camera.updateProjectionMatrix();
        };
        resize();
        window.addEventListener('resize', resize);

        const rawPts = sampled.pts;
        const count = rawPts.length || 1200;
        const homes = new Float32Array(count * 3);
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const colorsLight = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const phases = new Float32Array(count);

        if (rawPts.length > 0) {
          const cx = (sampled.minX + sampled.maxX) * 0.5;
          const cy = (sampled.minY + sampled.maxY) * 0.5;
          const span = Math.max(1, sampled.maxX - sampled.minX, sampled.maxY - sampled.minY);
          for (let i = 0; i < count; i++) {
            const p = rawPts[i];
            const jx = (Math.random() - 0.5) * 0.014;
            const jy = (Math.random() - 0.5) * 0.014;
            const hx = ((p.x - cx) / span) * 2.75 + jx;
            const hy = -((p.y - cy) / span) * 2.75 + jy;
            const normLum = Math.max(0, Math.min(1, (p.lum - 46) / 195));
            const hz = normLum * 0.24 - 0.06;

            homes[i * 3] = hx;
            homes[i * 3 + 1] = hy;
            homes[i * 3 + 2] = hz;

            // Gentle initial settle from recessed dispersion
            positions[i * 3] = hx + (Math.random() - 0.5) * 0.35;
            positions[i * 3 + 1] = hy + (Math.random() - 0.5) * 0.35;
            positions[i * 3 + 2] = hz + (Math.random() - 0.5) * 0.4;

            // Dark theme: luminous molten brass and gold highlights (additive on dark obsidian)
            colors[i * 3] = Math.min(1, (p.r / 255) * 1.24);
            colors[i * 3 + 1] = Math.min(1, (p.g / 255) * 1.18);
            colors[i * 3 + 2] = Math.min(1, (p.b / 255) * 1.06);

            // Light theme: rich burnished bronze, deep warm brass and patinated iron (normal blend on light)
            const darkR = 0.12, darkG = 0.10, darkB = 0.08;
            const brassR = 0.58, brassG = 0.38, brassB = 0.09;
            const rRatio = p.r / Math.max(1, p.lum);
            const gRatio = p.g / Math.max(1, p.lum);
            const bRatio = p.b / Math.max(1, p.lum);
            colorsLight[i * 3] = Math.min(1, darkR + (brassR - darkR) * normLum * (rRatio * 0.95));
            colorsLight[i * 3 + 1] = Math.min(1, darkG + (brassG - darkG) * normLum * (gRatio * 0.95));
            colorsLight[i * 3 + 2] = Math.min(1, darkB + (brassB - darkB) * normLum * (bRatio * 0.85));

            sizes[i] = 1.35 + normLum * 1.55;
            phases[i] = Math.random() * Math.PI * 2;
          }
        }

        const logoGeo = new THREE.BufferGeometry();
        logoGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        logoGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        logoGeo.setAttribute('aColorLight', new THREE.BufferAttribute(colorsLight, 3));
        logoGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

        const initialIsLight = (document.documentElement.getAttribute('data-theme') === 'light');
        const uniforms = {
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
          uTintColor: { value: new THREE.Color(initialIsLight ? 0x8C560F : 0xD4A459) },
          uTintMix: { value: 0.0 },
          uThemeMix: { value: initialIsLight ? 1.0 : 0.0 }
        };

        const initialBlending = initialIsLight ? THREE.NormalBlending : THREE.AdditiveBlending;
        let lastBlending = initialBlending;

        const logoMat = new THREE.ShaderMaterial({
          uniforms,
          transparent: true,
          depthWrite: false,
          blending: initialBlending,
          vertexShader:
            'attribute vec3 aColor;' +
            'attribute vec3 aColorLight;' +
            'attribute float aSize;' +
            'uniform float uPixelRatio;' +
            'uniform float uThemeMix;' +
            'varying vec3 vColor;' +
            'void main() {' +
            '  vColor = mix(aColor, aColorLight, uThemeMix);' +
            '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);' +
            '  gl_PointSize = aSize * uPixelRatio * (6.8 / -mvPosition.z);' +
            '  gl_Position = projectionMatrix * mvPosition;' +
            '}',
          fragmentShader:
            'uniform vec3 uTintColor;' +
            'uniform float uTintMix;' +
            'uniform float uThemeMix;' +
            'varying vec3 vColor;' +
            'void main() {' +
            '  float d = length(gl_PointCoord - vec2(0.5));' +
            '  if (d > 0.5) discard;' +
            '  float alpha = smoothstep(0.5, 0.06, d) * mix(0.88, 0.94, uThemeMix);' +
            '  vec3 col = mix(vColor, uTintColor, uTintMix);' +
            '  gl_FragColor = vec4(col, alpha);' +
            '}'
        });

        const particleGroup = new THREE.Group();
        const logoPoints = new THREE.Points(logoGeo, logoMat);
        particleGroup.add(logoPoints);

        // Quiet ambient brass dust field in deep parallax behind the WM mark
        const dustCount = 240;
        const dustPos = new Float32Array(dustCount * 3);
        const dustBase = new Float32Array(dustCount * 3);
        const dustSizes = new Float32Array(dustCount);
        const dustColors = new Float32Array(dustCount * 3);
        const dustColorsLight = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
          const x = (Math.random() - 0.5) * 5.2;
          const y = (Math.random() - 0.5) * 4.4;
          const z = (Math.random() - 0.5) * 2.2 - 0.4;
          dustBase[i * 3] = dustPos[i * 3] = x;
          dustBase[i * 3 + 1] = dustPos[i * 3 + 1] = y;
          dustBase[i * 3 + 2] = dustPos[i * 3 + 2] = z;
          dustSizes[i] = 0.8 + Math.random() * 1.4;
          // Dark theme: ambient golden brass dust
          dustColors[i * 3] = 0.62;
          dustColors[i * 3 + 1] = 0.48;
          dustColors[i * 3 + 2] = 0.28;
          // Light theme: subtle slate / patinated bronze dust
          dustColorsLight[i * 3] = 0.44;
          dustColorsLight[i * 3 + 1] = 0.39;
          dustColorsLight[i * 3 + 2] = 0.32;
        }
        const dustGeo = new THREE.BufferGeometry();
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        dustGeo.setAttribute('aColor', new THREE.BufferAttribute(dustColors, 3));
        dustGeo.setAttribute('aColorLight', new THREE.BufferAttribute(dustColorsLight, 3));
        dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1));
        const dustMat = new THREE.ShaderMaterial({
          uniforms: {
            uPixelRatio: uniforms.uPixelRatio,
            uTintColor: uniforms.uTintColor,
            uTintMix: { value: 0.0 },
            uThemeMix: uniforms.uThemeMix
          },
          transparent: true,
          depthWrite: false,
          blending: initialBlending,
          vertexShader: logoMat.vertexShader,
          fragmentShader:
            'uniform float uThemeMix;' +
            'varying vec3 vColor;' +
            'void main() {' +
            '  float d = length(gl_PointCoord - vec2(0.5));' +
            '  if (d > 0.5) discard;' +
            '  float alpha = smoothstep(0.5, 0.1, d) * mix(0.24, 0.32, uThemeMix);' +
            '  gl_FragColor = vec4(vColor, alpha);' +
            '}'
        });
        const dustPoints = new THREE.Points(dustGeo, dustMat);
        particleGroup.add(dustPoints);
        scene.add(particleGroup);

        let activeDisc = 'film';
        let waveActive = false;
        let waveAge = 1.0;
        let tintDecay = 0.0;
        let targetThemeMix = initialIsLight ? 1.0 : 0.0;
        let themeMix = targetThemeMix;

        function getThemeColors() {
          const isL = targetThemeMix > 0.5;
          return {
            isLight: isL,
            brass: isL ? 0x8C560F : 0xD4A459,
            pulse: isL ? 0x9D6616 : 0xE8C37D,
            verdigris: isL ? 0x0F6E43 : 0x34D399,
            crimson: isL ? 0xB91C1C : 0xF87171,
          };
        }

        const apply3DTheme = (mode) => {
          targetThemeMix = mode === 'light' ? 1.0 : 0.0;
        };
        window.__wmSetTheme = apply3DTheme;

        try {
          const themeObs = new MutationObserver(() => {
            const m = document.documentElement.getAttribute('data-theme') || 'dark';
            apply3DTheme(m);
          });
          themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        } catch (_) {}

        function launchWave(hexColor, mixPeak) {
          waveActive = true;
          waveAge = 0.0;
          uniforms.uTintColor.value.setHex(hexColor);
          tintDecay = mixPeak;
        }

        window.__wmSetDiscipline = (key, pulse) => {
          activeDisc = key;
          if (pulse) {
            const pal = getThemeColors();
            launchWave(pal.pulse, 0.35);
          }
        };

        window.__wmTriggerStamp = (reason) => {
          const pal = getThemeColors();
          launchWave(reason === 'failed' ? pal.crimson : pal.brass, 0.45);
        };

        window.__wmSet3DState = (state, score, label) => {
          const pal = getThemeColors();
          if (state === 'verified') {
            const clean = Number(score) >= 80;
            launchWave(clean ? pal.verdigris : pal.pulse, 0.72);
            if (statusEl) statusEl.textContent = 'VERIFIED // ' + label + ' (' + score + '/100)';
          } else {
            launchWave(pal.crimson, 0.85);
            if (statusEl) statusEl.textContent = 'REJECTED // ' + label;
          }
        };

        let t = 0;
        const posAttr = logoGeo.getAttribute('position');
        const dustAttr = dustGeo.getAttribute('position');

        const tick = () => {
          requestAnimationFrame(tick);
          t += 0.016;

          // Subtle poised perspective shift on hover (no spinning coin)
          const targetRx = pointerActive ? (-pointerNy * 0.11) : (Math.sin(t * 0.35) * 0.025);
          const targetRy = pointerActive ? (pointerNx * 0.14) : (Math.cos(t * 0.28) * 0.035);
          particleGroup.rotation.x += (targetRx - particleGroup.rotation.x) * 0.06;
          particleGroup.rotation.y += (targetRy - particleGroup.rotation.y) * 0.06;

          // Smoothly interpolate theme transition between dark molten brass and light burnished bronze
          if (Math.abs(themeMix - targetThemeMix) > 0.001) {
            themeMix += (targetThemeMix - themeMix) * 0.12;
            uniforms.uThemeMix.value = themeMix;
            const desiredBlending = themeMix > 0.45 ? THREE.NormalBlending : THREE.AdditiveBlending;
            if (desiredBlending !== lastBlending) {
              lastBlending = desiredBlending;
              logoMat.blending = desiredBlending;
              logoMat.needsUpdate = true;
              dustMat.blending = desiredBlending;
              dustMat.needsUpdate = true;
            }
          }

          if (waveActive) {
            waveAge += 0.018;
            if (waveAge >= 1.2) waveActive = false;
          }
          tintDecay *= 0.985;
          uniforms.uTintMix.value = tintDecay;

          const pwx = pointerNx * 1.75;
          const pwy = pointerNy * 1.55;
          const waveR = waveAge * 2.4;

          for (let i = 0; i < count; i++) {
            const ix = i * 3;
            const hx = homes[ix];
            const hy = homes[ix + 1];
            let hz = homes[ix + 2];
            const ph = phases[i];

            // Calm ambient micro-shimmer
            let tx = hx + Math.sin(t * 0.9 + ph) * 0.005;
            let ty = hy + Math.cos(t * 0.8 + ph * 1.3) * 0.005;
            let tz = hz + Math.sin(t * 1.1 + ph) * 0.012;

            // Discipline-specific quiet kinetic signature
            if (activeDisc === 'writing') {
              const sweepX = ((t * 0.7) % 4.0) - 2.0;
              const band = Math.exp(-Math.pow((hx - sweepX) * 2.6, 2));
              tz += band * 0.08;
            } else if (activeDisc === 'music') {
              tz += Math.sin(hx * 2.4 + t * 2.2) * 0.045;
            } else if (activeDisc === 'visual') {
              tz += hz * 0.9;
            } else if (activeDisc === 'film') {
              const sweepY = 1.4 - ((t * 0.55) % 2.8);
              const bar = Math.exp(-Math.pow((hy - sweepY) * 3.4, 2));
              tz += bar * 0.07;
            } else if (activeDisc === 'spatial') {
              tz += Math.sin(hx * 3.1 + t * 1.9) * Math.cos(hy * 3.1 - t * 1.6) * 0.095;
            }

            // Radial verification ripple from monogram center
            if (waveActive) {
              const distC = Math.sqrt(hx * hx + hy * hy);
              const ring = Math.exp(-Math.pow((distC - waveR) * 4.2, 2));
              if (ring > 0.01 && distC > 0.001) {
                tx += (hx / distC) * ring * 0.075;
                ty += (hy / distC) * ring * 0.075;
                tz += ring * 0.22;
              }
            }

            // Soft magnetic cursor repulsion
            if (pointerActive) {
              const dx = positions[ix] - pwx;
              const dy = positions[ix + 1] - pwy;
              const dSq = dx * dx + dy * dy;
              if (dSq < 0.36 && dSq > 0.0001) {
                const f = (1.0 - Math.sqrt(dSq) / 0.6) * 0.032;
                velocities[ix] += (dx / Math.sqrt(dSq)) * f;
                velocities[ix + 1] += (dy / Math.sqrt(dSq)) * f;
                velocities[ix + 2] += f * 0.8;
              }
            }

            velocities[ix] = (velocities[ix] + (tx - positions[ix]) * 0.08) * 0.82;
            velocities[ix + 1] = (velocities[ix + 1] + (ty - positions[ix + 1]) * 0.08) * 0.82;
            velocities[ix + 2] = (velocities[ix + 2] + (tz - positions[ix + 2]) * 0.08) * 0.82;

            positions[ix] += velocities[ix];
            positions[ix + 1] += velocities[ix + 1];
            positions[ix + 2] += velocities[ix + 2];
          }
          posAttr.needsUpdate = true;

          for (let i = 0; i < dustCount; i++) {
            const ix = i * 3;
            dustPos[ix] = dustBase[ix] + Math.sin(t * 0.22 + i) * 0.14;
            dustPos[ix + 1] = dustBase[ix + 1] + Math.cos(t * 0.18 + i * 0.7) * 0.12;
          }
          dustAttr.needsUpdate = true;

          renderer.render(scene, camera);
        };
        tick();
      } catch (err) {
        if (statusEl) statusEl.textContent = 'PARTICLE FIELD // WEBGL OFFLINE';
      }
    })();
  </script>
</body>
</html>`;

function buildSitemapXml(origin: string): string {
  const base = origin.replace(/\/$/, "").replace(/^http:\/\//, "https://");
  const staticUrls = [
    { loc: `${base}/`, changefreq: "weekly", priority: "1.0", lastmod: "2026-11-15" },
    { loc: `${base}/blog`, changefreq: "weekly", priority: "0.9", lastmod: "2026-11-15" },
    { loc: `${base}/privacy`, changefreq: "monthly", priority: "0.5", lastmod: "2026-11-15" },
    { loc: `${base}/terms`, changefreq: "monthly", priority: "0.5", lastmod: "2026-11-15" },
  ];
  const postUrls = BLOG_POSTS.map((post) => ({
    loc: `${base}/blog/${post.slug}`,
    changefreq: "monthly",
    priority: "0.8",
    lastmod: post.isoDate,
  }));
  const allUrls = [...staticUrls, ...postUrls];
  const items = allUrls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;
}

const port = Number(process.env.PORT || 3434);

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        brand: "wroughtmark.com",
        protocol: "0.3",
        supportedProtocols: ["0.1", "0.2", "0.3"],
        rustBinary: Boolean(RUST_BIN),
      });
    }
    if (url.pathname === "/api/sample") {
      return Response.json(await buildSingleScenario("film", mintRustFilmSample));
    }
    if (url.pathname === "/api/demo/scenario") {
      const kindParam = url.searchParams.get("kind");
      const allowed: DemoScenarioKind[] = [
        "clean",
        "paste",
        "retype",
        "chatloop",
        "hybrid",
        "spatial",
        "film",
        "gitpr",
        "hitlrubber",
        "handoff",
      ];
      const kind: DemoScenarioKind = allowed.includes(kindParam as DemoScenarioKind)
        ? (kindParam as DemoScenarioKind)
        : "film";
      return Response.json(await buildSingleScenario(kind, mintRustFilmSample));
    }
    if (url.pathname === "/api/demo/cohort") {
      return Response.json(await buildCohortDemo());
    }
    if (url.pathname === "/api/seals/register" && req.method === "POST") {
      const body = (await req.json()) as { seal: WroughtmarkSeal };
      const saved = await registry.registerSeal(body.seal);
      if (!saved.ok || !saved.sealId) {
        return Response.json(saved, { status: 400 });
      }
      return Response.json({
        ok: true,
        sealId: saved.sealId,
        shareUrl: `/v/${encodeURIComponent(saved.sealId)}`,
      });
    }
    if (url.pathname.startsWith("/v/")) {
      const sealId = decodeURIComponent(url.pathname.slice("/v/".length)).replace(/[^a-zA-Z0-9._-]/g, "");
      const found = registry.getSeal(sealId);
      if (!found) {
        return new Response("Receipt not found", { status: 404 });
      }
      return new Response(renderPublicReceiptHtml(found.seal, found.registeredAtUtc, url.origin), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.pathname === "/blog" || url.pathname === "/blog/") {
      return new Response(renderBlogIndexHtml(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.pathname.startsWith("/blog/")) {
      const slug = decodeURIComponent(url.pathname.slice("/blog/".length)).replace(/\/$/, "");
      const html = renderBlogPostHtml(slug);
      if (html) {
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("Dispatch not found", { status: 404 });
    }
    if (url.pathname === "/privacy" || url.pathname === "/privacy/") {
      return new Response(renderPrivacyPolicyHtml(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.pathname === "/terms" || url.pathname === "/terms/") {
      return new Response(renderTermsOfUseHtml(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.pathname === "/sitemap.xml") {
      const canonicalOrigin = url.origin.includes("localhost") ? "https://wroughtmark.com" : url.origin;
      return new Response(buildSitemapXml(canonicalOrigin), {
        headers: { "content-type": "application/xml; charset=utf-8" },
      });
    }
    if (url.pathname === "/robots.txt") {
      const robots = `User-agent: *\nAllow: /\n\nSitemap: https://wroughtmark.com/sitemap.xml\n`;
      return new Response(robots, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    if (url.pathname === "/api/blog/posts") {
      return Response.json(
        BLOG_POSTS.map((p) => ({
          slug: p.slug,
          title: p.title,
          subtitle: p.subtitle,
          date: p.date,
          isoDate: p.isoDate,
          readingTime: p.readingTime,
          category: p.category,
          author: p.author,
          summary: p.summary,
        }))
      );
    }
    if (url.pathname === "/api/lms/lti-config.json") {
      return Response.json(buildLtiToolConfig(url.origin));
    }
    if (url.pathname === "/api/brand-assets") {
      const candidates = [
        { files: ["wroughtmark-logo-mark.jpg", "wroughtmark-logo-mark.png"], label: "Hallmark Emblem (Hammered Brass on Obsidian)" },
        { files: ["wroughtmark-app-icon.jpg", "wroughtmark-app-icon.png"], label: "macOS & iOS App Icon Concept" },
      ];
      const assets = candidates
        .map((c) => ({ file: c.files.find((f) => existsSync(join(BRAND_DIR, f))), label: c.label }))
        .filter((a): a is { file: string; label: string } => Boolean(a.file))
        .map((a) => ({ url: `/brand/${a.file}`, label: a.label }));
      return Response.json(assets);
    }
    if (url.pathname === "/favicon.ico") {
      const p = join(BRAND_DIR, "favicon.ico");
      if (existsSync(p)) return new Response(Bun.file(p), { headers: { "content-type": "image/x-icon" } });
    }
    if (url.pathname === "/favicon.svg") {
      const p = join(BRAND_DIR, "favicon.svg");
      if (existsSync(p)) return new Response(Bun.file(p), { headers: { "content-type": "image/svg+xml" } });
    }
    if (url.pathname === "/favicon-32x32.png") {
      const p = join(BRAND_DIR, "favicon-32x32.png");
      if (existsSync(p)) return new Response(Bun.file(p), { headers: { "content-type": "image/png" } });
    }
    if (url.pathname === "/favicon-16x16.png") {
      const p = join(BRAND_DIR, "favicon-16x16.png");
      if (existsSync(p)) return new Response(Bun.file(p), { headers: { "content-type": "image/png" } });
    }
    if (url.pathname === "/apple-touch-icon.png" || url.pathname === "/apple-touch-icon-precomposed.png") {
      const p = join(BRAND_DIR, "apple-touch-icon.png");
      if (existsSync(p)) return new Response(Bun.file(p), { headers: { "content-type": "image/png" } });
    }
    if (url.pathname.startsWith("/brand/")) {
      const name = url.pathname.slice("/brand/".length).replace(/[^a-zA-Z0-9._-]/g, "");
      const filePath = join(BRAND_DIR, name);
      if (existsSync(filePath)) {
        return new Response(Bun.file(filePath));
      }
      return new Response("Not found", { status: 404 });
    }
    if (url.pathname === "/sdk/wroughtmark-badge.js") {
      return new Response(BADGE_SCRIPT, {
        headers: { "content-type": "application/javascript; charset=utf-8" },
      });
    }
    if (url.pathname === "/api/verify" && req.method === "POST") {
      const body = (await req.json()) as { outputBase64: string; seal: WroughtmarkSeal };
      const bytes = Uint8Array.from(atob(body.outputBase64), (c) => c.charCodeAt(0));
      const result = await verifySeal(bytes, body.seal);
      return Response.json(result);
    }
    if (url.pathname === "/api/anchor/stamp" && req.method === "POST") {
      const body = (await req.json()) as { digestHex?: string; wallClockUtc?: string };
      const stamped = await mintBlindTimeAnchor(body.digestHex ?? "", body.wallClockUtc);
      if (!stamped.ok) {
        return Response.json({ error: stamped.error }, { status: 400 });
      }
      return Response.json(stamped.anchor);
    }
    if (url.pathname === "/api/git/verify-pr" && req.method === "POST") {
      const body = (await req.json()) as {
        outputBase64?: string;
        prDiffBase64?: string;
        seal: WroughtmarkSeal;
      };
      return Response.json(await verifyGitPrRequest(body));
    }
    if (url.pathname === "/api/hiring/verify" && req.method === "POST") {
      const body = (await req.json()) as {
        outputBase64: string;
        seal: WroughtmarkSeal;
        challengeStartUtc?: string;
      };
      return Response.json(await verifyHiringAssessmentRequest(body));
    }
    if (url.pathname === "/api/usco/manifest" && req.method === "POST") {
      const body = (await req.json()) as {
        seal: WroughtmarkSeal;
        events?: Array<{ ai_disclosed?: boolean; structural_units?: number }>;
      };
      const manifest = await buildUscoManifestPayload(body);
      if (!manifest.ok) {
        return Response.json({ error: manifest.error }, { status: 400 });
      }
      return Response.json(manifest);
    }
    if (url.pathname === "/api/container/verify" && req.method === "POST") {
      const body = (await req.json()) as { containerBase64?: string };
      if (!body.containerBase64) {
        return Response.json({ valid: false, reason: "Missing containerBase64" }, { status: 400 });
      }
      const bytes = Uint8Array.from(atob(body.containerBase64), (c) => c.charCodeAt(0));
      return Response.json(await verifyEmbeddedContainerBytes(bytes));
    }
    if (url.pathname === "/api/suite/demo" && req.method === "POST") {
      const body = (await req.json()) as { kind?: SuiteDemoKind };
      const allowedSuites: SuiteDemoKind[] = ["m365", "google-workspace", "agent-mcp"];
      const kind: SuiteDemoKind = allowedSuites.includes(body.kind as SuiteDemoKind)
        ? (body.kind as SuiteDemoKind)
        : "m365";
      return Response.json(await runSuiteBridgeDemo(kind));
    }
    if (url.pathname === "/api/lms/verify" && req.method === "POST") {
      if (!authorizeLmsRequest(req, process.env.WROUGHTMARK_LMS_API_KEY)) {
        return Response.json({ error: "Unauthorized LMS API credentials" }, { status: 401 });
      }
      const body = (await req.json()) as LmsVerifyRequest;
      return Response.json(await verifyLmsSubmission(body));
    }
    if (url.pathname === "/api/lms/batch" && req.method === "POST") {
      if (!authorizeLmsRequest(req, process.env.WROUGHTMARK_LMS_API_KEY)) {
        return Response.json({ error: "Unauthorized LMS API credentials" }, { status: 401 });
      }
      const body = (await req.json()) as {
        assignmentId: string;
        submissions: LmsVerifyRequest[];
      };
      return Response.json(await verifyLmsBatch(body.assignmentId, body.submissions ?? []));
    }
    return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
  },
});

console.log(`Wroughtmark web-sdk listening on http://localhost:${server.port}`);
