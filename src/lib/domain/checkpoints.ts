import { CHECKPOINT_MERGE_THRESHOLD_SECONDS } from "@/lib/config";
import type { DecisionPoint } from "@/lib/types";

export function normalizeTimestampSeconds(timestampSeconds: number): number {
  return Math.round(timestampSeconds * 100) / 100;
}

export function findNearestDecisionPoint(
  points: DecisionPoint[],
  timestampSeconds: number,
  thresholdSeconds = CHECKPOINT_MERGE_THRESHOLD_SECONDS
): DecisionPoint | null {
  const normalized = normalizeTimestampSeconds(timestampSeconds);
  const sorted = [...points].sort(
    (a, b) => Math.abs(a.timestampSeconds - normalized) - Math.abs(b.timestampSeconds - normalized)
  );
  const nearest = sorted[0];

  if (!nearest) {
    return null;
  }

  return Math.abs(nearest.timestampSeconds - normalized) <= thresholdSeconds ? nearest : null;
}
