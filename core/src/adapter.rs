use std::path::Path;

use crate::chain::{AdapterKind, Discipline};

struct ExtensionMapping {
    ext: &'static str,
    discipline: Discipline,
    adapter: AdapterKind,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ArtifactInspection {
    pub discipline: Discipline,
    pub adapter: AdapterKind,
    pub structural_units: u32,
    pub entropy_score: f64,
}

const EXTENSION_MAP: &[ExtensionMapping] = &[
    // Writing
    ExtensionMapping { ext: "md", discipline: Discipline::Writing, adapter: AdapterKind::Text },
    ExtensionMapping { ext: "txt", discipline: Discipline::Writing, adapter: AdapterKind::Text },
    ExtensionMapping { ext: "docx", discipline: Discipline::Writing, adapter: AdapterKind::Text },
    ExtensionMapping { ext: "scriv", discipline: Discipline::Writing, adapter: AdapterKind::Text },
    ExtensionMapping { ext: "tex", discipline: Discipline::Writing, adapter: AdapterKind::Text },
    ExtensionMapping { ext: "rtf", discipline: Discipline::Writing, adapter: AdapterKind::Text },
    // Music / DAW
    ExtensionMapping { ext: "logicx", discipline: Discipline::Music, adapter: AdapterKind::Daw },
    ExtensionMapping { ext: "als", discipline: Discipline::Music, adapter: AdapterKind::Daw },
    ExtensionMapping { ext: "rpp", discipline: Discipline::Music, adapter: AdapterKind::Daw },
    ExtensionMapping { ext: "flp", discipline: Discipline::Music, adapter: AdapterKind::Daw },
    ExtensionMapping { ext: "ptx", discipline: Discipline::Music, adapter: AdapterKind::Daw },
    ExtensionMapping { ext: "wav", discipline: Discipline::Music, adapter: AdapterKind::Daw },
    ExtensionMapping { ext: "aiff", discipline: Discipline::Music, adapter: AdapterKind::Daw },
    // Visual Art / 3D
    ExtensionMapping { ext: "psd", discipline: Discipline::Visual, adapter: AdapterKind::Canvas },
    ExtensionMapping { ext: "procreate", discipline: Discipline::Visual, adapter: AdapterKind::Canvas },
    ExtensionMapping { ext: "clip", discipline: Discipline::Visual, adapter: AdapterKind::Canvas },
    ExtensionMapping { ext: "afdesign", discipline: Discipline::Visual, adapter: AdapterKind::Canvas },
    ExtensionMapping { ext: "kra", discipline: Discipline::Visual, adapter: AdapterKind::Canvas },
    ExtensionMapping { ext: "blend", discipline: Discipline::Visual, adapter: AdapterKind::Canvas },
    ExtensionMapping { ext: "fig", discipline: Discipline::Visual, adapter: AdapterKind::Canvas },
    // Film / NLE
    ExtensionMapping { ext: "drp", discipline: Discipline::Film, adapter: AdapterKind::Nle },
    ExtensionMapping { ext: "prproj", discipline: Discipline::Film, adapter: AdapterKind::Nle },
    ExtensionMapping { ext: "fcpxml", discipline: Discipline::Film, adapter: AdapterKind::Nle },
    ExtensionMapping { ext: "fcpbundle", discipline: Discipline::Film, adapter: AdapterKind::Nle },
    ExtensionMapping { ext: "mov", discipline: Discipline::Film, adapter: AdapterKind::Nle },
    // Code & Scientific Notebooks
    ExtensionMapping { ext: "rs", discipline: Discipline::Code, adapter: AdapterKind::Git },
    ExtensionMapping { ext: "ts", discipline: Discipline::Code, adapter: AdapterKind::Git },
    ExtensionMapping { ext: "tsx", discipline: Discipline::Code, adapter: AdapterKind::Git },
    ExtensionMapping { ext: "py", discipline: Discipline::Code, adapter: AdapterKind::Git },
    ExtensionMapping { ext: "go", discipline: Discipline::Code, adapter: AdapterKind::Git },
    ExtensionMapping { ext: "c", discipline: Discipline::Code, adapter: AdapterKind::Git },
    ExtensionMapping { ext: "cpp", discipline: Discipline::Code, adapter: AdapterKind::Git },
    ExtensionMapping { ext: "ipynb", discipline: Discipline::Science, adapter: AdapterKind::Git },
    // CAD & AEC Engineering
    ExtensionMapping { ext: "step", discipline: Discipline::Science, adapter: AdapterKind::Cad },
    ExtensionMapping { ext: "stp", discipline: Discipline::Science, adapter: AdapterKind::Cad },
    ExtensionMapping { ext: "iges", discipline: Discipline::Science, adapter: AdapterKind::Cad },
    ExtensionMapping { ext: "dxf", discipline: Discipline::Science, adapter: AdapterKind::Cad },
    ExtensionMapping { ext: "ifc", discipline: Discipline::Science, adapter: AdapterKind::Cad },
    ExtensionMapping { ext: "stl", discipline: Discipline::Science, adapter: AdapterKind::Cad },
    // HITL Inspection / Regulated Review
    ExtensionMapping { ext: "pdf", discipline: Discipline::Review, adapter: AdapterKind::Inspection },
    ExtensionMapping { ext: "dcm", discipline: Discipline::Review, adapter: AdapterKind::Inspection },
    ExtensionMapping { ext: "xlsx", discipline: Discipline::Review, adapter: AdapterKind::Inspection },
];

/// Classify a creative project file path into `(Discipline, AdapterKind)` by extension.
pub fn classify_path(path: &Path) -> Option<(Discipline, AdapterKind)> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    EXTENSION_MAP
        .iter()
        .find(|m| m.ext == ext)
        .map(|m| (m.discipline, m.adapter))
}

