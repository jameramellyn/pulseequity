"use client";

import { useState } from "react";
import type { ClientError } from "@/lib/analyze-client";
import { FIXTURE_LABEL, getCase } from "@/lib/fixtures";
import { getReference } from "@/lib/references";
import type { AnalysisResult, ConcernLevel } from "@/lib/schemas";
import { CONCERN_LABELS, buildSummaryText, sourceLabel } from "@/lib/summary";
import { Icons, sectionHeaderClass } from "./ui";

export type DashboardState =
  | { kind: "idle"; note?: string }
  | { kind: "loading" }
  | {
      kind: "result";
      source: "live" | "fixture";
      fixtureId?: string;
      data: AnalysisResult;
      missing: string[];
      latencyMs?: number;
    }
  | { kind: "error"; error: ClientError };

interface Props {
  state: DashboardState;
  canRetry: boolean;
  onRetry: () => void;
}

/** Colour is reserved for the concern level. */
export const CONCERN_DISPLAY: Record<
  ConcernLevel,
  { Icon: (typeof Icons)[keyof typeof Icons]; short: string; detail: string; panel: string; accent: string }
> = {
  elevated_concern: {
    Icon: Icons.elevated,
    short: "Elevated concern",
    detail: "Category describes this prototype's findings against its references, not clinical acuity.",
    panel: "border-red-700 bg-red-50 text-red-950",
    accent: "border-l-red-700",
  },
  possible_concern: {
    Icon: Icons.possible,
    short: "Possible concern",
    detail: "Category describes this prototype's findings against its references, not clinical acuity.",
    panel: "border-amber-600 bg-amber-50 text-amber-950",
    accent: "border-l-amber-600",
  },
  no_specific_markers_identified: {
    Icon: Icons.none,
    short: "No specific markers identified",
    detail: "This does not rule out cardiac disease and does not establish urgency or lack of urgency.",
    panel: "border-slate-500 bg-slate-100 text-slate-900",
    accent: "border-l-slate-400",
  },
  insufficient_information: {
    Icon: Icons.insufficient,
    short: "Insufficient information",
    detail: "The submitted intake was too limited for this prototype to check against its references.",
    panel: "border-slate-500 bg-slate-100 text-slate-900",
    accent: "border-l-slate-400",
  },
};

export default function AlertDashboard({ state, canRetry, onRetry }: Props) {
  return (
    <section
      id="dashboard"
      aria-labelledby="dashboard-heading"
      className="scroll-mt-24 rounded-sm border border-slate-300 bg-white"
    >
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-3 py-1.5">
        <h2 id="dashboard-heading" className={sectionHeaderClass}>
          Clinical decision support
        </h2>
        {state.kind === "result" && (
          <CopySummaryButton key={`${state.source}:${state.fixtureId ?? ""}:${state.data.summary}`} state={state} />
        )}
      </div>
      <div className="p-3" aria-live="polite" aria-busy={state.kind === "loading"}>
        <DashboardBody state={state} canRetry={canRetry} onRetry={onRetry} />
      </div>
      <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
        Supplements clinician judgment. Does not diagnose, rule out disease, assign ESI, order tests, or route patients.
        Synthetic demonstration only.
      </p>
    </section>
  );
}

