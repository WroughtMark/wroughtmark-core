# Wroughtmark Protocol Specification (v0.1 -> v0.2 -> v0.3)

> **Domain:** `wroughtmark.com`  
> **Design Goal:** Byte-identical canonical verification across Rust (`core/`), Apple (Swift / FFI), Android/XR (Kotlin / JNI), Windows/Linux (`eframe`), and TypeScript / WebCrypto (`web-sdk/`).  
> **Privacy Invariant:** Raw creative files (manuscripts, DAW stems, layered artwork, video timelines, private codebases, lab notebooks) NEVER leave the creator's device. Only cryptographic hashes, behavioral telemetry counters, structural entropy metrics, and signed timestamps are committed to a Wroughtmark Seal.

---

## Protocol Version Evolution

Wire compatibility preserves `"version": "0.1"` on base `ProcessEvent` and `WroughtmarkSeal` payloads while additive optional fields (`telemetry`, `time_anchor`, `signer_pubkey_hex`, `signer_role`, `handoff_to_pubkey_hex`, `authorship_tier`, `contributors`) activate `v0.2` and `v0.3` verification rules without breaking `v0.1` verifiers.

| Protocol | Focus | Key Additions |
|---|---|---|
| **v0.1** | Core Provenance & LMS Integrity | Ed25519 `CreatorKey` (`wm_key_...`), BLAKE3 append-only `ProcessChain`, Merkle `chain_root`, SHA-256 `WroughtmarkSeal`, 4 disciplines (`writing`, `music`, `visual`, `film`), 5 adapters (`text`, `daw`, `canvas`, `nle`, `physical`), baseline scoring & 3 anomaly flags (`SINGLE_SESSION_SUBMISSION`, `SHORT_DURATION`, `BULK_PASTE_SPIKE`). |
| **v0.2** | Behavioral AI Assay & Spatial/Wearable Co-Signing | 9-vector behavioral/AI telemetry (`ProcessTelemetry`), 3-tier `AuthorshipTier` (`HUMAN_WROUGHT`, `AI_ASSISTED_DISCLOSED`, `ANOMALY_FLAGGED`), 9 additional anomaly flags covering chat-loop micro-pastes, split-screen linear retyping, inline AI autocomplete, robotic cadence, C2PA synthetic markers, sEMG replay, and static 6DoF pose, plus watchOS, Wear OS, visionOS Optic ID, Horizon OS, Android XR, and Meta Ray-Ban Display HUD + Neural Band sEMG witnesses. |
| **v0.3** | Universal Provenance, Multi-Author Handoffs & Self-Contained Envelopes | 7 disciplines (`+ code, science, review`), 8 adapters (`+ git, cad, inspection`), blind RFC 3161-style `TimeAnchor`, multi-author `ContributorAttestation` handoff chains, 3 workflow flags (`RUBBER_STAMP_REVIEW`, `OPAQUE_DROP_NO_TEST_CYCLE`, `CLOCK_DRIFT_OR_BACKDATE`), self-contained `PNG` `iTXt` / `WAV` RIFF `WMKS` / generic trailer embedding, M365 OpenXML + Google Drive `appProperties` receipts, USCO + C2PA (`c2pa.wroughtmark.process` `0.3.0`) export, and `wroughtmark git-sign`. |

---

## 1. Core Primitives

### 1.1 Creator Identity (`CreatorKey`)
- **Algorithm:** Ed25519 signing keypair stored in hardware-backed storage where available (Apple Secure Enclave / Android Keystore / StrongBox / TPM) or an encrypted local keystore.
- **Key ID:** `wm_key_<base58(blake3(pubkey)[0..16])>`.
- **Multi-Device Attestation (`v0.1` -> `v0.2`):** A creator's primary desktop key can authorize hardware-backed co-signer devices (Secure Enclave, TPM, or external hardware witnesses) so physical captures and biometric/motor witnesses bind cryptographically to the same process chain.

### 1.2 Process Chain (`ProcessEvent`)
Every tracked work maintains a local append-only hash chain:

```json
{
  "version": "0.1",
  "project_id": "proj-v03-handoff",
  "seq": 42,
  "prev_hash": "blake3:...",
  "timestamp_utc": "2026-11-14T09:30:00Z",
  "adapter": "text | daw | canvas | nle | physical | git | cad | inspection",
  "device_id": "wm_key_...",
  "metrics": {
    "active_seconds": 1840,
    "delta_bytes": 48210,
    "entropy_score": 0.87,
    "structural_units": 14
  },
  "telemetry": {
    "paste_bytes": 0,
    "synthetic_insert_bytes": 0,
    "revision_events": 64,
    "sampled_keystrokes": 420,
    "focus_switch_inserts": 0,
    "keystroke_variance_bps": 2450,
    "external_ai_markers": 0,
    "ai_disclosed": false,
    "emg_motor_variance_bps": 1920,
    "spatial_6dof_entropy_bps": 2340,
    "viewport_coverage_bps": 9200,
    "annotation_events": 4,
    "build_test_cycles": 3,
    "clock_drift_seconds": 0
  },
  "time_anchor": {
    "authority_id": "tsa-wroughtmark-v1",
    "anchored_digest": "blake3:...",
    "wall_clock_utc": "2026-11-14T09:30:05Z",
    "authority_pubkey_hex": "...",
    "authority_sig": "..."
  },
  "signer_pubkey_hex": "...",
  "signer_role": "field_journalist",
  "handoff_to_pubkey_hex": "...",
  "artifact_digest": "blake3:...",
  "sig": "ed25519:..."
}
```

- `prev_hash` links every event to `blake3(canonical_json(prev_event))` (`seq: 0` has `prev_hash: null`), making retroactive insertion or backdating detectable.
- `adapter` (`AdapterKind`):
  - **v0.1:** `text`, `daw`, `canvas`, `nle`, `physical`
  - **v0.3:** `git` (local commit/diff provenance), `cad` (3D/CAD mesh & parametric history), `inspection` (HITL viewport scroll, annotation & review verification)
- `structural_units` counts domain structure without exposing content (tracks/clips in DAW, layers/meshes in `.psd`/`.procreate`/`.blend`, cuts in `.drp`, paragraphs/headings in `.md`/`.docx`).
- Optional `telemetry` (`ProcessTelemetry`), `time_anchor` (`TimeAnchor`), and handoff fields (`signer_pubkey_hex`, `signer_role`, `handoff_to_pubkey_hex`) are omitted when `None` so canonical JSON stays compact.

### 1.3 Wroughtmark Seal (`WroughtmarkSeal`)
When a creator or team publishes or submits work, `core/` summarizes the verified chain into a portable **Seal**:

- `seal_id`: `wm_seal_<base58(blake3(chain_root)[0..16])>`
- `final_output_sha256`: SHA-256 of the exported deliverable (`.mp3`, `.wav`, `.pdf`, `.docx`, `.png`, `.mp4`, bundle, etc.)
- `chain_root`: Merkle root of all `ProcessEvent` hashes
- `summary` (`SealSummary`):
  - `discipline`: `writing | music | visual | film | code | science | review` (`code`, `science`, `review` added in `v0.3`)
  - `session_count`: integer
  - `total_active_seconds`: integer
  - `span_start_utc` / `span_end_utc`: ISO-8601 UTC bounds
  - `co_signed_devices`: attested devices/surfaces (`desktop`, `mobile`, `watch`, `meta-rayban-display-emg`, `visionos-optic-id`, `m365-word`, `gws-docs`, `git-hook`, etc.)
  - `process_score`: deterministic `0..100` score
  - `anomaly_flags`: deterministic array covering all 15 behavioral, hardware, and workflow checks below
  - `authorship_tier` *(optional, `v0.2`+)*: `HUMAN_WROUGHT | AI_ASSISTED_DISCLOSED | ANOMALY_FLAGGED`
  - `contributors` *(optional, `v0.3`)*: array of `ContributorAttestation` (`role`, `creator_key_id`, `creator_pubkey_hex`, `start_seq`, `end_seq`, `stage_output_sha256`, `stage_sig`) for multi-author handoffs
- `time_anchor` *(optional, `v0.3`)*: Blind `TimeAnchor` (`authority_id`, `anchored_digest`, `wall_clock_utc`, `authority_pubkey_hex`, `authority_sig`) signing only a 32-byte digest with zero source content uploaded
- `creator_sig`: Ed25519 signature over canonical JSON (RFC 8785 / sorted-key UTF-8) of `SealPayload`.

