import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { findUnknownSourceIds } from "../references";
import { AnalysisResultSchema, type AnalysisResult, type AnalyzeError, type Intake } from "../schemas";
import { OUTPUT_JSON_SCHEMA, buildSystemPrompt, buildUserMessage } from "./prompt";

/** Total server-side deadline for the single provider call. */
export const SERVER_DEADLINE_MS = 20_000;
/** Output budget: covers the small JSON object plus any model reasoning tokens. */
export const MAX_OUTPUT_TOKENS = 8_000;

const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORT_LEVELS)[number];

export interface RuntimeConfig {
  apiKey: string;
  model: string;
  effort: Effort | null;
}

export type ConfigResult = { ok: true; config: RuntimeConfig } | { ok: false; error: AnalyzeError };

/** Reads server-only env vars. Never returns or logs the key's value in errors. */
export function readConfig(env: NodeJS.ProcessEnv = process.env): ConfigResult {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  const model = env.CLAUDE_MODEL?.trim();
  const effortRaw = env.CLAUDE_EFFORT?.trim();
  const missing: string[] = [];
  if (!apiKey) missing.push("ANTHROPIC_API_KEY");
  if (!model) missing.push("CLAUDE_MODEL");
  if (missing.length) {
    return {
      ok: false,
      error: {
        code: "CONFIGURATION_ERROR",
        message: `Live analysis is not configured: missing ${missing.join(" and ")} on the server. Prewritten demo mode still works.`,
        retryable: false,
      },
    };
  }
  let effort: Effort | null = null;
  if (effortRaw) {
    if (!(EFFORT_LEVELS as readonly string[]).includes(effortRaw)) {
      return {
        ok: false,
        error: {
          code: "CONFIGURATION_ERROR",
          message: `CLAUDE_EFFORT must be one of ${EFFORT_LEVELS.join(", ")} (or unset).`,
          retryable: false,
        },
      };
    }
    effort = effortRaw as Effort;
  }
  return { ok: true, config: { apiKey: apiKey!, model: model!, effort } };
}

export type AnalysisOutcome = { ok: true; data: AnalysisResult } | { ok: false; error: AnalyzeError };

const invalidOutput = (message: string, retryable: boolean): AnalysisOutcome => ({
  ok: false,
  error: { code: "INVALID_MODEL_OUTPUT", message, retryable },
});

/** Minimal shape of the provider message that we inspect. */
export type ProviderMessage = Pick<Anthropic.Message, "stop_reason" | "content">;

/**
 * Turns a provider message into a validated result or an explicit error.
 * Success only for a complete, schema-valid result with known source IDs.
 * No repair, no partial results, no fallback.
 */
export function interpretMessage(message: ProviderMessage): AnalysisOutcome {
  switch (message.stop_reason) {
    case "end_turn":
      break;
    case "refusal":
      return invalidOutput("The model declined to produce an analysis for this input.", false);
    case "max_tokens":
    case "model_context_window_exceeded":
      return invalidOutput("The model output was truncated before completion; no partial result is shown.", true);
    default:
      return invalidOutput(`Unexpected model stop reason (${String(message.stop_reason)}).`, true);
  }

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) return invalidOutput("The model returned no text output.", true);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return invalidOutput("The model output was not valid JSON.", true);
  }

  const validated = AnalysisResultSchema.safeParse(parsed);
  if (!validated.success) {
    return invalidOutput("The model output did not match the required result schema.", true);
  }

  const unknownIds = findUnknownSourceIds(validated.data.detectedMarkers.flatMap((m) => m.sourceIds));
  if (unknownIds.length) {
    return invalidOutput("The model cited source IDs that are not in the reference inventory.", true);
  }

  return { ok: true, data: validated.data };
}

/** Maps provider/SDK errors to safe, typed errors. Never forwards raw SDK messages. */
export function mapProviderError(err: unknown, deadlineHit: boolean): AnalyzeError {
  if (deadlineHit || err instanceof Anthropic.APIConnectionTimeoutError) {
    return { code: "UPSTREAM_TIMEOUT", message: "The analysis service did not respond within the deadline.", retryable: true };
  }
  if (err instanceof Anthropic.APIUserAbortError) {
    return { code: "UPSTREAM_ERROR", message: "The request was cancelled.", retryable: true };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { code: "RATE_LIMITED", message: "The analysis service is rate limiting requests. Wait a moment, then retry.", retryable: true };
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { code: "CONFIGURATION_ERROR", message: "The server's API credentials were rejected. Check ANTHROPIC_API_KEY.", retryable: false };
  }
  if (err instanceof Anthropic.NotFoundError) {
    return { code: "CONFIGURATION_ERROR", message: "The configured CLAUDE_MODEL is not available to this account.", retryable: false };
  }
  if (err instanceof Anthropic.BadRequestError) {
    return {
      code: "CONFIGURATION_ERROR",
      message: "The analysis service rejected the request configuration. Check CLAUDE_MODEL and CLAUDE_EFFORT compatibility.",
      retryable: false,
    };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { code: "UPSTREAM_ERROR", message: "Could not reach the analysis service.", retryable: true };
  }
  if (err instanceof Anthropic.APIError) {
    return { code: "UPSTREAM_ERROR", message: "The analysis service is unavailable right now.", retryable: true };
  }
  return { code: "UPSTREAM_ERROR", message: "Unexpected error while contacting the analysis service.", retryable: true };
}

/** The subset of the SDK client used here; injectable for tests. */
export interface MessagesClient {
  messages: {
    create(
      body: Anthropic.MessageCreateParamsNonStreaming,
      options?: { signal?: AbortSignal; timeout?: number },
    ): PromiseLike<ProviderMessage>;
  };
}

export function createClient(config: RuntimeConfig): MessagesClient {
  // Zero automatic retries: manual retry is exposed in the UI instead.
  return new Anthropic({ apiKey: config.apiKey, maxRetries: 0, timeout: SERVER_DEADLINE_MS });
}

export function buildRequest(config: RuntimeConfig, intake: Intake): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: config.model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserMessage(intake) }],
    output_config: {
      format: { type: "json_schema", schema: OUTPUT_JSON_SCHEMA },
      ...(config.effort ? { effort: config.effort } : {}),
    },
  };
}

/**
 * One bounded Claude call. Cancellation from the client is forwarded to the
 * SDK, but that does not guarantee the provider stopped work or incurred no cost.
 */
export async function analyzeIntake(
  intake: Intake,
  config: RuntimeConfig,
  opts: { signal?: AbortSignal; client?: MessagesClient; deadlineMs?: number } = {},
): Promise<AnalysisOutcome> {
  const client = opts.client ?? createClient(config);
  const deadlineMs = opts.deadlineMs ?? SERVER_DEADLINE_MS;
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), deadlineMs);
  const signal = opts.signal ? AbortSignal.any([opts.signal, deadline.signal]) : deadline.signal;

  try {
    const message = await client.messages.create(buildRequest(config, intake), { signal, timeout: deadlineMs });
    return interpretMessage(message);
  } catch (err) {
    return { ok: false, error: mapProviderError(err, deadline.signal.aborted) };
  } finally {
    clearTimeout(timer);
  }
}
