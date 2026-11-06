import { describe, expect, it } from "vitest";
import { requestAnalysis } from "@/lib/analyze-client";
import { SYNTHETIC_CASES } from "@/lib/fixtures";
import { RequestTracker } from "@/lib/request-tracker";

let n = 0;
const tracker = () => new RequestTracker(() => `req_test${String(++n).padStart(6, "0")}`);

describe("RequestTracker stale-response guards", () => {
  it("rapid case changes: only the latest request may commit", () => {
    const t = tracker();
    const a = t.begin("A", "live");
    const b = t.begin("B", "live");
    const c = t.begin("C", "live");
    expect(a.signal.aborted).toBe(true);
    expect(b.signal.aborted).toBe(true);
    expect(t.isCurrent(a, "C", "live")).toBe(false);
    expect(t.isCurrent(b, "C", "live")).toBe(false);
    expect(t.isCurrent(c, "C", "live")).toBe(true);
  });

  it("an edit during loading invalidates the pending request", () => {
    const t = tracker();
    const a = t.begin("A", "live");
    t.invalidate(); // edit
    expect(a.signal.aborted).toBe(true);
    expect(t.isCurrent(a, "A", "live")).toBe(false);
    // Even if the form were edited back to the same text, the old ticket stays stale.
    expect(t.isCurrent(a, "A", "live")).toBe(false);
  });

  it("snapshot mismatch blocks commit even without invalidate", () => {
    const t = tracker();
    const a = t.begin("A", "live");
    expect(t.isCurrent(a, "A-edited", "live")).toBe(false);
  });

  it("mode switch blocks commit", () => {
    const t = tracker();
    const a = t.begin("A", "live");
    expect(t.isCurrent(a, "A", "fixture")).toBe(false);
  });

  it("a late error from an old request cannot clear a newer success", () => {
    const t = tracker();
    const old = t.begin("A", "live");
    const fresh = t.begin("B", "live");
    // fresh succeeds and commits
    expect(t.isCurrent(fresh, "B", "live")).toBe(true);
    t.finish(fresh);
    // old request's late error arrives afterwards
    expect(t.isCurrent(old, "B", "live")).toBe(false);
  });

  it("finishing an old ticket does not clear the active one", () => {
    const t = tracker();
    const old = t.begin("A", "live");
    const fresh = t.begin("B", "live");
    t.finish(old);
    expect(t.isCurrent(fresh, "B", "live")).toBe(true);
  });

  it("duplicate identical submissions are detected while pending", () => {
    const t = tracker();
    const a = t.begin("A", "live");
    expect(t.isPendingFor("A", "live")).toBe(true);
    expect(t.isPendingFor("B", "live")).toBe(false);
    t.finish(a);
    expect(t.isPendingFor("A", "live")).toBe(false);
  });

  it("reset (invalidate) leaves nothing current", () => {
    const t = tracker();
    const a = t.begin("A", "live");
    t.invalidate();
    expect(t.isCurrent(a, "A", "live")).toBe(false);
    expect(t.isPendingFor("A", "live")).toBe(false);
  });
});

describe("requestAnalysis (browser fetch helper)", () => {
  const intake = SYNTHETIC_CASES[0].intake;
  const ok = (body: unknown, status = 200) =>
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("rejects a response whose requestId does not match", async () => {
    const r = await requestAnalysis(
      "req_aaaaaaaa",
      intake,
      new AbortController().signal,
      ok({ success: true, requestId: "req_bbbbbbbb", source: "live", data: SYNTHETIC_CASES[0].prewrittenResult }),
    );
    expect(r.kind === "error" && r.error.code).toBe("BAD_RESPONSE");
  });

  it("passes through typed server errors (no fixture substitution)", async () => {
    const r = await requestAnalysis(
      "req_aaaaaaaa",
      intake,
      new AbortController().signal,
      ok({ success: false, requestId: "req_aaaaaaaa", error: { code: "RATE_LIMITED", message: "slow down", retryable: true } }, 429),
    );
    expect(r).toEqual({
      kind: "error",
      requestId: "req_aaaaaaaa",
      error: { code: "RATE_LIMITED", message: "slow down", retryable: true },
    });
  });

  it("reports aborted when the caller cancels", async () => {
    const ctrl = new AbortController();
    const hanging = ((_u: string, init: RequestInit) =>
      new Promise((_r, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("x", "AbortError"))))) as unknown as typeof fetch;
    const p = requestAnalysis("req_aaaaaaaa", intake, ctrl.signal, hanging);
    ctrl.abort();
    expect(await p).toEqual({ kind: "aborted" });
  });

  it("reports CLIENT_TIMEOUT at the browser deadline", async () => {
    const hanging = ((_u: string, init: RequestInit) =>
      new Promise((_r, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("x", "AbortError"))))) as unknown as typeof fetch;
    const r = await requestAnalysis("req_aaaaaaaa", intake, new AbortController().signal, hanging, 20);
    expect(r.kind === "error" && r.error.code).toBe("CLIENT_TIMEOUT");
  });
});
