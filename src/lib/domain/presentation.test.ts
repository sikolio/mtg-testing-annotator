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
    rawActionText: "Bolt Ragavan",
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
    rawActionText: "Kill Ragavan",
    actionType: "cast_spell",
    actionText: "Kill Ragavan",
    argumentsText: "Must answer now.",
    lockedAt: "2026-05-20T00:00:00.000Z",
    verdict: "different_play"
  }
];

describe("groupAnnotationsForPresentation", () => {
  it("keeps distinct parsed actions separate when no aggregation exists", () => {
    const groups = groupAnnotationsForPresentation(annotations);
    expect(groups).toHaveLength(2);
    expect(groups[0].actionType).toBe("cast_spell");
    expect(groups[0].count).toBe(1);
  });

  it("summarizes verdict counts within each grouped option", () => {
    const groups = groupAnnotationsForPresentation(annotations);
    const samePlayGroup = groups.find((group) => group.verdictCounts.same_play === 1);
    const differentPlayGroup = groups.find((group) => group.verdictCounts.different_play === 1);

    expect(samePlayGroup?.verdictCounts).toEqual({
      same_play: 1,
      different_play: 0,
      unclear: 0
    });
    expect(differentPlayGroup?.verdictCounts).toEqual({
      same_play: 0,
      different_play: 1,
      unclear: 0
    });
  });

  it("summarizes verdict counts for aggregated groups", () => {
    const [group] = groupAnnotationsForPresentation([
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

    expect(group.verdictCounts).toEqual({
      same_play: 1,
      different_play: 1,
      unclear: 0
    });
  });

  it("prefers stored aggregation clusters over parsed action grouping", () => {
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

  it("uses the confirmed parsed action text when no aggregation label exists", () => {
    const [group] = groupAnnotationsForPresentation([
      {
        ...annotations[0],
        actionText: "Cast Lightning Bolt targeting Ragavan, Nimble Pilferer before combat"
      }
    ]);

    expect(group.label).toBe("Cast Lightning Bolt targeting Ragavan, Nimble Pilferer before combat");
  });
});
