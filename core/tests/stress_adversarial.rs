use wroughtmark_core::chain::{AdapterKind, Discipline, ProcessChain, ProcessMetrics};
use wroughtmark_core::identity::CreatorKey;
use wroughtmark_core::seal::{build_dossier, verify_seal, WroughtmarkSeal};

#[test]
fn five_hundred_event_chain_mints_verifies_and_builds_dossier() {
    let key = CreatorKey::from_seed([77u8; 32]);
    let mut chain = ProcessChain::new("novel-500-sessions");

    for i in 0..500u64 {
        let content = format!("chapter draft revision {i}");
        chain
            .record_event(
                &key,
                format!("2026-11-13T01:{:02}:{:02}Z", (i / 60) % 60, i % 60),
                AdapterKind::Text,
                ProcessMetrics {
                    active_seconds: 120,
                    delta_bytes: 320,
                    entropy_score: 0.9,
                    structural_units: 4,
                },
                content.as_bytes(),
            )
            .unwrap();
    }

    let final_bytes = b"published_novel_manuscript_v1";
    let seal = WroughtmarkSeal::mint(
        &key,
        &chain,
        Discipline::Writing,
        final_bytes,
        vec!["macbook".into(), "apple-watch".into()],
    )
    .unwrap();

    assert_eq!(seal.payload.summary.session_count, 500);
    assert_eq!(seal.payload.summary.process_score, 100);
    assert!(seal.payload.summary.anomaly_flags.is_empty());

    let report = build_dossier(final_bytes, &seal, Some(&chain.events)).unwrap();
    assert_eq!(report.timeline.len(), 500);
    assert!(report.timeline_verified);
}

#[test]
fn rejects_tampered_score_and_forged_pubkey() {
    let key_a = CreatorKey::from_seed([11u8; 32]);
    let key_b = CreatorKey::from_seed([22u8; 32]);

    let mut chain = ProcessChain::new("adversarial-test");
    chain
        .record_event(
            &key_a,
            "2026-11-13T00:00:00Z",
            AdapterKind::Text,
            ProcessMetrics {
                active_seconds: 400,
                delta_bytes: 500,
                entropy_score: 0.9,
                structural_units: 3,
            },
            b"draft1",
        )
        .unwrap();

    let final_bytes = b"essay_final";
    let mut seal = WroughtmarkSeal::mint(&key_a, &chain, Discipline::Writing, final_bytes, vec![])
        .unwrap();

    // Tampering with process_score invalidates the Ed25519 signature.
    seal.payload.summary.process_score = 0;
    assert!(verify_seal(final_bytes, &seal, None).is_err());

    // Swapping creator_pubkey_hex to key_b also fails verification.
    seal.payload.summary.process_score = 75;
    seal.payload.creator_pubkey_hex = key_b.public_key_hex();
    assert!(verify_seal(final_bytes, &seal, None).is_err());
}
