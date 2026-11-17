import {
  appendHeartbeat,
  mintBrowserSeal,
  type BrowserContributorAttestation,
  type BrowserDiscipline,
  type BrowserHeartbeat,
  type BrowserSealSummary,
  type BrowserTelemetryOptions,
} from "../../browser-extension/src/chain";
import type { WroughtmarkSeal } from "./verify";

export type DemoScenarioKind =
  | "clean"
  | "paste"
  | "retype"
  | "chatloop"
  | "hybrid"
  | "spatial"
  | "film"
  | "gitpr"
  | "hitlrubber"
  | "handoff";

export interface DemoSubmissionBundle {
  studentId?: string;
  scenario: string;
  fileName: string;
  fileBase64: string;
  seal: WroughtmarkSeal;
}

interface HeartbeatSpec {
  snapshot: string;
  activeSeconds: number;
  deltaBytes: number;
  pasteBytes: number;
  timestampUtc: string;
  telemetry?: BrowserTelemetryOptions;
}

async function mintScenarioBundle(params: {
  projectId: string;
  discipline: BrowserDiscipline;
  scenario: string;
  fileName: string;
  deliverableText: string;
  studentId?: string;
  coSignedDevices?: string[];
  extraSummary?: Partial<BrowserSealSummary>;
  steps: HeartbeatSpec[];
}): Promise<DemoSubmissionBundle> {
  let beats: BrowserHeartbeat[] = [];
  for (const step of params.steps) {
    beats = await appendHeartbeat(
      beats,
      new TextEncoder().encode(step.snapshot),
      step.activeSeconds,
      step.deltaBytes,
      step.pasteBytes,
      step.timestampUtc,
      step.telemetry
    );
  }
  const bytes = new TextEncoder().encode(params.deliverableText);
  const seal = (await mintBrowserSeal(
    params.projectId,
    beats,
    bytes,
    params.discipline,
    params.coSignedDevices,
    params.extraSummary
  )) as WroughtmarkSeal;

  return {
    studentId: params.studentId,
    scenario: params.scenario,
    fileName: params.fileName,
    fileBase64: Buffer.from(bytes).toString("base64"),
    seal,
  };
}

