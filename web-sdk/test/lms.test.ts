import { describe, expect, test } from "bun:test";
import { verifyLmsSubmission } from "../src/lms";
import { appendHeartbeat, mintBrowserSeal } from "../../browser-extension/src/chain";

describe("LMS LTI 1.3 Submission Verification", () => {
  test("returns VERIFIED_CLEAN for authentic multi-session student work", async () => {
    let beats = await appendHeartbeat([], new TextEncoder().encode("outline"), 200, 120, 0);
    beats = await appendHeartbeat(beats, new TextEncoder().encode("final essay"), 240, 350, 0);
    const essay = new TextEncoder().encode("final essay");
    const seal = await mintBrowserSeal("eng101-essay", beats, essay, "writing");

    const res = await verifyLmsSubmission({
      assignmentId: "CANVAS-ENG101-A1",
      studentId: "stu_4821",
      outputBase64: btoa("final essay"),
      seal,
    });
    expect(res.valid).toBe(true);
    expect(res.verdict).toBe("VERIFIED_CLEAN");
    expect(res.processScore).toBe(100);
  });

  test("returns VERIFIED_FLAGGED when paste spike is present", async () => {
    let beats = await appendHeartbeat([], new TextEncoder().encode("draft"), 200, 50, 0);
    beats = await appendHeartbeat(beats, new TextEncoder().encode("pasted"), 15, 65_000, 65_000);
    const essay = new TextEncoder().encode("pasted");
    const seal = await mintBrowserSeal("eng101-paste", beats, essay, "writing");

    const res = await verifyLmsSubmission({
      assignmentId: "CANVAS-ENG101-A1",
      studentId: "stu_9910",
      outputBase64: btoa("pasted"),
      seal,
    });
    expect(res.valid).toBe(true);
    expect(res.verdict).toBe("VERIFIED_FLAGGED");
    expect(res.anomalyFlags).toContain("BULK_PASTE_SPIKE");
  });
});