function DashboardBody({ state, canRetry, onRetry }: Props) {
  if (state.kind === "idle") {
    return (
      <div className="text-sm text-slate-700">
        {state.note ? (
          <p className="mb-2 flex items-start gap-1.5 font-medium text-slate-900">
            <Icons.info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-500" />
            {state.note}
          </p>
        ) : null}
        <p>Select a patient scenario or complete the intake to see decision support.</p>
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-800">
        <Icons.loading size={16} aria-hidden="true" className="animate-spin text-navy-800" />
        Analyzing with live Claude… Standard triage must not wait for this tool.
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div role="alert" className="rounded-sm border border-red-700 bg-red-50 p-3 text-sm text-red-950">
        <p className="flex items-center gap-1.5 font-semibold">
          <Icons.error size={16} aria-hidden="true" />
          Analysis unavailable ({state.error.code})
        </p>
        <p className="mt-1">{state.error.message}</p>
        <p className="mt-1 text-xs">No alert is shown. Nothing was substituted for the live result.</p>
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-sm bg-navy-800 px-3 py-1 text-sm font-semibold text-white hover:bg-navy-900"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return <ResultView state={state} />;
}

function ResultView({ state }: { state: Extract<DashboardState, { kind: "result" }> }) {
  const { data, source, fixtureId, missing, latencyMs } = state;
  const concern = CONCERN_DISPLAY[data.concernLevel];
  const citedIds = [...new Set(data.detectedMarkers.flatMap((m) => m.sourceIds))];
  const SourceIcon = source === "fixture" ? Icons.fixture : Icons.live;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 rounded-sm border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
          <SourceIcon size={13} aria-hidden="true" />
          {source === "fixture"
            ? `${FIXTURE_LABEL} (${getCase(fixtureId ?? "")?.label ?? fixtureId})`
            : `Live Claude response${latencyMs !== undefined ? ` · ${(latencyMs / 1000).toFixed(1)} s` : ""}`}
        </p>
      </div>

      <div className={`rounded-sm border-l-[6px] px-3 py-3 ${concern.panel}`}>
        <p className="flex items-center gap-2 text-lg font-bold leading-snug">
          <concern.Icon size={20} aria-hidden="true" className="shrink-0" />
          {CONCERN_LABELS[data.concernLevel]}
        </p>
        <p className="mt-1 text-xs">{concern.detail}</p>
        <p className="mt-2 leading-relaxed">{data.summary}</p>
      </div>

      <div className="rounded-sm border border-slate-300 border-l-4 border-l-navy-800 bg-slate-50 px-3 py-2">
        <p className={sectionHeaderClass}>Recommended next step</p>
        <p className="mt-0.5 text-base font-semibold text-slate-900">{data.recommendedAction}</p>
      </div>

      <hr className="border-slate-200" />

      <div>
        <h3 className={sectionHeaderClass}>Findings ({data.detectedMarkers.length})</h3>
        {data.detectedMarkers.length === 0 ? (
          <p className="mt-1 text-slate-700">None identified against the supplied references.</p>
        ) : (
          <>
          <ul className="mt-1.5 flex flex-col gap-2 sm:hidden">
            {data.detectedMarkers.map((m, i) => (
              <li key={i} className={`rounded-sm border border-l-4 border-slate-200 px-3 py-2 text-xs ${concern.accent}`}>
                <p className="text-sm font-semibold text-slate-900">{m.marker}</p>
                <p className="mt-0.5 leading-relaxed text-slate-700">{m.explanation}</p>
                <p className="mt-1.5 text-slate-600">
                  Intake evidence: <q className="font-mono text-[11px] text-slate-800">{stripQuotes(m.inputEvidence)}</q>
                </p>
                <p className="mt-1 text-slate-600">
                  Source:{" "}
                  {m.sourceIds.map((id) => (
                    <abbr key={id} title={getReference(id)?.title ?? id} className="mr-1 no-underline">
                      {sourceLabel(id)}
                    </abbr>
                  ))}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-left text-xs">
              <caption className="sr-only">Findings linked to submitted intake evidence and reference sources</caption>
              <thead>
                <tr className="border-b border-slate-300 text-slate-600">
                  <th scope="col" className="py-1 pl-2 pr-2 font-semibold">Marker</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Intake evidence</th>
                  <th scope="col" className="py-1 pr-1 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.detectedMarkers.map((m, i) => (
                  <tr key={i} className="border-b border-slate-200 align-top">
                    <td className={`border-l-4 py-1.5 pl-2 pr-2 ${concern.accent}`}>
                      <span className="block text-sm font-semibold text-slate-900">{m.marker}</span>
                      <span className="block leading-relaxed text-slate-700">{m.explanation}</span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <q className="font-mono text-[11px] text-slate-800">{stripQuotes(m.inputEvidence)}</q>
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-1 text-slate-700">
                      {m.sourceIds.map((id) => (
                        <abbr key={id} title={getReference(id)?.title ?? id} className="mr-1 no-underline">
                          {sourceLabel(id)}
                        </abbr>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {data.potentialDismissalPattern && (
        <div className="rounded-sm border border-slate-300 border-l-4 border-l-slate-500 bg-white px-3 py-2">
          <h3 className={sectionHeaderClass}>Possible dismissal pattern</h3>
          <p className="mt-0.5 text-slate-900">{data.potentialDismissalPattern}</p>
          <p className="mt-1 text-xs text-slate-600">Describes an attribution risk, not proven clinician bias.</p>
        </div>
      )}

      <div>
        <h3 className={sectionHeaderClass}>Limitations &amp; unknowns</h3>
        <ul className="mt-1 list-disc pl-5 text-xs leading-relaxed text-slate-500">
          {data.limitations.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
          {missing.length > 0 && <li>Not recorded in intake: {missing.join(", ")}.</li>}
          <li>Not validated; no clinical accuracy or safety has been demonstrated.</li>
        </ul>
      </div>

      {citedIds.length > 0 && (
        <p className="text-xs text-slate-600">
          Cited reference{citedIds.length > 1 ? "s" : ""}:{" "}
          {citedIds.map((id) => {
            const ref = getReference(id);
            return ref ? (
              <a key={id} href={ref.url} target="_blank" rel="noopener noreferrer" className="underline">
                {ref.publisher}, “{ref.title}”
              </a>
            ) : (
              <span key={id}>{id}</span>
            );
          })}{" "}
          (attribution only; does not prove each statement is supported).
        </p>
      )}
    </div>
  );
}

/** Evidence often arrives already quoted; <q> adds its own quotation marks. */
function stripQuotes(text: string): string {
  return text.replace(/^["“'‘]+|["”'’]+$/g, "").trim() || text;
}

/** Header action: copies a plain-text note of the current result. Rendered only when a result exists. */
function CopySummaryButton({ state }: { state: Extract<DashboardState, { kind: "result" }> }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildSummaryText(state.data, { source: state.source, missing: state.missing }));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    setTimeout(() => setCopyStatus("idle"), 2500);
  }

  return (
    <span className="flex items-center gap-2">
      <span role="status" className="text-xs text-slate-600">
        {copyStatus === "copied" ? "Summary copied" : copyStatus === "failed" ? "Copy failed — select text manually" : ""}
      </span>
      <button
        type="button"
        onClick={copySummary}
        className="flex items-center gap-1 rounded-sm border border-slate-400 bg-white px-2 py-0.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
      >
        {copyStatus === "copied" ? <Icons.check size={13} aria-hidden="true" /> : <Icons.copy size={13} aria-hidden="true" />}
        Copy summary
      </button>
    </span>
  );
}
