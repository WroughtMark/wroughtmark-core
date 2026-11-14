use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand_core::OsRng;

use crate::error::WroughtmarkError;

/// Ed25519 creator identity keypair with deterministic `wm_key_<base58>` identifier.
pub struct CreatorKey {
    signing_key: SigningKey,
}

impl CreatorKey {
    /// Generate a fresh random Ed25519 creator keypair.
    pub fn generate() -> Self {
        let signing_key = SigningKey::generate(&mut OsRng);
        Self { signing_key }
    }

    /// Reconstruct from 32-byte secret seed.
    pub fn from_seed(seed: [u8; 32]) -> Self {
        Self {
            signing_key: SigningKey::from_bytes(&seed),
        }
    }

    /// Return the 32-byte Ed25519 public key bytes.
    pub fn public_key_bytes(&self) -> [u8; 32] {
        self.signing_key.verifying_key().to_bytes()
    }

    /// Return hex-encoded Ed25519 public key.
    pub fn public_key_hex(&self) -> String {
        hex::encode(self.public_key_bytes())
    }

    /// Return `wm_key_<base58(blake3(pubkey)[0..16])>` per PROTOCOL.md.
    pub fn key_id(&self) -> String {
        key_id_from_pubkey(&self.public_key_bytes())
    }

    /// Sign arbitrary canonical payload bytes and return `ed25519:<hex>`.
    pub fn sign(&self, payload: &[u8]) -> String {
        let sig: Signature = self.signing_key.sign(payload);
        format!("ed25519:{}", hex::encode(sig.to_bytes()))
    }
}

/// Derive `wm_key_<base58>` from raw 32-byte Ed25519 public key.
pub fn key_id_from_pubkey(pubkey: &[u8; 32]) -> String {
    let hash = blake3::hash(pubkey);
    let prefix = &hash.as_bytes()[..16];
    format!("wm_key_{}", bs58::encode(prefix).into_string())
}

/// Verify an `ed25519:<hex>` signature against a hex-encoded 32-byte public key.
pub fn verify_signature(
    pubkey_hex: &str,
    payload: &[u8],
    sig_str: &str,
) -> Result<(), WroughtmarkError> {
    let pk_bytes = hex::decode(pubkey_hex).map_err(|_| WroughtmarkError::InvalidPublicKey)?;
    let pk_arr: [u8; 32] = pk_bytes
        .try_into()
        .map_err(|_| WroughtmarkError::InvalidPublicKey)?;
    let verifying_key =
        VerifyingKey::from_bytes(&pk_arr).map_err(|_| WroughtmarkError::InvalidPublicKey)?;

    let sig_hex = sig_str
        .strip_prefix("ed25519:")
        .ok_or(WroughtmarkError::InvalidSignature)?;
    let sig_bytes = hex::decode(sig_hex).map_err(|_| WroughtmarkError::InvalidSignature)?;
    let sig_arr: [u8; 64] = sig_bytes
        .try_into()
        .map_err(|_| WroughtmarkError::InvalidSignature)?;
    let signature = Signature::from_bytes(&sig_arr);

    verifying_key
        .verify(payload, &signature)
        .map_err(|_| WroughtmarkError::InvalidSignature)
}
