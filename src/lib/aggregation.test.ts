import { describe, expect, it } from "vitest";
import type { Annotation } from "@/lib/types";
import { aggregateDecisionPointAnnotations } from "./aggregation";

function makeAnnotation(id: string, actionText: string): Annotation {
  return {
    id,
    sessionId: "session-1",
    decisionPointId: "dp-1",
    userId: `user-${id}`,
    originalTimestampSeconds: 10,
    actionType: "cast_spell",
    actionText,
    argumentsText: "Keep tempo.",
    lockedAt: "2026-05-20T00:00:00.000Z"
  };
}

describe("aggregateDecisionPointAnnotations", () => {
  it("clusters equivalent annotations from the model response", async () => {
    const result = await aggregateDecisionPointAnnotations({
      decisionPointId: "dp-1",
      annotations: [makeAnnotation("a-1", "Bolt Ragavan"), makeAnnotation("a-2", "Kill Ragavan")],
      model: "test-model",
      client: {
        responses: {
          parse: async () => ({
            output_parsed: {
              clusters: [
                {
                  id: "cluster-1",
                  label: "Kill Ragavan",
                  annotationIds: ["a-1", "a-2"]
                }
              ]
            }
          })
        }
      }
    });

    expect(result.assignments).toEqual([
      { annotationId: "a-1", clusterId: "cluster-1", label: "Kill Ragavan" },
      { annotationId: "a-2", clusterId: "cluster-1", label: "Kill Ragavan" }
    ]);
  });
});
