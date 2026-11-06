import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import "./landing.css";

export const metadata: Metadata = {
  title: "PulseEquity — Recognizing women's cardiac presentations at triage",
  description:
    "Hackathon prototype: a provider-facing check that flags female-pattern cardiac presentations at the triage intake window. Synthetic data only; not clinical software.",
};

/**
 * Route of the working triage tool. It lives at "/" for now; when the routes
 * are swapped (tool → /triage, this page → /), update this one constant.
 */
const TOOL_HREF = "/";

/** Builds a repeating PQRST trace across a 1200×200 viewBox. */
function ecgPath(beats = 6, width = 1200, base = 110): string {
  const w = width / beats;
  let d = `M0 ${base}`;
  for (let i = 0; i < beats; i++) {
    const x = i * w;
    d +=
      ` L${x + w * 0.18} ${base}` +
      ` Q${x + w * 0.24} ${base - 14} ${x + w * 0.3} ${base}` + // P wave
      ` L${x + w * 0.38} ${base}` +
      ` L${x + w * 0.41} ${base + 12}` + // Q
      ` L${x + w * 0.46} ${base - 92}` + // R
      ` L${x + w * 0.51} ${base + 34}` + // S
      ` L${x + w * 0.55} ${base}` +
      ` L${x + w * 0.64} ${base}` +
      ` Q${x + w * 0.73} ${base - 26} ${x + w * 0.82} ${base}` + // T wave
      ` L${x + w} ${base}`;
  }
  return d;
}

const ECG = ecgPath();

function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <g className="pel-beat">
        <path
          d="M16 28s-11-6.6-11-15A6 6 0 0 1 16 9.6 6 6 0 0 1 27 13c0 8.4-11 15-11 15z"
          fill="#e11d48"
        />
        <path
          d="M6 16h5l2-4 3 8 2-5h8"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function EcgTrace() {
  return (
    <svg
      viewBox="0 0 1200 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="h-40 w-full sm:h-52"
    >
      <defs>
        <linearGradient id="ecg-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#e11d48" stopOpacity="0" />
          <stop offset="0.12" stopColor="#e11d48" stopOpacity="1" />
          <stop offset="0.88" stopColor="#e11d48" stopOpacity="1" />
          <stop offset="1" stopColor="#e11d48" stopOpacity="0" />
        </linearGradient>
        <filter id="ecg-glow" x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Faint trace drawn once on load */}
      <path
        d={ECG}
        pathLength={1}
        fill="none"
        stroke="url(#ecg-fade)"
        strokeOpacity="0.25"
        strokeWidth="2"
        strokeLinejoin="round"
        className="pel-ecgDraw"
      />
      {/* Bright moving sweep */}
      <path
        d={ECG}
        pathLength={1}
        fill="none"
        stroke="url(#ecg-fade)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#ecg-glow)"
        className="pel-ecgSweep"
      />
    </svg>
  );
}

/** TODO: replace each placeholder with a verified finding + its citation. */
const STAT_PLACEHOLDERS = [
  { ref: "[9]", hint: "Identical-vignette study: nurses less likely to consider cardiac diagnosis for women" },
  { ref: "[10]", hint: "Nurses report MI is not the first diagnosis they consider for women" },
  { ref: "[1, 2]", hint: "Women's symptoms minimized or misattributed in the clinical chain" },
];

