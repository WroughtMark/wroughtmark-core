use serde::{Deserialize, Serialize};

use crate::error::WroughtmarkError;
use crate::identity::verify_signature;
use crate::seal::{verify_seal, WroughtmarkSeal};
use crate::canonical_json_bytes;

const PNG_SIG: [u8; 8] = [0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_IEND: [u8; 12] = [0, 0, 0, 0, b'I', b'E', b'N', b'D', 0xae, 0x42, 0x60, 0x82];
const PNG_ITXT_KEYWORD: &[u8] = b"wroughtmark:seal";

const ENVELOPE_PREFIX: &[u8] = b"\n%%WROUGHTMARK_SEAL_V03:";
const ENVELOPE_SUFFIX: &[u8] = b"%%END_WROUGHTMARK_SEAL";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContainerKind {
    PngItxt,
    WavRiff,
    GenericEnvelope,
}

fn crc32_ieee(chunk_type: &[u8; 4], data: &[u8]) -> u32 {
    let mut crc: u32 = 0xffff_ffff;
    for &b in chunk_type.iter().chain(data.iter()) {
        crc ^= b as u32;
        for _ in 0..8 {
            let mask = (crc & 1).wrapping_neg();
            crc = (crc >> 1) ^ (0xedb8_8320 & mask);
        }
    }
    !crc
}

fn is_valid_png_with_iend(bytes: &[u8]) -> bool {
    bytes.len() >= PNG_SIG.len() + PNG_IEND.len()
        && bytes.starts_with(&PNG_SIG)
        && bytes.ends_with(&PNG_IEND)
}

fn is_valid_wav_riff(bytes: &[u8]) -> bool {
    if bytes.len() < 12 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return false;
    }
    let declared_size = u32::from_le_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]) as usize;
    declared_size.saturating_add(8) == bytes.len()
}

fn find_last_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() || needle.len() > haystack.len() {
        return None;
    }
    haystack
        .windows(needle.len())
        .rposition(|window| window == needle)
}

/// Embed a verified WroughtmarkSeal directly into an artifact container while keeping
/// deterministic pre-seal bytes recoverable for exact SHA-256 verification.
pub fn embed_seal_in_container(
    artifact_bytes: &[u8],
    seal: &WroughtmarkSeal,
) -> Result<Vec<u8>, WroughtmarkError> {
    verify_seal(artifact_bytes, seal, None)?;
    let seal_json = serde_json::to_string(seal)?;

    if is_valid_png_with_iend(artifact_bytes) {
        let mut chunk_data = Vec::with_capacity(PNG_ITXT_KEYWORD.len() + 5 + seal_json.len());
        chunk_data.extend_from_slice(PNG_ITXT_KEYWORD);
        chunk_data.push(0); // Null-terminated keyword
        chunk_data.push(0); // Compression flag (uncompressed)
        chunk_data.push(0); // Compression method
        chunk_data.push(0); // Language tag terminator
        chunk_data.push(0); // Translated keyword terminator
        chunk_data.extend_from_slice(seal_json.as_bytes());

        let chunk_len = u32::try_from(chunk_data.len())
            .map_err(|_| WroughtmarkError::ChainIntegrity("seal too large for PNG iTXt chunk".into()))?;
        let chunk_crc = crc32_ieee(b"iTXt", &chunk_data);

        let split = artifact_bytes.len() - PNG_IEND.len();
        let mut out = Vec::with_capacity(artifact_bytes.len() + 12 + chunk_data.len());
        out.extend_from_slice(&artifact_bytes[..split]);
        out.extend_from_slice(&chunk_len.to_be_bytes());
        out.extend_from_slice(b"iTXt");
        out.extend_from_slice(&chunk_data);
        out.extend_from_slice(&chunk_crc.to_be_bytes());
        out.extend_from_slice(&artifact_bytes[split..]);
        return Ok(out);
    }

    if is_valid_wav_riff(artifact_bytes) {
        let json_bytes = seal_json.as_bytes();
        let raw_len = u32::try_from(json_bytes.len())
            .map_err(|_| WroughtmarkError::ChainIntegrity("seal too large for WAV RIFF chunk".into()))?;
        let pad = json_bytes.len() % 2;
        let added_bytes = 8usize + json_bytes.len() + pad;
        let orig_riff_size = u32::from_le_bytes([
            artifact_bytes[4],
            artifact_bytes[5],
            artifact_bytes[6],
            artifact_bytes[7],
        ]);
        let new_riff_size = orig_riff_size
            .checked_add(u32::try_from(added_bytes).unwrap_or(u32::MAX))
            .ok_or_else(|| WroughtmarkError::ChainIntegrity("WAV RIFF size overflow".into()))?;

        let mut out = Vec::with_capacity(artifact_bytes.len() + added_bytes);
        out.extend_from_slice(artifact_bytes);
        out[4..8].copy_from_slice(&new_riff_size.to_le_bytes());
        out.extend_from_slice(b"WMKS");
        out.extend_from_slice(&raw_len.to_le_bytes());
        out.extend_from_slice(json_bytes);
        if pad == 1 {
            out.push(0);
        }
        return Ok(out);
    }

    let mut out =
        Vec::with_capacity(artifact_bytes.len() + ENVELOPE_PREFIX.len() + seal_json.len() + ENVELOPE_SUFFIX.len());
    out.extend_from_slice(artifact_bytes);
    out.extend_from_slice(ENVELOPE_PREFIX);
    out.extend_from_slice(seal_json.as_bytes());
    out.extend_from_slice(ENVELOPE_SUFFIX);
    Ok(out)
}

