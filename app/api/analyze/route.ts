import { randomUUID } from "node:crypto";
import {
  AnalyzeRequestSchema,
  HTTP_STATUS_FOR_ERROR,
  MAX_REQUEST_BYTES,
  RequestIdSchema,
  type AnalyzeError,
  type AnalyzeResponse,
} from "@/lib/schemas";
import { analyzeIntake, readConfig } from "@/lib/server/claude";

/**
 * POST /api/analyze — live Claude analysis only. Fixture responses never come
 * from this endpoint. Intake bodies and model output are never logged.
 */
export async function POST(request: Request): Promise<Response> {
  const started = Date.now();

  const body = await readBoundedText(request, MAX_REQUEST_BYTES);
  if (body === null) {
    return fail(newRequestId(), started, null, { code: "INVALID_INPUT", message: "Request body is too large.", retryable: false });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return fail(newRequestId(), started, null, { code: "INVALID_INPUT", message: "Request body must be valid JSON.", retryable: false });
  }

  // Echo the client request ID only if it is itself valid.
  const idCandidate = (json as { requestId?: unknown } | null)?.requestId;
  const idCheck = RequestIdSchema.safeParse(idCandidate);
  const requestId = idCheck.success ? idCheck.data : newRequestId();

  const parsed = AnalyzeRequestSchema.safeParse(json);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join(".") || "(root)"))].slice(0, 6);
    return fail(requestId, started, null, {
      code: "INVALID_INPUT",
      message: `Invalid request fields: ${fields.join(", ")}.`,
      retryable: false,
    });
  }

  const configResult = readConfig();
  if (!configResult.ok) return fail(requestId, started, null, configResult.error);
  const { config } = configResult;

  const outcome = await analyzeIntake(parsed.data.intake, config, { signal: request.signal });
  if (!outcome.ok) return fail(requestId, started, config.model, outcome.error);

  log({ requestId, outcome: "success", durationMs: Date.now() - started, model: config.model });
  const response: AnalyzeResponse = { success: true, requestId, source: "live", data: outcome.data };
  return Response.json(response, { status: 200, headers: { "Cache-Control": "no-store" } });
}

function newRequestId(): string {
  return `srv_${randomUUID().replace(/-/g, "")}`;
}

function fail(requestId: string, started: number, model: string | null, error: AnalyzeError): Response {
  log({ requestId, outcome: "error", code: error.code, durationMs: Date.now() - started, model });
  const response: AnalyzeResponse = { success: false, requestId, error };
  return Response.json(response, { status: HTTP_STATUS_FOR_ERROR[error.code], headers: { "Cache-Control": "no-store" } });
}

/** Technical metadata only: never intake text or model output. */
function log(entry: { requestId: string; outcome: string; code?: string; durationMs: number; model: string | null }) {
  console.info(JSON.stringify({ event: "analyze", ...entry }));
}

/** Reads the body up to `limit` bytes; returns null if it exceeds the limit. */
async function readBoundedText(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(merged);
}
