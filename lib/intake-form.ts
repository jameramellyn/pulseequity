/**
 * Conversion between the editable form (all strings) and the Intake contract.
 * Blank numeric inputs become null — never zero. Unknown stays unknown.
 */
import { IntakeSchema, type Intake, type SmokingStatus, type TriState } from "./schemas";

export interface IntakeFormValues {
  age: string;
  chiefComplaint: string;
  heartRate: string;
  systolicBP: string;
  diastolicBP: string;
  respiratoryRate: string;
  comorbidities: {
    diabetes: TriState;
    hypertension: TriState;
    priorCardiacHistory: TriState;
    smokingStatus: SmokingStatus;
  };
}

export type FormField =
  | "age"
  | "chiefComplaint"
  | "heartRate"
  | "systolicBP"
  | "diastolicBP"
  | "respiratoryRate"
  | "comorbidities";

export type FieldErrors = Partial<Record<FormField, string>>;

export function emptyFormValues(): IntakeFormValues {
  return {
    age: "",
    chiefComplaint: "",
    heartRate: "",
    systolicBP: "",
    diastolicBP: "",
    respiratoryRate: "",
    comorbidities: {
      diabetes: "unknown",
      hypertension: "unknown",
      priorCardiacHistory: "unknown",
      smokingStatus: "unknown",
    },
  };
}

const NUMERIC_PATTERN = /^\d+(\.\d+)?$/;

type ParsedNumber = { ok: true; value: number | null } | { ok: false };

/** Blank → null. Only plain decimal digits are accepted (no "1e3", no "abc"). */
export function parseOptionalNumber(raw: string): ParsedNumber {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (!NUMERIC_PATTERN.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false };
}

export type FormConversion =
  | { ok: true; intake: Intake }
  | { ok: false; fieldErrors: FieldErrors };

const MEASUREMENT_FIELDS = ["heartRate", "systolicBP", "diastolicBP", "respiratoryRate"] as const;

export function formToIntake(values: IntakeFormValues): FormConversion {
  const fieldErrors: FieldErrors = {};

  // Age is required.
  let age: number | null = null;
  const ageParsed = parseOptionalNumber(values.age);
  if (!ageParsed.ok) fieldErrors.age = "Enter age as a whole number.";
  else if (ageParsed.value === null) fieldErrors.age = "Age is required.";
  else age = ageParsed.value;

  const measurements: Record<(typeof MEASUREMENT_FIELDS)[number], number | null> = {
    heartRate: null,
    systolicBP: null,
    diastolicBP: null,
    respiratoryRate: null,
  };
  for (const field of MEASUREMENT_FIELDS) {
    const parsed = parseOptionalNumber(values[field]);
    if (!parsed.ok) fieldErrors[field] = "Enter a positive number, or leave blank if not measured.";
    else measurements[field] = parsed.value;
  }

  const candidate = {
    age,
    chiefComplaint: values.chiefComplaint,
    ...measurements,
    comorbidities: { ...values.comorbidities },
  };

  const result = IntakeSchema.safeParse(candidate);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as FormField | undefined;
      if (!field || fieldErrors[field]) continue;
      fieldErrors[field] = messageFor(field);
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !result.success) {
    return { ok: false, fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : { age: "Invalid input." } };
  }
  return { ok: true, intake: result.data };
}

function messageFor(field: FormField): string {
  switch (field) {
    case "age":
      return "Age must be a whole number from 18 to 110 (adults only in this demo).";
    case "chiefComplaint":
      return "Chief complaint must be 3–1000 characters.";
    case "comorbidities":
      return "Choose a value for each risk factor (unknown is allowed).";
    default:
      return "Enter a positive number, or leave blank if not measured.";
  }
}

function numToString(n: number | null): string {
  return n === null ? "" : String(n);
}

export function intakeToForm(intake: Intake): IntakeFormValues {
  return {
    age: String(intake.age),
    chiefComplaint: intake.chiefComplaint,
    heartRate: numToString(intake.heartRate),
    systolicBP: numToString(intake.systolicBP),
    diastolicBP: numToString(intake.diastolicBP),
    respiratoryRate: numToString(intake.respiratoryRate),
    comorbidities: { ...intake.comorbidities },
  };
}

/** Stable key for comparing form snapshots (fixed key order). */
export function snapshotKey(values: IntakeFormValues): string {
  return JSON.stringify([
    values.age,
    values.chiefComplaint,
    values.heartRate,
    values.systolicBP,
    values.diastolicBP,
    values.respiratoryRate,
    values.comorbidities.diabetes,
    values.comorbidities.hypertension,
    values.comorbidities.priorCardiacHistory,
    values.comorbidities.smokingStatus,
  ]);
}

const FIELD_LABELS: Record<string, string> = {
  heartRate: "Heart rate",
  systolicBP: "Systolic BP",
  diastolicBP: "Diastolic BP",
  respiratoryRate: "Respiratory rate",
  diabetes: "Diabetes",
  hypertension: "Hypertension",
  priorCardiacHistory: "Prior cardiac history",
  smokingStatus: "Smoking status",
};

/** Deterministic list of inputs recorded as unknown / not measured. */
export function missingInformation(intake: Intake): string[] {
  const missing: string[] = [];
  for (const field of MEASUREMENT_FIELDS) {
    if (intake[field] === null) missing.push(FIELD_LABELS[field]);
  }
  for (const [key, value] of Object.entries(intake.comorbidities)) {
    if (value === "unknown") missing.push(FIELD_LABELS[key]);
  }
  return missing;
}
