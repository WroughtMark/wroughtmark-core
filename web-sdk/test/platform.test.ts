import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { buildCohortDemo, buildSingleScenario } from "../src/demos";
import {
  buildUscoManifestPayload,
  mintBlindTimeAnchor,
  runSuiteBridgeDemo,
  verifyGitPrRequest,
  verifyHiringAssessmentRequest,
} from "../src/enterprise";
import { authorizeLmsRequest, buildLtiToolConfig, verifyLmsBatch } from "../src/lms";
import { renderPublicReceiptHtml, SealRegistry } from "../src/registry";
import { BLOG_POSTS, renderBlogIndexHtml, renderBlogPostHtml } from "../src/blog";
import { renderPrivacyPolicyHtml, renderTermsOfUseHtml } from "../src/legal";
import {
  verifyEmbeddedContainerBytes,
  verifySeal,
  verifyTimeAnchor,
} from "../src/verify";

describe("Wroughtmark Multi-Scenario Presets, Cohort Triage & Public Receipt Registry", () => {
  test("clean and paste presets mint cryptographically valid seals with distinct integrity scores", async () => {
    const clean = await buildSingleScenario("clean");
    const cleanBytes = Uint8Array.from(atob(clean.fileBase64), (c) => c.charCodeAt(0));
    const cleanCheck = await verifySeal(cleanBytes, clean.seal);
    expect(cleanCheck.valid).toBe(true);
    expect(clean.seal.summary.process_score).toBe(100);
    expect(clean.seal.summary.anomaly_flags).toEqual([]);

    const paste = await buildSingleScenario("paste");
    const pasteBytes = Uint8Array.from(atob(paste.fileBase64), (c) => c.charCodeAt(0));
    const pasteCheck = await verifySeal(pasteBytes, paste.seal);
    expect(pasteCheck.valid).toBe(true);
    expect(paste.seal.summary.anomaly_flags).toContain("BULK_PASTE_SPIKE");
    expect(paste.seal.summary.anomaly_flags).toContain("SHORT_DURATION");
    expect(paste.seal.summary.process_score).toBeLessThan(60);

    const retype = await buildSingleScenario("retype");
    const retypeBytes = Uint8Array.from(atob(retype.fileBase64), (c) => c.charCodeAt(0));
    expect((await verifySeal(retypeBytes, retype.seal)).valid).toBe(true);
    expect(retype.seal.summary.anomaly_flags).toContain("LINEAR_TRANSCRIPTION_PATTERN");
    expect(retype.seal.summary.anomaly_flags).toContain("SYNTHETIC_CADENCE_BOT");
    expect(retype.seal.summary.authorship_tier).toBe("ANOMALY_FLAGGED");

    const chatloop = await buildSingleScenario("chatloop");
    const chatBytes = Uint8Array.from(atob(chatloop.fileBase64), (c) => c.charCodeAt(0));
    expect((await verifySeal(chatBytes, chatloop.seal)).valid).toBe(true);
    expect(chatloop.seal.summary.anomaly_flags).toContain("CLIPBOARD_RATIO_HIGH");
    expect(chatloop.seal.summary.anomaly_flags).toContain("FOCUS_SWITCH_PASTE_LOOP");
    expect(chatloop.seal.summary.anomaly_flags).toContain("INLINE_AI_AUTOCOMPLETE");
    expect(chatloop.seal.summary.authorship_tier).toBe("ANOMALY_FLAGGED");

    const hybrid = await buildSingleScenario("hybrid");
    const hybridBytes = Uint8Array.from(atob(hybrid.fileBase64), (c) => c.charCodeAt(0));
    expect((await verifySeal(hybridBytes, hybrid.seal)).valid).toBe(true);
    expect(hybrid.seal.summary.anomaly_flags).toContain("AI_ASSISTANCE_DISCLOSED");
    expect(hybrid.seal.summary.authorship_tier).toBe("AI_ASSISTED_DISCLOSED");
    expect(hybrid.seal.summary.process_score).toBe(85);

    const spatial = await buildSingleScenario("spatial");
    const spatialBytes = Uint8Array.from(atob(spatial.fileBase64), (c) => c.charCodeAt(0));
    expect((await verifySeal(spatialBytes, spatial.seal)).valid).toBe(true);
    expect(spatial.seal.summary.process_score).toBe(100);
    expect(spatial.seal.summary.authorship_tier).toBe("HUMAN_WROUGHT");
    expect(spatial.seal.summary.co_signed_devices).toContain("meta-rayban-display-emg");
  });

  test("cohort demo builds 5 sorted submissions and passes verifyLmsBatch()", async () => {
    const cohort = await buildCohortDemo();
    expect(cohort.submissions.length).toBe(5);

    const scores = cohort.submissions.map((s) => s.seal.summary.process_score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }

    const batch = await verifyLmsBatch(
      cohort.assignmentId,
      cohort.submissions.map((s) => ({
        assignmentId: cohort.assignmentId,
        studentId: s.studentId || "unknown",
        outputBase64: s.fileBase64,
        seal: s.seal,
      }))
    );

    expect(batch.checked).toBe(5);
    expect(batch.invalidCount).toBe(0);
    expect(batch.cleanCount).toBe(2);
    expect(batch.flaggedCount).toBe(3);
  });

  test("LMS authorization enforces bearer/header key only when configured", () => {
    const req = new Request("https://wroughtmark.com/api/lms/verify", {
      headers: { authorization: "Bearer secret_lti_token" },
    });
    expect(authorizeLmsRequest(req, undefined)).toBe(true);
    expect(authorizeLmsRequest(req, "secret_lti_token")).toBe(true);
    expect(authorizeLmsRequest(req, "wrong_token")).toBe(false);

    const hdrReq = new Request("https://wroughtmark.com/api/lms/verify", {
      headers: { "x-wroughtmark-key": "alt_key" },
    });
    expect(authorizeLmsRequest(hdrReq, "alt_key")).toBe(true);

    const lti = buildLtiToolConfig("https://wroughtmark.com/");
    expect(lti.oidc_initiation_url).toBe("https://wroughtmark.com/api/lms/lti/login");
    expect(lti.api_endpoints.batch_verify).toBe("https://wroughtmark.com/api/lms/batch");
  });

  test("SealRegistry rejects forged seals and renders valid receipts without raw uploads", async () => {
    const db = new SealRegistry(":memory:");
    const clean = await buildSingleScenario("clean");

    const forged = {
      ...clean.seal,
      summary: { ...clean.seal.summary, process_score: 99 },
    };
    const reject = await db.registerSeal(forged);
    expect(reject.ok).toBe(false);

    const saved = await db.registerSeal(clean.seal);
    expect(saved.ok).toBe(true);
    const loaded = db.getSeal(clean.seal.seal_id);
    expect(loaded).not.toBeNull();

    const html = renderPublicReceiptHtml(loaded!.seal, loaded!.registeredAtUtc, "https://wroughtmark.com");
    expect(html).toContain(clean.seal.seal_id);
    expect(html).toContain(clean.seal.final_output_sha256);
    expect(html).toContain("0 bytes leave your browser");
    expect(html).toContain("Cookie Settings");
    expect(html).toContain('href="/#cookie-settings"');

    const spatial = await buildSingleScenario("spatial");
    const spatialHtml = renderPublicReceiptHtml(spatial.seal, "2026-11-15T03:00:00Z", "https://wroughtmark.com");
    expect(spatialHtml).toContain("HUMAN_WROUGHT");
    expect(spatialHtml).toContain("Authorship Tier");
    expect(spatialHtml).toContain("Co-Signed Hardware");
    expect(spatialHtml).toContain("meta-rayban-display-emg");
  });

  test("server HTML template exposes 9-vector behavioral assay, 3-tier taxonomy, and mobile/wearable/XR capacity", () => {
    const serverSource = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");
    const expectedMarkers = [
      'id="detection"',
      'id="hardware"',
      "HUMAN_WROUGHT",
      "AI_ASSISTED_DISCLOSED",
      "ANOMALY_FLAGGED",
      "SYNTHETIC_EMG_REPLAY",
      "STATIC_6DOF_POSE_ANOMALY",
      'data-disc="spatial"',
      "Meta Ray-Ban Display",
      "Apple Vision Pro",
      "watchOS",
      "Wear OS",
    ];
    for (const marker of expectedMarkers) {
      expect(serverSource).toContain(marker);
    }
  });

  test("v0.3 scenarios, blind TimeAnchor, Git PR gate, hiring, USCO, and container extraction", async () => {
    const gitpr = await buildSingleScenario("gitpr");
    const gitBytes = Uint8Array.from(atob(gitpr.fileBase64), (c) => c.charCodeAt(0));
    expect((await verifySeal(gitBytes, gitpr.seal)).valid).toBe(true);
    expect(gitpr.seal.summary.discipline).toBe("code");
    expect(gitpr.seal.summary.authorship_tier).toBe("HUMAN_WROUGHT");

    const prCheck = await verifyGitPrRequest({ outputBase64: gitpr.fileBase64, seal: gitpr.seal });
    expect(prCheck.verified).toBe(true);
    expect(prCheck.ci_gate).toBe("PASS");

    const hiringPass = await verifyHiringAssessmentRequest({
      outputBase64: gitpr.fileBase64,
      seal: gitpr.seal,
    });
    expect(hiringPass.assessment_verdict).toBe("AUTHENTIC_ITERATIVE");

    const hitlrubber = await buildSingleScenario("hitlrubber");
    const rubberBytes = Uint8Array.from(atob(hitlrubber.fileBase64), (c) => c.charCodeAt(0));
    expect((await verifySeal(rubberBytes, hitlrubber.seal)).valid).toBe(true);
    expect(hitlrubber.seal.summary.discipline).toBe("review");
    expect(hitlrubber.seal.summary.anomaly_flags).toContain("RUBBER_STAMP_REVIEW");
    expect(hitlrubber.seal.summary.authorship_tier).toBe("ANOMALY_FLAGGED");

    const hiringFlag = await verifyHiringAssessmentRequest({
      outputBase64: hitlrubber.fileBase64,
      seal: hitlrubber.seal,
    });
    expect(hiringFlag.assessment_verdict).toBe("FLAGGED_REVIEW");

    const handoff = await buildSingleScenario("handoff");
    const handoffBytes = Uint8Array.from(atob(handoff.fileBase64), (c) => c.charCodeAt(0));
    expect((await verifySeal(handoffBytes, handoff.seal)).valid).toBe(true);
    expect(handoff.seal.summary.contributors?.length).toBe(2);
    expect(handoff.seal.summary.contributors?.[0].role).toBe("field_journalist");
    expect(handoff.seal.summary.contributors?.[1].role).toBe("compliance_reviewer");

    const badAnchor = await mintBlindTimeAnchor("raw source secret text that must be rejected");
    expect(badAnchor.ok).toBe(false);

    const goodAnchor = await mintBlindTimeAnchor(gitpr.seal.chain_root, "2026-11-15T04:00:00Z");
    expect(goodAnchor.ok).toBe(true);
    if (goodAnchor.ok) {
      expect((await verifyTimeAnchor(goodAnchor.anchor, gitpr.seal.chain_root)).valid).toBe(true);
    }

    const clean = await buildSingleScenario("clean");
    const uscoClean = await buildUscoManifestPayload({ seal: clean.seal });
    expect(uscoClean.ok).toBe(true);
    if (uscoClean.ok) {
      expect(uscoClean.corpus_100_percent_human).toBe(true);
    }

    const hybrid = await buildSingleScenario("hybrid");
    const uscoHybrid = await buildUscoManifestPayload({ seal: hybrid.seal });
    expect(uscoHybrid.ok).toBe(true);
    if (uscoHybrid.ok) {
      expect(uscoHybrid.corpus_100_percent_human).toBe(false);
      expect(uscoHybrid.disclosure_statement).toContain("Hybrid USCO Authorship Disclosure");
    }

    const cleanRaw = new TextDecoder().decode(Uint8Array.from(atob(clean.fileBase64), (c) => c.charCodeAt(0)));
    const embedded = new TextEncoder().encode(
      `${cleanRaw}\n%%WROUGHTMARK_SEAL_V03:${JSON.stringify(clean.seal)}%%END_WROUGHTMARK_SEAL`
    );
    const extracted = await verifyEmbeddedContainerBytes(embedded);
    expect(extracted.valid).toBe(true);
    expect(extracted.seal?.seal_id).toBe(clean.seal.seal_id);

    const serverSource = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");
    for (const marker of [
      "05 Enterprise, Git &amp; HITL",
      "pane-enterprise",
      "/api/anchor/stamp",
      "/api/git/verify-pr",
      "/api/hiring/verify",
      "/api/usco/manifest",
      "/api/container/verify",
      "/api/suite/demo",
      "entM365Btn",
      "entGwsBtn",
      "entSkillMcpBtn",
      "MS365 Multi-Host Add-in",
      "Google Workspace Add-on",
      "wroughtmark-provenance",
    ]) {
      expect(serverSource).toContain(marker);
    }
  });

  test("MS365 OpenXML, Google Workspace Drive properties, and Agent Skill MCP bridge", async () => {
    const m365 = await runSuiteBridgeDemo("m365");
    expect(m365.verified).toBe(true);
    expect(m365.authorship_tier).toBe("AI_ASSISTED_DISCLOSED");

    const gws = await runSuiteBridgeDemo("google-workspace");
    expect(gws.verified).toBe(true);
    expect(gws.cardTitle).toBe("Wroughtmark // gws-docs");

    const mcp = await runSuiteBridgeDemo("agent-mcp");
    expect(mcp.verified).toBe(true);
    expect(mcp.authorship_tier).toBe("AI_ASSISTED_DISCLOSED");
    expect(mcp.corpus_100_percent_human).toBe(false);
  });

  test("server exposes WCAG 2.1 AA cookie control settings and omits footer logo showcase", () => {
    const serverSource = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");
    for (const marker of [
      "wroughtmark-cookie-consent",
      'id="cookieBanner"',
      'id="cookiePreferencesModal"',
      'id="footerCookieSettingsBtn"',
      'id="cookieToggleFunctional"',
      'id="cookieToggleAnalytics"',
      'id="cookieToggleMarketing"',
      "acceptAllCookies",
      "rejectOptionalCookies",
      "clearConsent",
      "cookieConsentChanged",
      'role="dialog"',
      'aria-modal="true"',
    ]) {
      expect(serverSource).toContain(marker);
    }
    expect(serverSource).not.toContain('id="brandShowcase"');
    expect(serverSource).not.toContain("gallery-spread");
    for (const dl of [
      "https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.dmg",
      "https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/Wroughtmark-macOS-arm64.tar.gz",
      "https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-windows-x86_64.zip",
      "https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-linux-x86_64.tar.gz",
      "https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/wroughtmark-plugins-bundle.zip",
      "https://github.com/WroughtMark/wroughtmark-core/releases/latest/download/SHA256SUMS.txt",
      "https://www.virustotal.com/gui/file/8d5ecbecacccb49e9d72b3ec59f3feccf2b67759145e9da118f776ca590161aa",
      "ab7b58f027b0de62ce3dae686a7fcd14d73d87824ae0ab5517ecd3a299be0ad7",
      "https://github.com/WroughtMark/wroughtmark-core",
    ]) {
      expect(serverSource).toContain(dl);
    }
  });

  test("Dispatches blog engine renders index and all 6 architectural and technical guides", () => {
    expect(BLOG_POSTS.length).toBe(6);

    const indexHtml = renderBlogIndexHtml();
    expect(indexHtml).toContain("Dispatches from the Foundry");
    expect(indexHtml).toContain("Dispatches &amp; Guides");
    expect(indexHtml).toContain("/brand/wroughtmark-logo-mark.jpg");
    expect(indexHtml).toContain("Architecture");
    expect(indexHtml).toContain("Guides");
    expect(indexHtml).toContain("Legal &amp; Policy");
    expect(indexHtml).toContain("Case Studies");

    for (const post of BLOG_POSTS) {
      expect(indexHtml).toContain(post.title);
      expect(indexHtml).toContain(`/blog/${post.slug}`);

      const postHtml = renderBlogPostHtml(post.slug);
      expect(postHtml).not.toBeNull();
      expect(postHtml).toContain(post.title);
      expect(postHtml).toContain("/brand/wroughtmark-logo-mark.jpg");
      expect(postHtml).toContain(post.author);
      expect(postHtml).toContain(post.date);
      expect(postHtml).toContain("Back to All Dispatches");
    }

    const missing = renderBlogPostHtml("non-existent-dispatch-slug");
    expect(missing).toBeNull();
  });

  test("Privacy Policy and Terms of Use render with Crampton IT Solutions legal attribution", () => {
    const privacyHtml = renderPrivacyPolicyHtml();
    expect(privacyHtml).toContain("Privacy Policy");
    expect(privacyHtml).toContain("Crampton IT Solutions");
    expect(privacyHtml).toContain("/brand/wroughtmark-logo-mark.jpg");
    expect(privacyHtml).toContain("0-Byte Transmission Guarantee");
    expect(privacyHtml).toContain("Australian Privacy Principles");
    expect(privacyHtml).toContain("GDPR");
    expect(privacyHtml).toContain("CCPA");

    const termsHtml = renderTermsOfUseHtml();
    expect(termsHtml).toContain("Terms of Use");
    expect(termsHtml).toContain("Crampton IT Solutions");
    expect(termsHtml).toContain("/brand/wroughtmark-logo-mark.jpg");
    expect(termsHtml).toContain("MIT License");
    expect(termsHtml).toContain("New South Wales, Australia");
    expect(termsHtml).toContain("Disclaimer of Warranties");
    expect(termsHtml).toContain("Limitation of Liability");

    const serverSource = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");
    expect(serverSource).toContain('url.pathname === "/privacy"');
    expect(serverSource).toContain('url.pathname === "/terms"');
    expect(serverSource).toContain("Privacy Policy");
    expect(serverSource).toContain("Terms of Use");
  });

  test("sitemap.xml and robots.txt serve valid SEO indexes for all pages", () => {
    const serverSource = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");
    expect(serverSource).toContain('url.pathname === "/sitemap.xml"');
    expect(serverSource).toContain('url.pathname === "/robots.txt"');
    expect(serverSource).toContain("buildSitemapXml");
    expect(serverSource).toContain("Sitemap:");
    expect(serverSource).toContain("/sitemap.xml");
  });
});