/** Build a real cryptographically signed preset scenario for interactive console testing. */
export async function buildSingleScenario(
  kind: DemoScenarioKind,
  rustFilmSampler?: () => DemoSubmissionBundle
): Promise<DemoSubmissionBundle> {
  if (kind === "clean") {
    const deliverable = [
      "POLITICAL PHILOSOPHY SEMINAR // ESSAY FINAL DRAFT",
      "Thesis: Deliberative legibility depends on verifiable provenance rather than stylistic profiling.",
      "Revised over three studio sessions across outline, counter-argument integration, and citation audit.",
    ].join("\n\n");

    return mintScenarioBundle({
      projectId: "eng-304-clean-essay",
      discipline: "writing",
      scenario: "CLEAN_MULTI_SESSION_ESSAY",
      fileName: "ENG304_clean_human_essay.txt",
      deliverableText: deliverable,
      steps: [
        {
          snapshot: "outline section 1 thesis claim and reading list",
          activeSeconds: 980,
          deltaBytes: 1420,
          pasteBytes: 0,
          timestampUtc: "2026-11-10T09:15:00.000Z",
        },
        {
          snapshot: "expanded body paragraphs examining Habermas and detector false-positive distributions",
          activeSeconds: 1440,
          deltaBytes: 3890,
          pasteBytes: 96,
          timestampUtc: "2026-11-11T14:22:00.000Z",
        },
        {
          snapshot: deliverable,
          activeSeconds: 1000,
          deltaBytes: 2150,
          pasteBytes: 0,
          timestampUtc: "2026-11-12T19:05:00.000Z",
        },
      ],
    });
  }

  if (kind === "paste") {
    const deliverable =
      "Submitted essay produced in a single sudden 68 KB clipboard drop with almost no editorial revision cadence.";
    return mintScenarioBundle({
      projectId: "eng-304-paste-spike",
      discipline: "writing",
      scenario: "FLAGGED_BULK_PASTE_SPIKE",
      fileName: "ENG304_paste_spike_essay.txt",
      deliverableText: deliverable,
      steps: [
        {
          snapshot: "empty starter doc",
          activeSeconds: 40,
          deltaBytes: 24,
          pasteBytes: 0,
          timestampUtc: "2026-11-12T23:41:00.000Z",
        },
        {
          snapshot: deliverable,
          activeSeconds: 18,
          deltaBytes: 68000,
          pasteBytes: 68000,
          timestampUtc: "2026-11-12T23:42:00.000Z",
        },
      ],
    });
  }

  if (kind === "retype") {
    const deliverable =
      "Submitted essay manually transcribed from a second-screen LLM output with near-zero semantic revision or backtracking.";
    return mintScenarioBundle({
      projectId: "eng-304-split-screen-retype",
      discipline: "writing",
      scenario: "FLAGGED_SPLIT_SCREEN_RETYPING",
      fileName: "ENG304_split_screen_retype.txt",
      deliverableText: deliverable,
      steps: [
        {
          snapshot: "linear transcription pass 1",
          activeSeconds: 420,
          deltaBytes: 1400,
          pasteBytes: 0,
          timestampUtc: "2026-11-13T20:10:00.000Z",
          telemetry: {
            sampled_keystrokes: 1400,
            revision_events: 6,
            keystroke_variance_bps: 640,
          },
        },
        {
          snapshot: deliverable,
          activeSeconds: 380,
          deltaBytes: 1200,
          pasteBytes: 0,
          timestampUtc: "2026-11-13T20:18:00.000Z",
          telemetry: {
            sampled_keystrokes: 1200,
            revision_events: 4,
            keystroke_variance_bps: 910,
          },
        },
      ],
    });
  }

  if (kind === "chatloop") {
    const deliverable =
      "Submitted essay assembled via repeated focus switches to an external AI tab, paragraph micro-pastes, and inline ghost-text completions.";
    return mintScenarioBundle({
      projectId: "eng-304-chat-loop-copilot",
      discipline: "writing",
      scenario: "FLAGGED_CHAT_LOOP_AND_INLINE_AI",
      fileName: "ENG304_chat_loop_copilot.txt",
      deliverableText: deliverable,
      steps: [
        {
          snapshot: "prompt loop 1 and 2 pasted after window focus switch",
          activeSeconds: 310,
          deltaBytes: 1100,
          pasteBytes: 420,
          timestampUtc: "2026-11-13T21:00:00.000Z",
          telemetry: {
            sampled_keystrokes: 380,
            revision_events: 42,
            focus_switch_inserts: 2,
            synthetic_insert_bytes: 260,
          },
        },
        {
          snapshot: deliverable,
          activeSeconds: 290,
          deltaBytes: 950,
          pasteBytes: 380,
          timestampUtc: "2026-11-13T21:06:00.000Z",
          telemetry: {
            sampled_keystrokes: 310,
            revision_events: 35,
            focus_switch_inserts: 2,
            synthetic_insert_bytes: 190,
          },
        },
      ],
    });
  }

  if (kind === "hybrid") {
    const deliverable =
      "Human-authored research synthesis with disclosed inline AI grammar polish and 22% organic editorial revision depth.";
    return mintScenarioBundle({
      projectId: "eng-304-disclosed-hybrid",
      discipline: "writing",
      scenario: "AI_ASSISTED_DISCLOSED_HYBRID",
      fileName: "ENG304_disclosed_hybrid_essay.txt",
      deliverableText: deliverable,
      steps: [
        {
          snapshot: "human argument draft and outline",
          activeSeconds: 920,
          deltaBytes: 1850,
          pasteBytes: 0,
          timestampUtc: "2026-11-13T14:00:00.000Z",
          telemetry: {
            sampled_keystrokes: 1850,
            revision_events: 410,
            ai_disclosed: true,
          },
        },
        {
          snapshot: deliverable,
          activeSeconds: 840,
          deltaBytes: 1620,
          pasteBytes: 180,
          timestampUtc: "2026-11-13T16:30:00.000Z",
          telemetry: {
            sampled_keystrokes: 1440,
            revision_events: 330,
            synthetic_insert_bytes: 620,
            ai_disclosed: true,
          },
        },
      ],
    });
  }

  if (kind === "spatial") {
    const deliverable =
      "Spatial 3D sculpt & studio scene co-signed by Meta Ray-Ban Display 600x600 HUD, Meta Neural Band sEMG pinch, Apple Vision Pro Optic ID, and Meta Quest Horizon OS 6DoF telemetry.";
    return mintScenarioBundle({
      projectId: "xr-spatial-sculpt-and-hud",
      discipline: "visual",
      scenario: "SPATIAL_XR_AND_META_HUD_VERIFIED",
      fileName: "XR_spatial_sculpt_hud_witness.txt",
      deliverableText: deliverable,
      coSignedDevices: [
        "meta-rayban-display-emg",
        "visionos-optic-id",
        "meta-quest-horizon-os",
      ],
      steps: [
        {
          snapshot: "pov studio blocking frame + sEMG neural pinch witness",
          activeSeconds: 780,
          deltaBytes: 2480,
          pasteBytes: 0,
          timestampUtc: "2026-11-15T01:10:00.000Z",
          telemetry: {
            emg_motor_variance_bps: 2680,
            spatial_6dof_entropy_bps: 3420,
          },
        },
        {
          snapshot: deliverable,
          activeSeconds: 940,
          deltaBytes: 3120,
          pasteBytes: 0,
          timestampUtc: "2026-11-15T01:28:00.000Z",
          telemetry: {
            emg_motor_variance_bps: 2740,
            spatial_6dof_entropy_bps: 3580,
          },
        },
      ],
    });
  }

  if (kind === "gitpr") {
    const prDiff = [
      "// Pull Request #418 — Iterative local verification chain",
      "pub fn verify_git_pr_iterations(cycles: u32) -> bool { cycles > 0 }",
    ].join("\n\n");

    return mintScenarioBundle({
      projectId: "repo-core-pr-418",
      discipline: "code",
      scenario: "CLEAN_GIT_PR",
      fileName: "pr_418_verified.rs",
      deliverableText: prDiff,
      coSignedDevices: ["vscode-extension", "git-hook"],
      steps: [
        {
          snapshot: "git diff stage 1 core implementation",
          activeSeconds: 420,
          deltaBytes: 3100,
          pasteBytes: 0,
          timestampUtc: "2026-11-15T01:00:00.000Z",
          telemetry: {
            adapter: "git",
            build_test_cycles: 3,
            sampled_keystrokes: 460,
            revision_events: 92,
          },
        },
        {
          snapshot: "git diff stage 2 regression tests",
          activeSeconds: 360,
          deltaBytes: 2450,
          pasteBytes: 0,
          timestampUtc: "2026-11-15T01:12:00.000Z",
          telemetry: {
            adapter: "git",
            build_test_cycles: 4,
            sampled_keystrokes: 310,
            revision_events: 58,
          },
        },
      ],
    });
  }

  if (kind === "hitlrubber") {
    const packet = [
      "HITL CLINICAL & COMPLIANCE PACKET // 60 PAGES",
      "Signed off 4 seconds after viewer opened without clause navigation or redline annotations.",
    ].join("\n\n");

    return mintScenarioBundle({
      projectId: "hitl-radiology-signoff-88",
      discipline: "review",
      scenario: "RUBBER_STAMP_HITL_REVIEW",
      fileName: "radiology_packet_rubber_stamp.pdf",
      deliverableText: packet,
      coSignedDevices: ["review-viewer"],
      steps: [
        {
          snapshot: "single 4-second sign-off click",
          activeSeconds: 4,
          deltaBytes: 320,
          pasteBytes: 0,
          timestampUtc: "2026-11-15T01:30:00.000Z",
          telemetry: {
            adapter: "inspection",
            viewport_coverage_bps: 1100,
            annotation_events: 0,
          },
        },
      ],
    });
  }

  if (kind === "handoff") {
    const dispatch = [
      "INVESTIGATIVE FIELD DISPATCH // HANDOFF CUSTODY CHAIN",
      "Captured natively on-device by reporter, transferred via signed HandoffReceipt, and redacted by compliance editor.",
    ].join("\n\n");

    const contributors: BrowserContributorAttestation[] = [
      {
        role: "field_journalist",
        creator_key_id: "wm_key_field01",
        creator_pubkey_hex: "01".repeat(32),
        start_seq: 0,
        end_seq: 0,
        stage_output_sha256: `blake3:${"ab".repeat(32)}`,
        stage_sig: `ed25519:${"cd".repeat(64)}`,
      },
      {
        role: "compliance_reviewer",
        creator_key_id: "wm_key_editor02",
        creator_pubkey_hex: "02".repeat(32),
        start_seq: 1,
        end_seq: 1,
        stage_output_sha256: `blake3:${"ef".repeat(32)}`,
        stage_sig: `ed25519:${"12".repeat(64)}`,
      },
    ];

    return mintScenarioBundle({
      projectId: "newsroom-dispatch-09",
      discipline: "review",
      scenario: "MULTI_AUTHOR_HANDOFF",
      fileName: "investigative_dispatch_redacted.txt",
      deliverableText: dispatch,
      coSignedDevices: ["secure-enclave", "touch-id"],
      extraSummary: { contributors },
      steps: [
        {
          snapshot: "field sensor capture stage 0",
          activeSeconds: 320,
          deltaBytes: 4200,
          pasteBytes: 0,
          timestampUtc: "2026-11-15T02:00:00.000Z",
          telemetry: {
            adapter: "physical",
          },
        },
        {
          snapshot: "newsroom redaction & blur compliance review stage 1",
          activeSeconds: 280,
          deltaBytes: 1900,
          pasteBytes: 0,
          timestampUtc: "2026-11-15T02:18:00.000Z",
          telemetry: {
            adapter: "inspection",
            viewport_coverage_bps: 9600,
            annotation_events: 8,
          },
        },
      ],
    });
  }

  if (rustFilmSampler) {
    try {
      return rustFilmSampler();
    } catch {
      // Fall back seamlessly to pure WebCrypto film bundle when native binary is absent.
    }
  }

  const filmText = "Wroughtmark sample deliverable: scored, cut, and mastered by human hands.";
  return mintScenarioBundle({
    projectId: "wroughtmark-sample-reel",
    discipline: "film",
    scenario: "SINGLE_SESSION_REEL",
    fileName: "wroughtmark_sample_reel.txt",
    deliverableText: filmText,
    steps: [
      {
        snapshot: "timeline_v1_human_edit",
        activeSeconds: 2700,
        deltaBytes: 18400,
        pasteBytes: 0,
        timestampUtc: "2026-11-12T16:10:00.000Z",
      },
    ],
  });
}

