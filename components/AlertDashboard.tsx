"use client";

import type { ClientError } from "@/lib/analyze-client";
import { FIXTURE_LABEL, getCase } from "@/lib/fixtures";
import { getReference } from "@/lib/references";
import type { AnalysisResult, ConcernLevel } from "@/lib/schemas";

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

const CONCERN_DISPLAY: Record<
  ConcernLevel,
  { icon: string; title: string; detail: string; className: string }
> = {
  elevated_concern: {
    icon: "▲",
    title: "Elevated concern — reference-listed markers found",
    detail: "Multiple submitted findings match symptoms in the reference context.",
    className: "border-red-700 bg-red-50 text-red-950",
  },
  possible_concern: {
    icon: "◆",
    title: "Possible concern — some reference-listed markers found",
    detail: "Some submitted findings match symptoms in the reference context.",
    className: "border-amber-600 bg-amber-50 text-amber-950",
  },
  no_specific_markers_identified: {
    icon: "○",
    title: "No specific markers identified by this prototype",
    detail: "This does not rule out cardiac disease and does not establish urgency or lack of urgency.",
    className: "border-slate-500 bg-slate-100 text-slate-900",
  },
  insufficient_information: {
    icon: "?",
    title: "Insufficient information",
    detail: "The submitted intake was too limited for this prototype to check against its references.",
    className: "border-slate-500 bg-slate-100 text-slate-900",
  },
};

export default function AlertDashboard({ state, canRetry, onRetry }: Props) {
  return (
    <section aria-labelledby="dashboard-heading" className="rounded-lg border border-slate-300 bg-white p-4">
      <h2 id="dashboard-heading" className="mb-3 text-base font-semibold text-slate-900">
        Decision-support alert
      </h2>
      <div aria-live="polite" aria-busy={state.kind === "loading"}>
        <DashboardBody state={state} canRetry={canRetry} onRetry={onRetry} />
      </div>
      <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-600">
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
        {state.note ? <p className="mb-2 font-medium text-slate-900">ℹ {state.note}</p> : null}
        <p>Select a synthetic case or complete the intake form to see an alert.</p>
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-800">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" aria-hidden="true" />
        Analyzing with live Claude… Standard triage must not wait for this tool.
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div role="alert" className="rounded-md border-2 border-red-700 bg-red-50 p-3 text-sm text-red-950">
        <p className="font-semibold">✕ Analysis unavailable ({state.error.code})</p>
        <p className="mt-1">{state.error.message}</p>
        <p className="mt-1 text-xs">No alert is shown. Nothing was substituted for the live result.</p>
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md bg-red-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-900"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const { data, source, fixtureId, missing, latencyMs } = state;
  const concern = CONCERN_DISPLAY[data.concernLevel];
  const citedIds = [...new Set(data.detectedMarkers.flatMap((m) => m.sourceIds))];

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p
        className={`rounded px-2 py-1 text-xs font-semibold ${
          source === "fixture" ? "bg-purple-100 text-purple-900" : "bg-blue-100 text-blue-900"
        }`}
      >
        {source === "fixture"
          ? `${FIXTURE_LABEL} (${getCase(fixtureId ?? "")?.label ?? fixtureId})`
          : `Live Claude response${latencyMs !== undefined ? ` · ${(latencyMs / 1000).toFixed(1)} s` : ""}`}
      </p>

      <div className={`rounded-md border-l-8 p-3 ${concern.className}`}>
        <p className="text-lg font-bold">
          <span aria-hidden="true">{concern.icon} </span>
          {concern.title}
        </p>
        <p className="mt-1 text-xs">{concern.detail}</p>
        <p className="mt-2">{data.summary}</p>
      </div>

      <div className="rounded-md border-2 border-blue-800 bg-blue-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">Suggested next step for clinician</p>
        <p className="mt-1 text-base font-semibold text-slate-900">{data.recommendedAction}</p>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900">Markers ({data.detectedMarkers.length})</h3>
        {data.detectedMarkers.length === 0 ? (
          <p className="text-slate-700">None identified against the supplied references.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-2">
            {data.detectedMarkers.map((m, i) => (
              <li key={i} className="rounded border border-slate-200 p-2">
                <p className="font-medium text-slate-900">• {m.marker}</p>
                <p className="text-slate-700">{m.explanation}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Intake evidence: <q>{m.inputEvidence}</q> · Source: {m.sourceIds.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.potentialDismissalPattern && (
        <div className="rounded border border-amber-500 bg-amber-50 p-2">
          <h3 className="font-semibold text-amber-950">Possible dismissal pattern</h3>
          <p className="text-amber-950">{data.potentialDismissalPattern}</p>
          <p className="mt-1 text-xs text-amber-900">Describes an attribution risk, not proven clinician bias.</p>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-slate-900">Limitations &amp; unknowns</h3>
        <ul className="mt-1 list-disc pl-5 text-slate-700">
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
