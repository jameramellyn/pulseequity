"use client";

import { CONCERN_DISPLAY, type DashboardState } from "./AlertDashboard";
import { Icons } from "./ui";

/**
 * Small-screen only: compact status near the top so the concern level is visible
 * without scrolling past the whole form. Wording deliberately differs from the
 * dashboard; the full result (and all disclaimers) stay in the dashboard.
 */
export default function StatusStrip({ state }: { state: DashboardState }) {
  if (state.kind === "idle") return null;

  let content: React.ReactNode;
  let tone = "border-slate-300 bg-white text-slate-800";
  if (state.kind === "loading") {
    content = (
      <>
        <Icons.loading size={14} aria-hidden="true" className="animate-spin" /> Check running…
      </>
    );
  } else if (state.kind === "error") {
    tone = "border-red-700 bg-red-50 text-red-950";
    content = (
      <>
        <Icons.error size={14} aria-hidden="true" /> Check failed — see details
      </>
    );
  } else {
    const c = CONCERN_DISPLAY[state.data.concernLevel];
    tone = c.panel;
    content = (
      <>
        <c.Icon size={14} aria-hidden="true" /> {c.short}
        {state.source === "fixture" ? <span className="font-normal"> · prewritten demo</span> : null}
      </>
    );
  }

  return (
    <div className="sticky top-0 z-20 px-4 pt-2 lg:hidden">
      <a
        href="#dashboard"
        className={`flex items-center justify-between gap-2 rounded-sm border border-l-4 px-3 py-1.5 text-sm font-semibold shadow-sm ${tone}`}
      >
        <span className="flex items-center gap-1.5">{content}</span>
        <span className="text-xs font-medium underline">View result</span>
      </a>
    </div>
  );
}
