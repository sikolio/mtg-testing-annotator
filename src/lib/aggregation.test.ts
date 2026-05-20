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
    rawActionText: actionText,
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

  it("replaces vague cluster labels with the most concrete grouped action text", async () => {
    const result = await aggregateDecisionPointAnnotations({
      decisionPointId: "dp-1",
      annotations: [
        makeAnnotation("a-1", "Bloodstained Mire and cast Dragon's Rage Channeler"),
        makeAnnotation("a-2", "Fetch steam vents and cast Dragon's Rage Channeler")
      ],
      model: "test-model",
      client: {
        responses: {
          parse: async () => ({
            output_parsed: {
              clusters: [
                {
                  id: "cluster-1",
                  label: "Creature Play and Resource Management",
                  annotationIds: ["a-1", "a-2"]
                }
              ]
            }
          })
        }
      }
    });

    expect(result.assignments).toEqual([
      {
        annotationId: "a-1",
        clusterId: "cluster-1",
        label: "Fetch steam vents and cast Dragon's Rage Channeler"
      },
      {
        annotationId: "a-2",
        clusterId: "cluster-1",
        label: "Fetch steam vents and cast Dragon's Rage Channeler"
      }
    ]);
  });
});