fn parse_itxt_wroughtmark_payload(chunk_data: &[u8]) -> Option<&[u8]> {
    let prefix_len = PNG_ITXT_KEYWORD.len() + 1;
    if chunk_data.len() < prefix_len + 4 || !chunk_data.starts_with(PNG_ITXT_KEYWORD) {
        return None;
    }
    if chunk_data[PNG_ITXT_KEYWORD.len()] != 0 {
        return None;
    }
    // Skip compression flag + compression method (2 bytes), then two null-terminated strings.
    let mut pos = prefix_len + 2;
    let lang_end = chunk_data[pos..].iter().position(|&b| b == 0)?;
    pos += lang_end + 1;
    let trans_end = chunk_data[pos..].iter().position(|&b| b == 0)?;
    pos += trans_end + 1;
    Some(&chunk_data[pos..])
}

/// Extract an embedded WroughtmarkSeal from a container file, reconstruct the original pre-seal
/// deliverable bytes, and run full SHA-256 + Ed25519 verification.
pub fn extract_and_verify_embedded_seal(
    container_bytes: &[u8],
) -> Result<(WroughtmarkSeal, Vec<u8>, ContainerKind), WroughtmarkError> {
    if container_bytes.starts_with(&PNG_SIG) {
        let mut pos = PNG_SIG.len();
        while pos + 12 <= container_bytes.len() {
            let chunk_len = u32::from_be_bytes([
                container_bytes[pos],
                container_bytes[pos + 1],
                container_bytes[pos + 2],
                container_bytes[pos + 3],
            ]) as usize;
            let chunk_type: [u8; 4] = [
                container_bytes[pos + 4],
                container_bytes[pos + 5],
                container_bytes[pos + 6],
                container_bytes[pos + 7],
            ];
            let data_start = pos + 8;
            let Some(data_end) = data_start.checked_add(chunk_len) else {
                break;
            };
            let Some(chunk_end) = data_end.checked_add(4) else {
                break;
            };
            if chunk_end > container_bytes.len() {
                break;
            }
            if &chunk_type == b"iTXt" {
                let chunk_data = &container_bytes[data_start..data_end];
                if let Some(json_bytes) = parse_itxt_wroughtmark_payload(chunk_data) {
                    let stored_crc = u32::from_be_bytes([
                        container_bytes[data_end],
                        container_bytes[data_end + 1],
                        container_bytes[data_end + 2],
                        container_bytes[data_end + 3],
                    ]);
                    if crc32_ieee(&chunk_type, chunk_data) != stored_crc {
                        return Err(WroughtmarkError::ChainIntegrity(
                            "corrupted PNG iTXt chunk CRC for wroughtmark:seal".into(),
                        ));
                    }
                    let seal: WroughtmarkSeal = serde_json::from_slice(json_bytes)?;
                    let mut original = Vec::with_capacity(container_bytes.len() - (chunk_end - pos));
                    original.extend_from_slice(&container_bytes[..pos]);
                    original.extend_from_slice(&container_bytes[chunk_end..]);
                    verify_seal(&original, &seal, None)?;
                    return Ok((seal, original, ContainerKind::PngItxt));
                }
            }
            pos = chunk_end;
        }
    }

    if is_valid_wav_riff(container_bytes) {
        let mut pos = 12usize;
        while pos + 8 <= container_bytes.len() {
            let chunk_id = &container_bytes[pos..pos + 4];
            let chunk_len = u32::from_le_bytes([
                container_bytes[pos + 4],
                container_bytes[pos + 5],
                container_bytes[pos + 6],
                container_bytes[pos + 7],
            ]) as usize;
            let data_start = pos + 8;
            let Some(data_end) = data_start.checked_add(chunk_len) else {
                break;
            };
            let pad = chunk_len % 2;
            let Some(chunk_end) = data_end.checked_add(pad) else {
                break;
            };
            if chunk_end > container_bytes.len() {
                break;
            }
            if chunk_id == b"WMKS" {
                let seal: WroughtmarkSeal =
                    serde_json::from_slice(&container_bytes[data_start..data_end])?;
                let removed = chunk_end - pos;
                let mut original = Vec::with_capacity(container_bytes.len() - removed);
                original.extend_from_slice(&container_bytes[..pos]);
                original.extend_from_slice(&container_bytes[chunk_end..]);
                let new_riff_size = u32::try_from(original.len().saturating_sub(8))
                    .map_err(|_| WroughtmarkError::ChainIntegrity("invalid WAV size".into()))?;
                original[4..8].copy_from_slice(&new_riff_size.to_le_bytes());
                verify_seal(&original, &seal, None)?;
                return Ok((seal, original, ContainerKind::WavRiff));
            }
            pos = chunk_end;
        }
    }

    if let Some(start) = find_last_subslice(container_bytes, ENVELOPE_PREFIX) {
        let after_prefix = start + ENVELOPE_PREFIX.len();
        if container_bytes.ends_with(ENVELOPE_SUFFIX)
            && container_bytes.len() >= after_prefix + ENVELOPE_SUFFIX.len()
        {
            let json_end = container_bytes.len() - ENVELOPE_SUFFIX.len();
            let seal: WroughtmarkSeal =
                serde_json::from_slice(&container_bytes[after_prefix..json_end])?;
            let original = container_bytes[..start].to_vec();
            verify_seal(&original, &seal, None)?;
            return Ok((seal, original, ContainerKind::GenericEnvelope));
        }
    }

    Err(WroughtmarkError::ChainIntegrity(
        "no verified Wroughtmark embedded seal found in container".into(),
    ))
}

