/**
 * Non-blocking DATA-ENTRY plausibility hints, to catch typos (e.g. "1200" for "120").
 *
 * These bounds are deliberately very wide and are NOT clinical thresholds, normal
 * ranges, or High/Low flags. They are not sourced clinical guidance, they never
 * block submission, they do not change the submitted intake, and they are not sent
 * to the model. Technical/format validation still lives in lib/schemas.ts.
 */
import { parseOptionalNumber, type IntakeFormValues } from "./intake-form";

type VitalKey = "heartRate" | "systolicBP" | "diastolicBP" | "respiratoryRate";

export const ENTRY_RANGES: Record<VitalKey, { min: number; max: number }> = {
  heartRate: { min: 20, max: 300 },
  systolicBP: { min: 40, max: 300 },
  diastolicBP: { min: 20, max: 200 },
  respiratoryRate: { min: 4, max: 80 },
};

export const OUT_OF_RANGE_MESSAGE = "Value outside usual entry range — confirm if correct";
export const BP_ORDER_MESSAGE = "Diastolic is not lower than systolic — check for swapped entries";

export type SoftWarnings = Partial<Record<VitalKey, string>>;

export function softWarnings(values: IntakeFormValues): SoftWarnings {
  const warnings: SoftWarnings = {};
  const nums: Partial<Record<VitalKey, number>> = {};
  for (const key of Object.keys(ENTRY_RANGES) as VitalKey[]) {
    const parsed = parseOptionalNumber(values[key]);
    if (!parsed.ok || parsed.value === null || parsed.value <= 0) continue; // format errors handled elsewhere
    nums[key] = parsed.value;
    const { min, max } = ENTRY_RANGES[key];
    if (parsed.value < min || parsed.value > max) warnings[key] = OUT_OF_RANGE_MESSAGE;
  }
  if (nums.systolicBP !== undefined && nums.diastolicBP !== undefined && nums.diastolicBP >= nums.systolicBP) {
    warnings.diastolicBP ??= BP_ORDER_MESSAGE;
  }
  return warnings;
}
