/**
 * Shared data contracts. Zod is the single source of truth; TypeScript types
 * are inferred from these schemas. This module must stay free of server-only
 * imports so the browser and the server validate against the same rules.
 *
 * These checks validate technical shape only. They say nothing about clinical
 * truth, and they deliberately do NOT apply clinical "normal ranges".
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

export const TriStateSchema = z.enum(["yes", "no", "unknown"]);
export type TriState = z.infer<typeof TriStateSchema>;

export const SmokingStatusSchema = z.enum(["current", "former", "never", "unknown"]);
export type SmokingStatus = z.infer<typeof SmokingStatusSchema>;

/** Positive finite measurement, or null when not measured / unknown. Never coerced. */
const optionalMeasurement = z.number().finite().positive().nullable();

export const ComorbiditiesSchema = z
  .object({
    diabetes: TriStateSchema,
    hypertension: TriStateSchema,
    priorCardiacHistory: TriStateSchema,
    smokingStatus: SmokingStatusSchema,
  })
  .strict();

export const IntakeSchema = z
  .object({
    /** Adults only: a product-scope choice for this synthetic demo, not a clinical threshold. */
    age: z.number().int().min(18).max(110),
    chiefComplaint: z.string().trim().min(3).max(1000),
    heartRate: optionalMeasurement, // bpm
    systolicBP: optionalMeasurement, // mmHg
    diastolicBP: optionalMeasurement, // mmHg
    respiratoryRate: optionalMeasurement, // breaths/minute
    comorbidities: ComorbiditiesSchema,
  })
  .strict();
export type Intake = z.infer<typeof IntakeSchema>;

// ---------------------------------------------------------------------------
// Analysis result (model output contract)
// ---------------------------------------------------------------------------

export const ConcernLevelSchema = z.enum([
  "elevated_concern",
  "possible_concern",
  "no_specific_markers_identified",
  "insufficient_information",
]);
export type ConcernLevel = z.infer<typeof ConcernLevelSchema>;

export const DetectedMarkerSchema = z
  .object({
    marker: z.string().trim().min(1).max(80),
    inputEvidence: z.string().trim().min(1).max(200),
    explanation: z.string().trim().min(1).max(240),
    /** Structural check only here; membership in the server inventory is checked separately. */
    sourceIds: z.array(z.string().trim().min(1).max(64)).min(1).max(3),
  })
  .strict();
export type DetectedMarker = z.infer<typeof DetectedMarkerSchema>;

export const AnalysisResultSchema = z
  .object({
    concernLevel: ConcernLevelSchema,
    summary: z.string().trim().min(1).max(240),
    detectedMarkers: z.array(DetectedMarkerSchema).max(4),
    potentialDismissalPattern: z.string().trim().min(1).max(240).nullable(),
    recommendedAction: z.string().trim().min(1).max(300),
    limitations: z.array(z.string().trim().min(1).max(200)).max(4),
  })
  .strict();
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ---------------------------------------------------------------------------
// API request / response
// ---------------------------------------------------------------------------

export const MAX_REQUEST_BYTES = 16 * 1024;

export const RequestIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/, "requestId must be 8-64 URL-safe characters");

export const AnalyzeRequestSchema = z
  .object({
    requestId: RequestIdSchema,
    intake: IntakeSchema,
  })
  .strict();
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const ErrorCodeSchema = z.enum([
  "INVALID_INPUT",
  "CONFIGURATION_ERROR",
  "RATE_LIMITED",
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_ERROR",
  "INVALID_MODEL_OUTPUT",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const HTTP_STATUS_FOR_ERROR: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  CONFIGURATION_ERROR: 503,
  RATE_LIMITED: 429,
  UPSTREAM_TIMEOUT: 504,
  UPSTREAM_ERROR: 503,
  INVALID_MODEL_OUTPUT: 502,
};

export const AnalyzeErrorSchema = z
  .object({
    code: ErrorCodeSchema,
    message: z.string().max(500),
    retryable: z.boolean(),
  })
  .strict();
export type AnalyzeError = z.infer<typeof AnalyzeErrorSchema>;

export const AnalyzeSuccessSchema = z
  .object({
    success: z.literal(true),
    requestId: z.string().max(64),
    source: z.literal("live"),
    data: AnalysisResultSchema,
  })
  .strict();

export const AnalyzeFailureSchema = z
  .object({
    success: z.literal(false),
    requestId: z.string().max(64),
    error: AnalyzeErrorSchema,
  })
  .strict();

/** Discriminated union: a response never carries both data and an error. */
export const AnalyzeResponseSchema = z.discriminatedUnion("success", [
  AnalyzeSuccessSchema,
  AnalyzeFailureSchema,
]);
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
