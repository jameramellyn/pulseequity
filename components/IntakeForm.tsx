"use client";

import { softWarnings } from "@/lib/entry-ranges";
import type { FieldErrors, IntakeFormValues } from "@/lib/intake-form";
import type { Mode } from "@/lib/request-tracker";
import type { SmokingStatus, TriState } from "@/lib/schemas";
import { Icons, InfoTip, Panel, SegmentedRadio, inputClass, type SegmentOption } from "./ui";

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

type VitalKey = "heartRate" | "systolicBP" | "diastolicBP" | "respiratoryRate";

const TRI_FIELDS: { key: "diabetes" | "hypertension" | "priorCardiacHistory"; label: string }[] = [
  { key: "diabetes", label: "Diabetes" },
  { key: "hypertension", label: "Hypertension" },
  { key: "priorCardiacHistory", label: "Prior cardiac history" },
];

const TRI_OPTIONS: readonly SegmentOption<TriState>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Unknown" },
];

const SMOKING_OPTIONS: readonly SegmentOption<SmokingStatus>[] = [
  { value: "current", label: "Current" },
  { value: "former", label: "Former" },
  { value: "never", label: "Never" },
  { value: "unknown", label: "Unknown" },
];

const labelClass = "text-xs font-medium text-slate-700";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 flex items-start gap-1 text-xs font-medium text-red-700">
      <Icons.warning size={13} aria-hidden="true" className="mt-px shrink-0" />
      {message}
    </p>
  );
}

function SoftWarning({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 flex items-start gap-1 text-xs text-slate-700">
      <Icons.info size={13} aria-hidden="true" className="mt-px shrink-0 text-slate-500" />
      {message}
    </p>
  );
}

const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

