/**
 * Browser-side call to POST /api/analyze. Validates the response shape and
 * converts transport failures into explicit client errors. Never substitutes
 * a fixture.
 */
import { AnalyzeResponseSchema, type AnalysisResult, type Intake } from "./schemas";

/** Slightly longer than the 20 s server deadline. */
export const BROWSER_DEADLINE_MS = 25_000;

export type ClientErrorCode =
  | "INVALID_INPUT"
  | "CONFIGURATION_ERROR"
  | "RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INVALID_MODEL_OUTPUT"
  | "NETWORK_ERROR"
  | "CLIENT_TIMEOUT"
  | "BAD_RESPONSE";

export interface ClientError {
  code: ClientErrorCode;
  message: string;
  retryable: boolean;
}

export type LiveOutcome =
  | { kind: "success"; requestId: string; data: AnalysisResult; latencyMs: number }
  | { kind: "error"; requestId: string; error: ClientError }
  | { kind: "aborted" };

export async function requestAnalysis(
  requestId: string,
  intake: Intake,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
  deadlineMs: number = BROWSER_DEADLINE_MS,
): Promise<LiveOutcome> {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), deadlineMs);
  const combined = AbortSignal.any([signal, deadline.signal]);
  const started = performance.now();

  try {
    const res = await fetchImpl("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, intake }),
      signal: combined,
      cache: "no-store",
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return badResponse(requestId);
    }
    const parsed = AnalyzeResponseSchema.safeParse(json);
    if (!parsed.success || parsed.data.requestId !== requestId) return badResponse(requestId);
    if (parsed.data.success) {
      return { kind: "success", requestId, data: parsed.data.data, latencyMs: Math.round(performance.now() - started) };
    }
    return { kind: "error", requestId, error: parsed.data.error };
  } catch {
    if (signal.aborted) return { kind: "aborted" };
    if (deadline.signal.aborted) {
      return {
        kind: "error",
        requestId,
        error: { code: "CLIENT_TIMEOUT", message: "No response from the server within the browser deadline.", retryable: true },
      };
    }
    return {
      kind: "error",
      requestId,
      error: { code: "NETWORK_ERROR", message: "Could not reach the local PulseEquity server.", retryable: true },
    };
  } finally {
    clearTimeout(timer);
  }
}

function badResponse(requestId: string): LiveOutcome {
  return {
    kind: "error",
    requestId,
    error: { code: "BAD_RESPONSE", message: "The server returned an unexpected response.", retryable: true },
  };
}
