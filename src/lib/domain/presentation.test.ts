import { describe, expect, it } from "vitest";
import type { Annotation } from "@/lib/types";
import { groupAnnotationsForPresentation } from "./presentation";

const annotations: Annotation[] = [
  {
    id: "a-1",
    sessionId: "s-1",
    decisionPointId: "dp-1",
    userId: "u-1",
    reviewerEmail: "one@example.com",
    originalTimestampSeconds: 10,
    actionType: "cast_spell",
    actionText: "Bolt Ragavan",
    argumentsText: "Prevent snowballing.",
    lockedAt: "2026-05-20T00:00:00.000Z",
    verdict: "same_play"
  },
  {
    id: "a-2",
    sessionId: "s-1",
    decisionPointId: "dp-1",
    userId: "u-2",
    reviewerEmail: "two@example.com",
    originalTimestampSeconds: 10.5,
    actionType: "cast_spell",
    actionText: "Kill Ragavan",
    argumentsText: "Must answer now.",
    lockedAt: "2026-05-20T00:00:00.000Z",
    verdict: "different_play"
  }
];

describe("groupAnnotationsForPresentation", () => {
  it("groups by decision point and action type", () => {
    const groups = groupAnnotationsForPresentation(annotations);
    expect(groups).toHaveLength(1);
    expect(groups[0].actionType).toBe("cast_spell");
    expect(groups[0].count).toBe(2);
  });

  it("summarizes verdict counts", () => {
    const [group] = groupAnnotationsForPresentation(annotations);
    expect(group.verdictCounts).toEqual({
      same_play: 1,
      different_play: 1,
      unclear: 0
    });
  });

  it("prefers stored aggregation clusters over action type grouping", () => {
    const groups = groupAnnotationsForPresentation([
      {
        ...annotations[0],
        aggregationClusterId: "cluster-1",
        aggregatedActionLabel: "Kill Ragavan now"
      },
      {
        ...annotations[1],
        aggregationClusterId: "cluster-1",
        aggregatedActionLabel: "Kill Ragavan now"
      }
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Kill Ragavan now");
  });
});
