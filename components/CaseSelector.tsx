"use client";

import { SYNTHETIC_CASES } from "@/lib/fixtures";
import type { Mode } from "@/lib/request-tracker";
import { Icons, InfoTip, sectionHeaderClass } from "./ui";

interface Props {
  mode: Mode;
  activeCaseId: string | null;
  onSelect: (caseId: string) => void;
}

/** Compact toolbar group of synthetic patient scenarios. */
export default function CaseSelector({ mode, activeCaseId, onSelect }: Props) {
  return (
    <div role="group" aria-labelledby="scenarios-label" className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="flex items-center gap-1">
        <span id="scenarios-label" className={sectionHeaderClass}>
          Patient scenarios
        </span>
        <InfoTip id="scenarios-tip" label="Patient scenarios">
          {mode === "live"
            ? "Selecting a scenario loads it into the form and sends it to live Claude immediately (a paid API call)."
            : "Selecting a scenario loads it and shows its prewritten demo response (no Claude call)."}
        </InfoTip>
      </span>
      {SYNTHETIC_CASES.map((c) => {
        const active = c.id === activeCaseId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-pressed={active}
            aria-describedby="scenarios-tip"
            title={c.description}
            className={`flex items-center gap-1 rounded-sm border px-2 py-1 text-xs ${
              active
                ? "border-navy-800 bg-navy-50 font-semibold text-navy-900"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
            }`}
          >
            {active && <Icons.check size={12} aria-hidden="true" />}
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
