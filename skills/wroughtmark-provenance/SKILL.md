---
name: wroughtmark-provenance
description: Cryptographic process-provenance skill and MCP bridge for recording disclosed agent assistance, stamping blind 32-byte digests, embedding/verifying Microsoft 365 OpenXML and Google Workspace Drive seals, and exporting USCO hybrid authorship manifests.
---

# Wroughtmark Provenance Skill

Use this skill whenever an agent or assistant drafts, edits, reviews, or verifies documents, spreadsheets, presentations, codebases, or deliverables across local repos, Microsoft 365 (`Word`, `Excel`, `PowerPoint`, `Outlook`), or Google Workspace (`Docs`, `Sheets`, `Slides`, `Drive`, `Gmail`).

## Core Invariants

1. **Zero raw content upload:** Never transmit raw draft text, pixels, waveforms, or source code to external verifiers. Only exchange SHA-256 / BLAKE3 32-byte digests (`/api/anchor/stamp`) and Ed25519 seals.
2. **Mandatory AI disclosure (`ai_disclosed: true`):** Any step authored or co-edited by an AI agent, M365 Copilot, or Gemini for Workspace must set `ai_disclosed: true` so the resulting `WroughtmarkSeal` classifies accurately as `AI_ASSISTED_DISCLOSED`.
3. **Suite container binding:**
   - **Microsoft 365 (`.docx`, `.xlsx`, `.pptx`):** Call `wroughtmark_mint_suite_seal` with `suite: "m365"` to emit an OpenXML `customXml/wroughtmark.xml` Custom XML Part alongside `*.seal.json`.
   - **Google Workspace (`Docs`, `Sheets`, `Slides`, `Drive`, `Gmail`):** Call `wroughtmark_mint_suite_seal` with `suite: "google-workspace"` to emit Drive API v3 `appProperties` and `CardService` UI state.
   - **Generic files & CLI containers (`.png`, `.pdf`, `.wav`, source code):** Run `wroughtmark embed <artifact> <seal.json> <out>` / `wroughtmark verify-embedded <artifact>`.
4. **USCO & Clean Corpus Verification:** Run `wroughtmark_usco_manifest` or `wroughtmark usco-manifest <seal.json> <chain.json> <out.json>` before copyright filing or dataset licensing.

## MCP Tools Exposed (`src/mcp-server.ts`)

- `wroughtmark_record_step` — Appends a privacy-preserving heartbeat step to a local `BrowserHeartbeat[]` chain with agent `ai_disclosed` flagging.
- `wroughtmark_mint_suite_seal` — Mints an Ed25519 `WroughtmarkSeal` plus suite-specific OpenXML `customXml` (`m365`) or Google Drive `appProperties` (`google-workspace`).
- `wroughtmark_verify_suite_artifact` — Verifies incoming artifacts against raw `seal`, OpenXML `customXml`, or Drive `appProperties` metadata.
- `wroughtmark_usco_manifest` — Generates a USCO hybrid authorship disclosure statement and `corpus_100_percent_human` attestation.
