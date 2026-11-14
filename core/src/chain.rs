use serde::{Deserialize, Serialize};

use crate::error::WroughtmarkError;
use crate::identity::{verify_signature, CreatorKey};
use crate::{blake3_hex, canonical_json_bytes};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Discipline {
    Writing,
    Music,
    Visual,
    Film,
    Code,
    Science,
    Review,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AdapterKind {
    Text,
    Daw,
    Canvas,
    Nle,
    Physical,
    Git,
    Cad,
    Inspection,
}

/// Blind wall-clock timestamp attestation bound only to a 32-byte digest (`0B` content uploaded).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TimeAnchor {
    pub authority_id: String,
    pub anchored_digest: String,
    pub wall_clock_utc: String,
    pub authority_pubkey_hex: String,
    pub authority_sig: String,
}

impl TimeAnchor {
    pub fn mint(
        authority_key: &CreatorKey,
        authority_id: impl Into<String>,
        anchored_digest: impl Into<String>,
        wall_clock_utc: impl Into<String>,
    ) -> Result<Self, WroughtmarkError> {
        let authority_id = authority_id.into();
        let anchored_digest = anchored_digest.into();
        let wall_clock_utc = wall_clock_utc.into();
        let payload = serde_json::json!({
            "anchored_digest": anchored_digest,
            "authority_id": authority_id,
            "wall_clock_utc": wall_clock_utc,
        });
        let bytes = canonical_json_bytes(&payload)?;
        let authority_sig = authority_key.sign(&bytes);
        Ok(Self {
            authority_id,
            anchored_digest,
            wall_clock_utc,
            authority_pubkey_hex: authority_key.public_key_hex(),
            authority_sig,
        })
    }

