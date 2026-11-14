use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use eframe::egui;
use wroughtmark_core::adapter::{classify_path, inspect_artifact};
use wroughtmark_core::blake3_hex;
use wroughtmark_core::chain::{Discipline, ProcessChain, ProcessMetrics};
use wroughtmark_core::identity::CreatorKey;
use wroughtmark_core::seal::{
    analyze_process_chain, build_dossier, render_dossier_html, verify_seal, WroughtmarkSeal,
};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum DesktopTheme {
    Dark,
    Light,
}

impl DesktopTheme {
    fn toggled(self) -> Self {
        match self {
            Self::Dark => Self::Light,
            Self::Light => Self::Dark,
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Dark => "DARK",
            Self::Light => "LIGHT",
        }
    }

    fn tokens(self) -> ThemeTokens {
        match self {
            Self::Dark => ThemeTokens {
                bg: egui::Color32::from_rgb(9, 10, 13),
                surface: egui::Color32::from_rgb(17, 19, 24),
                border: egui::Color32::from_rgb(44, 50, 64),
                ink: egui::Color32::from_rgb(242, 244, 248),
                muted: egui::Color32::from_rgb(161, 168, 182),
                brass: egui::Color32::from_rgb(226, 172, 85),
                emerald: egui::Color32::from_rgb(52, 211, 153),
                crimson: egui::Color32::from_rgb(248, 113, 113),
            },
            Self::Light => ThemeTokens {
                bg: egui::Color32::from_rgb(247, 247, 245),
                surface: egui::Color32::from_rgb(255, 255, 255),
                border: egui::Color32::from_rgb(23, 26, 33),
                ink: egui::Color32::from_rgb(15, 18, 24),
                muted: egui::Color32::from_rgb(73, 80, 94),
                brass: egui::Color32::from_rgb(157, 102, 22),
                emerald: egui::Color32::from_rgb(15, 110, 67),
                crimson: egui::Color32::from_rgb(185, 28, 28),
            },
        }
    }
}

struct ThemeTokens {
    bg: egui::Color32,
    surface: egui::Color32,
    border: egui::Color32,
    ink: egui::Color32,
    muted: egui::Color32,
    brass: egui::Color32,
    emerald: egui::Color32,
    crimson: egui::Color32,
}

struct DesktopSession {
    key: CreatorKey,
    chain: ProcessChain,
    seen_hashes: BTreeMap<PathBuf, String>,
    watched_dir: Option<PathBuf>,
    discipline: Discipline,
    is_watching: bool,
    status_line: String,
    status_ok: Option<bool>,
    last_scan: Instant,
}

impl DesktopSession {
    fn new() -> Self {
        Self {
            key: CreatorKey::generate(),
            chain: ProcessChain::new("wroughtmark-desktop-session"),
            seen_hashes: BTreeMap::new(),
            watched_dir: None,
            discipline: Discipline::Music,
            is_watching: false,
            status_line: "Idle. Select a project folder to begin.".into(),
            status_ok: None,
            last_scan: Instant::now(),
        }
    }

    fn scan_dir(&mut self) -> usize {
        let Some(dir) = self.watched_dir.clone() else {
            return 0;
        };
        let mut files = Vec::new();
        collect_creative_files(&dir, &mut files);
        files.sort();

        let secs = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let mut added = 0;
        for path in files {
            let Ok(bytes) = fs::read(&path) else {
                continue;
            };
            let Some(info) = inspect_artifact(&path, &bytes) else {
                continue;
            };
            let digest = blake3_hex(&bytes);
            if self.seen_hashes.get(&path).is_some_and(|prev| prev == &digest) {
                continue;
            }
            self.seen_hashes.insert(path.clone(), digest);
            if self
                .chain
                .record_event(
                    &self.key,
                    format!("unix:{secs}"),
                    info.adapter,
                    ProcessMetrics {
                        active_seconds: 60,
                        delta_bytes: bytes.len() as u64,
                        entropy_score: info.entropy_score,
                        structural_units: info.structural_units,
                    },
                    &bytes,
                )
                .is_ok()
            {
                added += 1;
            }
        }
        if added > 0 {
            self.status_line = format!("Recorded {added} new process heartbeat(s).");
            self.status_ok = Some(true);
        }
        added
    }

