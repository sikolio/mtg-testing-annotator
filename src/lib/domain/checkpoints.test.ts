import { describe, expect, it } from "vitest";
import { findNearestDecisionPoint, normalizeTimestampSeconds } from "./checkpoints";

const points = [
  { id: "dp-1", sessionId: "s-1", timestampSeconds: 10, source: "manual_annotation" as const },
  { id: "dp-2", sessionId: "s-1", timestampSeconds: 24, source: "manual_annotation" as const }
];

describe("checkpoint helpers", () => {
  it("normalizes timestamps to hundredths", () => {
    expect(normalizeTimestampSeconds(12.345)).toBe(12.35);
  });

  it("finds a nearby decision point within threshold", () => {
    expect(findNearestDecisionPoint(points, 11.8)?.id).toBe("dp-1");
  });

  it("does not match outside threshold", () => {
    expect(findNearestDecisionPoint(points, 13)).toBeNull();
  });
});
