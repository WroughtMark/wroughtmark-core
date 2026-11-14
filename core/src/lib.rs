//! Wroughtmark shared cryptographic core.
//!
//! Implements CreatorKey (Ed25519), append-only BLAKE3 ProcessChain,
//! canonical JSON serialization, and deterministic WroughtmarkSeal verification.

pub mod adapter;
pub mod chain;
pub mod container;
pub mod error;
pub mod ffi;
pub mod identity;
pub mod seal;

pub use chain::{
    AdapterKind, Discipline, ProcessChain, ProcessEvent, ProcessMetrics, ProcessTelemetry,
    TimeAnchor,
};
pub use container::{
    ContainerKind, embed_seal_in_container, export_c2pa_assertion_json,
    extract_and_verify_embedded_seal,
};
pub use error::WroughtmarkError;
pub use identity::CreatorKey;
pub use seal::{
    AuthorshipTier, ContributorAttestation, SealSummary, UscoManifest, WroughtmarkSeal,
    build_usco_manifest, classify_authorship_tier, verify_seal,
};

use serde::Serialize;

/// Compute lowercase hex SHA-256 digest of arbitrary bytes.
pub fn sha256_hex(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let digest = Sha256::digest(data);
    hex::encode(digest)
}

/// Compute lowercase hex BLAKE3 digest of arbitrary bytes.
pub fn blake3_hex(data: &[u8]) -> String {
    let hash = blake3::hash(data);
    hash.to_hex().to_string()
}

/// Serialize a value into deterministic canonical JSON (sorted object keys, no extra whitespace).
/// Matches RFC 8785 JCS key-ordering semantics for standard JSON structs.
pub fn canonical_json_bytes<T: Serialize>(value: &T) -> Result<Vec<u8>, WroughtmarkError> {
    let val = serde_json::to_value(value)?;
    let normalized = sort_json_value(val);
    Ok(serde_json::to_vec(&normalized)?)
}

fn sort_json_value(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut entries: Vec<(String, serde_json::Value)> =
                map.into_iter().map(|(k, v)| (k, sort_json_value(v))).collect();
            entries.sort_by(|a, b| a.0.cmp(&b.0));
            let mut sorted = serde_json::Map::new();
            for (k, v) in entries {
                sorted.insert(k, v);
            }
            serde_json::Value::Object(sorted)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.into_iter().map(sort_json_value).collect())
        }
        other => other,
    }
}
