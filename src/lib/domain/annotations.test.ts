import { describe, expect, it } from "vitest";
import type { Annotation } from "@/lib/types";
import { assertCanEditAnnotation, hasPendingVerdict } from "./annotations";

const baseAnnotation: Annotation = {
  id: "a-1",
  sessionId: "s-1",
  decisionPointId: "dp-1",
  userId: "u-1",
  originalTimestampSeconds: 10,
  rawActionText: "Cast Lightning Bolt",
  actionType: "cast_spell",
  actionText: "Cast Lightning Bolt",
  argumentsText: "Remove the threat before combat.",
  lockedAt: "2026-05-20T00:00:00.000Z"
};

describe("annotation rules", () => {
  it("reports pending verdict when no verdict exists", () => {
    expect(hasPendingVerdict(baseAnnotation)).toBe(true);
  });

  it("reports no pending verdict when verdict exists", () => {
    expect(hasPendingVerdict({ ...baseAnnotation, verdict: "same_play" })).toBe(false);
  });

  it("rejects edits to locked annotations", () => {
    expect(() => assertCanEditAnnotation(baseAnnotation)).toThrow("Locked annotations cannot be edited.");
  });
});
