# Wroughtmark Core Integrations Matrix (`v0.1` -> `v0.3`)

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
| **Local Git & File Watcher** | Any local project, Git hook (`wroughtmark git-sign`), or media container | `core/`, `desktop-win-linux/` | `v0.1` -> `v0.3` | Built & Tested |
