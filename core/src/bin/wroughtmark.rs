use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::path::Path;
use std::process;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use wroughtmark_core::adapter::{classify_path, inspect_artifact};
use wroughtmark_core::blake3_hex;
use wroughtmark_core::chain::{
    AdapterKind, Discipline, ProcessChain, ProcessEvent, ProcessMetrics, ProcessTelemetry,
};
use wroughtmark_core::container::{
    embed_seal_in_container, export_c2pa_assertion_json, extract_and_verify_embedded_seal,
};
use wroughtmark_core::identity::CreatorKey;
use wroughtmark_core::seal::{
    build_dossier, build_usco_manifest, render_dossier_html, verify_seal, WroughtmarkSeal,
};

#[derive(Serialize, Deserialize)]
struct KeyFile {
    key_id: String,
    pubkey_hex: String,
    seed_hex: String,
}

#[derive(Serialize, Deserialize)]
struct ChainFile {
    project_id: String,
    events: Vec<ProcessEvent>,
}

fn now_utc_iso_stub() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("unix:{secs}")
}

fn load_key(path: &str) -> CreatorKey {
    let raw = fs::read_to_string(path).unwrap_or_else(|e| die(&format!("read key {path}: {e}")));
    let kf: KeyFile = serde_json::from_str(&raw).unwrap_or_else(|e| die(&format!("parse key: {e}")));
    let seed_vec = hex::decode(&kf.seed_hex).unwrap_or_else(|e| die(&format!("hex seed: {e}")));
    let seed: [u8; 32] = seed_vec
        .try_into()
        .unwrap_or_else(|_| die("seed must be 32 bytes"));
    CreatorKey::from_seed(seed)
}

fn parse_adapter(s: &str) -> AdapterKind {
    match s {
        "text" => AdapterKind::Text,
        "daw" => AdapterKind::Daw,
        "canvas" => AdapterKind::Canvas,
        "nle" => AdapterKind::Nle,
        "physical" => AdapterKind::Physical,
        "git" => AdapterKind::Git,
        "cad" => AdapterKind::Cad,
        "inspection" => AdapterKind::Inspection,
        _ => die("adapter must be one of: text, daw, canvas, nle, physical, git, cad, inspection"),
    }
}

fn parse_discipline(s: &str) -> Discipline {
    match s {
        "writing" => Discipline::Writing,
        "music" => Discipline::Music,
        "visual" => Discipline::Visual,
        "film" => Discipline::Film,
        "code" => Discipline::Code,
        "science" => Discipline::Science,
        "review" => Discipline::Review,
        _ => die("discipline must be one of: writing, music, visual, film, code, science, review"),
    }
}

fn die(msg: &str) -> ! {
    eprintln!("error: {msg}");
    process::exit(1);
}