    fn mint_seal_for_bytes(&self, final_bytes: &[u8]) -> Result<WroughtmarkSeal, String> {
        WroughtmarkSeal::mint(
            &self.key,
            &self.chain,
            self.discipline,
            final_bytes,
            vec!["desktop".into()],
        )
        .map_err(|e| e.to_string())
    }

    fn export_dossier_html_for_bytes(&self, final_bytes: &[u8]) -> Result<(String, String), String> {
        let seal = self.mint_seal_for_bytes(final_bytes)?;
        let report = build_dossier(final_bytes, &seal, Some(&self.chain.events))
            .map_err(|e| e.to_string())?;
        Ok((seal.payload.seal_id, render_dossier_html(&report)))
    }

    fn current_score_badge(&self) -> (u8, String) {
        let (score, flags) = analyze_process_chain(&self.chain.events);
        let flag_text = if flags.is_empty() {
            "CLEAN".to_string()
        } else {
            flags.join(", ")
        };
        (score, flag_text)
    }
}

fn collect_creative_files(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if !name.starts_with('.') && name != "target" && name != "node_modules" {
                collect_creative_files(&path, out);
            }
        } else if classify_path(&path).is_some() {
            out.push(path);
        }
    }
}

struct WroughtmarkDesktopApp {
    session: DesktopSession,
    theme: DesktopTheme,
}

impl WroughtmarkDesktopApp {
    fn apply_theme(ctx: &egui::Context, theme: DesktopTheme) {
        let t = theme.tokens();
        let mut visuals = match theme {
            DesktopTheme::Dark => egui::Visuals::dark(),
            DesktopTheme::Light => egui::Visuals::light(),
        };
        visuals.panel_fill = t.bg;
        visuals.window_fill = t.surface;
        visuals.extreme_bg_color = t.surface;
        visuals.override_text_color = Some(t.ink);
        visuals.widgets.noninteractive.bg_fill = t.surface;
        visuals.widgets.noninteractive.bg_stroke = egui::Stroke::new(1.0_f32, t.border);
        visuals.widgets.noninteractive.rounding = egui::Rounding::ZERO;
        visuals.widgets.inactive.bg_fill = t.surface;
        visuals.widgets.inactive.bg_stroke = egui::Stroke::new(1.0_f32, t.border);
        visuals.widgets.inactive.rounding = egui::Rounding::ZERO;
        visuals.widgets.hovered.bg_stroke = egui::Stroke::new(1.0_f32, t.brass);
        visuals.widgets.hovered.rounding = egui::Rounding::ZERO;
        visuals.widgets.active.bg_stroke = egui::Stroke::new(1.0_f32, t.brass);
        visuals.widgets.active.rounding = egui::Rounding::ZERO;
        ctx.set_visuals(visuals);
    }

    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        let theme = DesktopTheme::Dark;
        Self::apply_theme(&cc.egui_ctx, theme);
        Self {
            session: DesktopSession::new(),
            theme,
        }
    }
}

