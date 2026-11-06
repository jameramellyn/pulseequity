"use client";

import { SYNTHETIC_CASES } from "@/lib/fixtures";
import type { Mode } from "@/lib/request-tracker";

interface Props {
  mode: Mode;
  activeCaseId: string | null;
  onSelect: (caseId: string) => void;
}

export default function CaseSelector({ mode, activeCaseId, onSelect }: Props) {
  return (
    <fieldset className="rounded-lg border border-slate-300 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">Synthetic cases</legend>
      <p className="mb-3 text-xs text-slate-600">
        {mode === "live"
          ? "Selecting a case loads it into the form and sends it to live Claude immediately."
          : "Selecting a case loads it and shows its prewritten demo response (no Claude call)."}
      </p>
      <div className="flex flex-col gap-2">
        {SYNTHETIC_CASES.map((c) => {
          const active = c.id === activeCaseId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              aria-pressed={active}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                active ? "border-blue-600 bg-blue-50" : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="block font-medium text-slate-900">
                {active ? "● " : ""}
                {c.label}
              </span>
              <span className="block text-xs text-slate-600">{c.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