fn collect_creative_files(dir: &Path, out: &mut Vec<std::path::PathBuf>) {
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

fn load_or_new_chain(chain_path: &str) -> ProcessChain {
    if let Ok(raw) = fs::read_to_string(chain_path) {
        let cf: ChainFile =
            serde_json::from_str(&raw).unwrap_or_else(|e| die(&format!("parse chain: {e}")));
        ProcessChain {
            project_id: cf.project_id,
            events: cf.events,
        }
    } else {
        ProcessChain::new("wroughtmark-project")
    }
}

fn save_chain(chain_path: &str, chain: &ProcessChain) {
    let out = serde_json::to_string_pretty(&ChainFile {
        project_id: chain.project_id.clone(),
        events: chain.events.clone(),
    })
    .unwrap();
    fs::write(chain_path, out).unwrap_or_else(|e| die(&format!("write chain: {e}")));
}

fn scan_once(
    watch_dir: &Path,
    chain_path: &str,
    key: &CreatorKey,
    seen: &mut BTreeMap<String, String>,
) -> usize {
    let mut files = Vec::new();
    collect_creative_files(watch_dir, &mut files);
    files.sort();

    let mut chain = load_or_new_chain(chain_path);
    let mut recorded = 0usize;

    for file in files {
        let Ok(bytes) = fs::read(&file) else {
            continue;
        };
        let Some(info) = inspect_artifact(&file, &bytes) else {
            continue;
        };
        let digest = blake3_hex(&bytes);
        let key_str = file.to_string_lossy().to_string();
        if seen.get(&key_str).is_some_and(|prev| prev == &digest) {
            continue;
        }
        seen.insert(key_str.clone(), digest);
        let ev = chain
            .record_event(
                key,
                now_utc_iso_stub(),
                info.adapter,
                ProcessMetrics {
                    active_seconds: 60,
                    delta_bytes: bytes.len() as u64,
                    entropy_score: info.entropy_score,
                    structural_units: info.structural_units,
                },
                &bytes,
            )
            .unwrap_or_else(|e| die(&format!("record event: {e}")));
        println!("watched {} -> seq={}", file.display(), ev.body.seq);
        recorded += 1;
    }

    if recorded > 0 {
        save_chain(chain_path, &chain);
    }
    recorded
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        die("usage: wroughtmark <keygen|record|seal|verify> ...");
    }

    match args[1].as_str() {
        "keygen" => {
            if args.len() != 3 {
                die("usage: wroughtmark keygen <out_key.json>");
            }
            let mut seed = [0u8; 32];
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos();
            seed[..16].copy_from_slice(&now.to_le_bytes());
            let key = CreatorKey::from_seed(seed);
            let kf = KeyFile {
                key_id: key.key_id(),
                pubkey_hex: key.public_key_hex(),
                seed_hex: hex::encode(seed),
            };
            let json = serde_json::to_string_pretty(&kf).unwrap();
            fs::write(&args[2], json).unwrap_or_else(|e| die(&format!("write key: {e}")));
            println!("generated {}", kf.key_id);
        }
        "record" => {
            if args.len() < 6 || args.len() > 7 {
                die("usage: wroughtmark record <chain.json> <key.json> <adapter> <artifact_file> [active_seconds]");
            }
            let chain_path = &args[2];
            let key = load_key(&args[3]);
            let adapter = parse_adapter(&args[4]);
            let artifact = fs::read(&args[5]).unwrap_or_else(|e| die(&format!("read artifact: {e}")));
            let active_seconds: u64 = args
                .get(6)
                .and_then(|s| s.parse().ok())
                .unwrap_or(600);

            let mut chain = if let Ok(raw) = fs::read_to_string(chain_path) {
                let cf: ChainFile =
                    serde_json::from_str(&raw).unwrap_or_else(|e| die(&format!("parse chain: {e}")));
                ProcessChain {
                    project_id: cf.project_id,
                    events: cf.events,
                }
            } else {
                ProcessChain::new("wroughtmark-project")
            };

            let ev = chain
                .record_event(
                    &key,
                    now_utc_iso_stub(),
                    adapter,
                    ProcessMetrics {
                        active_seconds,
                        delta_bytes: artifact.len() as u64,
                        entropy_score: 0.9,
                        structural_units: 1,
                    },
                    &artifact,
                )
                .unwrap_or_else(|e| die(&format!("record event: {e}")));
            let seq = ev.body.seq;

            let out = serde_json::to_string_pretty(&ChainFile {
                project_id: chain.project_id,
                events: chain.events,
            })
            .unwrap();
            fs::write(chain_path, out).unwrap_or_else(|e| die(&format!("write chain: {e}")));
            println!("recorded event seq={seq}");
        }
        "seal" => {
            if args.len() != 7 {
                die("usage: wroughtmark seal <chain.json> <key.json> <discipline> <final_file> <out_seal.json>");
            }
            let raw_chain =
                fs::read_to_string(&args[2]).unwrap_or_else(|e| die(&format!("read chain: {e}")));
            let cf: ChainFile =
                serde_json::from_str(&raw_chain).unwrap_or_else(|e| die(&format!("parse chain: {e}")));
            let chain = ProcessChain {
                project_id: cf.project_id,
                events: cf.events,
            };
            let key = load_key(&args[3]);
            let discipline = parse_discipline(&args[4]);
            let final_bytes =
                fs::read(&args[5]).unwrap_or_else(|e| die(&format!("read final file: {e}")));

            let seal = WroughtmarkSeal::mint(
                &key,
                &chain,
                discipline,
                &final_bytes,
                vec!["desktop".into()],
            )
            .unwrap_or_else(|e| die(&format!("mint seal: {e}")));

            let out = serde_json::to_string_pretty(&seal).unwrap();
            fs::write(&args[6], out).unwrap_or_else(|e| die(&format!("write seal: {e}")));
            println!("minted {}", seal.payload.seal_id);
        }
        "verify" => {
            if args.len() < 4 || args.len() > 5 {
                die("usage: wroughtmark verify <final_file> <seal.json> [chain.json]");
            }
            let final_bytes =
                fs::read(&args[2]).unwrap_or_else(|e| die(&format!("read final file: {e}")));
            let raw_seal =
                fs::read_to_string(&args[3]).unwrap_or_else(|e| die(&format!("read seal: {e}")));
            let seal: WroughtmarkSeal =
                serde_json::from_str(&raw_seal).unwrap_or_else(|e| die(&format!("parse seal: {e}")));

            let events = args.get(4).map(|p| {
                let raw_chain =
                    fs::read_to_string(p).unwrap_or_else(|e| die(&format!("read chain: {e}")));
                let cf: ChainFile = serde_json::from_str(&raw_chain)
                    .unwrap_or_else(|e| die(&format!("parse chain: {e}")));
                cf.events
            });

            match verify_seal(&final_bytes, &seal, events.as_deref()) {
                Ok(()) => println!("VERIFIED {}", seal.payload.seal_id),
                Err(e) => die(&format!("verification failed: {e}")),
            }
        }
        "watch" => {
            if args.len() < 5 || args.len() > 6 {
                die("usage: wroughtmark watch <dir> <chain.json> <key.json> [--once]");
            }
            let watch_dir = Path::new(&args[2]);
            let chain_path = &args[3];
            let key = load_key(&args[4]);
            let once = args.get(5).is_some_and(|a| a == "--once");

            let state_path = format!("{chain_path}.state.json");
            let mut seen: BTreeMap<String, String> = fs::read_to_string(&state_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();

            loop {
                let count = scan_once(watch_dir, chain_path, &key, &mut seen);
                if count > 0 {
                    let state_json = serde_json::to_string_pretty(&seen).unwrap();
                    let _ = fs::write(&state_path, state_json);
                }
                if once {
                    break;
                }
                thread::sleep(Duration::from_secs(2));
            }
        }
        "dossier" => {
            if args.len() < 5 || args.len() > 6 {
                die("usage: wroughtmark dossier <final_file> <seal.json> <out.html> [chain.json]");
            }
            let final_bytes =
                fs::read(&args[2]).unwrap_or_else(|e| die(&format!("read final file: {e}")));
            let raw_seal =
                fs::read_to_string(&args[3]).unwrap_or_else(|e| die(&format!("read seal: {e}")));
            let seal: WroughtmarkSeal =
                serde_json::from_str(&raw_seal).unwrap_or_else(|e| die(&format!("parse seal: {e}")));
            let events = args.get(5).map(|p| {
                let raw_chain =
                    fs::read_to_string(p).unwrap_or_else(|e| die(&format!("read chain: {e}")));
                let cf: ChainFile = serde_json::from_str(&raw_chain)
                    .unwrap_or_else(|e| die(&format!("parse chain: {e}")));
                cf.events
            });
            let report = build_dossier(&final_bytes, &seal, events.as_deref())
                .unwrap_or_else(|e| die(&format!("dossier failed: {e}")));
            let html = render_dossier_html(&report);
            fs::write(&args[4], html).unwrap_or_else(|e| die(&format!("write dossier: {e}")));
            println!("DOSSIER {}", args[4]);
        }
        "handoff" => {
            if args.len() < 7 || args.len() > 8 {
                die("usage: wroughtmark handoff <chain.json> <from_key.json> <to_pubkey_hex|none> <role> <artifact> [active_seconds]");
            }
            let chain_path = &args[2];
            let key = load_key(&args[3]);
            let next_pk = if args[4] == "none" || args[4] == "-" {
                None
            } else {
                Some(args[4].clone())
            };
            let role = &args[5];
            let artifact_path = Path::new(&args[6]);
            let artifact =
                fs::read(artifact_path).unwrap_or_else(|e| die(&format!("read artifact: {e}")));
            let active_seconds: u64 = args.get(7).and_then(|s| s.parse().ok()).unwrap_or(300);

            let (adapter, structural_units) = match classify_path(artifact_path) {
                Some((_, a)) => {
                    let units = inspect_artifact(artifact_path, &artifact)
                        .map(|insp| insp.structural_units)
                        .unwrap_or(1);
                    (a, units)
                }
                None => (AdapterKind::Text, 1),
            };

            let mut chain = load_or_new_chain(chain_path);
            let ev = chain
                .record_handoff_event(
                    &key,
                    now_utc_iso_stub(),
                    adapter,
                    ProcessMetrics {
                        active_seconds,
                        delta_bytes: artifact.len() as u64,
                        entropy_score: 0.9,
                        structural_units,
                    },
                    None,
                    None,
                    role,
                    next_pk,
                    &artifact,
                )
                .unwrap_or_else(|e| die(&format!("handoff event: {e}")));
            let seq = ev.body.seq;
            save_chain(chain_path, &chain);
            println!("HANDOFF seq={seq} role={role}");
        }
        "embed" => {
            if args.len() != 5 {
                die("usage: wroughtmark embed <artifact> <seal.json> <out_artifact>");
            }
            let artifact =
                fs::read(&args[2]).unwrap_or_else(|e| die(&format!("read artifact: {e}")));
            let raw_seal =
                fs::read_to_string(&args[3]).unwrap_or_else(|e| die(&format!("read seal: {e}")));
            let seal: WroughtmarkSeal =
                serde_json::from_str(&raw_seal).unwrap_or_else(|e| die(&format!("parse seal: {e}")));
            let embedded = embed_seal_in_container(&artifact, &seal)
                .unwrap_or_else(|e| die(&format!("embed failed: {e}")));
            fs::write(&args[4], embedded)
                .unwrap_or_else(|e| die(&format!("write embedded artifact: {e}")));
            println!("EMBEDDED {} -> {}", seal.payload.seal_id, args[4]);
        }
        "verify-embedded" => {
            if args.len() != 3 {
                die("usage: wroughtmark verify-embedded <artifact>");
            }
            let container =
                fs::read(&args[2]).unwrap_or_else(|e| die(&format!("read artifact: {e}")));
            let (seal, original, kind) = extract_and_verify_embedded_seal(&container)
                .unwrap_or_else(|e| die(&format!("verify-embedded failed: {e}")));
            println!(
                "VERIFIED_EMBEDDED {} ({:?}, {} bytes original)",
                seal.payload.seal_id,
                kind,
                original.len()
            );
        }
        "c2pa-export" => {
            if args.len() != 4 {
                die("usage: wroughtmark c2pa-export <seal.json> <out_assertion.json>");
            }
            let raw_seal =
                fs::read_to_string(&args[2]).unwrap_or_else(|e| die(&format!("read seal: {e}")));
            let seal: WroughtmarkSeal =
                serde_json::from_str(&raw_seal).unwrap_or_else(|e| die(&format!("parse seal: {e}")));
            let assertion_json = export_c2pa_assertion_json(&seal)
                .unwrap_or_else(|e| die(&format!("c2pa-export failed: {e}")));
            fs::write(&args[3], assertion_json)
                .unwrap_or_else(|e| die(&format!("write c2pa assertion: {e}")));
            println!("C2PA_EXPORTED {} -> {}", seal.payload.seal_id, args[3]);
        }
        "usco-manifest" => {
            if args.len() != 5 {
                die("usage: wroughtmark usco-manifest <seal.json> <chain.json> <out_manifest.json>");
            }
            let raw_seal =
                fs::read_to_string(&args[2]).unwrap_or_else(|e| die(&format!("read seal: {e}")));
            let seal: WroughtmarkSeal =
                serde_json::from_str(&raw_seal).unwrap_or_else(|e| die(&format!("parse seal: {e}")));
            let raw_chain =
                fs::read_to_string(&args[3]).unwrap_or_else(|e| die(&format!("read chain: {e}")));
            let cf: ChainFile =
                serde_json::from_str(&raw_chain).unwrap_or_else(|e| die(&format!("parse chain: {e}")));
            let manifest = build_usco_manifest(&seal, &cf.events)
                .unwrap_or_else(|e| die(&format!("usco-manifest failed: {e}")));
            let json = serde_json::to_string_pretty(&manifest).unwrap();
            fs::write(&args[4], json)
                .unwrap_or_else(|e| die(&format!("write manifest: {e}")));
            println!("USCO_MANIFEST {} -> {}", manifest.seal_id, args[4]);
        }
        "git-sign" => {
            if args.len() < 3 {
                die("usage: wroughtmark git-sign <init|record|seal|verify> ...");
            }
            match args[2].as_str() {
                "init" => {
                    if args.len() != 5 {
                        die("usage: wroughtmark git-sign init <repo_dir> <key.json>");
                    }
                    let repo_dir = Path::new(&args[3]);
                    let hooks_dir = repo_dir.join(".git").join("hooks");
                    if !hooks_dir.is_dir() {
                        die("expected existing git repo with .git/hooks directory");
                    }
                    let wm_dir = repo_dir.join(".wroughtmark");
                    fs::create_dir_all(&wm_dir)
                        .unwrap_or_else(|e| die(&format!("create .wroughtmark: {e}")));
                    let chain_file = wm_dir.join("git-chain.json");
                    if !chain_file.exists() {
                        let initial = ProcessChain::new(
                            repo_dir
                                .file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("git-repo"),
                        );
                        save_chain(&chain_file.to_string_lossy(), &initial);
                    }
                    let hook_script = format!(
                        "#!/bin/sh\n# Wroughtmark v0.3 local git provenance hook\nWM_BIN=\"$(command -v wroughtmark || echo wroughtmark)\"\nTOP=\"$(git rev-parse --show-toplevel)\"\ngit diff-tree --no-commit-id --name-status -r HEAD > \"$TOP/.wroughtmark/last-commit.txt\" 2>/dev/null || true\n\"$WM_BIN\" git-sign record \"{}\" \"{}\" \"$TOP/.wroughtmark/last-commit.txt\" 1 >/dev/null 2>&1 || true\n",
                        chain_file.display(),
                        args[4]
                    );
                    let hook_path = hooks_dir.join("post-commit");
                    fs::write(&hook_path, hook_script)
                        .unwrap_or_else(|e| die(&format!("write post-commit hook: {e}")));
                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        let mut perms = fs::metadata(&hook_path).unwrap().permissions();
                        perms.set_mode(0o755);
                        let _ = fs::set_permissions(&hook_path, perms);
                    }
                    println!("GIT_SIGN_INIT {}", hook_path.display());
                }
                "record" => {
                    if args.len() < 6 || args.len() > 8 {
                        die("usage: wroughtmark git-sign record <chain.json> <key.json> <artifact_file> [build_test_cycles] [active_seconds]");
                    }
                    let chain_path = &args[3];
                    let key = load_key(&args[4]);
                    let artifact_path = Path::new(&args[5]);
                    let artifact = fs::read(artifact_path)
                        .unwrap_or_else(|e| die(&format!("read artifact: {e}")));
                    let build_test_cycles: u32 =
                        args.get(6).and_then(|s| s.parse().ok()).unwrap_or(1);
                    let active_seconds: u64 =
                        args.get(7).and_then(|s| s.parse().ok()).unwrap_or(240);
                    let structural_units = inspect_artifact(artifact_path, &artifact)
                        .map(|insp| insp.structural_units)
                        .unwrap_or(1);

                    let mut chain = load_or_new_chain(chain_path);
                    let ev = chain
                        .record_event_with_telemetry(
                            &key,
                            now_utc_iso_stub(),
                            AdapterKind::Git,
                            ProcessMetrics {
                                active_seconds,
                                delta_bytes: artifact.len() as u64,
                                entropy_score: 0.91,
                                structural_units,
                            },
                            ProcessTelemetry {
                                build_test_cycles,
                                ..Default::default()
                            },
                            &artifact,
                        )
                        .unwrap_or_else(|e| die(&format!("git-sign record: {e}")));
                    let seq = ev.body.seq;
                    save_chain(chain_path, &chain);
                    println!("GIT_SIGN_RECORD seq={seq} cycles={build_test_cycles}");
                }
                "seal" => {
                    if args.len() != 7 {
                        die("usage: wroughtmark git-sign seal <chain.json> <key.json> <bundle_file> <out_seal.json>");
                    }
                    let raw_chain = fs::read_to_string(&args[3])
                        .unwrap_or_else(|e| die(&format!("read chain: {e}")));
                    let cf: ChainFile = serde_json::from_str(&raw_chain)
                        .unwrap_or_else(|e| die(&format!("parse chain: {e}")));
                    let chain = ProcessChain {
                        project_id: cf.project_id,
                        events: cf.events,
                    };
                    let key = load_key(&args[4]);
                    let final_bytes = fs::read(&args[5])
                        .unwrap_or_else(|e| die(&format!("read bundle: {e}")));
                    let seal = WroughtmarkSeal::mint(
                        &key,
                        &chain,
                        Discipline::Code,
                        &final_bytes,
                        vec!["git-hook".into()],
                    )
                    .unwrap_or_else(|e| die(&format!("git-sign seal: {e}")));
                    let out = serde_json::to_string_pretty(&seal).unwrap();
                    fs::write(&args[6], out)
                        .unwrap_or_else(|e| die(&format!("write seal: {e}")));
                    println!("GIT_SIGN_SEAL {}", seal.payload.seal_id);
                }
                "verify" => {
                    if args.len() < 5 || args.len() > 6 {
                        die("usage: wroughtmark git-sign verify <bundle_file> <seal.json> [chain.json]");
                    }
                    let final_bytes = fs::read(&args[3])
                        .unwrap_or_else(|e| die(&format!("read bundle: {e}")));
                    let raw_seal = fs::read_to_string(&args[4])
                        .unwrap_or_else(|e| die(&format!("read seal: {e}")));
                    let seal: WroughtmarkSeal = serde_json::from_str(&raw_seal)
                        .unwrap_or_else(|e| die(&format!("parse seal: {e}")));
                    let events = args.get(5).map(|p| {
                        let raw_chain = fs::read_to_string(p)
                            .unwrap_or_else(|e| die(&format!("read chain: {e}")));
                        let cf: ChainFile = serde_json::from_str(&raw_chain)
                            .unwrap_or_else(|e| die(&format!("parse chain: {e}")));
                        cf.events
                    });
                    match verify_seal(&final_bytes, &seal, events.as_deref()) {
                        Ok(()) => println!("GIT_SIGN_VERIFIED {}", seal.payload.seal_id),
                        Err(e) => die(&format!("git-sign verify failed: {e}")),
                    }
                }
                _ => die("git-sign subcommand must be one of: init, record, seal, verify"),
            }
        }
        _ => die(
            "unknown subcommand (expected keygen, record, seal, verify, watch, dossier, handoff, embed, verify-embedded, c2pa-export, usco-manifest, git-sign)",
        ),
    }
}
