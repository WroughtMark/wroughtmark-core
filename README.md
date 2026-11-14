# Wroughtmark Core

> **Open-Source Cryptographic Proof of Human Process (Protocol `v0.1` -> `v0.3`) · MIT License**  
> **Privacy Invariant:** Raw creative files, manuscripts, audio stems, layered art, video timelines, and source code never leave your machine. Wroughtmark stamps local Ed25519 BLAKE3 hash chains, 9-vector behavioral telemetry counters, and offline-verifiable `WroughtmarkSeal` manifests with **0 bytes** of content uploaded.

---

## Download Desktop Apps, CLI & Plugins (`v0.3.0`)

Prebuilt binaries and plugin bundles are published directly from this repository on [**GitHub Releases**](https://github.com/WroughtMark/wroughtmark-core/releases/latest):

| Platform / Package | Included | Verification & VirusTotal | Direct Download |
|---|---|---|---|
| **macOS (`v14+` Apple Silicon)** | Native SwiftUI `MenuBarExtra` (`Wroughtmark.app`) + `wroughtmark-desktop` GUI + `wroughtmark` CLI | Apple Developer ID Signed & Notarized (`HL4S9RXPF6`) · `.dmg` `a44eeebe8559...` ([VirusTotal](https://www.virustotal.com/gui/file/a44eeebe8559cd671b178926fb8df4a74406b9736fb407cdac5a12855223c53d)) · `.tar.gz` `9d77ee433109...` ([VirusTotal](https://www.virustotal.com/gui/file/9d77ee4331094abe829312c3d604335175cdedd0cc5768546f699c7ed45b0f41)) | [`Wroughtmark-macOS-arm64.dmg`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.dmg) · [`.tar.gz`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.tar.gz) |
| **Windows (`x86_64`)** | Native Rust `eframe` Desktop GUI (`wroughtmark-desktop.exe`) + `wroughtmark.exe` CLI | SHA-256 + VirusTotal Verified · `b1e3264396b1...` ([VirusTotal Report](https://www.virustotal.com/gui/file/b1e3264396b18f262f2264a4711a188940713656c921dea710fd1a827582e78f)) | [`wroughtmark-windows-x86_64.zip`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-windows-x86_64.zip) |
| **Linux (`x86_64`)** | Native Rust `eframe` Desktop GUI (`wroughtmark-desktop`) + `wroughtmark` CLI | SHA-256 + VirusTotal Verified · `aba4083224d9...` ([VirusTotal Report](https://www.virustotal.com/gui/file/aba4083224d97b42d23afe1817c59019258875b0b353a16a4e6f2080b301f3ff)) | [`wroughtmark-linux-x86_64.tar.gz`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-linux-x86_64.tar.gz) |
| **Editor, Browser & Suite Plugins** | Prebuilt bundles for Chrome/Docs/Canvas, Word/M365, Google Workspace, VS Code, Obsidian, Figma, Adobe UXP, Blender, Reaper & MCP | SHA-256 + VirusTotal Verified · `14b84d470f3a...` ([VirusTotal Report](https://www.virustotal.com/gui/file/14b84d470f3a255aaf37a785db1aac70646fe91fc49750c1cefb9733fae460e1)) | [`wroughtmark-plugins-bundle.zip`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-plugins-bundle.zip) |
| **SHA-256 Checksums & Release Notes** | Cryptographic digests for all release archives | [`SHA256SUMS.txt`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/SHA256SUMS.txt) | [`All Releases`](https://github.com/WroughtMark/wroughtmark-core/releases) |

<details>
<summary>Verify downloaded archive SHA-256 checksums (<code>v0.3.0</code>)</summary>

```text
a44eeebe8559cd671b178926fb8df4a74406b9736fb407cdac5a12855223c53d  Wroughtmark-macOS-arm64.dmg
9d77ee4331094abe829312c3d604335175cdedd0cc5768546f699c7ed45b0f41  Wroughtmark-macOS-arm64.tar.gz
b1e3264396b18f262f2264a4711a188940713656c921dea710fd1a827582e78f  wroughtmark-windows-x86_64.zip
aba4083224d97b42d23afe1817c59019258875b0b353a16a4e6f2080b301f3ff  wroughtmark-linux-x86_64.tar.gz
14b84d470f3a255aaf37a785db1aac70646fe91fc49750c1cefb9733fae460e1  wroughtmark-plugins-bundle.zip
```

```bash
# macOS / Linux
shasum -a 256 -c SHA256SUMS.txt
```

```powershell
# Windows PowerShell
Get-FileHash .\wroughtmark-windows-x86_64.zip -Algorithm SHA256
```

</details>

> Build locally from source anytime via `bash scripts/package.sh` (outputs to `dist/`). Windows and Linux release archives are built deterministically in GitHub Actions and ship with public SHA-256 digests and VirusTotal scan links; if Windows SmartScreen prompts on first run, verify the SHA-256 hash above and choose **More info -> Run anyway**.

---

## What Is Included in `wroughtmark-core`

- **`core/`**: Rust cryptographic library (`wroughtmark-core`), C ABI (`include/wroughtmark.h`), 9-vector `analyze_process_chain()` & `classify_authorship_tier()`, blind `TimeAnchor` verifier, self-contained `PNG` `iTXt` / `WAV` `WMKS` / trailer container embedders, USCO & C2PA (`c2pa.wroughtmark.process` `0.3.0`) exporters, and the `wroughtmark` CLI (`keygen`, `record`, `watch`, `seal`, `verify`, `dossier`, `handoff`, `embed`, `verify-embedded`, `c2pa-export`, `usco-manifest`, `git-sign`).
- **`apple/`**: Native macOS (`v14+`) SwiftUI `MenuBarExtra` folder watcher, Discipline selector, seal minter/verifier, and HTML Dossier exporter (`WroughtmarkApp` + `WroughtmarkKit` FFI linked against `libwroughtmark_core.a`).
- **`desktop-win-linux/`**: Cross-platform native Rust (`eframe`/`egui`) folder watcher, scorer, and HTML Dossier exporter for Windows, Linux, and macOS.
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
