# Wroughtmark Core Integrations Matrix (`v0.1` -> `v0.3`)

> **Direct Prebuilt Downloads:** Grab ready-to-run apps and plugins from [`GitHub Releases`](https://github.com/WroughtMark/wroughtmark-core/releases/latest): [`Wroughtmark-macOS-arm64.dmg`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.dmg) (Apple Developer ID signed & notarized · [`VirusTotal`](https://www.virustotal.com/gui/file/a44eeebe8559cd671b178926fb8df4a74406b9736fb407cdac5a12855223c53d)), [`wroughtmark-windows-x86_64.zip`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-windows-x86_64.zip) ([`VirusTotal`](https://www.virustotal.com/gui/file/b1e3264396b18f262f2264a4711a188940713656c921dea710fd1a827582e78f)), [`wroughtmark-linux-x86_64.tar.gz`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-linux-x86_64.tar.gz) ([`VirusTotal`](https://www.virustotal.com/gui/file/aba4083224d97b42d23afe1817c59019258875b0b353a16a4e6f2080b301f3ff)), [`wroughtmark-plugins-bundle.zip`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-plugins-bundle.zip) ([`VirusTotal`](https://www.virustotal.com/gui/file/14b84d470f3a255aaf37a785db1aac70646fe91fc49750c1cefb9733fae460e1)), and [`SHA256SUMS.txt`](https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/SHA256SUMS.txt).

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
