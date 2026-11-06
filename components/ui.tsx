"use client";

import { useId, useState, type ReactNode } from "react";
import {
  Activity,
  Check,
  Circle,
  CircleAlert,
  CircleHelp,
  CircleX,
  Copy,
  FileText,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";

/** Single icon set for the whole UI (lucide). Icons are decorative; text always carries the meaning. */
export const Icons = {
  info: Info,
  warning: TriangleAlert,
  error: CircleX,
  elevated: TriangleAlert,
  possible: CircleAlert,
  none: Circle,
  insufficient: CircleHelp,
  loading: LoaderCircle,
  copy: Copy,
  check: Check,
  live: Activity,
  fixture: FileText,
} as const;

export const sectionHeaderClass = "text-[11px] font-semibold uppercase tracking-wider text-slate-600";

export const inputClass =
  "w-full rounded-sm border border-slate-400 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 aria-[invalid=true]:border-red-600";

/** Panel with a slim header bar, EHR style. */
export function Panel({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-sm border border-slate-300 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-3 py-1.5">
        <h3 id={id} className={sectionHeaderClass}>
          {title}
        </h3>
        {aside}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

/**
 * (i) help tooltip. Opens on hover, keyboard focus, or click; Escape closes.
 * The help text is always in the DOM (visually hidden when closed) so fields can
 * reference it with aria-describedby and screen readers always announce it.
 */
export function InfoTip({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`Help for ${label.toLowerCase()}`}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="rounded-full text-slate-500 hover:text-slate-900"
      >
        <Icons.info size={14} aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={
          open
            ? "absolute left-0 top-full z-30 mt-1 w-60 rounded-sm bg-slate-900 px-2 py-1.5 text-xs font-normal normal-case tracking-normal text-white shadow-lg"
            : "sr-only"
        }
      >
        {children}
      </span>
    </span>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Segmented control built from native radio inputs inside a fieldset/legend,
 * so arrow-key navigation and screen-reader semantics come from the browser.
 * "unknown" has its own visible selected style.
 */
export function SegmentedRadio<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  size = "sm",
}: {
  legend: ReactNode;
  name: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (next: T) => void;
  size?: "sm" | "xs";
}) {
  const uid = useId();
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-medium text-slate-700">{legend}</legend>
      <div className="inline-flex flex-wrap overflow-hidden rounded-sm border border-slate-400">
        {options.map((o) => {
          const checked = o.value === value;
          const isUnknown = o.value === "unknown";
          return (
            <label
              key={o.value}
              className={`relative cursor-pointer select-none border-l border-slate-300 first:border-l-0 has-[:focus-visible]:z-10 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue-600 ${
                size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
              } ${
                checked
                  ? isUnknown
                    ? "bg-slate-500 font-semibold text-white"
                    : "bg-navy-800 font-semibold text-white"
                  : "bg-white text-slate-800 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
                name={`${name}-${uid}`}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