### 1.4 Deterministic Scoring & Anomaly Flags (`v0.1` -> `v0.3`)

| Protocol | Flag | What Triggers It |
|---|---|---|
| **v0.1** | `SINGLE_SESSION_SUBMISSION` | Fewer than 2 heartbeat events in the chain |
| **v0.1** | `SHORT_DURATION` | Total `active_seconds` below 300s |
| **v0.1** | `BULK_PASTE_SPIKE` | Non-initial event (`seq > 0`) with `delta_bytes > 50,000` or `paste_bytes > 50,000` in `< 120s` |
| **v0.2** | `CLIPBOARD_RATIO_HIGH` | Cumulative `paste_bytes >= 250` and `> 25%` of total `delta_bytes` |
| **v0.2** | `FOCUS_SWITCH_PASTE_LOOP` | `focus_switch_inserts >= 3` across the session (chat-loop micro-pasting) |
| **v0.2** | `INLINE_AI_AUTOCOMPLETE` | `synthetic_insert_bytes >= 150` and `> 15%` of total `delta_bytes` |
| **v0.2** | `LINEAR_TRANSCRIPTION_PATTERN` | `sampled_keystrokes >= 300`, `delta_bytes >= 1,500`, revision rate `< 3%` (split-screen retyping) |
| **v0.2** | `SYNTHETIC_CADENCE_BOT` | `sampled_keystrokes >= 200` with robotic inter-key timing variance (`0 < keystroke_variance_bps < 800`) |
| **v0.2** | `AI_ASSET_METADATA_DETECTED` | External C2PA / generative AI asset markers detected in artifact bytes (`external_ai_markers > 0`) |
| **v0.2** | `SYNTHETIC_EMG_REPLAY` | Low-variance surface EMG signal (`0 < emg_motor_variance_bps < 500`) on Neural Band co-sign |
| **v0.2** | `STATIC_6DOF_POSE_ANOMALY` | Static spatial head/hand entropy (`0 < spatial_6dof_entropy_bps < 600`) on XR headset session |
| **v0.2** | `AI_ASSISTANCE_DISCLOSED` | Explicit `ai_disclosed: true` telemetry (classifies cleanly as `AI_ASSISTED_DISCLOSED` when no hard anomaly triggers and `process_score >= 70`) |
| **v0.3** | `CLOCK_DRIFT_OR_BACKDATE` | `clock_drift_seconds > 300` or backward `TimeAnchor.wall_clock_utc` across events |
| **v0.3** | `RUBBER_STAMP_REVIEW` | Inspection review with partial viewport coverage (`0 < viewport_coverage_bps < 4000`, e.g. signing without reading) |
| **v0.3** | `OPAQUE_DROP_NO_TEST_CYCLE` | `git` adapter event with `delta_bytes > 5,000` and `build_test_cycles == 0` |

**Authorship Tier Classification (`v0.2`+):**
1. **`ANOMALY_FLAGGED`**: `process_score < 70` or any hard anomaly flag present (`BULK_PASTE_SPIKE`, `LINEAR_TRANSCRIPTION_PATTERN`, `SYNTHETIC_CADENCE_BOT`, `AI_ASSET_METADATA_DETECTED`, `SYNTHETIC_EMG_REPLAY`, `STATIC_6DOF_POSE_ANOMALY`, `CLOCK_DRIFT_OR_BACKDATE`, `RUBBER_STAMP_REVIEW`, `OPAQUE_DROP_NO_TEST_CYCLE`).
2. **`AI_ASSISTED_DISCLOSED`**: `process_score >= 70`, no hard flags, and either explicit `ai_disclosed: true` telemetry or soft disclosure flags.
3. **`HUMAN_WROUGHT`**: `process_score >= 70` and zero flags or undisclosed-AI signals.

---

## 2. Verification Rules (Deterministic)

