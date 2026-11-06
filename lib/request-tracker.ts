/**
 * Tracks the single in-flight live analysis. Every state update from a request
 * (loading, success, error) must pass `isCurrent` before it is committed:
 * aborting fetch alone does not prevent stale UI updates.
 */

export type Mode = "live" | "fixture";

export interface RequestTicket {
  generation: number;
  requestId: string;
  snapshotKey: string;
  mode: Mode;
  signal: AbortSignal;
}

interface ActiveRequest extends RequestTicket {
  controller: AbortController;
}

export class RequestTracker {
  private generation = 0;
  private active: ActiveRequest | null = null;

  constructor(private readonly makeId: () => string = defaultRequestId) {}

  /** Starts a new request, cancelling and superseding any previous one. */
  begin(snapshotKey: string, mode: Mode): RequestTicket {
    this.invalidate();
    const controller = new AbortController();
    const ticket: ActiveRequest = {
      generation: ++this.generation,
      requestId: this.makeId(),
      snapshotKey,
      mode,
      signal: controller.signal,
      controller,
    };
    this.active = ticket;
    return ticket;
  }

  /** Cancels any pending request and makes every outstanding ticket stale. */
  invalidate(): void {
    if (this.active) this.active.controller.abort();
    this.active = null;
    this.generation++;
  }

  /** True only if the ticket is still the active request for this snapshot and mode. */
  isCurrent(ticket: RequestTicket, currentSnapshotKey: string, currentMode: Mode): boolean {
    const a = this.active;
    return (
      a !== null &&
      a.generation === ticket.generation &&
      a.generation === this.generation &&
      a.requestId === ticket.requestId &&
      a.snapshotKey === currentSnapshotKey &&
      ticket.snapshotKey === currentSnapshotKey &&
      a.mode === currentMode &&
      ticket.mode === currentMode
    );
  }

  /** Clears the active slot after a request settles (only if it is still the active one). */
  finish(ticket: RequestTicket): void {
    if (this.active && this.active.generation === ticket.generation) this.active = null;
  }

  /** Used to prevent duplicate identical submissions while one is pending. */
  isPendingFor(snapshotKey: string, mode: Mode): boolean {
    return this.active !== null && this.active.snapshotKey === snapshotKey && this.active.mode === mode;
  }
}

function defaultRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "")}`;
}