/// Export a C2PA custom assertion (`c2pa.wroughtmark.process`) JSON payload for a valid seal.
pub fn export_c2pa_assertion_json(seal: &WroughtmarkSeal) -> Result<String, WroughtmarkError> {
    let canonical = canonical_json_bytes(&seal.payload)?;
    verify_signature(
        &seal.payload.creator_pubkey_hex,
        &canonical,
        &seal.creator_sig,
    )?;
    if let Some(ref anchor) = seal.payload.time_anchor {
        anchor.verify(&seal.payload.chain_root)?;
    }

    let assertion = serde_json::json!({
        "label": "c2pa.wroughtmark.process",
        "version": "0.3.0",
        "data": {
            "seal_id": seal.payload.seal_id,
            "project_id": seal.payload.project_id,
            "final_output_sha256": seal.payload.final_output_sha256,
            "chain_root": seal.payload.chain_root,
            "creator_key_id": seal.payload.creator_key_id,
            "creator_pubkey_hex": seal.payload.creator_pubkey_hex,
            "creator_sig": seal.creator_sig,
            "discipline": seal.payload.summary.discipline,
            "authorship_tier": seal.payload.summary.authorship_tier,
            "process_score": seal.payload.summary.process_score,
            "session_count": seal.payload.summary.session_count,
            "total_active_seconds": seal.payload.summary.total_active_seconds,
            "span_start_utc": seal.payload.summary.span_start_utc,
            "span_end_utc": seal.payload.summary.span_end_utc,
            "co_signed_devices": seal.payload.summary.co_signed_devices,
            "anomaly_flags": seal.payload.summary.anomaly_flags,
            "contributors": seal.payload.summary.contributors,
            "time_anchor": seal.payload.time_anchor,
        }
    });

    Ok(serde_json::to_string_pretty(&assertion)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chain::{AdapterKind, Discipline, ProcessChain, ProcessMetrics};
    use crate::identity::CreatorKey;

    fn sample_chain_and_seal(output: &[u8]) -> WroughtmarkSeal {
        let key = CreatorKey::from_seed([81u8; 32]);
        let mut chain = ProcessChain::new("proj-container-01");
        chain
            .record_event(
                &key,
                "2026-11-15T01:00:00Z",
                AdapterKind::Canvas,
                ProcessMetrics {
                    active_seconds: 240,
                    delta_bytes: 1024,
                    entropy_score: 0.9,
                    structural_units: 4,
                },
                b"stroke_v1",
            )
            .unwrap();
        chain
            .record_event(
                &key,
                "2026-11-15T01:06:00Z",
                AdapterKind::Canvas,
                ProcessMetrics {
                    active_seconds: 240,
                    delta_bytes: 2048,
                    entropy_score: 0.92,
                    structural_units: 7,
                },
                b"stroke_v2",
            )
            .unwrap();
        WroughtmarkSeal::mint(
            &key,
            &chain,
            Discipline::Visual,
            output,
            vec!["desktop".into()],
        )
        .unwrap()
    }

    #[test]
    fn png_itxt_embed_extract_and_tamper_detection() {
        let mut png = Vec::new();
        png.extend_from_slice(&PNG_SIG);
        let ihdr_data = [0u8, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0];
        let ihdr_crc = crc32_ieee(b"IHDR", &ihdr_data);
        png.extend_from_slice(&(ihdr_data.len() as u32).to_be_bytes());
        png.extend_from_slice(b"IHDR");
        png.extend_from_slice(&ihdr_data);
        png.extend_from_slice(&ihdr_crc.to_be_bytes());
        png.extend_from_slice(&PNG_IEND);

        let seal = sample_chain_and_seal(&png);
        let embedded = embed_seal_in_container(&png, &seal).unwrap();
        assert!(embedded.starts_with(&PNG_SIG));
        assert!(embedded.ends_with(&PNG_IEND));
        assert!(embedded.len() > png.len());

        let (extracted, reconstructed, kind) =
            extract_and_verify_embedded_seal(&embedded).unwrap();
        assert_eq!(kind, ContainerKind::PngItxt);
        assert_eq!(extracted.payload.seal_id, seal.payload.seal_id);
        assert_eq!(reconstructed, png);

        let mut tampered = embedded.clone();
        tampered[12] ^= 0xff;
        assert!(extract_and_verify_embedded_seal(&tampered).is_err());
    }

    #[test]
    fn wav_riff_and_generic_pdf_envelope_round_trip_and_c2pa_export() {
        // 1. WAV RIFF chunk round-trip
        let sample_data = b"data\x04\x00\x00\x00\x01\x02\x03\x04";
        let total_riff_len = (4 + sample_data.len()) as u32;
        let mut wav = Vec::new();
        wav.extend_from_slice(b"RIFF");
        wav.extend_from_slice(&total_riff_len.to_le_bytes());
        wav.extend_from_slice(b"WAVE");
        wav.extend_from_slice(sample_data);

        let wav_seal = sample_chain_and_seal(&wav);
        let wav_embedded = embed_seal_in_container(&wav, &wav_seal).unwrap();
        let (extracted_wav, recon_wav, wav_kind) =
            extract_and_verify_embedded_seal(&wav_embedded).unwrap();
        assert_eq!(wav_kind, ContainerKind::WavRiff);
        assert_eq!(recon_wav, wav);
        assert_eq!(extracted_wav.payload.seal_id, wav_seal.payload.seal_id);

        // 2. PDF / generic container envelope round-trip
        let pdf = b"%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF";
        let pdf_seal = sample_chain_and_seal(pdf);
        let pdf_embedded = embed_seal_in_container(pdf, &pdf_seal).unwrap();
        let (extracted_pdf, recon_pdf, pdf_kind) =
            extract_and_verify_embedded_seal(&pdf_embedded).unwrap();
        assert_eq!(pdf_kind, ContainerKind::GenericEnvelope);
        assert_eq!(recon_pdf, pdf);
        assert_eq!(extracted_pdf.payload.seal_id, pdf_seal.payload.seal_id);

        // 3. C2PA assertion export
        let c2pa_json = export_c2pa_assertion_json(&pdf_seal).unwrap();
        assert!(c2pa_json.contains("\"c2pa.wroughtmark.process\""));
        assert!(c2pa_json.contains(&pdf_seal.payload.chain_root));
    }
}
