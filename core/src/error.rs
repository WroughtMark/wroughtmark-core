use thiserror::Error;

#[derive(Debug, Error)]
pub enum WroughtmarkError {
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("invalid public key encoding")]
    InvalidPublicKey,

    #[error("invalid signature encoding or verification failed")]
    InvalidSignature,

    #[error("process chain error: {0}")]
    ChainIntegrity(String),

    #[error("output file SHA-256 mismatch: expected {expected}, got {actual}")]
    OutputDigestMismatch { expected: String, actual: String },

    #[error("chain root mismatch: expected {expected}, got {actual}")]
    ChainRootMismatch { expected: String, actual: String },
}
