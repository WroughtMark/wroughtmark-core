# Wroughtmark Core

> **Open-Source Cryptographic Proof of Human Process (Protocol `v0.1` -> `v0.3`)**  
> **Privacy Invariant:** Raw creative files, manuscripts, audio stems, layered art, video timelines, and source code never leave your machine. Wroughtmark stamps local Ed25519 BLAKE3 hash chains, 9-vector behavioral telemetry counters, and offline-verifiable `WroughtmarkSeal` manifests with **0 bytes** of content uploaded.

---

## What Is Included in `wroughtmark-core`

- **`core/`**: Rust cryptographic library (`wroughtmark-core`), C ABI (`include/wroughtmark.h`), 9-vector `analyze_process_chain()` & `classify_authorship_tier()`, blind `TimeAnchor` verifier, self-contained `PNG` `iTXt` / `WAV` `WMKS` / trailer container embedders, USCO & C2PA (`c2pa.wroughtmark.process` `0.3.0`) exporters, and the `wroughtmark` CLI (`keygen`, `record`, `watch`, `seal`, `verify`, `dossier`, `handoff`, `embed`, `verify-embedded`, `c2pa-export`, `usco-manifest`, `git-sign`).
- **`desktop-win-linux/`**: Cross-platform native Rust (`eframe`/`egui`) folder watcher, scorer, and HTML Dossier exporter.
- **`web-sdk/`**: Zero-dependency WebCrypto verifier (`verify.ts`) matching Rust canonical JSON byte-for-byte, plus `<wroughtmark-badge>` Web Component (`badge.ts`).
- **Single-User Editor, Browser, Suite & DCC Plugins**:
  - `browser-extension/` (Manifest V3: Google Docs, Overleaf, Canvas, Blackboard)
  - `office-addin/` (Office.js taskpane for Word, Excel, PowerPoint, Outlook + OpenXML `customXml/wroughtmark.xml`)
  - `google-workspace-addon/` (`CardService` add-on for Docs, Sheets, Slides, Drive `appProperties`, Gmail)
  - `integrations/` (`vscode`, `obsidian`, `figma`, `adobe-uxp`, `blender`, `reaper`)
  - `skills/wroughtmark-provenance/` (Agent Skill `SKILL.md` + local stdio MCP server)

---

## Quickstart

```bash
# Run all 14 open-core verification suites (Rust, WebCrypto, plugins, CLI E2E, Python)
bash scripts/verify.sh

# Mint a key, watch a project folder, seal a deliverable, and verify offline
cargo build --manifest-path core/Cargo.toml --bin wroughtmark
./core/target/debug/wroughtmark keygen creator.key.json
./core/target/debug/wroughtmark watch ./my-project chain.json creator.key.json --once
./core/target/debug/wroughtmark seal chain.json creator.key.json writing export.pdf export.seal.json
./core/target/debug/wroughtmark verify export.pdf export.seal.json chain.json
./core/target/debug/wroughtmark dossier export.pdf export.seal.json dossier.html chain.json
```

---

## Documentation

- [Wroughtmark Protocol Specification (`v0.1` -> `v0.2` -> `v0.3`)](docs/PROTOCOL.md)
- [Tech Stack & Architecture Map](docs/TECH_STACK.md)
- [Open-Core Integrations Matrix](docs/INTEGRATIONS.md)
- [Agent Skill & MCP Tool Spec (`wroughtmark-provenance`)](skills/wroughtmark-provenance/SKILL.md)
- [MIT License](LICENSE)
