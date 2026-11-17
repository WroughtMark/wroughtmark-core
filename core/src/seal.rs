use serde::{Deserialize, Serialize};

use crate::chain::{AdapterKind, Discipline, ProcessChain, ProcessEvent, TimeAnchor};
use crate::error::WroughtmarkError;
use crate::identity::{verify_signature, CreatorKey};
use crate::{canonical_json_bytes, sha256_hex};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuthorshipTier {
    HumanWrought,
    AiAssistedDisclosed,
    AnomalyFlagged,
}

/// Role-attributed contributor segment within a multi-author relay/handoff chain.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ContributorAttestation {
    pub role: String,
    pub creator_key_id: String,
    pub creator_pubkey_hex: String,
    pub start_seq: u64,
    pub end_seq: u64,
    pub stage_output_sha256: String,
    pub stage_sig: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SealSummary {
    pub discipline: Discipline,
    pub session_count: u64,
    pub total_active_seconds: u64,
    pub span_start_utc: String,
    pub span_end_utc: String,
    pub co_signed_devices: Vec<String>,
    pub process_score: u8,
    pub anomaly_flags: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub authorship_tier: Option<AuthorshipTier>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub contributors: Vec<ContributorAttestation>,
}

/// Classify a verified process chain into one of three human-authorship tiers.
pub fn classify_authorship_tier(
    process_score: u8,
    anomaly_flags: &[String],
    events: &[ProcessEvent],
) -> AuthorshipTier {
    let hard_flags = [
        "BULK_PASTE_SPIKE",
        "LINEAR_TRANSCRIPTION_PATTERN",
        "SYNTHETIC_CADENCE_BOT",
        "AI_ASSET_METADATA_DETECTED",
        "SYNTHETIC_EMG_REPLAY",
        "STATIC_6DOF_POSE_ANOMALY",
        "CLOCK_DRIFT_OR_BACKDATE",
        "RUBBER_STAMP_REVIEW",
        "OPAQUE_DROP_NO_TEST_CYCLE",
    ];
    if process_score < 70
        || anomaly_flags
            .iter()
            .any(|f| hard_flags.contains(&f.as_str()))
    {
        return AuthorshipTier::AnomalyFlagged;
    }

    let any_disclosed = events
        .iter()
        .any(|e| e.body.telemetry.as_ref().is_some_and(|t| t.ai_disclosed));
    if any_disclosed || !anomaly_flags.is_empty() {
        return AuthorshipTier::AiAssistedDisclosed;
    }

    AuthorshipTier::HumanWrought
}

