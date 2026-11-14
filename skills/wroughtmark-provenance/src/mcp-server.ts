import {
  appendHeartbeat,
  mintBrowserSeal,
  type BrowserHeartbeat,
} from "../../../browser-extension/src/chain";
import {
  buildDriveAppProperties,
  buildWorkspaceCardUi,
  createWorkspaceSessionState,
  mintWorkspaceSeal,
  recordWorkspaceSnapshot,
  verifyDriveAppProperties,
  type WorkspaceHost,
} from "../../../google-workspace-addon/src/addon";
import {
  buildOpenXmlCustomPart,
  createM365SessionState,
  extractAndVerifyOpenXmlCustomPart,
  mintM365Seal,
  recordM365Snapshot,
  type M365HostKind,
} from "../../../office-addin/src/taskpane";
import {
  buildUscoManifestPayload,
  verifySeal,
  type UscoEventSummaryInput,
  type WroughtmarkSeal,
} from "../../../web-sdk/src/verify";

export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const WROUGHTMARK_MCP_TOOLS: McpToolSchema[] = [
  {
    name: "wroughtmark_record_step",
    description:
      "Append a local zero-content heartbeat step to a Wroughtmark process chain with automatic agent AI disclosure tagging.",
    inputSchema: {
      type: "object",
      properties: {
        beats: { type: "array" },
        contentText: { type: "string" },
        activeSeconds: { type: "number" },
        deltaBytes: { type: "number" },
        pasteBytes: { type: "number" },
        aiDisclosed: { type: "boolean" },
        timestampUtc: { type: "string" },
      },
      required: ["contentText"],
    },
  },
  {
    name: "wroughtmark_mint_suite_seal",
    description:
      "Mint an Ed25519 WroughtmarkSeal across m365 (Word/Excel/PowerPoint/Outlook + OpenXML customXml), google-workspace (Docs/Sheets/Slides/Drive/Gmail + appProperties), or agent-cli.",
    inputSchema: {
      type: "object",
      properties: {
        suite: { type: "string", enum: ["m365", "google-workspace", "agent-cli"] },
        host: { type: "string" },
        projectId: { type: "string" },
        steps: { type: "array" },
      },
      required: ["suite", "projectId", "steps"],
    },
  },
  {
    name: "wroughtmark_verify_suite_artifact",
    description:
      "Verify deliverable bytes against a WroughtmarkSeal JSON, Microsoft 365 OpenXML customXml part, or Google Drive appProperties map.",
    inputSchema: {
      type: "object",
      properties: {
        contentText: { type: "string" },
        contentBase64: { type: "string" },
        seal: { type: "object" },
        customXml: { type: "string" },
        driveAppProperties: { type: "object" },
      },
    },
  },
  {
    name: "wroughtmark_usco_manifest",
    description:
      "Generate a USCO hybrid copyright disclosure statement and 100% human corpus cleanliness attestation from a signed seal.",
    inputSchema: {
      type: "object",
      properties: {
        seal: { type: "object" },
        events: { type: "array" },
      },
      required: ["seal"],
    },
  },
];

export interface SuiteStepInput {
  content: string;
  activeSeconds?: number;
  timestampUtc?: string;
  aiDisclosed?: boolean;
  annotationEvents?: number;
  viewportCoverageBps?: number;
  structuralUnits?: number;
}

function resolveArtifactBytes(args: {
  contentText?: string;
  contentBase64?: string;
}): Uint8Array {
  if (typeof args.contentBase64 === "string") {
    return Uint8Array.from(atob(args.contentBase64), (c) => c.charCodeAt(0));
  }
  return new TextEncoder().encode(args.contentText ?? "");
}

/**
 * Execute one of the Wroughtmark Agent Skill MCP tools deterministically using
 * shared core WebCrypto, Microsoft 365 OpenXML, Google Workspace Drive, and USCO helpers.
 */
