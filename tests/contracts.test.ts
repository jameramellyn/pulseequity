import { describe, expect, it } from "vitest";
import { SYNTHETIC_CASES, fixtureResultFor } from "@/lib/fixtures";
import { emptyFormValues, formToIntake, intakeToForm, missingInformation } from "@/lib/intake-form";
import { findUnknownSourceIds } from "@/lib/references";
import { AnalysisResultSchema, AnalyzeResponseSchema, IntakeSchema } from "@/lib/schemas";

const baseIntake = SYNTHETIC_CASES[0].intake;

describe("intake form conversion", () => {
  it("keeps unknown comorbidities unknown and blank vitals null (never zero)", () => {
    const values = { ...emptyFormValues(), age: "50", chiefComplaint: "tired and achy" };
    const r = formToIntake(values);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.intake.heartRate).toBeNull();
    expect(r.intake.systolicBP).toBeNull();
    expect(r.intake.diastolicBP).toBeNull();
    expect(r.intake.respiratoryRate).toBeNull();
    expect(r.intake.comorbidities).toEqual({
      diabetes: "unknown",
      hypertension: "unknown",
      priorCardiacHistory: "unknown",
      smokingStatus: "unknown",
    });
    expect(missingInformation(r.intake)).toHaveLength(8);
  });

  it("requires age and complaint", () => {
    const r = formToIntake(emptyFormValues());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors.age).toBeTruthy();
    expect(r.fieldErrors.chiefComplaint).toBeTruthy();
  });

  it("rejects non-numeric, exponent, zero and negative vitals; accepts extreme positives", () => {
    const base = { ...emptyFormValues(), age: "50", chiefComplaint: "tired" };
    for (const bad of ["abc", "1e3", "0", "-5", "Infinity"]) {
      const r = formToIntake({ ...base, heartRate: bad });
      expect(r.ok, bad).toBe(false);
    }
    const extreme = formToIntake({ ...base, heartRate: "250" });
    expect(extreme.ok).toBe(true);
  });

  it("trims the complaint and keeps former distinct from never", () => {
    const r = formToIntake({
      ...emptyFormValues(),
      age: "60",
      chiefComplaint: "   jaw ache   ",
      comorbidities: { ...emptyFormValues().comorbidities, smokingStatus: "former" },
    });
    expect(r.ok && r.intake.chiefComplaint).toBe("jaw ache");
    expect(r.ok && r.intake.comorbidities.smokingStatus).toBe("former");
  });

  it("round-trips fixtures through the form", () => {
    for (const c of SYNTHETIC_CASES) {
      const r = formToIntake(intakeToForm(c.intake));
      expect(r.ok && r.intake).toEqual(c.intake);
    }
  });
});

describe("intake schema", () => {
  it("rejects coercion, NaN, Infinity, unknown enums, extra keys, oversized text", () => {
    const bad = [
      { ...baseIntake, heartRate: 0 },
      { ...baseIntake, heartRate: "96" },
      { ...baseIntake, heartRate: Number.NaN },
      { ...baseIntake, heartRate: Number.POSITIVE_INFINITY },
      { ...baseIntake, age: 17 },
      { ...baseIntake, age: 50.5 },
      { ...baseIntake, chiefComplaint: "x".repeat(1001) },
      { ...baseIntake, comorbidities: { ...baseIntake.comorbidities, diabetes: "true" } },
      { ...baseIntake, comorbidities: { ...baseIntake.comorbidities, diabetes: true } },
      { ...baseIntake, extra: 1 },
    ];
    for (const b of bad) expect(IntakeSchema.safeParse(b).success).toBe(false);
  });
});

describe("analysis result schema", () => {
  const minimal = {
    concernLevel: "no_specific_markers_identified",
    summary: "Nothing in the reference list was described.",
    detectedMarkers: [],
    potentialDismissalPattern: null,
    recommendedAction: "Continue clinician assessment under local protocol.",
    limitations: [],
  };

  it("accepts zero markers and a null dismissal pattern", () => {
    expect(AnalysisResultSchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects reassuring/unknown categories, too many markers, overlong fields", () => {
    expect(AnalysisResultSchema.safeParse({ ...minimal, concernLevel: "non_urgent" }).success).toBe(false);
    const marker = { marker: "m", inputEvidence: "e", explanation: "x", sourceIds: ["AHA_SYMPTOMS_WOMEN"] };
    expect(AnalysisResultSchema.safeParse({ ...minimal, detectedMarkers: Array(5).fill(marker) }).success).toBe(false);
    expect(AnalysisResultSchema.safeParse({ ...minimal, summary: "x".repeat(241) }).success).toBe(false);
    expect(
      AnalysisResultSchema.safeParse({ ...minimal, detectedMarkers: [{ ...marker, sourceIds: [] }] }).success,
    ).toBe(false);
  });

  it("all prewritten fixtures are schema-valid and cite only inventory IDs", () => {
    for (const c of SYNTHETIC_CASES) {
      expect(AnalysisResultSchema.safeParse(c.prewrittenResult).success, c.id).toBe(true);
      expect(findUnknownSourceIds(c.prewrittenResult.detectedMarkers.flatMap((m) => m.sourceIds))).toEqual([]);
      expect(IntakeSchema.safeParse(c.intake).success).toBe(true);
    }
  });
});

describe("API response union", () => {
  it("never accepts both data and error", () => {
    const both = {
      success: true,
      requestId: "abcdefgh",
      source: "live",
      data: SYNTHETIC_CASES[0].prewrittenResult,
      error: { code: "UPSTREAM_ERROR", message: "x", retryable: true },
    };
    expect(AnalyzeResponseSchema.safeParse(both).success).toBe(false);
    expect(AnalyzeResponseSchema.safeParse({ ...both, source: "fixture", error: undefined }).success).toBe(false);
  });
});

describe("fixture mode", () => {
  it("returns the matching prewritten result only for the exact unedited case", () => {
    for (const c of SYNTHETIC_CASES) {
      expect(fixtureResultFor(c.id, intakeToForm(c.intake))).toBe(c.prewrittenResult);
    }
    const a = SYNTHETIC_CASES[0];
    const edited = { ...intakeToForm(a.intake), heartRate: "97" };
    expect(fixtureResultFor(a.id, edited)).toBeNull();
    // A different case's intake never receives another case's response.
    expect(fixtureResultFor(a.id, intakeToForm(SYNTHETIC_CASES[1].intake))).toBeNull();
    expect(fixtureResultFor(null, intakeToForm(a.intake))).toBeNull();
  });
});
