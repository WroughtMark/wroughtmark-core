import { verifySeal, type WroughtmarkSeal } from "./verify";

export interface LmsVerifyRequest {
  assignmentId: string;
  studentId: string;
  outputBase64: string;
  seal: WroughtmarkSeal;
}

export interface LmsVerifyResponse {
  valid: boolean;
  assignmentId: string;
  studentId: string;
  sealId?: string;
  processScore: number;
  anomalyFlags: string[];
  verdict: "VERIFIED_CLEAN" | "VERIFIED_FLAGGED" | "INVALID";
  reason?: string;
}

/** Verify a Canvas / Moodle / Blackboard LTI 1.3 submission payload against a WroughtmarkSeal. */
export async function verifyLmsSubmission(
  req: LmsVerifyRequest
): Promise<LmsVerifyResponse> {
  const bytes = Uint8Array.from(atob(req.outputBase64), (c) => c.charCodeAt(0));
  const res = await verifySeal(bytes, req.seal);
  if (!res.valid) {
    return {
      valid: false,
      assignmentId: req.assignmentId,
      studentId: req.studentId,
      processScore: 0,
      anomalyFlags: ["INVALID_SEAL"],
      verdict: "INVALID",
      reason: res.reason,
    };
  }

  const flags = req.seal.summary.anomaly_flags ?? [];
  const score = req.seal.summary.process_score ?? 100;
  return {
    valid: true,
    assignmentId: req.assignmentId,
    studentId: req.studentId,
    sealId: res.sealId,
    processScore: score,
    anomalyFlags: flags,
    verdict: flags.length === 0 ? "VERIFIED_CLEAN" : "VERIFIED_FLAGGED",
  };
}

export interface LmsBatchResponse {
  assignmentId: string;
  checked: number;
  cleanCount: number;
  flaggedCount: number;
  invalidCount: number;
  results: LmsVerifyResponse[];
}

/** Verify a cohort of LMS submissions in parallel, ordered lowest processScore first. */
export async function verifyLmsBatch(
  assignmentId: string,
  submissions: LmsVerifyRequest[]
): Promise<LmsBatchResponse> {
  const results = await Promise.all(
    submissions.map((item) =>
      verifyLmsSubmission({
        ...item,
        assignmentId: item.assignmentId || assignmentId,
      })
    )
  );
  results.sort((a, b) => a.processScore - b.processScore);

  const cleanCount = results.filter((r) => r.verdict === "VERIFIED_CLEAN").length;
  const flaggedCount = results.filter((r) => r.verdict === "VERIFIED_FLAGGED").length;
  const invalidCount = results.filter((r) => r.verdict === "INVALID").length;

  return {
    assignmentId,
    checked: results.length,
    cleanCount,
    flaggedCount,
    invalidCount,
    results,
  };
}

/** Validate API key / Bearer token for LMS endpoints when WROUGHTMARK_LMS_API_KEY is configured. */
export function authorizeLmsRequest(req: Request, expectedKey?: string): boolean {
  const key = expectedKey?.trim();
  if (!key) return true;

  const headerKey = req.headers.get("x-wroughtmark-key")?.trim();
  if (headerKey && headerKey === key) return true;

  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() === key;
  }
  return false;
}

/** Generate standard IMS Global LTI 1.3 tool JSON configuration for Canvas / Moodle / Blackboard. */
export function buildLtiToolConfig(origin: string) {
  const cleanOrigin = origin.replace(/\/+$/, "");
  return {
    title: "Wroughtmark Process Provenance Assay",
    description: "Zero-upload cryptographic human process verification for student assignments.",
    oidc_initiation_url: `${cleanOrigin}/api/lms/lti/login`,
    target_link_uri: `${cleanOrigin}/#instrument`,
    scopes: [
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
      "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
      "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
    ],
    extensions: [
      {
        platform: "canvas.instructure.com",
        domain: new URL(cleanOrigin).hostname,
        privacy_level: "anonymous",
        settings: {
          placements: [
            {
              placement: "assignment_submission",
              message_type: "LtiResourceLinkRequest",
              target_link_uri: `${cleanOrigin}/#instrument`,
              text: "Wroughtmark Provenance Check",
            },
            {
              placement: "course_navigation",
              message_type: "LtiResourceLinkRequest",
              target_link_uri: `${cleanOrigin}/#instrument`,
              text: "Wroughtmark Assay Triage",
            },
          ],
        },
      },
    ],
    public_jwk_url: `${cleanOrigin}/api/lms/lti/jwks.json`,
    custom_fields: {
      assignment_id: "$Canvas.assignment.id",
      course_id: "$Canvas.course.id",
    },
    api_endpoints: {
      single_verify: `${cleanOrigin}/api/lms/verify`,
      batch_verify: `${cleanOrigin}/api/lms/batch`,
    },
  };
}