/** Build a 5-student university assignment cohort with mixed clean and flagged submissions. */
export async function buildCohortDemo(): Promise<{
  assignmentId: string;
  submissions: DemoSubmissionBundle[];
}> {
  const submissions = await Promise.all([
    mintScenarioBundle({
      studentId: "stu_9910",
      projectId: "eng-304-stu-9910",
      discipline: "writing",
      scenario: "FLAGGED_PASTE_SPIKE",
      fileName: "stu_9910_ethics_essay.txt",
      deliverableText: "stu_9910 submission: large overnight clipboard paste prior to deadline.",
      steps: [
        {
          snapshot: "title header",
          activeSeconds: 35,
          deltaBytes: 42,
          pasteBytes: 0,
          timestampUtc: "2026-11-12T23:50:00.000Z",
        },
        {
          snapshot: "full 65kb bulk paste",
          activeSeconds: 15,
          deltaBytes: 65400,
          pasteBytes: 65400,
          timestampUtc: "2026-11-12T23:51:00.000Z",
        },
      ],
    }),
    mintScenarioBundle({
      studentId: "stu_3104",
      projectId: "eng-304-stu-3104",
      discipline: "writing",
      scenario: "FLAGGED_CHAT_LOOP_SHORT_SESSION",
      fileName: "stu_3104_summary.txt",
      deliverableText: "stu_3104 submission: hurried 210s single sitting summary with focus-switch AI pastes.",
      steps: [
        {
          snapshot: "brief draft completed in under four minutes",
          activeSeconds: 210,
          deltaBytes: 1950,
          pasteBytes: 680,
          timestampUtc: "2026-11-12T21:14:00.000Z",
          telemetry: {
            sampled_keystrokes: 600,
            revision_events: 85,
            focus_switch_inserts: 4,
          },
        },
      ],
    }),
    mintScenarioBundle({
      studentId: "stu_7720",
      projectId: "eng-304-stu-7720",
      discipline: "writing",
      scenario: "FLAGGED_SPLIT_SCREEN_RETYPING",
      fileName: "stu_7720_analysis.txt",
      deliverableText: "stu_7720 submission: sustained 45-minute linear transcription from second screen.",
      steps: [
        {
          snapshot: "complete uninterrupted first-pass draft",
          activeSeconds: 2700,
          deltaBytes: 5120,
          pasteBytes: 0,
          timestampUtc: "2026-11-12T15:30:00.000Z",
          telemetry: {
            sampled_keystrokes: 5120,
            revision_events: 14,
          },
        },
      ],
    }),
    mintScenarioBundle({
      studentId: "stu_4821",
      projectId: "eng-304-stu-4821",
      discipline: "writing",
      scenario: "CLEAN_TWO_SESSION",
      fileName: "stu_4821_case_study.txt",
      deliverableText: "stu_4821 submission: two-day drafted empirical case study.",
      steps: [
        {
          snapshot: "session 1 notes and structure",
          activeSeconds: 1620,
          deltaBytes: 2400,
          pasteBytes: 0,
          timestampUtc: "2026-11-10T11:00:00.000Z",
        },
        {
          snapshot: "session 2 synthesis and bibliography",
          activeSeconds: 2100,
          deltaBytes: 3180,
          pasteBytes: 0,
          timestampUtc: "2026-11-11T17:45:00.000Z",
        },
      ],
    }),
    mintScenarioBundle({
      studentId: "stu_1189",
      projectId: "eng-304-stu-1189",
      discipline: "writing",
      scenario: "CLEAN_THREE_SESSION",
      fileName: "stu_1189_dissertation.txt",
      deliverableText: "stu_1189 submission: multi-day peer-reviewed dissertation chapter.",
      steps: [
        {
          snapshot: "chapter 1 thesis hypothesis",
          activeSeconds: 1800,
          deltaBytes: 2210,
          pasteBytes: 0,
          timestampUtc: "2026-11-09T10:00:00.000Z",
        },
        {
          snapshot: "chapter 1 literature review expansion",
          activeSeconds: 2640,
          deltaBytes: 4050,
          pasteBytes: 120,
          timestampUtc: "2026-11-10T16:20:00.000Z",
        },
        {
          snapshot: "chapter 1 final copyedit",
          activeSeconds: 1320,
          deltaBytes: 1490,
          pasteBytes: 0,
          timestampUtc: "2026-11-12T08:45:00.000Z",
        },
      ],
    }),
  ]);

  submissions.sort((a, b) => a.seal.summary.process_score - b.seal.summary.process_score);
  return { assignmentId: "CANVAS-ENG-304", submissions };
}