/// Analyze a verified process chain for paste spikes, chat-loop micro-pastes,
/// split-screen retyping (linear transcription), inline AI autocomplete,
/// robotic cadence injectors, and C2PA / AI asset metadata markers.
pub fn analyze_process_chain(events: &[ProcessEvent]) -> (u8, Vec<String>) {
    let mut flags = Vec::new();
    let mut score: i32 = 100;

    if events.len() < 2 {
        flags.push("SINGLE_SESSION_SUBMISSION".to_string());
        score -= 25;
    }

    let total_secs: u64 = events.iter().map(|e| e.body.metrics.active_seconds).sum();
    if total_secs < 300 {
        flags.push("SHORT_DURATION".to_string());
        score -= 20;
    }

    let has_bulk_spike = events.iter().any(|e| {
        let paste_b = e.body.telemetry.as_ref().map_or(0, |t| t.paste_bytes);
        e.body.seq > 0
            && (e.body.metrics.delta_bytes > 50_000 || paste_b > 50_000)
            && e.body.metrics.active_seconds < 120
    });
    if has_bulk_spike {
        flags.push("BULK_PASTE_SPIKE".to_string());
        score -= 35;
    }

    let total_delta: u64 = events.iter().map(|e| e.body.metrics.delta_bytes).sum();
    let mut total_paste: u64 = 0;
    let mut total_synthetic: u64 = 0;
    let mut total_revisions: u64 = 0;
    let mut total_keystrokes: u64 = 0;
    let mut total_focus_inserts: u64 = 0;
    let mut total_ai_markers: u64 = 0;
    let mut has_cadence_bot = false;
    let mut has_synthetic_emg = false;
    let mut has_static_6dof = false;
    let mut has_clock_drift = false;
    let mut has_rubber_stamp_review = false;
    let mut has_opaque_git_drop = false;
    let mut any_disclosed = false;
    let mut prev_anchor_utc: Option<&str> = None;

    for ev in events {
        if let Some(anchor) = &ev.body.time_anchor {
            if let Some(prev) = prev_anchor_utc {
                if anchor.wall_clock_utc.as_str() < prev {
                    has_clock_drift = true;
                }
            }
            prev_anchor_utc = Some(anchor.wall_clock_utc.as_str());
        }
        if ev.body.adapter == AdapterKind::Git
            && ev.body.metrics.delta_bytes > 5_000
            && ev.body.telemetry.as_ref().map_or(0, |t| t.build_test_cycles) == 0
        {
            has_opaque_git_drop = true;
        }
        if let Some(t) = &ev.body.telemetry {
            total_paste = total_paste.saturating_add(t.paste_bytes);
            total_synthetic = total_synthetic.saturating_add(t.synthetic_insert_bytes);
            total_revisions = total_revisions.saturating_add(t.revision_events as u64);
            total_keystrokes = total_keystrokes.saturating_add(t.sampled_keystrokes as u64);
            total_focus_inserts = total_focus_inserts.saturating_add(t.focus_switch_inserts as u64);
            total_ai_markers = total_ai_markers.saturating_add(t.external_ai_markers as u64);
            if t.sampled_keystrokes >= 200
                && t.keystroke_variance_bps > 0
                && t.keystroke_variance_bps < 800
            {
                has_cadence_bot = true;
            }
            if t.emg_motor_variance_bps > 0 && t.emg_motor_variance_bps < 500 {
                has_synthetic_emg = true;
            }
            if t.spatial_6dof_entropy_bps > 0 && t.spatial_6dof_entropy_bps < 600 {
                has_static_6dof = true;
            }
            if t.clock_drift_seconds > 300 {
                has_clock_drift = true;
            }
            if t.viewport_coverage_bps > 0 && t.viewport_coverage_bps < 4000 {
                has_rubber_stamp_review = true;
            }
            if t.ai_disclosed {
                any_disclosed = true;
            }
        }
    }

    let organic_revisions = total_keystrokes >= 200
        && (total_revisions as f64 / total_keystrokes as f64) >= 0.12;

    if total_paste >= 250
        && total_delta > 0
        && (total_paste as f64 / total_delta as f64) > 0.25
    {
        flags.push("CLIPBOARD_RATIO_HIGH".to_string());
        score -= if any_disclosed && organic_revisions { 15 } else { 30 };
    }

    if total_focus_inserts >= 3 {
        flags.push("FOCUS_SWITCH_PASTE_LOOP".to_string());
        score -= 25;
    }

    if total_synthetic >= 150
        && total_delta > 0
        && (total_synthetic as f64 / total_delta as f64) > 0.15
    {
        flags.push("INLINE_AI_AUTOCOMPLETE".to_string());
        score -= if any_disclosed && organic_revisions { 15 } else { 30 };
    }

    if total_keystrokes >= 300
        && total_delta >= 1_500
        && (total_revisions as f64 / total_keystrokes as f64) < 0.03
    {
        flags.push("LINEAR_TRANSCRIPTION_PATTERN".to_string());
        score -= 35;
    }

    if has_cadence_bot {
        flags.push("SYNTHETIC_CADENCE_BOT".to_string());
        score -= 45;
    }

    if total_ai_markers > 0 {
        flags.push("AI_ASSET_METADATA_DETECTED".to_string());
        score -= 40;
    }

    if has_synthetic_emg {
        flags.push("SYNTHETIC_EMG_REPLAY".to_string());
        score -= 45;
    }

    if has_static_6dof {
        flags.push("STATIC_6DOF_POSE_ANOMALY".to_string());
        score -= 35;
    }

    if has_clock_drift {
        flags.push("CLOCK_DRIFT_OR_BACKDATE".to_string());
        score -= 45;
    }

    if has_rubber_stamp_review {
        flags.push("RUBBER_STAMP_REVIEW".to_string());
        score -= 50;
    }

    if has_opaque_git_drop {
        flags.push("OPAQUE_DROP_NO_TEST_CYCLE".to_string());
        score -= 40;
    }

    if any_disclosed {
        flags.push("AI_ASSISTANCE_DISCLOSED".to_string());
    }

    (score.clamp(0, 100) as u8, flags)
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SealPayload {
    pub version: String,
    pub seal_id: String,
    pub project_id: String,
    pub creator_key_id: String,
    pub creator_pubkey_hex: String,
    pub final_output_sha256: String,
    pub chain_root: String,
    pub summary: SealSummary,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_anchor: Option<TimeAnchor>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WroughtmarkSeal {
    #[serde(flatten)]
    pub payload: SealPayload,
    pub creator_sig: String,
}

fn build_contributors(
    events: &[ProcessEvent],
    fallback_pubkey: &str,
) -> Vec<ContributorAttestation> {
    let has_explicit_attribution = events
        .iter()
        .any(|e| e.body.signer_role.is_some() || e.body.signer_pubkey_hex.is_some());
    if !has_explicit_attribution {
        return Vec::new();
    }

    let mut contributors: Vec<ContributorAttestation> = Vec::new();
    for ev in events {
        let role = ev
            .body
            .signer_role
            .clone()
            .unwrap_or_else(|| "creator".to_string());
        let pubkey = ev
            .body
            .signer_pubkey_hex
            .clone()
            .unwrap_or_else(|| fallback_pubkey.to_string());
        if let Some(last) = contributors.last_mut() {
            if last.role == role && last.creator_pubkey_hex == pubkey {
                last.end_seq = ev.body.seq;
                last.stage_output_sha256 = ev.body.artifact_digest.clone();
                last.stage_sig = ev.sig.clone();
                continue;
            }
        }
        contributors.push(ContributorAttestation {
            role,
            creator_key_id: ev.body.device_id.clone(),
            creator_pubkey_hex: pubkey,
            start_seq: ev.body.seq,
            end_seq: ev.body.seq,
            stage_output_sha256: ev.body.artifact_digest.clone(),
            stage_sig: ev.sig.clone(),
        });
    }
    contributors
}

impl WroughtmarkSeal {
    /// Mint and sign a portable WroughtmarkSeal from a verified ProcessChain and exported deliverable.
    pub fn mint(
        key: &CreatorKey,
        chain: &ProcessChain,
        discipline: Discipline,
        final_output_bytes: &[u8],
        co_signed_devices: Vec<String>,
    ) -> Result<Self, WroughtmarkError> {
        Self::mint_with_time_anchor(
            key,
            chain,
            discipline,
            final_output_bytes,
            co_signed_devices,
            None,
        )
    }

    /// Mint and sign a portable WroughtmarkSeal with an optional blind wall-clock TimeAnchor.
    pub fn mint_with_time_anchor(
        key: &CreatorKey,
        chain: &ProcessChain,
        discipline: Discipline,
        final_output_bytes: &[u8],
        co_signed_devices: Vec<String>,
        time_anchor: Option<TimeAnchor>,
    ) -> Result<Self, WroughtmarkError> {
        if chain.events.is_empty() {
            return Err(WroughtmarkError::ChainIntegrity(
                "cannot mint seal from empty process chain".into(),
            ));
        }

        let chain_root = chain.verify(&key.public_key_hex())?;
        if let Some(ref anchor) = time_anchor {
            anchor.verify(&chain_root)?;
        }
        let total_active_seconds: u64 = chain
            .events
            .iter()
            .map(|e| e.body.metrics.active_seconds)
            .sum();

        let span_start_utc = chain.events.first().unwrap().body.timestamp_utc.clone();
        let span_end_utc = chain.events.last().unwrap().body.timestamp_utc.clone();

        let root_hash_bytes = blake3::hash(chain_root.as_bytes());
        let seal_id = format!(
            "wm_seal_{}",
            bs58::encode(&root_hash_bytes.as_bytes()[..16]).into_string()
        );

        let (process_score, anomaly_flags) = analyze_process_chain(&chain.events);
        let authorship_tier =
            classify_authorship_tier(process_score, &anomaly_flags, &chain.events);
        let contributors = build_contributors(&chain.events, &key.public_key_hex());

        let payload = SealPayload {
            version: "0.1".to_string(),
            seal_id,
            project_id: chain.project_id.clone(),
            creator_key_id: key.key_id(),
            creator_pubkey_hex: key.public_key_hex(),
            final_output_sha256: sha256_hex(final_output_bytes),
            chain_root,
            summary: SealSummary {
                discipline,
                session_count: chain.events.len() as u64,
                total_active_seconds,
                span_start_utc,
                span_end_utc,
                co_signed_devices,
                process_score,
                anomaly_flags,
                authorship_tier: Some(authorship_tier),
                contributors,
            },
            time_anchor,
        };

        let canonical = canonical_json_bytes(&payload)?;
        let creator_sig = key.sign(&canonical);
        Ok(Self {
            payload,
            creator_sig,
        })
    }
}

/// Deterministic seal verifier implementing PROTOCOL.md §2.
pub fn verify_seal(
    final_output_bytes: &[u8],
    seal: &WroughtmarkSeal,
    events: Option<&[ProcessEvent]>,
) -> Result<(), WroughtmarkError> {
    // 1. Verify final deliverable digest
    let actual_sha256 = sha256_hex(final_output_bytes);
    if actual_sha256 != seal.payload.final_output_sha256 {
        return Err(WroughtmarkError::OutputDigestMismatch {
            expected: seal.payload.final_output_sha256.clone(),
            actual: actual_sha256,
        });
    }

    // 2. Verify Ed25519 signature over canonical JSON payload
    let canonical = canonical_json_bytes(&seal.payload)?;
    verify_signature(
        &seal.payload.creator_pubkey_hex,
        &canonical,
        &seal.creator_sig,
    )?;

    // 2b. Verify seal-level blind time anchor when present
    if let Some(ref anchor) = seal.payload.time_anchor {
        anchor.verify(&seal.payload.chain_root)?;
    }

    // 3. If full event timeline is provided, verify chain integrity and Merkle root
    if let Some(ev_slice) = events {
        let chain = ProcessChain {
            project_id: seal.payload.project_id.clone(),
            events: ev_slice.to_vec(),
        };
        let computed_root = chain.verify(&seal.payload.creator_pubkey_hex)?;
        if computed_root != seal.payload.chain_root {
            return Err(WroughtmarkError::ChainRootMismatch {
                expected: seal.payload.chain_root.clone(),
                actual: computed_root,
            });
        }
    }

    Ok(())
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DossierTimelineEntry {
    pub seq: u64,
    pub timestamp_utc: String,
    pub adapter: String,
    pub active_seconds: u64,
    pub delta_bytes: u64,
    pub structural_units: u32,
    pub event_hash_prefix: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DossierReport {
    pub seal_id: String,
    pub project_id: String,
    pub discipline: Discipline,
    pub process_score: u8,
    pub anomaly_flags: Vec<String>,
    pub session_count: u64,
    pub total_active_seconds: u64,
    pub span_start_utc: String,
    pub span_end_utc: String,
    pub co_signed_devices: Vec<String>,
    pub final_output_sha256: String,
    pub chain_root: String,
    pub creator_pubkey_hex: String,
    pub creator_sig: String,
    pub timeline_verified: bool,
    pub timeline: Vec<DossierTimelineEntry>,
}

/// Build a verified, privacy-preserving audit dossier from a seal, deliverable bytes, and optional chain events.
pub fn build_dossier(
    final_output_bytes: &[u8],
    seal: &WroughtmarkSeal,
    events: Option<&[ProcessEvent]>,
) -> Result<DossierReport, WroughtmarkError> {
    verify_seal(final_output_bytes, seal, events)?;

    let timeline = events
        .unwrap_or(&[])
        .iter()
        .map(|ev| {
            let hash_prefix = ev.event_hash()?.chars().take(16).collect::<String>();
            Ok(DossierTimelineEntry {
                seq: ev.body.seq,
                timestamp_utc: ev.body.timestamp_utc.clone(),
                adapter: format!("{:?}", ev.body.adapter).to_lowercase(),
                active_seconds: ev.body.metrics.active_seconds,
                delta_bytes: ev.body.metrics.delta_bytes,
                structural_units: ev.body.metrics.structural_units,
                event_hash_prefix: hash_prefix,
            })
        })
        .collect::<Result<Vec<_>, WroughtmarkError>>()?;

    Ok(DossierReport {
        seal_id: seal.payload.seal_id.clone(),
        project_id: seal.payload.project_id.clone(),
        discipline: seal.payload.summary.discipline.clone(),
        process_score: seal.payload.summary.process_score,
        anomaly_flags: seal.payload.summary.anomaly_flags.clone(),
        session_count: seal.payload.summary.session_count,
        total_active_seconds: seal.payload.summary.total_active_seconds,
        span_start_utc: seal.payload.summary.span_start_utc.clone(),
        span_end_utc: seal.payload.summary.span_end_utc.clone(),
        co_signed_devices: seal.payload.summary.co_signed_devices.clone(),
        final_output_sha256: seal.payload.final_output_sha256.clone(),
        chain_root: seal.payload.chain_root.clone(),
        creator_pubkey_hex: seal.payload.creator_pubkey_hex.clone(),
        creator_sig: seal.creator_sig.clone(),
        timeline_verified: events.is_some(),
        timeline,
    })
}

/// USCO hybrid copyright disclosure & AI-training corpus cleanliness manifest.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UscoManifest {
    pub seal_id: String,
    pub project_id: String,
    pub discipline: Discipline,
    pub authorship_tier: AuthorshipTier,
    pub process_score: u8,
    pub human_events: u64,
    pub ai_disclosed_events: u64,
    pub human_structural_units: u64,
    pub total_structural_units: u64,
    pub total_active_seconds: u64,
    pub corpus_100_percent_human: bool,
    pub disclosure_statement: String,
    pub span_start_utc: String,
    pub span_end_utc: String,
}

/// Verify a seal against its full ProcessChain timeline and emit a USCO / clean-dataset manifest.
pub fn build_usco_manifest(
    seal: &WroughtmarkSeal,
    events: &[ProcessEvent],
) -> Result<UscoManifest, WroughtmarkError> {
    let canonical = canonical_json_bytes(&seal.payload)?;
    verify_signature(
        &seal.payload.creator_pubkey_hex,
        &canonical,
        &seal.creator_sig,
    )?;
    if let Some(ref anchor) = seal.payload.time_anchor {
        anchor.verify(&seal.payload.chain_root)?;
    }

    let chain = ProcessChain {
        project_id: seal.payload.project_id.clone(),
        events: events.to_vec(),
    };
    let computed_root = chain.verify(&seal.payload.creator_pubkey_hex)?;
    if computed_root != seal.payload.chain_root {
        return Err(WroughtmarkError::ChainRootMismatch {
            expected: seal.payload.chain_root.clone(),
            actual: computed_root,
        });
    }

    let mut human_events: u64 = 0;
    let mut ai_disclosed_events: u64 = 0;
    let mut human_structural_units: u64 = 0;
    let mut total_structural_units: u64 = 0;

    for ev in events {
        let units = ev.body.metrics.structural_units as u64;
        total_structural_units = total_structural_units.saturating_add(units);
        let disclosed = ev.body.telemetry.as_ref().is_some_and(|t| t.ai_disclosed);
        if disclosed {
            ai_disclosed_events += 1;
        } else {
            human_events += 1;
            human_structural_units = human_structural_units.saturating_add(units);
        }
    }

    let authorship_tier = seal.payload.summary.authorship_tier.unwrap_or_else(|| {
        classify_authorship_tier(
            seal.payload.summary.process_score,
            &seal.payload.summary.anomaly_flags,
            events,
        )
    });
    let corpus_100_percent_human =
        authorship_tier == AuthorshipTier::HumanWrought && ai_disclosed_events == 0;

    let disclosure_statement = if corpus_100_percent_human {
        format!(
            "100% HUMAN_WROUGHT corpus lineage verified for {} ({} human events, {} structural units, {}s active time, chain_root {}). Eligible for clean dataset licensing with zero disclosed AI segments.",
            seal.payload.project_id,
            human_events,
            total_structural_units,
            seal.payload.summary.total_active_seconds,
            seal.payload.chain_root
        )
    } else {
        format!(
            "Hybrid USCO Authorship Disclosure for {}: {} unassisted human sessions ({} structural units) and {} AI-assisted disclosed sessions ({} total structural units), {}s active duration, tier {:?}, chain_root {}. Applicant claims copyright solely in human selection, coordination, arrangement, and original expressive revisions.",
            seal.payload.project_id,
            human_events,
            human_structural_units,
            ai_disclosed_events,
            total_structural_units,
            seal.payload.summary.total_active_seconds,
            authorship_tier,
            seal.payload.chain_root
        )
    };

    Ok(UscoManifest {
        seal_id: seal.payload.seal_id.clone(),
        project_id: seal.payload.project_id.clone(),
        discipline: seal.payload.summary.discipline,
        authorship_tier,
        process_score: seal.payload.summary.process_score,
        human_events,
        ai_disclosed_events,
        human_structural_units,
        total_structural_units,
        total_active_seconds: seal.payload.summary.total_active_seconds,
        corpus_100_percent_human,
        disclosure_statement,
        span_start_utc: seal.payload.summary.span_start_utc.clone(),
        span_end_utc: seal.payload.summary.span_end_utc.clone(),
    })
}

fn escape_html(raw: &str) -> String {
    raw.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

/// Render a self-contained, print-ready HTML verification dossier.
pub fn render_dossier_html(report: &DossierReport) -> String {
    let flags = if report.anomaly_flags.is_empty() {
        "CLEAN".to_string()
    } else {
        report.anomaly_flags.iter().map(|f| escape_html(f)).collect::<Vec<_>>().join(", ")
    };

    let timeline_rows = if report.timeline.is_empty() {
        "<tr><td colspan=\"6\">Summary-only seal verification (full local chain omitted by creator for minimal disclosure).</td></tr>".to_string()
    } else {
        report
            .timeline
            .iter()
            .map(|row| {
                format!(
                    "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}s</td><td>{} B</td><td><code>{}...</code></td></tr>",
                    row.seq,
                    escape_html(&row.timestamp_utc),
                    escape_html(&row.adapter),
                    row.active_seconds,
                    row.delta_bytes,
                    escape_html(&row.event_hash_prefix),
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let devices = if report.co_signed_devices.is_empty() {
        "none".to_string()
    } else {
        report.co_signed_devices.iter().map(|d| escape_html(d)).collect::<Vec<_>>().join(", ")
    };

    format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Wroughtmark Verification Dossier - {seal_id}</title>
<style>
  body {{ font-family: Georgia, serif; background: #FBF9F5; color: #1A1918; max-width: 820px; margin: 40px auto; padding: 32px; border: 1px solid #DDD6C8; }}
  h1 {{ margin: 0 0 4px; font-size: 26px; }}
  .sub {{ color: #6E6A63; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 24px; }}
  .badge {{ display: inline-block; padding: 6px 12px; background: #1B4D3E; color: #FBF9F5; font-family: monospace; font-size: 12px; border-radius: 4px; margin-bottom: 18px; }}
  .grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }}
  .card {{ background: #F5F1EA; border: 1px solid #DDD6C8; padding: 12px 14px; border-radius: 4px; }}
  .label {{ font-size: 11px; text-transform: uppercase; color: #6E6A63; letter-spacing: 0.06em; }}
  .val {{ font-family: monospace; font-size: 13px; margin-top: 4px; word-break: break-all; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; font-family: monospace; }}
  th, td {{ border-bottom: 1px solid #DDD6C8; padding: 8px 6px; text-align: left; }}
  th {{ color: #6E6A63; font-size: 11px; text-transform: uppercase; }}
  .privacy {{ margin-top: 24px; padding: 12px; border-left: 3px solid #9E6B24; background: #F5F1EA; font-size: 13px; }}
  @media print {{ body {{ border: none; margin: 0; background: #FFFFFF; }} }}
</style>
</head>
<body>
  <h1>Wroughtmark Human-Origin Verification Dossier</h1>
  <div class="sub">Cryptographic Process Provenance Receipt</div>
  <div class="badge">VERIFIED HUMAN PROCESS | SCORE {score}/100 | {flags}</div>
  <div class="grid">
    <div class="card"><div class="label">Seal ID</div><div class="val">{seal_id}</div></div>
    <div class="card"><div class="label">Discipline &amp; Project</div><div class="val">{discipline:?} / {project_id}</div></div>
    <div class="card"><div class="label">Active Sessions / Duration</div><div class="val">{sessions} session(s) / {active_secs}s active</div></div>
    <div class="card"><div class="label">Timeline Span</div><div class="val">{span_start} -&gt; {span_end}</div></div>
    <div class="card"><div class="label">Co-Signed Devices</div><div class="val">{devices}</div></div>
    <div class="card"><div class="label">Full Chain Audited</div><div class="val">{chain_audited}</div></div>
    <div class="card"><div class="label">Deliverable SHA-256</div><div class="val">{sha256}</div></div>
    <div class="card"><div class="label">Chain Merkle Root</div><div class="val">{chain_root}</div></div>
    <div class="card"><div class="label">Creator Public Key (Ed25519)</div><div class="val">{pubkey}</div></div>
    <div class="card"><div class="label">Seal Signature</div><div class="val">{sig}</div></div>
  </div>
  <h3>Redacted Process Timeline</h3>
  <table>
    <thead><tr><th>Seq</th><th>Timestamp (UTC)</th><th>Adapter</th><th>Active</th><th>Delta</th><th>Event Hash</th></tr></thead>
    <tbody>{timeline_rows}</tbody>
  </table>
  <div class="privacy">
    <strong>Privacy Attestation:</strong> Zero raw drafts, keystrokes, or unpublished manuscript/media contents are stored in this dossier. Verification relies solely on local cryptographic hashes and Ed25519 signatures.
  </div>
</body>
</html>"#,
        seal_id = escape_html(&report.seal_id),
        score = report.process_score,
        flags = flags,
        discipline = report.discipline,
        project_id = escape_html(&report.project_id),
        sessions = report.session_count,
        active_secs = report.total_active_seconds,
        span_start = escape_html(&report.span_start_utc),
        span_end = escape_html(&report.span_end_utc),
        devices = devices,
        chain_audited = if report.timeline_verified { "YES (all events verified)" } else { "SUMMARY SEAL ONLY" },
        sha256 = escape_html(&report.final_output_sha256),
        chain_root = escape_html(&report.chain_root),
        pubkey = escape_html(&report.creator_pubkey_hex),
        sig = escape_html(&report.creator_sig),
        timeline_rows = timeline_rows,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chain::{AdapterKind, ProcessMetrics};

    #[test]
    fn mint_and_verify_round_trip() {
        let key = CreatorKey::from_seed([7u8; 32]);
        let mut chain = ProcessChain::new("proj-short-film-01");

        chain
            .record_event(
                &key,
                "2026-11-13T01:00:00Z",
                AdapterKind::Nle,
                ProcessMetrics {
                    active_seconds: 1200,
                    delta_bytes: 18400,
                    entropy_score: 0.91,
                    structural_units: 8,
                },
                b"timeline_v1_rough_cut",
            )
            .unwrap();

        chain
            .record_event(
                &key,
                "2026-11-13T02:15:00Z",
                AdapterKind::Physical,
                ProcessMetrics {
                    active_seconds: 300,
                    delta_bytes: 4096,
                    entropy_score: 1.0,
                    structural_units: 1,
                },
                b"watch_on_set_slate_take_4",
            )
            .unwrap();

        let final_film = b"final_master_render_prores_422_bytes";
        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Film,
            final_film,
            vec!["desktop".into(), "watch".into()],
        )
        .unwrap();

        assert!(verify_seal(final_film, &seal, Some(&chain.events)).is_ok());
        assert_eq!(seal.payload.summary.total_active_seconds, 1500);
        assert_eq!(seal.payload.summary.session_count, 2);
    }

    #[test]
    fn tampered_output_fails_verification() {
        let key = CreatorKey::from_seed([9u8; 32]);
        let mut chain = ProcessChain::new("proj-track-01");
        chain
            .record_event(
                &key,
                "2026-11-13T03:00:00Z",
                AdapterKind::Daw,
                ProcessMetrics {
                    active_seconds: 2400,
                    delta_bytes: 95000,
                    entropy_score: 0.88,
                    structural_units: 24,
                },
                b"ableton_set_v3",
            )
            .unwrap();

        let original_wav = b"real_human_master_wav";
        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Music,
            original_wav,
            vec!["desktop".into()],
        )
        .unwrap();

        let err = verify_seal(b"swapped_ai_track_wav", &seal, Some(&chain.events)).unwrap_err();
        assert!(matches!(err, WroughtmarkError::OutputDigestMismatch { .. }));
    }

    #[test]
    fn broken_chain_link_fails_verification() {
        let key = CreatorKey::from_seed([11u8; 32]);
        let mut chain = ProcessChain::new("proj-novel-ch1");
        for i in 0..3 {
            chain
                .record_event(
                    &key,
                    format!("2026-11-13T0{}:00:00Z", i + 1),
                    AdapterKind::Text,
                    ProcessMetrics {
                        active_seconds: 600,
                        delta_bytes: 2048,
                        entropy_score: 0.9,
                        structural_units: 5 + i,
                    },
                    format!("draft_{i}").as_bytes(),
                )
                .unwrap();
        }

        let final_doc = b"chapter_1_final";
        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Writing,
            final_doc,
            vec!["desktop".into()],
        )
        .unwrap();

        let mut tampered_events = chain.events.clone();
        tampered_events[1].body.metrics.active_seconds = 99999;

        let err = verify_seal(final_doc, &seal, Some(&tampered_events)).unwrap_err();
        assert!(matches!(err, WroughtmarkError::InvalidSignature));
    }

    #[test]
    fn bulk_paste_spike_is_flagged_in_seal() {
        let key = CreatorKey::from_seed([15u8; 32]);
        let mut chain = ProcessChain::new("proj-essay-paste");
        chain
            .record_event(
                &key,
                "2026-11-13T01:00:00Z",
                AdapterKind::Text,
                ProcessMetrics {
                    active_seconds: 600,
                    delta_bytes: 400,
                    entropy_score: 0.85,
                    structural_units: 2,
                },
                b"outline",
            )
            .unwrap();
        chain
            .record_event(
                &key,
                "2026-11-13T01:01:00Z",
                AdapterKind::Text,
                ProcessMetrics {
                    active_seconds: 30,
                    delta_bytes: 95_000,
                    entropy_score: 0.9,
                    structural_units: 20,
                },
                b"huge_pasted_essay",
            )
            .unwrap();

        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Writing,
            b"final_essay_bytes",
            vec!["desktop".into()],
        )
        .unwrap();

        assert!(seal
            .payload
            .summary
            .anomaly_flags
            .contains(&"BULK_PASTE_SPIKE".to_string()));
        assert!(seal.payload.summary.process_score < 100);
    }

    #[test]
    fn dossier_includes_redacted_timeline_without_raw_content() {
        let key = CreatorKey::from_seed([23u8; 32]);
        let mut chain = ProcessChain::new("student-thesis");
        let secret_draft = b"SECRET_UNPUBLISHED_DRAFT_TEXT";
        chain
            .record_event(
                &key,
                "2026-11-13T01:00:00Z",
                AdapterKind::Text,
                ProcessMetrics {
                    active_seconds: 900,
                    delta_bytes: 1800,
                    entropy_score: 0.91,
                    structural_units: 6,
                },
                secret_draft,
            )
            .unwrap();
        chain
            .record_event(
                &key,
                "2026-11-13T01:30:00Z",
                AdapterKind::Text,
                ProcessMetrics {
                    active_seconds: 1200,
                    delta_bytes: 2100,
                    entropy_score: 0.93,
                    structural_units: 9,
                },
                b"final_student_essay",
            )
            .unwrap();

        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Writing,
            b"final_student_essay",
            vec!["macbook".into()],
        )
        .unwrap();

        let report = build_dossier(b"final_student_essay", &seal, Some(&chain.events)).unwrap();
        assert_eq!(report.process_score, 100);
        assert!(report.timeline_verified);
        assert_eq!(report.timeline.len(), 2);

        let html = render_dossier_html(&report);
        assert!(html.contains(&seal.payload.seal_id));
        assert!(html.contains("SCORE 100/100 | CLEAN"));
        assert!(!html.contains("SECRET_UNPUBLISHED_DRAFT_TEXT"));
    }

    #[test]
    fn detects_chat_loop_micro_paste_and_focus_switch_loop() {
        use crate::chain::ProcessTelemetry;
        let key = CreatorKey::from_seed([31u8; 32]);
        let mut chain = ProcessChain::new("proj-chat-loop");

        for i in 0..3u64 {
            chain
                .record_event_with_telemetry(
                    &key,
                    format!("2026-11-14T10:0{i}:00Z"),
                    AdapterKind::Text,
                    ProcessMetrics {
                        active_seconds: 180,
                        delta_bytes: 800,
                        entropy_score: 0.89,
                        structural_units: 3,
                    },
                    ProcessTelemetry {
                        paste_bytes: 550,
                        focus_switch_inserts: 1,
                        sampled_keystrokes: 250,
                        revision_events: 35,
                        ..Default::default()
                    },
                    format!("paragraph_{i}").as_bytes(),
                )
                .unwrap();
        }

        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Writing,
            b"chat_loop_essay",
            vec!["browser-extension".into()],
        )
        .unwrap();

        let flags = &seal.payload.summary.anomaly_flags;
        assert!(flags.contains(&"CLIPBOARD_RATIO_HIGH".to_string()));
        assert!(flags.contains(&"FOCUS_SWITCH_PASTE_LOOP".to_string()));
        assert_eq!(
            seal.payload.summary.authorship_tier,
            Some(AuthorshipTier::AnomalyFlagged)
        );
    }

    #[test]
    fn detects_split_screen_retyping_and_inline_ai_and_c2pa_markers() {
        use crate::chain::ProcessTelemetry;
        let key = CreatorKey::from_seed([37u8; 32]);
        let mut chain = ProcessChain::new("proj-retype-ai");

        chain
            .record_event_with_telemetry(
                &key,
                "2026-11-14T11:00:00Z",
                AdapterKind::Text,
                ProcessMetrics {
                    active_seconds: 600,
                    delta_bytes: 1200,
                    entropy_score: 0.9,
                    structural_units: 4,
                },
                ProcessTelemetry {
                    sampled_keystrokes: 1200,
                    revision_events: 5,
                    synthetic_insert_bytes: 350,
                    keystroke_variance_bps: 420,
                    ..Default::default()
                },
                b"c2pa.ai_generated retyped part 1",
            )
            .unwrap();

        chain
            .record_event_with_telemetry(
                &key,
                "2026-11-14T11:15:00Z",
                AdapterKind::Text,
                ProcessMetrics {
                    active_seconds: 600,
                    delta_bytes: 1000,
                    entropy_score: 0.9,
                    structural_units: 4,
                },
                ProcessTelemetry {
                    sampled_keystrokes: 1000,
                    revision_events: 4,
                    ..Default::default()
                },
                b"retyped part 2",
            )
            .unwrap();

        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Writing,
            b"retyped_final",
            vec!["desktop".into()],
        )
        .unwrap();

        let flags = &seal.payload.summary.anomaly_flags;
        assert!(flags.contains(&"LINEAR_TRANSCRIPTION_PATTERN".to_string()));
        assert!(flags.contains(&"INLINE_AI_AUTOCOMPLETE".to_string()));
        assert!(flags.contains(&"SYNTHETIC_CADENCE_BOT".to_string()));
        assert!(flags.contains(&"AI_ASSET_METADATA_DETECTED".to_string()));
        assert_eq!(
            seal.payload.summary.authorship_tier,
            Some(AuthorshipTier::AnomalyFlagged)
        );
    }

    #[test]
    fn disclosed_hybrid_ai_assistance_with_human_revision_earns_ai_assisted_tier() {
        use crate::chain::ProcessTelemetry;
        let key = CreatorKey::from_seed([41u8; 32]);
        let mut chain = ProcessChain::new("proj-disclosed-hybrid");

        chain
            .record_event_with_telemetry(
                &key,
                "2026-11-14T12:00:00Z",
                AdapterKind::Text,
                ProcessMetrics {
                    active_seconds: 900,
                    delta_bytes: 2000,
                    entropy_score: 0.91,
                    structural_units: 6,
                },
                ProcessTelemetry {
                    sampled_keystrokes: 1800,
                    revision_events: 380,
                    synthetic_insert_bytes: 700,
                    ai_disclosed: true,
                    ..Default::default()
                },
                b"draft_1_with_disclosed_polish",
            )
            .unwrap();

        chain
            .record_event_with_telemetry(
                &key,
                "2026-11-14T12:30:00Z",
                AdapterKind::Text,
                ProcessMetrics {
                    active_seconds: 900,
                    delta_bytes: 1800,
                    entropy_score: 0.92,
                    structural_units: 5,
                },
                ProcessTelemetry {
                    sampled_keystrokes: 1800,
                    revision_events: 410,
                    ..Default::default()
                },
                b"draft_2_human_synthesis",
            )
            .unwrap();

        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Writing,
            b"hybrid_final",
            vec!["vscode".into()],
        )
        .unwrap();

        assert_eq!(seal.payload.summary.process_score, 85);
        assert!(seal
            .payload
            .summary
            .anomaly_flags
            .contains(&"AI_ASSISTANCE_DISCLOSED".to_string()));
        assert_eq!(
            seal.payload.summary.authorship_tier,
            Some(AuthorshipTier::AiAssistedDisclosed)
        );
    }

    #[test]
    fn detects_spatial_6dof_and_neural_band_emg_anomalies() {
        use crate::chain::ProcessTelemetry;
        let key = CreatorKey::from_seed([53u8; 32]);
        let mut chain = ProcessChain::new("proj-xr-replay");

        chain
            .record_event_with_telemetry(
                &key,
                "2026-11-15T01:00:00Z",
                AdapterKind::Canvas,
                ProcessMetrics {
                    active_seconds: 240,
                    delta_bytes: 2048,
                    entropy_score: 0.9,
                    structural_units: 6,
                },
                ProcessTelemetry {
                    emg_motor_variance_bps: 310,
                    spatial_6dof_entropy_bps: 420,
                    ..Default::default()
                },
                b"mesh_sculpt_v1",
            )
            .unwrap();

        chain
            .record_event_with_telemetry(
                &key,
                "2026-11-15T01:05:00Z",
                AdapterKind::Canvas,
                ProcessMetrics {
                    active_seconds: 240,
                    delta_bytes: 1800,
                    entropy_score: 0.91,
                    structural_units: 9,
                },
                ProcessTelemetry {
                    emg_motor_variance_bps: 280,
                    spatial_6dof_entropy_bps: 450,
                    ..Default::default()
                },
                b"mesh_sculpt_v2",
            )
            .unwrap();

        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Visual,
            b"xr_sculpt_export",
            vec!["meta-rayban-display-emg".into(), "meta-quest-horizon-os".into()],
        )
        .unwrap();

        let flags = &seal.payload.summary.anomaly_flags;
        assert!(flags.contains(&"SYNTHETIC_EMG_REPLAY".to_string()));
        assert!(flags.contains(&"STATIC_6DOF_POSE_ANOMALY".to_string()));
        assert_eq!(
            seal.payload.summary.authorship_tier,
            Some(AuthorshipTier::AnomalyFlagged)
        );
    }

    #[test]
    fn detects_clock_drift_rubber_stamp_review_and_opaque_git_drop() {
        use crate::chain::ProcessTelemetry;
        let key = CreatorKey::from_seed([61u8; 32]);
        let mut chain = ProcessChain::new("proj-enterprise-anomalies");

        chain
            .record_event_with_telemetry(
                &key,
                "2026-11-15T02:00:00Z",
                AdapterKind::Git,
                ProcessMetrics {
                    active_seconds: 120,
                    delta_bytes: 9_200,
                    entropy_score: 0.75,
                    structural_units: 12,
                },
                ProcessTelemetry {
                    build_test_cycles: 0,
                    clock_drift_seconds: 900,
                    ..Default::default()
                },
                b"opaque_git_commit_bytes",
            )
            .unwrap();

        chain
            .record_event_with_telemetry(
                &key,
                "2026-11-15T02:04:00Z",
                AdapterKind::Inspection,
                ProcessMetrics {
                    active_seconds: 190,
                    delta_bytes: 400,
                    entropy_score: 0.5,
                    structural_units: 60,
                },
                ProcessTelemetry {
                    viewport_coverage_bps: 1_200,
                    annotation_events: 0,
                    ..Default::default()
                },
                b"rubber_stamp_pdf_signoff",
            )
            .unwrap();

        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Review,
            b"enterprise_pr_and_hitl_signoff",
            vec!["git-hook".into(), "review-viewer".into()],
        )
        .unwrap();

        let flags = &seal.payload.summary.anomaly_flags;
        assert!(flags.contains(&"CLOCK_DRIFT_OR_BACKDATE".to_string()));
        assert!(flags.contains(&"RUBBER_STAMP_REVIEW".to_string()));
        assert!(flags.contains(&"OPAQUE_DROP_NO_TEST_CYCLE".to_string()));
        assert_eq!(
            seal.payload.summary.authorship_tier,
            Some(AuthorshipTier::AnomalyFlagged)
        );
    }

    #[test]
    fn multi_author_handoff_chain_and_usco_manifest_round_trip() {
        use crate::chain::ProcessTelemetry;
        let writer_key = CreatorKey::from_seed([71u8; 32]);
        let reviewer_key = CreatorKey::from_seed([72u8; 32]);
        let anchor_key = CreatorKey::from_seed([73u8; 32]);

        let mut chain = ProcessChain::new("proj-handoff-usco");
        let draft_bytes = b"field_capture_plus_draft_v1";
        let draft_digest = format!("blake3:{}", crate::blake3_hex(draft_bytes));
        let ev0_anchor = TimeAnchor::mint(
            &anchor_key,
            "wroughtmark-tsa-demo",
            draft_digest,
            "2026-11-15T03:00:00Z",
        )
        .unwrap();

        chain
            .record_handoff_event(
                &writer_key,
                "2026-11-15T03:00:00Z",
                AdapterKind::Text,
                ProcessMetrics {
                    active_seconds: 240,
                    delta_bytes: 2800,
                    entropy_score: 0.88,
                    structural_units: 6,
                },
                Some(ProcessTelemetry {
                    sampled_keystrokes: 310,
                    revision_events: 48,
                    ..Default::default()
                }),
                Some(ev0_anchor),
                "author",
                Some(reviewer_key.public_key_hex()),
                draft_bytes,
            )
            .unwrap();

        chain
            .record_handoff_event(
                &reviewer_key,
                "2026-11-15T03:12:00Z",
                AdapterKind::Inspection,
                ProcessMetrics {
                    active_seconds: 180,
                    delta_bytes: 640,
                    entropy_score: 0.84,
                    structural_units: 4,
                },
                Some(ProcessTelemetry {
                    ai_disclosed: true,
                    viewport_coverage_bps: 9200,
                    annotation_events: 7,
                    ..Default::default()
                }),
                None,
                "compliance_reviewer",
                None,
                b"redacted_reviewed_final_v2",
            )
            .unwrap();

        let final_doc = b"published_redacted_brief_v2";
        let seal_root = chain.verify(&writer_key.public_key_hex()).unwrap();
        let seal_anchor = TimeAnchor::mint(
            &anchor_key,
            "wroughtmark-tsa-demo",
            seal_root,
            "2026-11-15T03:15:00Z",
        )
        .unwrap();

        let seal = WroughtmarkSeal::mint_with_time_anchor(
            &writer_key,
            &chain,
            Discipline::Review,
            final_doc,
            vec!["secure-enclave".into(), "touch-id".into()],
            Some(seal_anchor),
        )
        .unwrap();

        assert!(verify_seal(final_doc, &seal, Some(&chain.events)).is_ok());
        assert_eq!(seal.payload.summary.contributors.len(), 2);
        assert_eq!(seal.payload.summary.contributors[0].role, "author");
        assert_eq!(
            seal.payload.summary.contributors[1].role,
            "compliance_reviewer"
        );
        assert_eq!(
            seal.payload.summary.authorship_tier,
            Some(AuthorshipTier::AiAssistedDisclosed)
        );

        let manifest = build_usco_manifest(&seal, &chain.events).unwrap();
        assert_eq!(manifest.human_events, 1);
        assert_eq!(manifest.ai_disclosed_events, 1);
        assert_eq!(manifest.human_structural_units, 6);
        assert_eq!(manifest.total_structural_units, 10);
        assert!(!manifest.corpus_100_percent_human);
        assert!(manifest.disclosure_statement.contains("Hybrid USCO Authorship Disclosure"));
    }
}
