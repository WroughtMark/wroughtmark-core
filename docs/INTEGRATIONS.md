# Wroughtmark Core Integrations Matrix (`v0.1` -> `v0.3`)

> **Direct Prebuilt Downloads:** Grab ready-to-run apps and plugins from [`GitHub Releases`](https://github.com/WroughtMark/wroughtmark-core/releases/latest): [`Wroughtmark-macOS-arm64.dmg`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.dmg) (Apple Developer ID signed & notarized · [`VirusTotal`](https://www.virustotal.com/gui/file/ab7b58f027b0de62ce3dae686a7fcd14d73d87824ae0ab5517ecd3a299be0ad7)), [`wroughtmark-windows-x86_64.zip`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-windows-x86_64.zip) ([`VirusTotal`](https://www.virustotal.com/gui/file/8d5ecbecacccb49e9d72b3ec59f3feccf2b67759145e9da118f776ca590161aa)), [`wroughtmark-linux-x86_64.tar.gz`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-linux-x86_64.tar.gz) ([`VirusTotal`](https://www.virustotal.com/gui/file/924a8db872eab3747b2837ddbfbb24fd7e8ab6ab1a6ed22cec5053088325430c)), [`wroughtmark-plugins-bundle.zip`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-plugins-bundle.zip) ([`VirusTotal`](https://www.virustotal.com/gui/file/ae0c7f839cd80f24c50f3a9e17d5f0195ae4815c52d850f563d545d82d5ce7bf)), and [`SHA256SUMS.txt`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/SHA256SUMS.txt).

Every open-core capture plugin in `wroughtmark-core` runs locally on the creator's device and shares deterministic canonical JSON + Ed25519 verification with `core/` and `web-sdk/src/verify.ts`.

| Audience | Tool / Platform | Module Path | Protocol | Status |
|---|---|---|---|---|
| **Browser Drafting & LMS** | Google Docs, Overleaf, Canvas, Blackboard | `browser-extension/` | `v0.1` / `v0.2` | Built & Tested |
| **Microsoft 365** | Word, Excel, PowerPoint, Outlook (+ OpenXML `customXml/wroughtmark.xml`) | `office-addin/` | `v0.2` / `v0.3` | Built & Tested |
| **Google Workspace** | Docs, Sheets, Slides, Drive (`appProperties`), Gmail (`CardService`) | `google-workspace-addon/` | `v0.2` / `v0.3` | Built & Tested |
| **AI Coding Agents & MCP Hosts** | Local stdio MCP + `SKILL.md` (`wroughtmark_record_step`, `wroughtmark_mint_suite_seal`, `wroughtmark_verify_suite_artifact`, `wroughtmark_usco_manifest`) | `skills/wroughtmark-provenance/` | `v0.3` | Built & Tested |
| **CS, LaTeX & Markdown** | VS Code / compatible editors | `integrations/vscode/` | `v0.2` | Built & Tested |
| **Writers & Researchers** | Obsidian | `integrations/obsidian/` | `v0.1` / `v0.2` | Built & Tested |
| **Designers & Illustrators** | Figma / FigJam | `integrations/figma/` | `v0.1` / `v0.2` | Built & Tested |
| **Visual / Photo / Video** | Photoshop, Premiere Pro (UXP) | `integrations/adobe-uxp/` | `v0.1` / `v0.2` | Built & Tested |
| **3D Artists & CAD** | Blender | `integrations/blender/` | `v0.1` / `v0.3` | Built & Tested |
| **Music Producers** | Reaper | `integrations/reaper/` | `v0.1` / `v0.2` | Built & Tested |
| **macOS Desktop & Menu Bar** | Native macOS `v14+` `MenuBarExtra` folder watcher, seal minting & HTML Dossier exporter | `apple/` | `v0.1` -> `v0.3` | Built & Tested |
| **Local Git & File Watcher** | Any local project, Git hook (`wroughtmark git-sign`), or media container (Windows, Linux & macOS) | `core/`, `desktop-win-linux/` | `v0.1` -> `v0.3` | Built & Tested |
