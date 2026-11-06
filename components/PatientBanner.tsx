"use client";

import type { IntakeFormValues } from "@/lib/intake-form";

const withUnit = (v: string, unit: string) => (v.trim() === "" ? "—" : `${v.trim()} ${unit}`);

function truncate(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Read-only summary of the current form values, EHR patient-banner style. "—" = not entered. */
export default function PatientBanner({ values }: { values: IntakeFormValues }) {
  const sys = values.systolicBP.trim();
  const dia = values.diastolicBP.trim();
  const bp = sys || dia ? `${sys || "—"}/${dia || "—"} mmHg` : "—";
  const items: [string, string][] = [
    ["Age", withUnit(values.age, "y")],
    ["CC", truncate(values.chiefComplaint, 60)],
    ["HR", withUnit(values.heartRate, "bpm")],
    ["BP", bp],
    ["RR", withUnit(values.respiratoryRate, "/min")],
  ];
  return (
    <div className="border-b border-slate-300 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-0.5 px-4 py-1.5 text-xs text-slate-800">
        <span id="banner-label" className="font-semibold uppercase tracking-wider text-slate-500">
          Synthetic patient
        </span>
        <dl aria-labelledby="banner-label" className="contents">
          {items.map(([k, v]) => (
            <div key={k} className={`flex gap-1 ${k === "CC" ? "min-w-0 max-w-full sm:max-w-md" : ""}`}>
              <dt className="font-semibold text-slate-500">{k}</dt>
              <dd className={`tabular-nums ${k === "CC" ? "truncate" : ""}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
