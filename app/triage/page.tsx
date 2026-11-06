"use client";

import { useRef, useState } from "react";
import AlertDashboard, { type DashboardState } from "@/components/AlertDashboard";
import CaseSelector from "@/components/CaseSelector";
import IntakeForm from "@/components/IntakeForm";
import PatientBanner from "@/components/PatientBanner";
import StatusStrip from "@/components/StatusStrip";
import { SegmentedRadio, sectionHeaderClass } from "@/components/ui";
import { requestAnalysis } from "@/lib/analyze-client";
import { fixtureResultFor, getCase } from "@/lib/fixtures";
import {
  emptyFormValues,
  formToIntake,
  intakeToForm,
  missingInformation,
  snapshotKey,
  type FieldErrors,
  type IntakeFormValues,
} from "@/lib/intake-form";
import { REFERENCE_INVENTORY_VERSION } from "@/lib/references";
import { RequestTracker, type Mode } from "@/lib/request-tracker";
import { APP_VERSION, LAST_UPDATED } from "@/lib/version";

export default function Home() {
  const [mode, setMode] = useState<Mode>("live");
  const [form, setForm] = useState<IntakeFormValues>(emptyFormValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [dash, setDash] = useState<DashboardState>({ kind: "idle" });
  const [pending, setPending] = useState(false);
  const [tracker] = useState(() => new RequestTracker());

  // Synchronously updated mirrors used by the stale-response guard.
  // (React state may not yet reflect a just-made change when a response lands.)
  const formRef = useRef(form);
  const modeRef = useRef(mode);

  function commitForm(next: IntakeFormValues) {
    formRef.current = next;
    setForm(next);
  }

  function clearResult(note?: string) {
    tracker.invalidate();
    setPending(false);
    setDash({ kind: "idle", note });
  }

  async function submitLive(values: IntakeFormValues) {
    if (modeRef.current !== "live") return;
    const conversion = formToIntake(values);
    if (!conversion.ok) {
      setErrors(conversion.fieldErrors);
      clearResult("Fix the highlighted fields before analyzing.");
      return;
    }
    const key = snapshotKey(values);
    if (tracker.isPendingFor(key, "live")) return; // duplicate identical submission

    const ticket = tracker.begin(key, "live");
    setErrors({});
    setPending(true);
    setDash({ kind: "loading" });

    const outcome = await requestAnalysis(ticket.requestId, conversion.intake, ticket.signal);

    // Commit only if this request is still the active one for the current input and mode.
    if (!tracker.isCurrent(ticket, snapshotKey(formRef.current), modeRef.current)) return;
    tracker.finish(ticket);
    setPending(false);

    if (outcome.kind === "success") {
      setDash({
        kind: "result",
        source: "live",
        data: outcome.data,
        missing: missingInformation(conversion.intake),
        latencyMs: outcome.latencyMs,
      });
    } else if (outcome.kind === "error") {
      setDash({ kind: "error", error: outcome.error });
    } else {
      setDash({ kind: "idle", note: "Request cancelled." });
    }
  }

  function handleSelectCase(caseId: string) {
    const c = getCase(caseId);
    if (!c) return;
    const values = intakeToForm(c.intake);
    commitForm(values);
    setErrors({});
    setActiveCaseId(caseId);

    if (modeRef.current === "live") {
      // Submit the same snapshot directly; don't rely on just-updated React state.
      void submitLive(values);
      return;
    }
    tracker.invalidate();
    setPending(false);
    const result = fixtureResultFor(caseId, values);
    setDash(
      result
        ? { kind: "result", source: "fixture", fixtureId: caseId, data: result, missing: missingInformation(c.intake) }
        : { kind: "idle" },
    );
  }

  function handleFormChange(next: IntakeFormValues) {
    commitForm(next);
    if (activeCaseId) setActiveCaseId(null);
    if (pending || dash.kind !== "idle") {
      clearResult(
        modeRef.current === "fixture"
          ? "Input edited — prewritten response removed. Switch to Live AI to analyze edited input."
          : "Input changed — previous result cleared. Submit again to analyze.",
      );
    }
  }

  function handleModeChange(next: Mode) {
    if (next === modeRef.current) return;
    modeRef.current = next;
    setMode(next);
    setActiveCaseId(null);
    clearResult(next === "fixture" ? "Prewritten demo mode: select a predefined case." : "Live AI mode: submit or select a case.");
  }

  function handleReset() {
    commitForm(emptyFormValues());
    setErrors({});
    setActiveCaseId(null);
    clearResult();
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
          <h1 className="text-base font-bold tracking-tight">PulseEquity</h1>
          <span className="rounded-sm border border-white/50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider">
            Synthetic demo
          </span>
          <p className="text-xs text-slate-300">
            Not clinical software · no real patient data · parallel check for female-pattern cardiac presentations at
            triage intake
          </p>
        </div>
      </header>

      <PatientBanner values={form} />
      <StatusStrip state={dash} />

      <div className="mx-auto w-full max-w-7xl px-4 pt-2">
        <p className="rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800">
          <strong>Out of scope:</strong> unconscious, unresponsive, or severely altered patients. Standard emergency
          processes must never depend on this form or wait for AI output.
        </p>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pt-2">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2 rounded-sm border border-slate-300 bg-white px-3 py-2">
          <SegmentedRadio
            legend={<span className={sectionHeaderClass}>Mode</span>}
            name="mode"
            value={mode}
            options={[
              { value: "live", label: "Live AI (Claude)" },
              { value: "fixture", label: "Prewritten demo (no AI)" },
            ]}
            onChange={handleModeChange}
            size="xs"
          />
          <CaseSelector mode={mode} activeCaseId={activeCaseId} onSelect={handleSelectCase} />
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <IntakeForm
          values={form}
          errors={errors}
          mode={mode}
          pending={pending}
          onChange={handleFormChange}
          onSubmit={() => void submitLive(formRef.current)}
          onCancel={() => clearResult("Request cancelled. (The provider may still finish and bill the call.)")}
          onReset={handleReset}
        />

        <div className="lg:sticky lg:top-3 lg:self-start">
          <AlertDashboard
            state={dash}
            canRetry={mode === "live" && dash.kind === "error" && dash.error.retryable}
            onRetry={() => void submitLive(formRef.current)}
          />
        </div>
      </main>

      <footer className="border-t border-slate-300 bg-white">
        <p className="mx-auto max-w-7xl px-4 py-2 text-xs text-slate-600">
          PulseEquity v{APP_VERSION} · Reference inventory {REFERENCE_INVENTORY_VERSION} · Last updated {LAST_UPDATED} ·
          Synthetic demonstration only — not for clinical use.
        </p>
      </footer>
    </div>
  );
}
