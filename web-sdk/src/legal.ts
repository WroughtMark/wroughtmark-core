/**
 * Wroughtmark Legal & Compliance — Privacy Policy & Terms of Use
 * Authored for Crampton IT Solutions (New South Wales, Australia).
 */

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
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
    transition: background 180ms ease, color 180ms ease;
  }
  a { color: inherit; text-decoration: none; }
  a:hover { color: var(--brass); }

  /* Masthead */
  .mast {
    border-bottom: 1px solid var(--rule);
    background: var(--surface);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .mast-inner {
    max-width: 1080px;
    margin: 0 auto;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .mast-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--display);
    font-weight: 700;
    font-size: 19px;
    letter-spacing: -0.01em;
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
    gap: 20px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .mast-links a.active {
    color: var(--brass);
    font-weight: 600;
  }
  .theme-switch {
    background: var(--surface-hi);
    border: 1px solid var(--border);
    color: var(--ink);
    padding: 6px 12px;
    font-family: var(--mono);
    font-size: 11px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 120ms ease;
  }
  .theme-switch:hover {
    border-color: var(--brass);
  }

  /* Subnav */
  .subnav {
    max-width: 860px;
    margin: 28px auto 0;
    padding: 0 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--dim);
  }
  .subnav a:hover {
    color: var(--brass);
  }

  /* Document Layout */
  .doc-layout {
    max-width: 860px;
    margin: 20px auto 80px;
    padding: 0 24px;
  }
  .doc-header {
    border-bottom: 1px solid var(--rule);
    padding-bottom: 32px;
    margin-bottom: 40px;
  }
  .kicker {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--brass);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
  }
  h1 {
    font-family: var(--display);
    font-size: 40px;
    line-height: 1.15;
    margin: 0 0 16px;
    letter-spacing: -0.02em;
  }
  .deck {
    font-size: 18px;
    color: var(--ash);
    margin: 0 0 20px;
    line-height: 1.5;
  }
  .meta-strip {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--dim);
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }
  .meta-strip span {
    color: var(--ink);
    font-weight: 500;
  }

  /* Typography */
  .doc-content h2 {
    font-family: var(--display);
    font-size: 24px;
    margin: 40px 0 16px;
    letter-spacing: -0.01em;
    padding-top: 16px;
    border-top: 1px solid var(--rule);
  }
  .doc-content h2:first-of-type {
    border-top: none;
    padding-top: 0;
  }
  .doc-content h3 {
    font-family: var(--display);
    font-size: 18px;
    margin: 24px 0 12px;
  }
  .doc-content p {
    margin: 0 0 16px;
    color: var(--ink);
  }
  .doc-content ul, .doc-content ol {
    margin: 0 0 20px;
    padding-left: 24px;
  }
  .doc-content li {
    margin-bottom: 8px;
  }
  .doc-content strong {
    color: var(--ink);
    font-weight: 600;
  }
  .doc-content code {
    font-family: var(--mono);
    font-size: 13px;
    background: var(--surface-hi);
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid var(--border);
  }

  .callout {
    background: var(--surface);
    border-left: 3px solid var(--brass);
    border-radius: 0 6px 6px 0;
    padding: 18px 22px;
    margin: 24px 0;
    border-top: 1px solid var(--rule);
    border-right: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
  }
  .callout-title {
    font-family: var(--mono);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--brass-hi);
    margin-bottom: 6px;
    font-weight: 600;
  }
  .callout p {
    margin: 0;
    font-size: 14.5px;
    color: var(--ink);
  }

  .doc-footer-nav {
    margin-top: 60px;
    padding-top: 24px;
    border-top: 1px solid var(--rule);
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }
  .btn-outline {
    font-family: var(--mono);
    font-size: 12px;
    border: 1px solid var(--border);
    padding: 10px 16px;
    border-radius: 4px;
    background: var(--surface);
    display: inline-block;
  }
  .btn-outline:hover {
    border-color: var(--brass);
    color: var(--brass);
  }

  /* Footer */
  .site-footer {
    border-top: 1px solid var(--rule);
    padding: 32px 24px;
    text-align: center;
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--dim);
    background: var(--surface-lo);
  }
  .site-footer a {
    color: var(--ash);
  }
  .site-footer a:hover {
    color: var(--brass);
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

export function renderPrivacyPolicyHtml(options?: { theme?: string }): string {
  const initialTheme = options?.theme || "dark";
  return `<!doctype html>
<html lang="en" data-theme="${initialTheme}">
<head>
  <title>Privacy Policy — Wroughtmark Kinetic Assay Foundry</title>
  <meta name="description" content="Privacy Policy for Wroughtmark and Crampton IT Solutions. Detailed explanation of our 0-Byte transmission guarantee and local-first cryptographic architecture." />
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
        <a href="/blog">Dispatches</a>
        <a class="active" href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <button id="themeToggleBtn" class="theme-switch" type="button">Theme</button>
      </nav>
    </div>
  </header>

  <div class="subnav">
    <a href="/">Home</a>
    <span>/</span>
    <span>Legal</span>
    <span>/</span>
    <span>Privacy Policy</span>
  </div>

  <main class="doc-layout">
    <header class="doc-header">
      <div class="kicker">Legal &bull; Crampton IT Solutions &bull; Effective November 15, 2026</div>
      <h1>Privacy Policy</h1>
      <p class="deck">Wroughtmark is engineered under a strict 0-Byte Transmission Guarantee. We believe your unpublished drafts, intellectual property, and keystroke rhythms should never leave your personal workstation.</p>
      <div class="meta-strip">
        <div>Operator: <span>Crampton IT Solutions (NSW, Australia)</span></div>
        <div>Jurisdiction: <span>Australia, GDPR (EU/UK), CCPA (US)</span></div>
        <div>Last Updated: <span>November 15, 2026</span></div>
      </div>
    </header>

    <div class="doc-content">
      <div class="callout">
        <div class="callout-title">The 0-Byte Transmission Guarantee</div>
        <p>Wroughtmark desktop applications, CLI binaries, browser extensions, and office add-ins operate entirely on your local workstation. <strong>Zero bytes of unpublished manuscript text, source code, video edits, audio tracks, or full-text keystroke streams are ever uploaded, transmitted, or inspected by our servers.</strong></p>
      </div>

      <h2>1. About Us and This Policy</h2>
      <p>This Privacy Policy explains how <strong>Crampton IT Solutions</strong> (referred to as "we", "us", or "our"), trading as Wroughtmark, handles personal information when you visit <code>wroughtmark.com</code>, download our open-core desktop or CLI software, use our editor plugins, or interact with our public verification services.</p>
      <p>We operate from New South Wales, Australia, and comply with the Australian Privacy Principles (APPs) set out in the <em>Privacy Act 1988 (Cth)</em>, the EU/UK General Data Protection Regulation (GDPR), and the California Consumer Privacy Act (CCPA/CPRA).</p>

      <h2>2. What We Do NOT Collect (Local-First Processing)</h2>
      <p>Traditional proctoring and surveillance software record screens, capture webcams, and send raw keystrokes to centralized corporate clouds. Wroughtmark was specifically created to reject that intrusive model. On your computer:</p>
      <ul>
        <li><strong>No Draft Text Collection:</strong> We do not receive, store, or index the text or media you create.</li>
        <li><strong>No Keylogging:</strong> Wroughtmark monitors only temporal intervals, deletion ratios, and character count deltas to construct statistical entropy models locally. Raw characters and clipboard contents are never stored or transmitted.</li>
        <li><strong>Local Cryptographic Keys:</strong> Your Ed25519 signing keys and session merkle delta chains are stored locally on your device (in your user profile directory). You alone retain control over your private signing keys.</li>
      </ul>

      <h2>3. Data Processed by Our Web &amp; Public Services</h2>
      <p>When you interact with our website or public cloud APIs, we process minimal operational information:</p>
      <ul>
        <li><strong>Public Seal Registry (<code>/v/:sealId</code>):</strong> If you intentionally choose to publish a seal to the public registry, our server stores the <code>.seal.json</code> envelope. This envelope contains only mathematical metadata: hash digests, process integrity scores, timestamps, co-signing hardware identifiers, and cryptographic signatures. It contains zero raw prose. Anyone with the link can verify this public record.</li>
        <li><strong>Blind TimeAnchor Service (<code>/api/anchor/stamp</code>):</strong> When anchoring a draft timestamp, your client transmits only a cryptographic SHA-256 or BLAKE3 digest of your work. Our witness server cryptographically signs this digest and current UTC wall-clock time without ever receiving or seeing the underlying file.</li>
        <li><strong>Web Server Access Logs:</strong> Like standard web hosts, our servers log incoming HTTP requests (IP address, user-agent, referring URL, timestamp) for security defense, DDoS prevention, and rate limiting. Logs are retained for 30 days and purged automatically.</li>
        <li><strong>Local Cookie Preferences:</strong> We do not deploy third-party advertising or cross-site tracking cookies. We store your explicit cookie preferences locally in your browser's <code>localStorage</code> (<code>wroughtmark-cookie-consent</code>) to honor your settings.</li>
      </ul>

      <h2>4. Legal Bases for Processing (GDPR / International Users)</h2>
      <p>If you are located in the European Economic Area (EEA) or United Kingdom, we process data under the following lawful bases:</p>
      <ul>
        <li><strong>Performance of a Contract:</strong> Providing the verification service, issuing blind time-anchors, and rendering public receipts requested by you.</li>
        <li><strong>Legitimate Interests:</strong> Protecting the integrity and availability of our web infrastructure against spam, bot floods, and denial-of-service attacks.</li>
        <li><strong>Consent:</strong> Storing optional preferences or when you explicitly choose to publish a seal.</li>
      </ul>

      <h2>5. Data Retention &amp; Security</h2>
      <p>Local data remains under your exclusive custody and is deleted whenever you remove the local software or delete your <code>~/.wroughtmark</code> cache. Public registry seals remain accessible until and unless requested for removal by the originating seal holder. All web communications are secured via TLS 1.3 encryption, Caddy reverse-proxy routing, and strict security headers.</p>

      <h2>6. Your Rights</h2>
      <p>Depending on your jurisdiction, you have the following rights:</p>
      <ul>
        <li><strong>Access &amp; Portability:</strong> Request confirmation of what data (if any) we hold regarding your public registry entries.</li>
        <li><strong>Deletion &amp; Erasure:</strong> Request the deletion of any public seal registered under your cryptographic public key.</li>
        <li><strong>Correction:</strong> Update or clarify records associated with your enterprise account.</li>
        <li><strong>Non-Discrimination:</strong> We do not sell or monetize personal information, and you will never face differential treatment for exercising your privacy rights.</li>
      </ul>

      <h2>7. Contact &amp; Grievances</h2>
      <p>For questions regarding this Privacy Policy, or to exercise your rights under Australian or international privacy legislation, please contact:</p>
      <div class="callout">
        <div class="callout-title">Privacy Officer</div>
        <p><strong>Crampton IT Solutions</strong><br />
        Attn: Privacy &amp; Data Governance<br />
        Illawarra, New South Wales, Australia<br />
        Email: <code>privacy@wroughtmark.com</code> or <code>legal@cramptonit.solutions</code></p>
      </div>
    </div>

    <footer class="doc-footer-nav">
      <a class="btn-outline" href="/">&larr; Return to Foundry Home</a>
      <a class="btn-outline" href="/terms">View Terms of Use &rarr;</a>
    </footer>
  </main>

  <footer class="site-footer">
    <p>&copy; 2026 Crampton IT Solutions &bull; Wroughtmark Open Core released under MIT License &bull; 0 Bytes Transmitted &bull; <a href="/">Return to Console</a> &bull; <a href="/blog">Dispatches</a> &bull; <a href="/privacy">Privacy Policy</a> &bull; <a href="/terms">Terms of Use</a></p>
  </footer>

  ${COMMON_SCRIPT}
</body>
</html>`;
}

export function renderTermsOfUseHtml(options?: { theme?: string }): string {
  const initialTheme = options?.theme || "dark";
  return `<!doctype html>
<html lang="en" data-theme="${initialTheme}">
<head>
  <title>Terms of Use — Wroughtmark Kinetic Assay Foundry</title>
  <meta name="description" content="Terms of Use for Wroughtmark software, open-core repositories, client extensions, and hosted verification services provided by Crampton IT Solutions." />
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
        <a href="/blog">Dispatches</a>
        <a href="/privacy">Privacy</a>
        <a class="active" href="/terms">Terms</a>
        <button id="themeToggleBtn" class="theme-switch" type="button">Theme</button>
      </nav>
    </div>
  </header>

  <div class="subnav">
    <a href="/">Home</a>
    <span>/</span>
    <span>Legal</span>
    <span>/</span>
    <span>Terms of Use</span>
  </div>

  <main class="doc-layout">
    <header class="doc-header">
      <div class="kicker">Legal &bull; Crampton IT Solutions &bull; Effective November 15, 2026</div>
      <h1>Terms of Use</h1>
      <p class="deck">Rules and conditions governing the use of Wroughtmark open-core software, desktop clients, suite extensions, and hosted verification services.</p>
      <div class="meta-strip">
        <div>Operator: <span>Crampton IT Solutions (NSW, Australia)</span></div>
        <div>Licensing: <span>MIT License (Software) / Commercial Terms (Hosted Services)</span></div>
        <div>Last Updated: <span>November 15, 2026</span></div>
      </div>
    </header>

    <div class="doc-content">
      <h2>1. Acceptance of Terms</h2>
      <p>By downloading, installing, compiling, or accessing Wroughtmark software, desktop clients, browser extensions, office add-ins, or web services at <code>wroughtmark.com</code>, you enter into a binding agreement with <strong>Crampton IT Solutions</strong> (referred to as "we", "us", or "our"). If you do not agree to these terms, you may not use the services.</p>

      <h2>2. Software Licensing &amp; Dual Architecture</h2>
      <p>Wroughtmark operates under a transparent dual-structure model:</p>
      <ul>
        <li><strong>Open-Core Software:</strong> The source code of the Wroughtmark engine (Rust core binary, macOS background tray, Windows/Linux eframe desktop client, suite plugins, and verification SDK) is licensed under the permissive <a href="https://github.com/WroughtMark/wroughtmark-core/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>. You may freely inspect, modify, and run the open-source code under MIT terms.</li>
        <li><strong>Hosted Services &amp; Infrastructure:</strong> The <code>wroughtmark.com</code> web application, hosted public receipt registry (<code>/v/:sealId</code>), blind TimeAnchor signing service, enterprise LMS bridges, and related cloud APIs are proprietary services operated by Crampton IT Solutions and governed by these Terms of Use.</li>
      </ul>

      <h2>3. Authorship, Ownership &amp; Legal Nature of Seals</h2>
      <div class="callout">
        <div class="callout-title">Important Notice on Authorship Receipts</div>
        <p>A Wroughtmark Seal (<code>.seal.json</code>) is a cryptographic certification of local temporal editing rhythms and hardware enclave telemetry. <strong>It serves as immutable mathematical evidence of process; it does not constitute legal copyright advice, official registration with governmental copyright offices, or a guarantee of commercial outcomes.</strong></p>
      </div>
      <p>You retain 100% of all intellectual property, copyright, and moral rights in the works, manuscripts, codebases, audio projects, and media deliverables you create. Crampton IT Solutions asserts zero ownership over your authored creations.</p>

      <h2>4. Acceptable Use and Integrity Rules</h2>
      <p>To preserve the integrity and evidentiary value of the Wroughtmark provenance network, you agree NOT to:</p>
      <ul>
        <li>Forge, simulate, or artificially alter timestamp telemetry, device co-signing attestations, or cryptographic signatures.</li>
        <li>Deploy automated bots or cadence generators designed to mimic human drafting patterns for the purpose of misleading academic institutions, employers, or regulatory bodies.</li>
        <li>Attempt to interfere with, disrupt, or launch denial-of-service attacks against <code>wroughtmark.com</code> or our public API infrastructure.</li>
        <li>Use the service for fraudulent, defamatory, or unlawful purposes.</li>
      </ul>

      <h2>5. Disclaimer of Warranties</h2>
      <p>TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW (INCLUDING THE AUSTRALIAN CONSUMER LAW), WROUGHTMARK SOFTWARE AND HOSTED SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. CRAMPTON IT SOLUTIONS DISCLAIMS ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
      <p>WE DO NOT WARRANT THAT THIRD-PARTY ACADEMIC INSTITUTIONS, PUBLISHERS, EMPLOYERS, OR PLATFORMS WILL ACCEPT OR RELY UPON WROUGHTMARK SEALS AS CONCLUSIVE PROOF OF AUTHORSHIP.</p>

      <h2>6. Limitation of Liability</h2>
      <p>TO THE EXTENT PERMITTED BY LAW, IN NO EVENT SHALL CRAMPTON IT SOLUTIONS, ITS PRINCIPAL, AFFILIATES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, USE, GOODWILL, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF WROUGHTMARK.</p>
      <p>OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING UNDER OR RELATING TO THESE TERMS SHALL NOT EXCEED AUD $50.00 OR THE FEES ACTUALLY PAID BY YOU TO CRAMPTON IT SOLUTIONS IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.</p>

      <h2>7. Termination</h2>
      <p>We reserve the right to suspend or revoke access to hosted registry services or enterprise API keys for any user who violates these Terms or engages in fraudulent seal manipulation. You may terminate your agreement at any time by ceasing all use of the hosted services.</p>

      <h2>8. Governing Law &amp; Jurisdiction</h2>
      <p>These Terms of Use are governed by and construed in accordance with the laws of the <strong>State of New South Wales, Australia</strong>. You irrevocably submit to the exclusive jurisdiction of the courts of New South Wales and any courts competent to hear appeals from those courts.</p>

      <h2>9. Modifications</h2>
      <p>We may update these terms periodically to reflect protocol improvements, statutory amendments, or new service capabilities. Revisions will be published at <code>wroughtmark.com/terms</code> with an updated effective date.</p>

      <div class="callout">
        <div class="callout-title">Legal Contact</div>
        <p><strong>Crampton IT Solutions</strong><br />
        Illawarra, New South Wales, Australia<br />
        Inquiries: <code>legal@cramptonit.solutions</code></p>
      </div>
    </div>

    <footer class="doc-footer-nav">
      <a class="btn-outline" href="/">&larr; Return to Foundry Home</a>
      <a class="btn-outline" href="/privacy">View Privacy Policy &rarr;</a>
    </footer>
  </main>

  <footer class="site-footer">
    <p>&copy; 2026 Crampton IT Solutions &bull; Wroughtmark Open Core released under MIT License &bull; 0 Bytes Transmitted &bull; <a href="/">Return to Console</a> &bull; <a href="/blog">Dispatches</a> &bull; <a href="/privacy">Privacy Policy</a> &bull; <a href="/terms">Terms of Use</a></p>
  </footer>

  ${COMMON_SCRIPT}
</body>
</html>`;
}