export async function handleMcpToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (name === "wroughtmark_record_step") {
    const existing = Array.isArray(args.beats) ? (args.beats as BrowserHeartbeat[]) : [];
    const contentText = String(args.contentText ?? "");
    const bytes = new TextEncoder().encode(contentText);
    const updated = await appendHeartbeat(
      existing,
      bytes,
      Number(args.activeSeconds ?? 180),
      Number(args.deltaBytes ?? bytes.length),
      Number(args.pasteBytes ?? 0),
      typeof args.timestampUtc === "string" ? args.timestampUtc : new Date().toISOString(),
      {
        ai_disclosed: args.aiDisclosed !== false,
      }
    );
    return { ok: true, count: updated.length, beats: updated };
  }

  if (name === "wroughtmark_mint_suite_seal") {
    const suite = String(args.suite ?? "agent-cli");
    const projectId = String(args.projectId ?? "wroughtmark-agent-task");
    const steps = Array.isArray(args.steps) ? (args.steps as SuiteStepInput[]) : [];
    if (!steps.length) {
      throw new Error("wroughtmark_mint_suite_seal requires at least one step");
    }

    const lastContent = steps[steps.length - 1].content;
    const baseMs = 1_763_168_400_000;

    if (suite === "m365") {
      const host = (typeof args.host === "string" ? args.host : "word") as M365HostKind;
      let state = createM365SessionState(host);
      let cursorMs = baseMs;
      for (const s of steps) {
        cursorMs += (s.activeSeconds ?? 180) * 1000;
        state = await recordM365Snapshot(
          state,
          s.content,
          {
            host,
            copilotAssisted: s.aiDisclosed,
            annotationEvents: s.annotationEvents,
            viewportCoverageBps: s.viewportCoverageBps,
            structuralUnits: s.structuralUnits,
          },
          cursorMs,
          s.timestampUtc ?? new Date(cursorMs).toISOString()
        );
      }
      const seal = await mintM365Seal(projectId, state, lastContent);
      return {
        ok: true,
        suite,
        host,
        seal,
        customXml: buildOpenXmlCustomPart(seal),
      };
    }

    if (suite === "google-workspace") {
      const host = (typeof args.host === "string" ? args.host : "docs") as WorkspaceHost;
      let state = createWorkspaceSessionState(host);
      let cursorMs = baseMs;
      for (const s of steps) {
        cursorMs += (s.activeSeconds ?? 180) * 1000;
        state = await recordWorkspaceSnapshot(
          state,
          s.content,
          {
            host,
            geminiDisclosed: s.aiDisclosed,
            annotationEvents: s.annotationEvents,
            viewportCoverageBps: s.viewportCoverageBps,
            structuralUnits: s.structuralUnits,
          },
          cursorMs,
          s.timestampUtc ?? new Date(cursorMs).toISOString()
        );
      }
      const seal = await mintWorkspaceSeal(projectId, state, lastContent);
      return {
        ok: true,
        suite,
        host,
        seal,
        driveAppProperties: buildDriveAppProperties(seal),
        cardUi: buildWorkspaceCardUi(state, seal),
      };
    }

    let beats: BrowserHeartbeat[] = [];
    let cursorMs = baseMs;
    for (const s of steps) {
      const bytes = new TextEncoder().encode(s.content);
      cursorMs += (s.activeSeconds ?? 180) * 1000;
      beats = await appendHeartbeat(
        beats,
        bytes,
        s.activeSeconds ?? 180,
        bytes.length,
        0,
        s.timestampUtc ?? new Date(cursorMs).toISOString(),
        { ai_disclosed: s.aiDisclosed !== false }
      );
    }
    const seal = await mintBrowserSeal(
      projectId,
      beats,
      new TextEncoder().encode(lastContent),
      "code",
      ["agent-skill-mcp", "local-workstation"]
    );
    return { ok: true, suite: "agent-cli", seal };
  }

  if (name === "wroughtmark_verify_suite_artifact") {
    const bytes = resolveArtifactBytes({
      contentText: typeof args.contentText === "string" ? args.contentText : undefined,
      contentBase64: typeof args.contentBase64 === "string" ? args.contentBase64 : undefined,
    });
    if (typeof args.customXml === "string") {
      const res = await extractAndVerifyOpenXmlCustomPart(args.customXml, bytes);
      return { format: "m365-openxml", ...res };
    }
    if (args.driveAppProperties && typeof args.driveAppProperties === "object") {
      const res = await verifyDriveAppProperties(
        args.driveAppProperties as Record<string, string>,
        bytes
      );
      return { format: "gws-drive-app-properties", ...res };
    }
    if (args.seal && typeof args.seal === "object") {
      const res = await verifySeal(bytes, args.seal as WroughtmarkSeal);
      return { format: "raw-seal", ...res };
    }
    return { valid: false, reason: "Provide seal, customXml, or driveAppProperties" };
  }

  if (name === "wroughtmark_usco_manifest") {
    const result = await buildUscoManifestPayload({
      seal: args.seal as WroughtmarkSeal,
      events: Array.isArray(args.events) ? (args.events as UscoEventSummaryInput[]) : undefined,
    });
    return result as unknown as Record<string, unknown>;
  }

  throw new Error(`Unknown Wroughtmark MCP tool: ${name}`);
}

const isMain = Boolean((import.meta as { main?: boolean }).main);
if (isMain) {
  // Minimal stdio JSON-RPC handler when executed directly as an MCP server process
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  (async () => {
    for await (const chunk of Bun.stdin.stream()) {
      const line = decoder.decode(chunk).trim();
      if (!line) continue;
      for (const part of line.split("\n")) {
        try {
          const msg = JSON.parse(part) as {
            id?: unknown;
            method?: string;
            params?: { name?: string; arguments?: Record<string, unknown> };
          };
          if (msg.method === "tools/list") {
            await Bun.write(
              Bun.stdout,
              encoder.encode(
                JSON.stringify({ id: msg.id ?? null, result: { tools: WROUGHTMARK_MCP_TOOLS } }) + "\n"
              )
            );
          } else if (msg.method === "tools/call") {
            const out = await handleMcpToolCall(
              msg.params?.name ?? "",
              msg.params?.arguments ?? {}
            );
            await Bun.write(
              Bun.stdout,
              encoder.encode(JSON.stringify({ id: msg.id ?? null, result: out }) + "\n")
            );
          }
        } catch (err) {
          await Bun.write(
            Bun.stdout,
            encoder.encode(
              JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) + "\n"
            )
          );
        }
      }
    }
  })();
}