export default function IntakeForm({ values, errors, mode, pending, onChange, onSubmit, onCancel, onReset }: Props) {
  const set = <K extends keyof IntakeFormValues>(key: K, v: IntakeFormValues[K]) => onChange({ ...values, [key]: v });
  const setCo = <K extends keyof IntakeFormValues["comorbidities"]>(key: K, v: IntakeFormValues["comorbidities"][K]) =>
    onChange({ ...values, comorbidities: { ...values.comorbidities, [key]: v } });
  const warnings = softWarnings(values);

  const vitalInput = (key: VitalKey, label: string, unit: string | null, opts: { visibleLabel?: boolean } = {}) => (
    <div className={opts.visibleLabel === false ? "min-w-0 flex-1" : undefined}>
      <label htmlFor={key} className={opts.visibleLabel === false ? "sr-only" : `mb-1 block ${labelClass}`}>
        {label}
        {unit ? <span className="sr-only"> ({unit})</span> : null}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={key}
          inputMode="decimal"
          autoComplete="off"
          placeholder="—"
          className={`${inputClass} tabular-nums`}
          value={values[key]}
          onChange={(e) => set(key, e.target.value)}
          aria-invalid={!!errors[key]}
          aria-describedby={describedBy("vitals-tip", errors[key] && `${key}-error`, warnings[key] && `${key}-warn`)}
        />
        {unit ? (
          <span className="shrink-0 text-xs text-slate-500" aria-hidden="true">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      aria-labelledby="intake-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="intake-heading" className="sr-only">
        Intake
      </h2>

      <Panel id="panel-complaint" title="Presenting complaint">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <div>
            <div className="mb-1 flex items-center gap-1">
              <label htmlFor="age" className={labelClass}>
                Age (years) <span aria-hidden="true">*</span>
                <span className="sr-only"> required</span>
              </label>
              <InfoTip id="age-tip" label="Age">
                Adults 18–110 only. This is a demo scope choice, not a clinical threshold.
              </InfoTip>
            </div>
            <input
              id="age"
              inputMode="numeric"
              autoComplete="off"
              className={`${inputClass} tabular-nums`}
              value={values.age}
              onChange={(e) => set("age", e.target.value)}
              aria-invalid={!!errors.age}
              aria-describedby={describedBy("age-tip", errors.age && "age-error")}
            />
            <FieldError id="age-error" message={errors.age} />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1">
              <label htmlFor="chiefComplaint" className={labelClass}>
                Chief complaint <span aria-hidden="true">*</span>
                <span className="sr-only"> required</span>
              </label>
              <InfoTip id="cc-tip" label="Chief complaint">
                Describe in the patient&apos;s own words. Synthetic text only; up to 1000 characters.
              </InfoTip>
              {values.chiefComplaint.length > 800 && (
                <span className="ml-auto text-xs text-slate-500">{values.chiefComplaint.length}/1000</span>
              )}
            </div>
            <textarea
              id="chiefComplaint"
              rows={3}
              maxLength={1000}
              placeholder="Describe in the patient's own words"
              className={`${inputClass} leading-relaxed`}
              value={values.chiefComplaint}
              onChange={(e) => set("chiefComplaint", e.target.value)}
              aria-invalid={!!errors.chiefComplaint}
              aria-describedby={describedBy("cc-tip", errors.chiefComplaint && "cc-error")}
            />
            <FieldError id="cc-error" message={errors.chiefComplaint} />
          </div>
        </div>
      </Panel>

      <Panel
        id="panel-vitals"
        title="Vital signs"
        aside={
          <InfoTip id="vitals-tip" label="Vital signs">
            Leave blank if not measured. Blank is sent as &quot;not measured&quot;, never as zero. Range notes only flag
            possible typos; they are not clinical interpretation and do not block submission.
          </InfoTip>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)]">
          <div>
            {vitalInput("heartRate", "Heart rate", "bpm")}
            <FieldError id="heartRate-error" message={errors.heartRate} />
            <SoftWarning id="heartRate-warn" message={warnings.heartRate} />
          </div>
          <fieldset>
            <legend className={`mb-1 ${labelClass}`}>Blood pressure</legend>
            <div className="flex items-center gap-1">
              {vitalInput("systolicBP", "Systolic BP", null, { visibleLabel: false })}
              <span className="text-slate-500" aria-hidden="true">
                /
              </span>
              {vitalInput("diastolicBP", "Diastolic BP", null, { visibleLabel: false })}
              <span className="shrink-0 text-xs text-slate-500">mmHg</span>
            </div>
            <FieldError id="systolicBP-error" message={errors.systolicBP} />
            <FieldError id="diastolicBP-error" message={errors.diastolicBP} />
            <SoftWarning id="systolicBP-warn" message={warnings.systolicBP} />
            <SoftWarning id="diastolicBP-warn" message={warnings.diastolicBP} />
          </fieldset>
          <div>
            {vitalInput("respiratoryRate", "Respiratory rate", "/min")}
            <FieldError id="respiratoryRate-error" message={errors.respiratoryRate} />
            <SoftWarning id="respiratoryRate-warn" message={warnings.respiratoryRate} />
          </div>
        </div>
      </Panel>

      <Panel id="panel-risk" title="Risk factors / comorbidities">
        <p className="mb-3 text-xs font-medium text-slate-700">Unknown is not the same as no.</p>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {TRI_FIELDS.map((f) => (
            <SegmentedRadio
              key={f.key}
              legend={f.label}
              name={f.key}
              value={values.comorbidities[f.key]}
              options={TRI_OPTIONS}
              onChange={(v) => setCo(f.key, v)}
            />
          ))}
          <SegmentedRadio
            legend="Smoking"
            name="smokingStatus"
            value={values.comorbidities.smokingStatus}
            options={SMOKING_OPTIONS}
            onChange={(v) => setCo("smokingStatus", v)}
          />
        </div>
        <FieldError id="co-error" message={errors.comorbidities} />
      </Panel>

      <div className="flex flex-wrap items-center gap-2 rounded-sm border border-slate-300 bg-white px-3 py-2">
        {mode === "live" ? (
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-navy-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {pending ? "Running…" : "Run cardiac check"}
          </button>
        ) : (
          <p className="text-xs text-slate-700">
            Prewritten mode shows responses only for unedited predefined cases. Switch to <strong>Live AI</strong> to analyze
            other input.
          </p>
        )}
        {pending && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded-sm border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
        >
          Reset form
        </button>
      </div>
    </form>
  );
}
