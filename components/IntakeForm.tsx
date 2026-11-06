"use client";

import type { FieldErrors, IntakeFormValues } from "@/lib/intake-form";
import type { Mode } from "@/lib/request-tracker";
import type { SmokingStatus, TriState } from "@/lib/schemas";

interface Props {
  values: IntakeFormValues;
  errors: FieldErrors;
  mode: Mode;
  pending: boolean;
  onChange: (next: IntakeFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onReset: () => void;
}

type MeasurementKey = "heartRate" | "systolicBP" | "diastolicBP" | "respiratoryRate";

const MEASUREMENTS: { key: MeasurementKey; label: string; unit: string }[] = [
  { key: "heartRate", label: "Heart rate", unit: "bpm" },
  { key: "systolicBP", label: "Systolic BP", unit: "mmHg" },
  { key: "diastolicBP", label: "Diastolic BP", unit: "mmHg" },
  { key: "respiratoryRate", label: "Respiratory rate", unit: "breaths/min" },
];

const TRI_FIELDS: { key: "diabetes" | "hypertension" | "priorCardiacHistory"; label: string }[] = [
  { key: "diabetes", label: "Diabetes" },
  { key: "hypertension", label: "Hypertension" },
  { key: "priorCardiacHistory", label: "Prior cardiac history" },
];

const TRI_OPTIONS: { value: TriState; label: string }[] = [
  { value: "unknown", label: "Unknown" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const SMOKING_OPTIONS: { value: SmokingStatus; label: string }[] = [
  { value: "unknown", label: "Unknown" },
  { value: "current", label: "Current" },
  { value: "former", label: "Former" },
  { value: "never", label: "Never" },
];

/** Clinical-tool section header: small, uppercase, tracked. */
export const sectionHeaderClass = "text-xs font-semibold uppercase tracking-wider text-slate-500";

const inputClass =
  "w-full rounded-md border border-slate-400 bg-white px-2 py-1.5 text-sm text-slate-900 aria-[invalid=true]:border-red-600";

const fieldLabelClass = "mb-1 block text-xs font-medium text-slate-700";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs font-medium text-red-700">
      ⚠ {message}
    </p>
  );
}

export default function IntakeForm({ values, errors, mode, pending, onChange, onSubmit, onCancel, onReset }: Props) {
  const set = <K extends keyof IntakeFormValues>(key: K, v: IntakeFormValues[K]) => onChange({ ...values, [key]: v });
  const setCo = <K extends keyof IntakeFormValues["comorbidities"]>(key: K, v: IntakeFormValues["comorbidities"][K]) =>
    onChange({ ...values, comorbidities: { ...values.comorbidities, [key]: v } });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="rounded-lg border border-slate-300 bg-white p-4"
      aria-labelledby="intake-heading"
    >
      <h2 id="intake-heading" className={`mb-4 ${sectionHeaderClass}`}>
        Intake
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="age" className="mb-1 block text-sm font-medium text-slate-800">
            Age (years) <span aria-hidden="true">*</span>
            <span className="sr-only"> required</span>
          </label>
          <input
            id="age"
            inputMode="numeric"
            autoComplete="off"
            className={inputClass}
            value={values.age}
            onChange={(e) => set("age", e.target.value)}
            aria-invalid={!!errors.age}
            aria-describedby={errors.age ? "age-error" : "age-hint"}
          />
          <p id="age-hint" className="mt-1 text-xs text-slate-500">
            Adults 18–110 (demo scope)
          </p>
          <FieldError id="age-error" message={errors.age} />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="chiefComplaint" className="mb-1 block text-sm font-medium text-slate-800">
          Chief complaint <span aria-hidden="true">*</span>
          <span className="sr-only"> required</span>
        </label>
        <textarea
          id="chiefComplaint"
          rows={3}
          maxLength={1000}
          placeholder="Describe in the patient's own words"
          className={`${inputClass} leading-relaxed`}
          value={values.chiefComplaint}
          onChange={(e) => set("chiefComplaint", e.target.value)}
          aria-invalid={!!errors.chiefComplaint}
          aria-describedby={errors.chiefComplaint ? "cc-error" : "cc-hint"}
        />
        <p id="cc-hint" className="mt-1 text-xs text-slate-500">
          Describe in the patient&apos;s own words · {values.chiefComplaint.length}/1000 characters · synthetic text only
        </p>
        <FieldError id="cc-error" message={errors.chiefComplaint} />
      </div>

      <fieldset className="mt-5 border-t border-slate-200 pt-4" aria-describedby="vitals-hint">
        <legend className={`float-left w-full ${sectionHeaderClass}`}>Vital signs</legend>
        <p id="vitals-hint" className="clear-both mb-3 pt-1 text-xs text-slate-500">
          Leave blank if not measured
        </p>
        <div className="grid grid-cols-2 gap-3">
          {MEASUREMENTS.map((m) => (
            <div key={m.key}>
              <label htmlFor={m.key} className={fieldLabelClass}>
                {m.label} <span className="text-slate-500">({m.unit})</span>
              </label>
              <input
                id={m.key}
                inputMode="decimal"
                autoComplete="off"
                placeholder="not measured"
                className={inputClass}
                value={values[m.key]}
                onChange={(e) => set(m.key, e.target.value)}
                aria-invalid={!!errors[m.key]}
                aria-describedby={errors[m.key] ? `${m.key}-error` : undefined}
              />
              <FieldError id={`${m.key}-error`} message={errors[m.key]} />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5 border-t border-slate-200 pt-4" aria-describedby="risk-hint">
        <legend className={`float-left w-full ${sectionHeaderClass}`}>Risk factors</legend>
        <p id="risk-hint" className="clear-both mb-3 pt-1 text-xs text-slate-500">
          Unknown is not the same as no
        </p>
        <div className="grid grid-cols-2 gap-3">
          {TRI_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className={fieldLabelClass}>
                {f.label}
              </label>
              <select
                id={f.key}
                className={inputClass}
                value={values.comorbidities[f.key]}
                onChange={(e) => setCo(f.key, e.target.value as TriState)}
              >
                {TRI_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div>
            <label htmlFor="smokingStatus" className={fieldLabelClass}>
              Smoking
            </label>
            <select
              id="smokingStatus"
              className={inputClass}
              value={values.comorbidities.smokingStatus}
              onChange={(e) => setCo("smokingStatus", e.target.value as SmokingStatus)}
            >
              {SMOKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <FieldError id="co-error" message={errors.comorbidities} />
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        {mode === "live" ? (
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {pending ? "Running…" : "Run cardiac check"}
          </button>
        ) : (
          <p className="text-sm text-slate-700">
            Prewritten mode shows responses only for unedited predefined cases. Switch to <strong>Live AI</strong> to analyze
            other input.
          </p>
        )}
        {pending && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-400 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-slate-400 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Reset form
        </button>
      </div>
    </form>
  );
}