impl eframe::App for WroughtmarkDesktopApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        if self.session.is_watching && self.session.last_scan.elapsed() >= Duration::from_secs(2) {
            self.session.scan_dir();
            self.session.last_scan = Instant::now();
            ctx.request_repaint_after(Duration::from_secs(2));
        }

        let t = self.theme.tokens();

        egui::CentralPanel::default().show(ctx, |ui| {
            ui.add_space(8.0);
            ui.horizontal(|ui| {
                ui.colored_label(t.brass, egui::RichText::new("WROUGHTMARK // ASSAY").strong().size(18.0));
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui.button(self.theme.label()).clicked() {
                        self.theme = self.theme.toggled();
                        Self::apply_theme(ctx, self.theme);
                    }
                    let (badge, color) = if self.session.is_watching {
                        ("ACTIVE", t.emerald)
                    } else {
                        ("IDLE", t.muted)
                    };
                    ui.colored_label(color, egui::RichText::new(badge).monospace().size(12.0));
                });
            });

            ui.colored_label(t.muted, format!("Key ID: {}", self.session.key.key_id()));
            if !self.session.chain.events.is_empty() {
                let (score, flags) = self.session.current_score_badge();
                ui.colored_label(
                    t.brass,
                    format!(
                        "Chain: {} event(s) | Score: {score}/100 ({flags})",
                        self.session.chain.events.len()
                    ),
                );
            }
            ui.add_space(10.0);
            ui.separator();
            ui.add_space(10.0);

            ui.label("Discipline");
            ui.horizontal(|ui| {
                ui.selectable_value(&mut self.session.discipline, Discipline::Writing, "Writing");
                ui.selectable_value(&mut self.session.discipline, Discipline::Music, "Music");
                ui.selectable_value(&mut self.session.discipline, Discipline::Visual, "Visual");
                ui.selectable_value(&mut self.session.discipline, Discipline::Film, "Film");
            });

            ui.add_space(10.0);
            let folder_label = self
                .session
                .watched_dir
                .as_ref()
                .map(|p| p.display().to_string())
                .unwrap_or_else(|| "No folder selected".into());
            ui.colored_label(t.muted, format!("Folder: {folder_label}"));
            ui.colored_label(
                t.brass,
                format!("Recorded Heartbeats: {}", self.session.chain.events.len()),
            );

            ui.add_space(14.0);
            ui.horizontal(|ui| {
                if ui.button("Select Project Folder...").clicked() {
                    if let Some(dir) = rfd::FileDialog::new().pick_folder() {
                        self.session.watched_dir = Some(dir.clone());
                        self.session.status_line = format!("Ready: {}", dir.display());
                        self.session.status_ok = None;
                    }
                }

                let watch_label = if self.session.is_watching {
                    "Pause Watching"
                } else {
                    "Start Watching"
                };
                if ui.button(watch_label).clicked() {
                    if self.session.watched_dir.is_none() {
                        self.session.status_line = "Select a project folder first.".into();
                        self.session.status_ok = Some(false);
                    } else {
                        self.session.is_watching = !self.session.is_watching;
                        if self.session.is_watching {
                            self.session.scan_dir();
                            self.session.last_scan = Instant::now();
                        }
                    }
                }
            });

            ui.add_space(8.0);
            ui.horizontal(|ui| {
                if ui.button("Mint Seal for Export...").clicked() {
                    if let Some(file) = rfd::FileDialog::new().pick_file() {
                        match fs::read(&file)
                            .map_err(|e| e.to_string())
                            .and_then(|bytes| self.session.mint_seal_for_bytes(&bytes))
                        {
                            Ok(seal) => {
                                let out_path = file.with_extension("seal.json");
                                let json = serde_json::to_string_pretty(&seal).unwrap_or_default();
                                let _ = fs::write(&out_path, json);
                                self.session.status_line =
                                    format!("Minted {}", seal.payload.seal_id);
                                self.session.status_ok = Some(true);
                            }
                            Err(err) => {
                                self.session.status_line = format!("Mint failed: {err}");
                                self.session.status_ok = Some(false);
                            }
                        }
                    }
                }

                if ui.button("Verify Deliverable + Seal...").clicked() {
                    if let Some(file) = rfd::FileDialog::new().pick_file() {
                        if let Some(seal_file) = rfd::FileDialog::new()
                            .add_filter("Wroughtmark Seal", &["json"])
                            .pick_file()
                        {
                            let ok = fs::read(&file).ok().zip(fs::read_to_string(&seal_file).ok());
                            if let Some((bytes, raw_seal)) = ok {
                                match serde_json::from_str::<WroughtmarkSeal>(&raw_seal)
                                    .map_err(|e| e.to_string())
                                    .and_then(|s| {
                                        verify_seal(&bytes, &s, None)
                                            .map(|()| {
                                                let flags = if s.payload.summary.anomaly_flags.is_empty() {
                                                    "CLEAN".to_string()
                                                } else {
                                                    s.payload.summary.anomaly_flags.join(", ")
                                                };
                                                format!(
                                                    "{} | score {}/100 ({flags})",
                                                    s.payload.seal_id,
                                                    s.payload.summary.process_score
                                                )
                                            })
                                            .map_err(|e| e.to_string())
                                    }) {
                                    Ok(summary) => {
                                        self.session.status_line = format!("VERIFIED {summary}");
                                        self.session.status_ok = Some(true);
                                    }
                                    Err(err) => {
                                        self.session.status_line = format!("FAILED: {err}");
                                        self.session.status_ok = Some(false);
                                    }
                                }
                            }
                        }
                    }
                }

                if ui.button("Export Dossier...").clicked() {
                    if let Some(file) = rfd::FileDialog::new().pick_file() {
                        match fs::read(&file)
                            .map_err(|e| e.to_string())
                            .and_then(|bytes| self.session.export_dossier_html_for_bytes(&bytes))
                        {
                            Ok((seal_id, html)) => {
                                if let Some(out) = rfd::FileDialog::new()
                                    .set_file_name(format!("{seal_id}-dossier.html"))
                                    .save_file()
                                {
                                    if fs::write(&out, html).is_ok() {
                                        self.session.status_line = format!("Exported dossier for {seal_id}");
                                        self.session.status_ok = Some(true);
                                    }
                                }
                            }
                            Err(err) => {
                                self.session.status_line = format!("Dossier error: {err}");
                                self.session.status_ok = Some(false);
                            }
                        }
                    }
                }
            });

            ui.add_space(16.0);
            let status_color = match self.session.status_ok {
                Some(true) => t.emerald,
                Some(false) => t.crimson,
                None => t.muted,
            };
            ui.colored_label(status_color, &self.session.status_line);
        });
    }
}

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([460.0, 320.0])
            .with_title("Wroughtmark"),
        ..Default::default()
    };
    eframe::run_native(
        "Wroughtmark",
        options,
        Box::new(|cc| Ok(Box::new(WroughtmarkDesktopApp::new(cc)))),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn desktop_theme_toggles_between_obsidian_dark_and_studio_light() {
        let dark = DesktopTheme::Dark;
        assert_eq!(dark.label(), "DARK");
        assert_eq!(dark.tokens().bg, egui::Color32::from_rgb(9, 10, 13));
        let light = dark.toggled();
        assert_eq!(light.label(), "LIGHT");
        assert_eq!(light.tokens().bg, egui::Color32::from_rgb(247, 247, 245));
    }

    #[test]
    fn desktop_session_scans_mints_and_verifies() {
        let tmp = std::env::temp_dir().join("wm_desktop_test");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();
        fs::write(tmp.join("track.als"), b"ableton_session_v1").unwrap();

        let mut session = DesktopSession::new();
        session.watched_dir = Some(tmp.clone());
        assert_eq!(session.scan_dir(), 1);
        assert_eq!(session.scan_dir(), 0); // unchanged skipped

        let final_wav = b"master_export_wav";
        let seal = session.mint_seal_for_bytes(final_wav).unwrap();
        assert!(verify_seal(final_wav, &seal, Some(&session.chain.events)).is_ok());

        let (dossier_id, html) = session.export_dossier_html_for_bytes(final_wav).unwrap();
        assert_eq!(dossier_id, seal.payload.seal_id);
        assert!(html.contains("VERIFIED HUMAN PROCESS"));

        let _ = fs::remove_dir_all(&tmp);
    }
}