const STEPS = [
  {
    Icon: ClipboardList,
    title: "Nurse enters the intake",
    body: "Age, chief complaint in the patient's own words, vitals, and known risk factors. Blank means not measured, not zero.",
  },
  {
    Icon: HeartPulse,
    title: "A parallel check runs",
    body: "Claude reviews the intake against a small, versioned reference set on symptoms in women, alongside the nurse's own assessment.",
  },
  {
    Icon: TriangleAlert,
    title: "Patterns are flagged",
    body: "A concern level, the intake details behind it, a possible dismissal pattern, and one suggested next step for the clinician.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/landing" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight text-[#15213a]">
              Pulse<span className="text-rose-600">Equity</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#problem" className="hidden hover:text-[#15213a] sm:inline">
              The problem
            </a>
            <a href="#how" className="hidden hover:text-[#15213a] sm:inline">
              How it works
            </a>
            <Link
              href={TOOL_HREF}
              className="rounded-full bg-[#15213a] px-4 py-2 text-white transition hover:bg-[#2a3d63]"
            >
              Launch demo
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(225,29,72,0.10),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(21,33,58,0.06),transparent_50%)]"
          />
          {/* Monitor grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          />

          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-6 sm:pt-28">
            <p
              className="pel-fadeUp inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-700"
            >
              <Stethoscope size={14} aria-hidden="true" />
              Triage decision support · Women&apos;s heart health
            </p>
            <h1
              className="pel-fadeUp mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-[#15213a] sm:text-7xl"
              style={{ animationDelay: "120ms" }}
            >
              Same symptoms.
              <br />
              <span className="text-rose-600">Different triage.</span>
            </h1>
            <p
              className="pel-fadeUp mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl"
              style={{ animationDelay: "240ms" }}
            >
              PulseEquity is a lightweight, provider-facing check that flags female-pattern cardiac
              presentations at the triage intake window, the moment when a heart attack can be
              mistaken for anxiety or indigestion.
            </p>
            <div
              className="pel-fadeUp mt-10 flex flex-wrap items-center gap-4"
              style={{ animationDelay: "360ms" }}
            >
              <Link
                href={TOOL_HREF}
                className="group inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-700"
              >
                Launch the demo
                <ArrowRight
                  size={18}
                  aria-hidden="true"
                  className="transition group-hover:translate-x-0.5"
                />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center rounded-full border border-slate-300 px-6 py-3 text-base font-semibold text-[#15213a] transition hover:border-[#15213a]"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="relative">
            <EcgTrace />
          </div>
        </section>

        {/* Problem */}
        <section id="problem" className="scroll-mt-16 bg-[#15213a] text-white">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <p className="text-sm font-semibold uppercase tracking-wider text-rose-400">
              The problem
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              The bias happens in seconds, at the triage desk.
            </h2>
            <div className="mt-6 grid gap-6 text-lg leading-relaxed text-slate-300 md:grid-cols-2">
              <p>
                There is no lightweight, provider-facing tool that specifically flags female-pattern
                cardiac presentations at the triage intake window, one of several points in the
                clinical chain where research documents that women&apos;s symptoms are frequently
                minimized or misattributed [1, 2, 7, 8].
              </p>
              <p>
                Under time pressure, nurses make fast inferences. In studies using identical patient
                vignettes, nurses were significantly less likely to consider a cardiac diagnosis for
                a female patient than for a male patient with the same presentation [9, 10].
              </p>
            </div>

            {/* TODO: fill with verified statistics + citations */}
            <div className="mt-14 grid gap-4 sm:grid-cols-3">
              {STAT_PLACEHOLDERS.map((s) => (
                <div
                  key={s.ref}
                  className="rounded-2xl border border-dashed border-white/25 bg-white/5 p-6"
                >
                  <p className="text-5xl font-bold tracking-tight text-rose-400">—%</p>
                  <p className="mt-3 text-sm text-slate-300">{s.hint}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-amber-300">
                    TODO: add statistic · {s.ref}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 bg-slate-50">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <p className="text-sm font-semibold uppercase tracking-wider text-rose-600">
              How it works
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-[#15213a] sm:text-4xl">
              A second look, alongside the nurse.
            </h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ Icon, title, body }, i) => (
                <li
                  key={title}
                  className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-slate-400">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[#15213a]">{title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-8 flex items-start gap-2 text-sm text-slate-500">
              <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#2a3d63]" />
              Supports clinician judgment and never replaces it. It does not diagnose, assign
              acuity, or place orders, and emergency care never waits on it.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-white">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-24">
            <LogoMark className="mx-auto h-14 w-14" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#15213a] sm:text-4xl">
              See it flag a presentation in real time.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
              Load a synthetic case or enter your own, and watch the alert dashboard respond.
            </p>
            <Link
              href={TOOL_HREF}
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-rose-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-700"
            >
              Launch the demo
              <ArrowRight
                size={18}
                aria-hidden="true"
                className="transition group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-slate-600">
            Synthetic hackathon demonstration. Not clinical software. No real patient data.
          </p>
          <p>© 2026 PulseEquity · Hackathon prototype</p>
        </div>
      </footer>
    </div>
  );
}
