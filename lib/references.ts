/**
 * Versioned, server-owned reference inventory.
 *
 * This is intentionally tiny. It supports symptom-awareness context only.
 * It does NOT establish an age cutoff, a combination rule, a diagnostic score,
 * an acuity algorithm, a troponin/ECG ordering rule, or an emergency protocol.
 * Do not expand it without a separately verified primary source.
 *
 * Safe to import from the browser (used for source titles/links in the
 * dashboard); it contains only public citation metadata.
 */

export const REFERENCE_INVENTORY_VERSION = "2026-11-06.1";

export interface ReferenceEntry {
  id: string;
  /** Short display label for the UI (e.g. findings table). Not sent to the model. */
  shortName: string;
  title: string;
  publisher: string;
  url: string;
  /** Date shown on the page as "last reviewed" when it was checked. */
  pageLastReviewed: string;
  /** Date this entry was verified against the page for this project. */
  verifiedOn: string;
  /** Clearly labeled paraphrase. NOT a verbatim excerpt. */
  paraphrase: string;
}

export const REFERENCES: readonly ReferenceEntry[] = [
  {
    id: "AHA_SYMPTOMS_WOMEN",
    shortName: "AHA",
    title: "Heart Attack Symptoms in Women",
    publisher: "American Heart Association",
    url: "https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack/heart-attack-symptoms-in-women",
    pageLastReviewed: "2024-12-13",
    verifiedOn: "Recorded in project specification (pre-event revision); recheck before presenting.",
    paraphrase:
      "PARAPHRASE (not a quotation): Chest discomfort is the leading heart-attack symptom in women, as in men. " +
      "Other possible symptoms include back or jaw discomfort, breathlessness, nausea, unusual tiredness, and weakness. " +
      "Some presentations may be subtle or confused with other conditions. These symptoms are not exclusive to women.",
  },
] as const;

export const REFERENCE_IDS: ReadonlySet<string> = new Set(REFERENCES.map((r) => r.id));

export function getReference(id: string): ReferenceEntry | undefined {
  return REFERENCES.find((r) => r.id === id);
}

/**
 * Returns the list of source IDs that are not in the inventory.
 * A valid ID is attribution only — it is not proof that a generated
 * statement is actually supported by that source.
 */
export function findUnknownSourceIds(ids: readonly string[]): string[] {
  return ids.filter((id) => !REFERENCE_IDS.has(id));
}
