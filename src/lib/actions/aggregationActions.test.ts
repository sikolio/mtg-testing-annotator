import { describe, expect, it, vi } from "vitest";
import type { Annotation } from "@/lib/types";
import { AGGREGATION_VERSION } from "@/lib/aggregation";
import { ensureSessionAggregation } from "./aggregationActions";

function makeAnnotation(id: string, overrides: Partial<Annotation> = {}): Annotation {
  return {
    id,
    sessionId: "session-1",
    decisionPointId: "dp-1",
    userId: `user-${id}`,
    originalTimestampSeconds: 10,
    actionType: "cast_spell",
    actionText: "Bolt Ragavan",
    argumentsText: "Keep tempo.",
    lockedAt: "2026-05-20T00:00:00.000Z",
    ...overrides
  };
}

describe("ensureSessionAggregation", () => {
  it("persists aggregation assignments for each stale decision point in the session", async () => {
    const persistAssignments = vi.fn(async () => undefined);

    const result = await ensureSessionAggregation({
      sessionId: "session-1",
      annotations: [
        makeAnnotation("a-1"),
        makeAnnotation("a-2"),
        makeAnnotation("a-3", {
          decisionPointId: "dp-2",
          aggregationVersion: AGGREGATION_VERSION
        })
      ],
      aggregateDecisionPoint: async () => ({
        assignments: [
          { annotationId: "a-1", clusterId: "cluster-1", label: "Kill Ragavan" },
          { annotationId: "a-2", clusterId: "cluster-1", label: "Kill Ragavan" }
        ]
      }),
      persistAssignments
    });

    expect(persistAssignments).toHaveBeenCalledTimes(1);
    expect(result.updatedDecisionPointIds).toEqual(["dp-1"]);
  });
});