/// Inspect raw creative file bytes to extract non-invasive structural units and byte entropy.
pub fn inspect_artifact(path: &Path, bytes: &[u8]) -> Option<ArtifactInspection> {
    let (discipline, adapter) = classify_path(path)?;
    let structural_units = count_structural_units(adapter, bytes);
    let entropy_score = shannon_entropy_normalized(bytes);
    Some(ArtifactInspection {
        discipline,
        adapter,
        structural_units,
        entropy_score,
    })
}

fn count_structural_units(adapter: AdapterKind, bytes: &[u8]) -> u32 {
    let text = String::from_utf8_lossy(bytes);
    match adapter {
        AdapterKind::Text => {
            let paragraphs = text.lines().filter(|l| !l.trim().is_empty()).count();
            paragraphs.max(1) as u32
        }
        AdapterKind::Daw => {
            let markers = text.matches("Track").count()
                + text.matches("<TRACK").count()
                + text.matches("data").count().min(1);
            markers.max(1) as u32
        }
        AdapterKind::Canvas => {
            let layers = text.matches("Layer").count() + text.matches("8BIM").count();
            layers.max(1) as u32
        }
        AdapterKind::Nle => {
            let cuts = text.matches("<clip").count()
                + text.matches("<asset-clip").count()
                + text.matches("Timeline").count();
            cuts.max(1) as u32
        }
        AdapterKind::Git => {
            let symbols = text.matches("fn ").count()
                + text.matches("function ").count()
                + text.matches("def ").count()
                + text.matches("\"cell_type\"").count()
                + text.matches("#[test]").count();
            symbols.max(1) as u32
        }
        AdapterKind::Cad => {
            let entities = text.matches('=').count()
                + text.matches("ENTITY").count()
                + text.matches("facet normal").count()
                + text.matches("IFC").count();
            entities.max(1) as u32
        }
        AdapterKind::Inspection => {
            let pages = text.matches("/Page").count()
                + text.matches("DICM").count()
                + text.matches("<sheet").count()
                + text.matches('\n').count();
            pages.max(1) as u32
        }
        AdapterKind::Physical => 1,
    }
}

fn shannon_entropy_normalized(bytes: &[u8]) -> f64 {
    if bytes.is_empty() {
        return 0.0;
    }
    let mut counts = [0u64; 256];
    for &b in bytes {
        counts[b as usize] += 1;
    }
    let len = bytes.len() as f64;
    let mut entropy = 0.0;
    for &c in &counts {
        if c > 0 {
            let p = c as f64 / len;
            entropy -= p * p.log2();
        }
    }
    (entropy / 8.0).clamp(0.0, 1.0)
}

const AI_ASSET_SIGNATURES: &[&str] = &[
    "trainedalgorithmicmedia",
    "c2pa.ai_generated",
    "c2pa.trained_algorithmic_media",
    "midjourney",
    "stable diffusion",
    "automatic1111",
    "comfyui",
    "adobe firefly",
    "dall-e",
    "suno.ai",
    "udio.com",
    "runwayml",
];

/// Scan raw creative artifact bytes for C2PA `trainedAlgorithmicMedia` assertions,
/// PNG/EXIF generator headers, or audio AI generator tags without storing content.
pub fn detect_ai_asset_markers(bytes: &[u8]) -> u16 {
    if bytes.is_empty() {
        return 0;
    }
    let lower = String::from_utf8_lossy(bytes).to_ascii_lowercase();
    let mut count = 0u16;
    for sig in AI_ASSET_SIGNATURES {
        if lower.contains(sig) {
            count = count.saturating_add(1);
        }
    }
    count
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_all_four_disciplines() {
        assert_eq!(
            classify_path(Path::new("chapter1.md")),
            Some((Discipline::Writing, AdapterKind::Text))
        );
        assert_eq!(
            classify_path(Path::new("track.als")),
            Some((Discipline::Music, AdapterKind::Daw))
        );
        assert_eq!(
            classify_path(Path::new("cover.procreate")),
            Some((Discipline::Visual, AdapterKind::Canvas))
        );
        assert_eq!(
            classify_path(Path::new("cut_v3.drp")),
            Some((Discipline::Film, AdapterKind::Nle))
        );
        assert_eq!(
            classify_path(Path::new("lib.rs")),
            Some((Discipline::Code, AdapterKind::Git))
        );
        assert_eq!(
            classify_path(Path::new("chassis.step")),
            Some((Discipline::Science, AdapterKind::Cad))
        );
        assert_eq!(
            classify_path(Path::new("contract.pdf")),
            Some((Discipline::Review, AdapterKind::Inspection))
        );
        assert_eq!(classify_path(Path::new("random.tmp")), None);
    }

    #[test]
    fn inspects_structural_units_without_exposing_content() {
        let md = b"# Chapter 1\n\nFirst paragraph.\n\nSecond paragraph.\n";
        let md_info = inspect_artifact(Path::new("novel.md"), md).unwrap();
        assert_eq!(md_info.structural_units, 3);
        assert!(md_info.entropy_score > 0.0);
        assert_eq!(detect_ai_asset_markers(md), 0);

        let fcpxml = b"<fcpxml><sequence><asset-clip name='A'/><asset-clip name='B'/></sequence></fcpxml>";
        let film_info = inspect_artifact(Path::new("edit.fcpxml"), fcpxml).unwrap();
        assert_eq!(film_info.structural_units, 2);

        let c2pa_ai_layer = b"8BPS\x00\x01c2pa.actions trainedAlgorithmicMedia Adobe Firefly";
        assert_eq!(detect_ai_asset_markers(c2pa_ai_layer), 2);
    }
}