    pub fn verify(&self, expected_digest: &str) -> Result<(), WroughtmarkError> {
        if self.anchored_digest != expected_digest {
            return Err(WroughtmarkError::ChainIntegrity(format!(
                "time anchor digest mismatch: expected {expected_digest}, got {}",
                self.anchored_digest
            )));
        }
        let payload = serde_json::json!({
            "anchored_digest": self.anchored_digest,
            "authority_id": self.authority_id,
            "wall_clock_utc": self.wall_clock_utc,
        });
        let bytes = canonical_json_bytes(&payload)?;
        verify_signature(&self.authority_pubkey_hex, &bytes, &self.authority_sig)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProcessMetrics {
    pub active_seconds: u64,
    pub delta_bytes: u64,
    pub entropy_score: f64,
    pub structural_units: u32,
}

/// Zero-knowledge behavioral & AI-usage telemetry captured during a heartbeat window.
/// Never stores raw keystrokes, clipboard text, or screen contents.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProcessTelemetry {
    #[serde(default)]
    pub paste_bytes: u64,
    #[serde(default)]
    pub synthetic_insert_bytes: u64,
    #[serde(default)]
    pub revision_events: u32,
    #[serde(default)]
    pub sampled_keystrokes: u32,
    #[serde(default)]
    pub focus_switch_inserts: u32,
    #[serde(default)]
    pub keystroke_variance_bps: u16,
    #[serde(default)]
    pub external_ai_markers: u16,
    #[serde(default)]
    pub ai_disclosed: bool,
    #[serde(default)]
    pub emg_motor_variance_bps: u16,
    #[serde(default)]
    pub spatial_6dof_entropy_bps: u16,
    #[serde(default)]
    pub viewport_coverage_bps: u16,
    #[serde(default)]
    pub annotation_events: u32,
    #[serde(default)]
    pub build_test_cycles: u32,
    #[serde(default)]
    pub clock_drift_seconds: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProcessEventBody {
    pub version: String,
    pub project_id: String,
    pub seq: u64,
    pub prev_hash: Option<String>,
    pub timestamp_utc: String,
    pub adapter: AdapterKind,
    pub device_id: String,
    pub metrics: ProcessMetrics,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub telemetry: Option<ProcessTelemetry>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_anchor: Option<TimeAnchor>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub signer_pubkey_hex: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub signer_role: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub handoff_to_pubkey_hex: Option<String>,
    pub artifact_digest: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProcessEvent {
    #[serde(flatten)]
    pub body: ProcessEventBody,
    pub sig: String,
}

impl ProcessEvent {
    /// Canonical hash of the signed event (`blake3:<hex>`).
    pub fn event_hash(&self) -> Result<String, WroughtmarkError> {
        let bytes = canonical_json_bytes(self)?;
        Ok(format!("blake3:{}", blake3_hex(&bytes)))
    }
}

/// Local append-only process hash chain for a single creative project.
#[derive(Debug, Clone)]
pub struct ProcessChain {
    pub project_id: String,
    pub events: Vec<ProcessEvent>,
}

impl ProcessChain {
    pub fn new(project_id: impl Into<String>) -> Self {
        Self {
            project_id: project_id.into(),
            events: Vec::new(),
        }
    }

    /// Append and sign a new process heartbeat event.
    pub fn record_event(
        &mut self,
        key: &CreatorKey,
        timestamp_utc: impl Into<String>,
        adapter: AdapterKind,
        metrics: ProcessMetrics,
        artifact_bytes: &[u8],
    ) -> Result<&ProcessEvent, WroughtmarkError> {
        let ai_markers = crate::adapter::detect_ai_asset_markers(artifact_bytes);
        let telemetry = if ai_markers > 0 {
            Some(ProcessTelemetry {
                external_ai_markers: ai_markers,
                ..Default::default()
            })
        } else {
            None
        };
        self.record_event_internal(
            key,
            timestamp_utc,
            adapter,
            metrics,
            telemetry,
            None,
            None,
            None,
            None,
            artifact_bytes,
        )
    }

    /// Append and sign a process heartbeat event with explicit AI-usage & behavioral telemetry.
    pub fn record_event_with_telemetry(
        &mut self,
        key: &CreatorKey,
        timestamp_utc: impl Into<String>,
        adapter: AdapterKind,
        metrics: ProcessMetrics,
        mut telemetry: ProcessTelemetry,
        artifact_bytes: &[u8],
    ) -> Result<&ProcessEvent, WroughtmarkError> {
        let detected = crate::adapter::detect_ai_asset_markers(artifact_bytes);
        telemetry.external_ai_markers = telemetry.external_ai_markers.saturating_add(detected);
        self.record_event_internal(
            key,
            timestamp_utc,
            adapter,
            metrics,
            Some(telemetry),
            None,
            None,
            None,
            None,
            artifact_bytes,
        )
    }

    /// Append a role-attributed stage handoff event (optionally pinned to a blind TimeAnchor
    /// and a designated next contributor public key).
    #[allow(clippy::too_many_arguments)]
    pub fn record_handoff_event(
        &mut self,
        key: &CreatorKey,
        timestamp_utc: impl Into<String>,
        adapter: AdapterKind,
        metrics: ProcessMetrics,
        telemetry: Option<ProcessTelemetry>,
        time_anchor: Option<TimeAnchor>,
        role: impl Into<String>,
        next_pubkey_hex: Option<String>,
        artifact_bytes: &[u8],
    ) -> Result<&ProcessEvent, WroughtmarkError> {
        self.record_event_internal(
            key,
            timestamp_utc,
            adapter,
            metrics,
            telemetry,
            time_anchor,
            Some(key.public_key_hex()),
            Some(role.into()),
            next_pubkey_hex,
            artifact_bytes,
        )
    }

    #[allow(clippy::too_many_arguments)]
    fn record_event_internal(
        &mut self,
        key: &CreatorKey,
        timestamp_utc: impl Into<String>,
        adapter: AdapterKind,
        metrics: ProcessMetrics,
        telemetry: Option<ProcessTelemetry>,
        time_anchor: Option<TimeAnchor>,
        signer_pubkey_hex: Option<String>,
        signer_role: Option<String>,
        handoff_to_pubkey_hex: Option<String>,
        artifact_bytes: &[u8],
    ) -> Result<&ProcessEvent, WroughtmarkError> {
        let seq = self.events.len() as u64;
        let prev_hash = match self.events.last() {
            Some(prev) => Some(prev.event_hash()?),
            None => None,
        };

        let body = ProcessEventBody {
            version: "0.1".to_string(),
            project_id: self.project_id.clone(),
            seq,
            prev_hash,
            timestamp_utc: timestamp_utc.into(),
            adapter,
            device_id: key.key_id(),
            metrics,
            telemetry,
            time_anchor,
            signer_pubkey_hex,
            signer_role,
            handoff_to_pubkey_hex,
            artifact_digest: format!("blake3:{}", blake3_hex(artifact_bytes)),
        };

        let payload = canonical_json_bytes(&body)?;
        let sig = key.sign(&payload);
        self.events.push(ProcessEvent { body, sig });
        Ok(self.events.last().expect("just pushed"))
    }

    /// Compute Merkle root over all event hashes (`blake3:<hex>`).
    pub fn merkle_root(&self) -> Result<String, WroughtmarkError> {
        if self.events.is_empty() {
            return Err(WroughtmarkError::ChainIntegrity(
                "cannot compute merkle root of empty chain".into(),
            ));
        }

        let mut layer: Vec<Vec<u8>> = Vec::with_capacity(self.events.len());
        for ev in &self.events {
            let bytes = canonical_json_bytes(ev)?;
            layer.push(blake3::hash(&bytes).as_bytes().to_vec());
        }

        while layer.len() > 1 {
            let mut next = Vec::with_capacity(layer.len().div_ceil(2));
            for pair in layer.chunks(2) {
                let mut hasher = blake3::Hasher::new();
                hasher.update(&pair[0]);
                if pair.len() == 2 {
                    hasher.update(&pair[1]);
                } else {
                    hasher.update(&pair[0]);
                }
                next.push(hasher.finalize().as_bytes().to_vec());
            }
            layer = next;
        }

        Ok(format!("blake3:{}", hex::encode(&layer[0])))
    }

    /// Verify sequence monotonicity, prev_hash links, blind time anchors, handoff keys,
    /// and per-event signatures.
    pub fn verify(&self, creator_pubkey_hex: &str) -> Result<String, WroughtmarkError> {
        let mut expected_prev: Option<String> = None;
        let mut expected_handoff_pubkey: Option<String> = None;

        for (idx, ev) in self.events.iter().enumerate() {
            if ev.body.seq != idx as u64 {
                return Err(WroughtmarkError::ChainIntegrity(format!(
                    "expected seq {idx}, got {}",
                    ev.body.seq
                )));
            }
            if ev.body.prev_hash != expected_prev {
                return Err(WroughtmarkError::ChainIntegrity(format!(
                    "broken prev_hash link at seq {}",
                    ev.body.seq
                )));
            }
            let signer_pk = ev.body.signer_pubkey_hex.as_deref().unwrap_or(creator_pubkey_hex);
            if let Some(ref expected_pk) = expected_handoff_pubkey {
                if signer_pk != expected_pk {
                    return Err(WroughtmarkError::ChainIntegrity(format!(
                        "unexpected handoff signer at seq {}: expected {expected_pk}, got {signer_pk}",
                        ev.body.seq
                    )));
                }
            }
            if let Some(ref anchor) = ev.body.time_anchor {
                anchor.verify(&ev.body.artifact_digest)?;
            }
            let payload = canonical_json_bytes(&ev.body)?;
            verify_signature(signer_pk, &payload, &ev.sig)?;
            expected_handoff_pubkey = ev.body.handoff_to_pubkey_hex.clone();
            expected_prev = Some(ev.event_hash()?);
        }

        self.merkle_root()
    }
}