A verifier (Rust CLI, Rust FFI / Swift / Kotlin, or browser TypeScript / WebCrypto) accepts `(final_file, seal_json)` and passes **only if**:
1. `sha256(final_file) == seal.final_output_sha256`.
2. Canonical JSON signature `creator_sig` verifies against `creator_pubkey_hex` over `SealPayload`.
3. When full timeline proof (`ProcessEvent[]`) is provided, `chain_root` matches the Merkle root of verified events with strictly monotonic `seq`, valid `prev_hash` links, valid per-event Ed25519 signatures (including per-contributor `signer_pubkey_hex` -> `handoff_to_pubkey_hex` transitions in `v0.3` relay chains), and recomputed `process_score` / `anomaly_flags`.
4. Optional `time_anchor` verifies via Ed25519 against `authority_pubkey_hex` and `anchored_digest == seal.chain_root`.

---

## 3. Self-Contained Container, Suite & Legal Envelopes (`v0.3`)

- **Media & Document Containers (`core/src/container.rs` & `web-sdk/src/verify.ts`):**
  - **PNG:** Uncompressed `iTXt` chunk with keyword `wroughtmark:seal` inserted before `IEND`; stripping `iTXt` reconstructs the exact pre-seal PNG bytes for SHA-256 verification.
  - **WAV:** RIFF subchunk FourCC `WMKS` appended at end of file with updated RIFF header size; stripping `WMKS` and restoring the RIFF size reconstructs original PCM audio bytes.
  - **Generic Documents & Code Bundles (`.pdf`, `.md`, `.txt`, archives):** Appended `\n%%WROUGHTMARK_SEAL_V03:<seal_json>%%END_WROUGHTMARK_SEAL` trailer stripped deterministically before hashing.
- **Office & Workspace Envelopes:**
  - **Microsoft 365 (`office-addin/`):** OpenXML `customXml/wroughtmark.xml` envelope in namespace `https://wroughtmark.org/openxml/v0.3`.
  - **Google Workspace (`google-workspace-addon/`):** Signed Google Drive v3 `appProperties` keys (`wroughtmark_seal_id`, `wroughtmark_tier`, `wroughtmark_score`, `wroughtmark_sha256`, `wroughtmark_chain_root`, `wroughtmark_seal_json`).
- **Standard Interop & Legal Manifests:**
  - **C2PA Assertion (`c2pa-export`):** Custom assertion label `"c2pa.wroughtmark.process"` (`"version": "0.3.0"`) binding `seal_id`, `chain_root`, `authorship_tier`, `contributors`, and `time_anchor`.
  - **USCO & Clean-Corpora Manifest (`usco-manifest`, `buildUscoManifestPayload`):** Deterministic `UscoManifest` separating human events/structural units from disclosed AI events (`corpus_100_percent_human`, `disclosure_statement`).

---

## 4. Repository Layout (`wroughtmark-core`)

```text
wroughtmark-core/
├── core/                         # Rust crypto core, 9-vector assay, TimeAnchor, containers, C ABI FFI, CLI (`wroughtmark`)
├── apple/                        # Native macOS (`v14+`) SwiftUI MenuBarExtra desktop app (`WroughtmarkApp`) & Swift FFI (`WroughtmarkKit`)
├── desktop-win-linux/            # Native Rust tray/desktop GUI (`eframe`/`egui`) for Windows, Linux & macOS
├── web-sdk/                      # Zero-dependency WebCrypto verifier (`verify.ts`) & `<wroughtmark-badge>` Web Component
├── browser-extension/            # Manifest V3 extension + shared zero-dep WebCrypto chain (`Google Docs`, `Canvas`, `Overleaf`, `Blackboard`)
├── office-addin/                 # Microsoft 365 multi-host Office.js add-in (`Word`, `Excel`, `PowerPoint`, `Outlook` + OpenXML)
├── google-workspace-addon/       # Native Google Workspace Add-on (`Docs`, `Sheets`, `Slides`, `Drive` appProperties, `Gmail` CardService)
├── skills/wroughtmark-provenance/# Agent Skill (`SKILL.md`) + stdio MCP server bridging M365, Google Workspace & Rust CLI
├── integrations/                 # Editor & DCC plugins: `vscode`, `obsidian`, `figma`, `adobe-uxp`, `blender`, `reaper`
├── scripts/                      # `verify.sh` (14-suite test runner)
└── docs/                         # Protocol spec, tech stack & integrations matrix
```
