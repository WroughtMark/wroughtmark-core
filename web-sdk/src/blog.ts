/**
 * Wroughtmark Dispatches — Editorial Articles, Architectural Guides & Policy Analysis
 * High-craft editorial engine styled in Wroughtmark's archival foundry design system.
 */

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  isoDate: string;
  readingTime: string;
  category: "Architecture" | "Guides" | "Legal & Policy" | "Case Studies";
  author: string;
  summary: string;
  body: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-process-provenance-beats-ai-detection",
    title: "The Statistical Impossibility of Post-Hoc AI Detection",
    subtitle: "Why surface-level classifiers fail, punish fluent humans, and how local cryptographic provenance replaces guesswork.",
    date: "November 14, 2026",
    isoDate: "2026-11-14",
    readingTime: "7 min read",
    category: "Architecture",
    author: "Wroughtmark Research",
    summary: "Post-hoc AI detectors analyze finished files without access to draft history. We examine the mathematical and linguistic reasons these probabilistic models fail, and how deterministic client-side process provenance solves the verification dilemma.",
    body: `
<h2>The Detection Dilemma</h2>
<p>Over the past four years, universities, publishing houses, and enterprise engineering teams deployed probabilistic AI detectors under the belief that synthetic text carries a detectable statistical watermark. Empirical benchmarks have decisively demolished this premise.</p>
<p>Modern Large Language Models are explicitly trained on human text corpora to maximize natural phrasing. When a detector evaluates perplexity (word predictability) and burstiness (sentence length variance) on finished prose, it is measuring style, not origin. The consequences are documented and severe:</p>
<ul>
  <li><strong>Non-native English penalization</strong>: Multilingual writers who favor grammatical precision and consistent clause structures are disproportionately misclassified as synthetic.</li>
  <li><strong>Technical prose vulnerability</strong>: Rigorous scientific, legal, and engineering documentation demands predictable terminology and formal structure, triggering false positives on disciplined authors.</li>
  <li><strong>Paraphraser evasion</strong>: Light prompt tuning, synonym injection, or minor human rewriting completely dissolves detector confidence scores.</li>
</ul>

<div class="callout">
  <div class="callout-title">The Fundamental Architectural Flaw</div>
  <p>Inspecting a static file <em>after</em> export arrives too late. Once text is reduced to a flat string of unicode characters, all temporal, physical, and cognitive evidence of how those characters came into existence is erased.</p>
</div>

<h2>Process Provenance: Measuring the Labor, Not the Pixels</h2>
<p>Wroughtmark replaces post-hoc statistical guessing with <strong>client-side process provenance</strong>. Instead of scanning the finished deliverable, Wroughtmark observes the physical drafting timeline on your local workstation as you write, score, or code.</p>

<p>Every keystroke cluster, deletion sequence, and structural reorganization produces an incremental edit heartbeat. These heartbeats are hashed into an append-only merkle delta chain secured by BLAKE3 and signed by your workstation's local Ed25519 asymmetric key pair.</p>

<h2>The Zero-Knowledge Privacy Standard</h2>
<p>Traditional proctoring software and employee monitoring utilities attempt to solve this problem through invasive surveillance: recording screens, capturing webcam feeds, and transmitting raw keystroke logs to centralized servers. This trade-off is unacceptable for privacy-conscious writers, proprietary software developers, and confidential legal drafting.</p>

<p>Wroughtmark operates under a strict <strong>0-Byte Transmission Guarantee</strong>:</p>
<ol>
  <li><strong>No raw text transmission</strong>: Not a single paragraph, sentence, or word of your unpublished work ever leaves your computer.</li>
  <li><strong>No full-text keystroke logging</strong>: Wroughtmark records only temporal intervals, deletion ratios, and cryptographic hashes of delta states.</li>
  <li><strong>Offline verifiable seals</strong>: When you finish your draft, Wroughtmark compiles a standalone <code>.seal.json</code> envelope. Any party can verify your seal's mathematical validity offline without reading your private draft files.</li>
</ol>

<h2>The Shift from Accusation to Proof</h2>
<p>In an environment saturated with generative tooling, demanding that writers "prove they are human" by submitting to faulty probabilistic scanners is backwards. Process provenance equips creators with immutable mathematical receipts of their own craft. When questioned, you do not debate a detector score; you present a cryptographically anchored timeline of your work.</p>
`
  },
  {
    slug: "proving-human-work-guide-for-creators-and-writers",
    title: "Proving Human Craft: A Guide for Authors, Scholars, and Screenwriters",
    subtitle: "How to establish verifiable authorship without invasive surveillance, raw draft uploads, or keystroke loggers.",
    date: "November 12, 2026",
    isoDate: "2026-11-12",
    readingTime: "9 min read",
    category: "Guides",
    author: "Wroughtmark Editorial",
    summary: "A practical guide for novelists, essayists, screenwriters, and academic researchers facing false AI accusations. Learn how behavioral telemetry captures drafting rhythms and how to publish verified authorship seals.",
    body: `
<h2>The New Vulnerability of the Professional Writer</h2>
<p>If you write for a living, you have likely felt the chill of the modern submission process: submitting a 5,000-word chapter or a peer-reviewed paper, only to receive an automated notification stating an AI detector flagged your work with a '48% synthetic likelihood.' Trying to disprove an invisible algorithm using only your final document is an exercise in futility.</p>

<p>Human writing is chaotic, iterative, and deeply rhythmic. We write three paragraphs, delete one, stare at the ceiling for four minutes, rearrange two clauses, and rewrite the opening sentence five times. <em>That struggle is your proof.</em></p>

<h2>How Wroughtmark Records Human Rhythm</h2>
<p>Wroughtmark runs unobtrusively in your system tray on macOS, Windows, or Linux, or as an extension in Microsoft Word, Google Docs, or your browser. As you work, it tracks nine distinct behavioral telemetry vectors:</p>

<table>
  <thead>
    <tr>
      <th>Vector</th>
      <th>Human Signature</th>
      <th>Synthetic / Bulk Signature</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Typing Flight Time</strong></td>
      <td>Variable intervals between letter pairs (cognitive pauses)</td>
      <td>Microsecond flat bursts or steady robotic cadence</td>
    </tr>
    <tr>
      <td><strong>Revision Topology</strong></td>
      <td>Non-linear edits, backtracks, sentence restructurings</td>
      <td>Unidirectional cursor forward movement, zero micro-edits</td>
    </tr>
    <tr>
      <td><strong>Pause Geometry</strong></td>
      <td>Spontaneous 30s to 10-minute thinking breaks</td>
      <td>Uniform paste intervals without contemplation time</td>
    </tr>
    <tr>
      <td><strong>Paste Spike Detection</strong></td>
      <td>Disclosed citations or reference clips with context</td>
      <td>Sudden 2,000-word insertion into empty canvas in 0.2s</td>
    </tr>
    <tr>
      <td><strong>Multi-Session Continuity</strong></td>
      <td>Drafting across hours or days with session handoffs</td>
      <td>Single instant session generating finished manuscript</td>
    </tr>
  </tbody>
</table>

<h2>The Three Authorship Tiers</h2>
<p>Wroughtmark does not operate as a binary pass/fail hammer. It scores work into three transparent tiers based on the depth and integrity of the observed process:</p>

<ul>
  <li><strong>Tier 1 &mdash; Human-Authored (Score &ge; 80/100)</strong>: Characterized by natural inter-keystroke variance, non-linear revision topology, multi-session gestation, and authentic pause geometry.</li>
  <li><strong>Tier 2 &mdash; Disclosed Hybrid AI (Score 50&ndash;79/100)</strong>: Transparent collaboration where an author drafts with AI assistance (e.g. brainstorming, outline generation) but conducts extensive human line-editing, curation, and structural reformulation.</li>
  <li><strong>Tier 3 &mdash; Unverifiable / Synthetic (Score &lt; 50/100)</strong>: Instant bulk insertions, zero observable drafting history, or four-second rubber-stamped edits.</li>
</ul>

<h2>Publishing Your Proof</h2>
<p>When your manuscript is finished, export a Wroughtmark seal alongside your deliverable:</p>
<pre><code># Stamp your document into a cryptographic seal
wroughtmark stamp manuscript.docx --seal manuscript.seal.json

# Extract receipt URL or generate embed badge
wroughtmark verify manuscript.docx --seal manuscript.seal.json</code></pre>

<p>You can embed the dynamic <code>&lt;wroughtmark-badge&gt;</code> on your blog, portfolio, or deliverable cover page. Readers and editors can click the badge to inspect the cryptographic receipt, session counts, and integrity score without ever seeing your private unedited notes.</p>
`
  },
  {
    slug: "verifying-code-authorship-git-supply-chain",
    title: "Stopping Bot Floods in Open Source: Verifying Human Git PRs",
    subtitle: "Protecting repositories, enterprise hiring pipelines, and bug bounties with tamper-evident commit evolution.",
    date: "November 9, 2026",
    isoDate: "2026-11-09",
    readingTime: "8 min read",
    category: "Case Studies",
    author: "Wroughtmark Engineering",
    summary: "Automated coding agents and low-effort prompt spam are overwhelming GitHub maintainers and hiring take-home challenges. Learn how Wroughtmark validates genuine software engineering labor in pull requests.",
    body: `
<h2>The Open-Source Triage Crisis</h2>
<p>Every major open-source repository on GitHub is currently contending with a surge of automated pull requests: AI agents and script-kiddies scraping issue boards, piping bug reports into LLMs, and opening hundreds of pull requests without testing or understanding the codebase. Maintainers spend dozens of hours reviewing code that looks plausible at a glance but contains subtle hallucinated regressions.</p>

<p>Similarly, tech recruitment teams evaluating remote engineering candidates can no longer trust take-home coding submissions: candidates paste prompts into coding assistants and push clean commits within 15 minutes.</p>

<h2>The Anatomy of a Synthetic Git Commit</h2>
<p>Synthetic commits share a common cryptographic and temporal footprint:</p>
<ul>
  <li><strong>Instantaneous commit emergence</strong>: A 500-line complex architectural refactor appears with zero prior micro-commits or local build iterations.</li>
  <li><strong>Four-second rubber-stamping</strong>: Reviewers or contributors accept agent-generated patches in seconds without running tests or inspecting edge cases.</li>
  <li><strong>Missing test iteration</strong>: Real software engineering involves red-green-refactor loops: failing test runs, compile error fixes, and iterative commits.</li>
</ul>

<h2>The Wroughtmark Git Verification Gate</h2>
<p>Wroughtmark integrates directly into GitHub Actions and GitLab CI/CD pipelines via the <code>/api/git/verify-pr</code> endpoint. When a developer works on a feature branch, the Wroughtmark desktop daemon records commit evolution heartbeats:</p>

<pre><code># .github/workflows/wroughtmark-gate.yml
name: Wroughtmark Authorship Gate
on: [pull_request]
jobs:
  verify-provenance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Verify Human Craft
        run: |
          curl -fsSL https://wroughtmark.com/api/git/verify-pr \\
            -H "Content-Type: application/json" \\
            -d "{\\"prNumber\\": \${{ github.event.pull_request.number }}, \\"commits\\": \${{ toJSON(github.event.pull_request.commits) }}}"
</code></pre>

<h2>Differentiating Genuine Engineers from Prompt Spammers</h2>
<p>A senior engineer using AI tooling responsibly does not open prompt-spam PRs. They inspect the output, rewrite functions for performance, add regression tests, and tune architecture over hours of focused iteration. Wroughtmark validates that human labor, awarding Tier 1 or Tier 2 verification while stopping automated zero-effort bot floods at the gate.</p>
`
  },
  {
    slug: "us-copyright-office-ai-disclosure-compliance",
    title: "Human Authorship and the US Copyright Office: The Compliance Playbook",
    subtitle: "Separating human revision from synthetic assistance to protect copyright eligibility under federal registration standards.",
    date: "November 5, 2026",
    isoDate: "2026-11-05",
    readingTime: "11 min read",
    category: "Legal & Policy",
    author: "Wroughtmark Legal Engineering",
    summary: "Federal copyright registration requires creators to disclaim AI-generated elements and prove substantial human selection and arrangement. Here is how Wroughtmark automatically builds court-ready authorship manifests.",
    body: `
<h2>The Federal Legal Landscape</h2>
<p>In March 2023, the United States Copyright Office (USCO) published landmark policy guidance clarifying that works containing material generated by artificial intelligence are only copyrightable to the extent that they contain <strong>sufficient human authorship</strong>. In subsequent decisions (including <em>Zarya of the Dawn</em> and <em>Thaler v. Perlmutter</em>), federal courts reaffirmed a cornerstone principle: <em>copyright law only protects the fruits of human intellectual labor</em>.</p>

<p>When registering a book, film screenplay, software codebase, or musical score that utilized AI in any capacity, applicants are legally required to:</p>
<ol>
  <li>Explicitly disclose the use of generative AI tools.</li>
  <li>Disclaim non-human generated content from copyright protection.</li>
  <li>Document and substantiate the human creator's specific contributions (selection, coordination, and arrangement).</li>
</ol>

<h2>The Proof Gap in Traditional Creative Workflows</h2>
<p>Most creative agencies, game studios, and corporate marketing teams lack any record-keeping system capable of satisfying this standard. If an artist uses Midjourney to brainstorm concept thumbnails, or a copywriter uses Claude to draft introductory headlines, how do they prove to copyright examiners that the final 40,000-word novel or 3D asset pipeline is human-owned?</p>

<p>Without contemporaneous evidence, creators face an unenviable dilemma: risk copyright invalidation by failing to disclose AI tools, or disclaim critical creative assets because they cannot prove where the machine stopped and the human began.</p>

<h2>Automated USCO Manifest Generation</h2>
<p>Wroughtmark resolves this audit challenge by generating cryptographic <strong>USCO Authorship Manifests</strong>. As you work, Wroughtmark tracks both assistive generative imports and subsequent human editorial deltas:</p>

<pre><code>{
  "manifest_standard": "USCO_AI_DISCLOSURE_v1",
  "human_author": "Reginald Crampton",
  "work_title": "Wroughtmark Protocol Specification",
  "total_active_seconds": 18400,
  "human_edit_ratio": 0.94,
  "declared_ai_elements": [
    {
      "model": "claude-3-5-sonnet",
      "purpose": "initial outline brainstorming",
      "timestamp": "2026-11-02T10:14:00Z",
      "disclaimed_tokens": 420
    }
  ],
  "human_selection_evidence": {
    "revision_topology_score": 96.4,
    "line_edits_performed": 1842,
    "blind_time_anchor": "rfc3161_token_sha256_verified"
  }
}</code></pre>

<h2>Securing Intellectual Property Value</h2>
<p>Enterprise acquirers, venture capital investors, and film production insurers increasingly audit IP provenance before closing transactions. A codebase or media library backed by Wroughtmark USCO manifests guarantees clear chain of title and defensible statutory copyright ownership.</p>
`
  },
  {
    slug: "hardware-witnesses-spatial-xr-and-wearables",
    title: "Hardware-Witnessed Provenance: Co-Signing with VisionOS, Meta HUD, and Wearables",
    subtitle: "Binding physical human presence to digital documents via Apple Vision Pro, Meta Ray-Ban Display, and neural bands.",
    date: "October 29, 2026",
    isoDate: "2026-10-29",
    readingTime: "8 min read",
    category: "Architecture",
    author: "Wroughtmark Spatial Lab",
    summary: "Software alone can be simulated. By coupling desktop edit chains with hardware enclave co-signers like Apple Vision Pro, Meta Ray-Ban Display, and smartwatches, Wroughtmark proves physical human focus in physical space.",
    body: `
<h2>The Limits of Workstation Cryptography</h2>
<p>A cryptographic key stored on a workstation proves that a specific machine signed a file. In an era where autonomous cloud agents can simulate mouse movements and generate synthetic keystrokes, workstation software signatures face a ceiling of assurance.</p>

<p>To establish unassailable proof of human presence during creative work, Wroughtmark introduces <strong>Hardware Enclave Co-Signing</strong>.</p>

<h2>The Wearable Witness Matrix</h2>
<p>Wroughtmark companion apps pair locally over encrypted Bluetooth LE or Wi-Fi Direct with the devices you already wear while you work:</p>

<table>
  <thead>
    <tr>
      <th>Platform</th>
      <th>Hardware Telemetry Vector</th>
      <th>Security Guarantee</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Apple Vision Pro</strong></td>
      <td>Optic ID authentication &amp; micro-saccade gaze telemetry</td>
      <td>Secure Enclave hardware co-sign of visual inspection</td>
    </tr>
    <tr>
      <td><strong>Meta Ray-Ban Display</strong></td>
      <td>600&times;600 heads-up display focus &amp; neural sEMG band</td>
      <td>Neuromuscular motor intent captured during drafting</td>
    </tr>
    <tr>
      <td><strong>Apple Watch &amp; Wear OS</strong></td>
      <td>Continuous PPG heart rate &amp; wrist accelerometer tremor</td>
      <td>Biological biometric witness of concurrent physical presence</td>
    </tr>
    <tr>
      <td><strong>Meta Quest &amp; Horizon OS</strong></td>
      <td>6DoF spatial head-pose variance &amp; hand tracking jitter</td>
      <td>Physical space immersion anchor during 3D design and cut</td>
    </tr>
  </tbody>
</table>

<h2>Micro-Tremor and Biometric Proof of Life</h2>
<p>Human hands do not operate like industrial stepper motors. Even the steadiest pianist or diamond cutter exhibits physiological micro-tremor (8&ndash;12 Hz involuntary motor oscillations). When an author types while wearing an Apple Watch or a Meta neural wristband, Wroughtmark correlates the sub-millimeter biometric tremor against the timestamped keystroke arrival on the PC.</p>

<p>An automated script or cloud LLM running in a virtual machine cannot synthesize correlated biometric tremor across a separate physical Bluetooth enclave. The resulting dual-signature seal proves both cognitive effort and physical biological presence.</p>

<h2>RFC 3161 Blind Time-Anchoring</h2>
<p>To prevent retroactive back-dating of drafts, Wroughtmark anchors intermediate session hashes against trusted RFC 3161 timestamping authorities (TSAs). By transmitting only a zero-knowledge hash of the seal envelope, Wroughtmark locks the exact moment your draft existed in time, providing undeniable proof of creation prior to external publishing or competition deadlines.</p>
`
  },
  {
    slug: "getting-started-quickstart-guide",
    title: "Getting Started with Wroughtmark: CLI, Desktop Clients, and Office Suites",
    subtitle: "From zero to verified seal in under five minutes on macOS, Windows, and Linux.",
    date: "October 20, 2026",
    isoDate: "2026-10-20",
    readingTime: "6 min read",
    category: "Guides",
    author: "Wroughtmark Support",
    summary: "Step-by-step instructions for installing Wroughtmark, configuring tracking in Word and Google Docs, running the open-core Rust CLI, and verifying your first cryptographic seal.",
    body: `
<h2>1. Installation</h2>
<p>Wroughtmark is open-core software. Choose the distribution that fits your environment:</p>

<h3>macOS (Apple Silicon &amp; Intel)</h3>
<p>Download the official Apple-notarized package directly from <a href="https://github.com/WroughtMark/wroughtmark-core/releases/latest">GitHub Releases</a> or install via curl:</p>
<pre><code># Quick install script
curl -fsSL https://wroughtmark.com/install.sh | bash

# Or download the notarized DMG
open https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.dmg</code></pre>

<h3>Windows &amp; Linux</h3>
<p>Download the portable binaries with verified SHA-256 checksums from our <a href="/#downloads">Downloads Section</a>:</p>
<ul>
  <li><strong>Windows x64</strong>: <code>wroughtmark-windows-x86_64.zip</code> (portable tray client + CLI)</li>
  <li><strong>Linux x64</strong>: <code>wroughtmark-linux-x86_64.tar.gz</code> (glibc 2.31+ standalone binary)</li>
</ul>

<h2>2. Initialize Your First Project</h2>
<p>Navigate to your writing or coding directory and run:</p>
<pre><code># Generate your local Ed25519 identity key
wroughtmark keygen ~/.wroughtmark/identity.key

# Initialize an append-only provenance chain
wroughtmark init my-novel/ --key ~/.wroughtmark/identity.key</code></pre>

<h2>3. Writing with Office Suite Plugins</h2>
<p>If you write in Microsoft Word or Google Docs, install the official Wroughtmark add-ins included in the <code>wroughtmark-plugins-bundle.zip</code>:</p>
<ul>
  <li><strong>Microsoft Word (Office 365)</strong>: Sideload the Office Add-in manifest. Wroughtmark embeds invisible cryptographic heartbeats directly into the OpenXML custom document properties on every save.</li>
  <li><strong>Google Docs</strong>: Install the Google Workspace companion script to record edit session timestamps to private document metadata.</li>
</ul>

<h2>4. Stamping and Verifying a Deliverable</h2>
<p>When your manuscript, thesis, or contract is ready for submission:</p>
<pre><code># Compile the provenance chain into a standalone seal
wroughtmark seal chain.json ~/.wroughtmark/identity.key writing deliverable.pdf deliverable.seal.json

# Verify the deliverable offline without network access
wroughtmark verify deliverable.pdf --seal deliverable.seal.json</code></pre>

<p>The verification output displays the confirmed authorship tier, total active human working seconds, session breakdown, and cryptographic validity score.</p>
`
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const COMMON_HEAD = `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg?v=3" />
  <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32x32.png?v=3" />
  <link rel="icon" type="image/png" sizes="16x16" href="/brand/favicon-16x16.png?v=3" />
  <link rel="apple-touch-icon" sizes="180x180" href="/brand/apple-touch-icon.png?v=3" />
  <link rel="shortcut icon" href="/favicon.ico?v=3" />
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
`;

const COMMON_CSS = `
  :root {
    --display: "Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif;
    --sans: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  html[data-theme="dark"] {
    color-scheme: dark;
    --bg: #0C0D10;
    --surface: #12151B;
    --surface-hi: #181C24;
    --surface-lo: #08090C;
    --ink: #ECEFF4;
    --ash: #8A92A0;
    --dim: #545B69;
    --rule: #232833;
    --border: #2C3240;
    --brass: #C99738;
    --brass-hi: #E2B75B;
    --verdigris: #34D399;
    --crimson: #F87171;
    --btn-bg: #EAEFF7;
    --btn-ink: #0C0D10;
    --wire-bg: #08090C;
    --wire-ink: #8A92A0;
    --grain-opacity: 0.022;
  }
  html[data-theme="light"] {
    color-scheme: light;
    --bg: #F7F7F5;
    --surface: #FFFFFF;
    --surface-hi: #ECECE9;
    --surface-lo: #F1F2F4;
    --ink: #0F1218;
    --ash: #49505E;
    --dim: #6E7686;
    --rule: #D7DBE3;
    --border: #171A21;
    --brass: #9D6616;
    --brass-hi: #C98B2B;
    --verdigris: #0F6E43;
    --crimson: #B91C1C;
    --btn-bg: #0F1218;
    --btn-ink: #FFFFFF;
    --wire-bg: #0F1218;
    --wire-ink: #A1A8B6;
    --grain-opacity: 0.028;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--sans);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    transition: background 180ms ease, color 180ms ease;
  }
  a { color: inherit; text-decoration: none; }
  a:hover { color: var(--brass); }

  /* Masthead */
  .mast {
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--bg);
    z-index: 60;
    transition: background 180ms ease;
  }
  .mast-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }
  .mast-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--display);
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .mast-brand img {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: block;
    box-shadow: 0 0 0 1px rgba(212, 175, 55, 0.35);
  }
  .mast-links {
    display: flex;
    align-items: center;
    gap: 24px;
    font-family: var(--mono);
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ash);
  }
  .mast-links a.active { color: var(--brass); font-weight: 600; }
  .theme-switch {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 6px 12px;
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    color: var(--ink);
    cursor: pointer;
    border-radius: 4px;
  }

  /* Breadcrumb & Subnav */
  .subnav {
    max-width: 1280px;
    margin: 0 auto;
    padding: 20px 24px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--dim);
  }
  .subnav a:hover { color: var(--brass); }

  /* Hero */
  .editorial-hero {
    max-width: 1280px;
    margin: 0 auto;
    padding: 48px 24px 36px;
    border-bottom: 1px solid var(--border);
  }
  .kicker {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--brass);
    font-weight: 600;
    margin-bottom: 12px;
  }
  h1.page-title {
    font-family: var(--display);
    font-size: clamp(34px, 4.5vw, 56px);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.03em;
    margin: 0 0 16px;
    max-width: 22ch;
  }
  .page-deck {
    font-size: 17px;
    color: var(--ash);
    max-width: 64ch;
    margin: 0;
    line-height: 1.5;
  }

  /* Filter bar */
  .filter-strip {
    max-width: 1280px;
    margin: 0 auto;
    padding: 16px 24px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--rule);
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
  }
  .filter-btn {
    background: transparent;
    border: 1px solid var(--border);
    padding: 6px 14px;
    color: var(--ash);
    cursor: pointer;
    border-radius: 4px;
    transition: all 120ms ease;
  }
  .filter-btn:hover, .filter-btn.active {
    background: var(--surface-hi);
    color: var(--ink);
    border-color: var(--brass);
  }

  /* Grid */
  .articles-grid {
    max-width: 1280px;
    margin: 0 auto;
    padding: 40px 24px 80px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 28px;
  }
  @media (max-width: 640px) {
    .articles-grid { grid-template-columns: 1fr; }
  }
  .article-card {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 28px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 140ms ease, border-color 140ms ease;
  }
  .article-card:hover {
    border-color: var(--brass);
    transform: translateY(-2px);
  }
  .card-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--brass);
    margin-bottom: 14px;
  }
  .card-meta .time { color: var(--dim); }
  .card-title {
    font-family: var(--display);
    font-size: 21px;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.02em;
    margin: 0 0 10px;
    color: var(--ink);
  }
  .card-deck {
    font-size: 14px;
    color: var(--ash);
    line-height: 1.5;
    margin: 0 0 20px;
    flex-grow: 1;
  }
  .card-foot {
    border-top: 1px solid var(--rule);
    padding-top: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--mono);
    font-size: 10.5px;
    color: var(--dim);
  }
  .read-link {
    color: var(--brass);
    font-weight: 600;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  /* Single Article View */
  .article-layout {
    max-width: 820px;
    margin: 0 auto;
    padding: 48px 24px 96px;
  }
  .article-header {
    margin-bottom: 36px;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 28px;
  }
  .article-header h1 {
    font-family: var(--display);
    font-size: clamp(32px, 4vw, 48px);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.03em;
    margin: 12px 0 16px;
  }
  .article-header .deck {
    font-size: 19px;
    line-height: 1.45;
    color: var(--ash);
    margin: 0 0 20px;
  }
  .author-strip {
    display: flex;
    gap: 18px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--dim);
    text-transform: uppercase;
  }
  .author-strip span { color: var(--ink); }

  /* Body Prose */
  .article-content {
    font-size: 16.5px;
    line-height: 1.72;
    color: var(--ink);
  }
  .article-content p { margin: 0 0 22px; }
  .article-content h2 {
    font-family: var(--display);
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 44px 0 16px;
    color: var(--ink);
    border-bottom: 1px solid var(--rule);
    padding-bottom: 8px;
  }
  .article-content h3 {
    font-family: var(--display);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 32px 0 12px;
  }
  .article-content ul, .article-content ol {
    margin: 0 0 24px;
    padding-left: 24px;
  }
  .article-content li { margin-bottom: 8px; }
  .article-content pre {
    background: var(--surface-hi);
    border: 1px solid var(--border);
    padding: 16px 20px;
    overflow-x: auto;
    font-family: var(--mono);
    font-size: 12.5px;
    line-height: 1.5;
    margin: 24px 0;
    border-radius: 4px;
  }
  .article-content code {
    font-family: var(--mono);
    font-size: 0.9em;
    background: var(--surface-hi);
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid var(--rule);
  }
  .article-content pre code {
    background: transparent;
    padding: 0;
    border: none;
  }
  .article-content .callout {
    background: var(--surface);
    border-left: 3px solid var(--brass);
    border-top: 1px solid var(--border);
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: 20px 24px;
    margin: 28px 0;
  }
  .callout-title {
    font-family: var(--display);
    font-weight: 700;
    font-size: 17px;
    color: var(--brass);
    margin-bottom: 6px;
  }
  .callout p { margin: 0; font-size: 15px; color: var(--ash); }
  .article-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 28px 0;
    font-size: 13.5px;
  }
  .article-content th, .article-content td {
    padding: 12px 14px;
    border: 1px solid var(--rule);
    text-align: left;
  }
  .article-content th {
    background: var(--surface-hi);
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink);
  }

  /* Article Footer */
  .article-footer {
    margin-top: 60px;
    border-top: 1px solid var(--border);
    padding-top: 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .btn-outline {
    border: 1px solid var(--border);
    background: transparent;
    padding: 10px 18px;
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    color: var(--ink);
    border-radius: 4px;
  }
  .btn-outline:hover {
    border-color: var(--brass);
    color: var(--brass);
  }
  .btn-solid {
    background: var(--btn-bg);
    color: var(--btn-ink);
    padding: 10px 20px;
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    border-radius: 4px;
  }
  .btn-solid:hover { background: var(--brass); color: #0C0D10; }

  /* Footer */
  .site-footer {
    border-top: 1px solid var(--border);
    padding: 40px 24px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--dim);
    text-align: center;
  }
`;

const COMMON_SCRIPT = `
  <script>
    (function initTheme() {
      var saved = localStorage.getItem('wroughtmark-theme');
      var sys = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
      var theme = saved || sys || 'dark';
      document.documentElement.setAttribute('data-theme', theme);

      var btn = document.getElementById('themeToggleBtn');
      if (btn) {
        btn.textContent = theme === 'dark' ? 'Light Theme' : 'Dark Theme';
        btn.addEventListener('click', function() {
          var cur = document.documentElement.getAttribute('data-theme') || 'dark';
          var next = cur === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          try { localStorage.setItem('wroughtmark-theme', next); } catch(_) {}
          btn.textContent = next === 'dark' ? 'Light Theme' : 'Dark Theme';
        });
      }
    })();
  </script>
`;

export function renderBlogIndexHtml(options?: { theme?: string }): string {
  const initialTheme = options?.theme || "dark";
  const cardsHtml = BLOG_POSTS.map((post) => `
    <article class="article-card" data-category="${escapeHtml(post.category)}">
      <div>
        <div class="card-meta">
          <span>${escapeHtml(post.category)}</span>
          <span class="time">${escapeHtml(post.readingTime)}</span>
        </div>
        <h2 class="card-title"><a href="/blog/${post.slug}">${escapeHtml(post.title)}</a></h2>
        <p class="card-deck">${escapeHtml(post.summary)}</p>
      </div>
      <div class="card-foot">
        <time datetime="${post.isoDate}">${escapeHtml(post.date)}</time>
        <a class="read-link" href="/blog/${post.slug}">Read Article &rarr;</a>
      </div>
    </article>
  `).join("\n");

  return `<!doctype html>
<html lang="en" data-theme="${initialTheme}">
<head>
  <title>Dispatches &amp; Guides — Wroughtmark Kinetic Assay Foundry</title>
  <meta name="description" content="Articles, guides, and architectural explanations on cryptographic process provenance, behavioral AI telemetry, and proving human craft." />
  ${COMMON_HEAD}
  <style>${COMMON_CSS}</style>
</head>
<body>
  <header class="mast">
    <div class="mast-inner">
      <a class="mast-brand" href="/">
        <img src="/brand/wroughtmark-logo-mark.jpg" alt="Wroughtmark Hallmark" />
        <span>Wroughtmark</span>
      </a>
      <nav class="mast-links">
        <a href="/#thesis">Thesis</a>
        <a href="/#downloads">Downloads</a>
        <a href="/#instrument">Console</a>
        <a class="active" href="/blog">Dispatches</a>
        <button id="themeToggleBtn" class="theme-switch" type="button">Theme</button>
      </nav>
    </div>
  </header>

  <main>
    <section class="editorial-hero">
      <div class="kicker">Field Notes &bull; Architecture &bull; Technical Guides</div>
      <h1 class="page-title">Dispatches from the Foundry</h1>
      <p class="page-deck">Explanations of process provenance, behavioral AI assays, zero-upload local cryptography, and practical playbooks for writers, engineers, and scholars proving authentic craft.</p>
    </section>

    <div class="filter-strip" id="filterStrip">
      <button class="filter-btn active" data-filter="all">All (${BLOG_POSTS.length})</button>
      <button class="filter-btn" data-filter="Architecture">Architecture</button>
      <button class="filter-btn" data-filter="Guides">Guides</button>
      <button class="filter-btn" data-filter="Legal &amp; Policy">Legal &amp; Policy</button>
      <button class="filter-btn" data-filter="Case Studies">Case Studies</button>
    </div>

    <section class="articles-grid" id="articlesGrid">
      ${cardsHtml}
    </section>
  </main>

  <footer class="site-footer">
    <p>&copy; 2026 Crampton IT Solutions &bull; Wroughtmark Open Core released under MIT License &bull; 0 Bytes Transmitted &bull; <a href="/">Return to Console</a> &bull; <a href="/blog">Dispatches</a> &bull; <a href="/privacy">Privacy Policy</a> &bull; <a href="/terms">Terms of Use</a></p>
  </footer>

  ${COMMON_SCRIPT}
  <script>
    (function initFilter() {
      var strip = document.getElementById('filterStrip');
      var grid = document.getElementById('articlesGrid');
      if (!strip || !grid) return;
      var cards = grid.querySelectorAll('.article-card');
      strip.addEventListener('click', function(e) {
        var btn = e.target.closest('.filter-btn');
        if (!btn) return;
        strip.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var f = btn.getAttribute('data-filter');
        cards.forEach(function(card) {
          var c = card.getAttribute('data-category');
          if (f === 'all' || f === c) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    })();
  </script>
</body>
</html>`;
}

export function renderBlogPostHtml(slug: string, options?: { theme?: string }): string | null {
  const post = getBlogPost(slug);
  if (!post) return null;
  const initialTheme = options?.theme || "dark";

  return `<!doctype html>
<html lang="en" data-theme="${initialTheme}">
<head>
  <title>${escapeHtml(post.title)} — Wroughtmark</title>
  <meta name="description" content="${escapeHtml(post.summary)}" />
  ${COMMON_HEAD}
  <style>${COMMON_CSS}</style>
</head>
<body>
  <header class="mast">
    <div class="mast-inner">
      <a class="mast-brand" href="/">
        <img src="/brand/wroughtmark-logo-mark.jpg" alt="Wroughtmark Hallmark" />
        <span>Wroughtmark</span>
      </a>
      <nav class="mast-links">
        <a href="/#thesis">Thesis</a>
        <a href="/#downloads">Downloads</a>
        <a href="/#instrument">Console</a>
        <a class="active" href="/blog">Dispatches</a>
        <button id="themeToggleBtn" class="theme-switch" type="button">Theme</button>
      </nav>
    </div>
  </header>

  <div class="subnav">
    <a href="/">Home</a>
    <span>/</span>
    <a href="/blog">Dispatches</a>
    <span>/</span>
    <span>${escapeHtml(post.category)}</span>
  </div>

  <article class="article-layout">
    <header class="article-header">
      <div class="kicker">${escapeHtml(post.category)} &bull; ${escapeHtml(post.readingTime)}</div>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="deck">${escapeHtml(post.subtitle)}</p>
      <div class="author-strip">
        <div>By <span>${escapeHtml(post.author)}</span></div>
        <div>Published <span>${escapeHtml(post.date)}</span></div>
      </div>
    </header>

    <div class="article-content">
      ${post.body}
    </div>

    <footer class="article-footer">
      <a class="btn-outline" href="/blog">&larr; Back to All Dispatches</a>
      <a class="btn-solid" href="/#instrument">Open Assay Console &rarr;</a>
    </footer>
  </article>

  <footer class="site-footer">
    <p>&copy; 2026 Crampton IT Solutions &bull; Wroughtmark Open Core released under MIT License &bull; 0 Bytes Transmitted &bull; <a href="/blog">Dispatches Index</a> &bull; <a href="/privacy">Privacy Policy</a> &bull; <a href="/terms">Terms of Use</a></p>
  </footer>

  ${COMMON_SCRIPT}
</body>
</html>`;
}
