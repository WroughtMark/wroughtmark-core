use std::path::Path;

use wroughtmark_core::adapter::inspect_artifact;
use wroughtmark_core::chain::{Discipline, ProcessChain, ProcessMetrics};
use wroughtmark_core::identity::CreatorKey;
use wroughtmark_core::seal::{verify_seal, WroughtmarkSeal};

#[test]
fn end_to_end_multi_discipline_fixtures() {
    let key = CreatorKey::from_seed([42u8; 32]);

    let cases: &[(&str, &[u8], Discipline, u32)] = &[
        (
            "manuscript.md",
            b"# Title\n\nOpening scene.\n\nTurning point.\n",
            Discipline::Writing,
            3,
        ),
        (
            "session.rpp",
            b"<REAPER_PROJECT 0.1\n  <TRACK 'Drums'>\n  <TRACK 'Bass'>\n>",
            Discipline::Music,
            2,
        ),
        (
            "illustration.psd",
            b"8BPS\x00\x018BIMLayerInk8BIMLayerColor",
            Discipline::Visual,
            4,
        ),
        (
            "shortfilm.fcpxml",
            b"<fcpxml><sequence><asset-clip name='A'/><asset-clip name='B'/><asset-clip name='C'/></sequence></fcpxml>",
            Discipline::Film,
            3,
        ),
    ];

    for (filename, sample_bytes, expected_disc, expected_units) in cases {
        let info = inspect_artifact(Path::new(filename), sample_bytes).expect("known extension");
        assert_eq!(info.discipline, *expected_disc);
        assert_eq!(info.structural_units, *expected_units);

        let mut chain = ProcessChain::new(format!("fixture-{filename}"));
        chain
            .record_event(
                &key,
                "2026-11-13T11:20:00Z",
                info.adapter,
                ProcessMetrics {
                    active_seconds: 900,
                    delta_bytes: sample_bytes.len() as u64,
                    entropy_score: info.entropy_score,
                    structural_units: info.structural_units,
                },
                sample_bytes,
            )
            .unwrap();

        let seal = WroughtmarkSeal::mint(
            &key,
            &chain,
            info.discipline,
            sample_bytes,
            vec!["desktop".into()],
        )
        .unwrap();

        assert!(verify_seal(sample_bytes, &seal, Some(&chain.events)).is_ok());
    }
}
