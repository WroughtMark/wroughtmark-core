# Wroughtmark Core — Tech Stack & Architecture Map

> **Design Principle:** One shared cryptographic source of truth in Rust (`core/`) across Protocol `v0.1`, `v0.2`, and `v0.3`, with pure zero-dependency WebCrypto TypeScript (`web-sdk/src/verify.ts`, `browser-extension/`, suite & editor plugins) producing byte-identical canonical JSON verification.

---

## 1. End-to-End Local Architecture

```
  [ Capture Surfaces ]                   [ Local Process Engine ]              [ Offline Verification & Envelopes ]
  ├── Desktop GUI (Win/Linux `eframe`) ─┐
  ├── CLI (`watch`, `git-sign`, `embed`) ├──▶  ProcessChain (BLAKE3/SHA-256) ─▶  WebCrypto Verifier (`verify.ts`)
  ├── Browser Ext (Docs/Canvas/Overleaf) │     + Ed25519 Signature               + Self-Contained Containers (`PNG`/`WAV`/`V03`)
  ├── Office.js Add-in (`customXml`)    ─┼──▶  + 9-Vector AI Assay (`v0.2`)   ─▶  OpenXML & Drive `appProperties` Check
  ├── Workspace Add-on (`appProperties`) │     + TimeAnchor & Handoffs (`v0.3`)  + USCO & C2PA (`c2pa.wroughtmark.process`)
  ├── Agent Skill MCP (`stdio`)          │     + AuthorshipTier (3 tiers)      ─▶  Printable Audit Dossier (`.html`)
  └── VS Code/Obsidian/Figma/UXP/Blender/Reaper                                  + Embeddable `<wroughtmark-badge>`
```

---

## 2. Layer-by-Layer Overview

### A. Cryptographic Core & CLI (`core/`)
- **Crates:** `ed25519-dalek`, `blake3`, `sha2`, `bs58`, `hex`, `serde`, `serde_json`, `thiserror`
- **Capabilities:**
  - Append-only `ProcessChain` (`chain.rs`) with `prev_hash` / `event_hash` linking, role-attributed multi-author handoff fields, and blind `TimeAnchor` digest verification
  - 7 `Discipline` variants (`writing`, `music`, `visual`, `film`, `code`, `science`, `review`) and 8 `AdapterKind` variants (`text`, `daw`, `canvas`, `nle`, `physical`, `git`, `cad`, `inspection`)
  - `analyze_process_chain()` + `classify_authorship_tier()` emitting `process_score` (`0..100`), `AuthorshipTier` (`HUMAN_WROUGHT`, `AI_ASSISTED_DISCLOSED`, `ANOMALY_FLAGGED`), and 15 deterministic `anomaly_flags`
  - `container.rs`: deterministic embed/extract for `PNG` `iTXt` (`wroughtmark:seal`), `WAV` RIFF (`WMKS`), generic trailers (`%%WROUGHTMARK_SEAL_V03`), and C2PA (`c2pa.wroughtmark.process` `0.3.0`) export
  - C ABI (`ffi.rs`, `include/wroughtmark.h`): `wm_sha256_hex`, `wm_verify_seal_json`, `wm_build_dossier_html`, `wm_free_string`
  - CLI (`wroughtmark`): `keygen`, `record`, `watch [--once]`, `seal`, `verify`, `dossier`, `handoff`, `embed`, `verify-embedded`, `c2pa-export`, `usco-manifest`, `git-sign <init|record|seal|verify>`

### B. Native Desktop App (`desktop-win-linux/`)
- Rust + `eframe`/`egui` + `rfd` native folder watcher, light/dark palette toggle, real-time `process_score`, seal mint/verify, and one-click HTML Dossier export.

### C. WebCrypto Verifier & Badge SDK (`web-sdk/`)
- `src/verify.ts`: Pure WebCrypto `SHA-256` and `Ed25519` canonical JSON verifier, blind `TimeAnchor` check, generic `%%WROUGHTMARK_SEAL_V03` extractor, and `buildUscoManifestPayload()`.
- `src/badge.ts`: Zero-dependency `<wroughtmark-badge>` Web Component.

### D. Plugins & Agent Skill MCP
- **WebCrypto TS plugins** sharing `browser-extension/src/chain.ts`: `browser-extension/`, `office-addin/`, `google-workspace-addon/`, `integrations/vscode/`, `integrations/obsidian/`, `integrations/figma/`, `integrations/adobe-uxp/`.
- **Agent Skill & stdio MCP server:** `skills/wroughtmark-provenance/`.
- **Python CLI-bridge plugins:** `integrations/blender/`, `integrations/reaper/`.
- **Automated Verification:** `scripts/verify.sh` runs all 14 suites; `.github/workflows/ci.yml` executes cross-OS tests on every push and pull request.
