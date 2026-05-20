import React, { isValidElement } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const presenterWorkspaceSpy = vi.fn((props: unknown) => <div data-props={JSON.stringify(props)} />);

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  })
}));

vi.mock("@/components/PresenterWorkspace", () => ({
  PresenterWorkspace: (props: unknown) => presenterWorkspaceSpy(props)
}));

vi.mock("@/lib/actions/aggregationActions", () => ({
  ensureSessionAggregation: vi.fn(async () => ({ updatedDecisionPointIds: [] }))
}));

const fakeSupabase = {
  from: vi.fn()
};

vi.mock("@/lib/db/server", () => ({
  shouldUseLocalDevelopmentStore: vi.fn(() => false),
  createSupabaseServerClient: vi.fn(() => fakeSupabase)
}));

describe("PresenterPage", () => {
  beforeEach(() => {
    presenterWorkspaceSpy.mockClear();
    fakeSupabase.from.mockReset();
  });

  it("falls back to the legacy annotation query when the explicit annotation select fails", async () => {
    const session = {
      id: "session-1",
      youtube_video_id: "LBkEDKfWpaA",
      decklist_text: "4 Lightning Bolt",
      opponent_decklist_text: "",
      hand_block_enabled: false,
      hand_block_x: 0,
      hand_block_y: 0,
      hand_block_width: 0,
      hand_block_height: 0,
      hand_block_2_enabled: false,
      hand_block_2_x: 0,
      hand_block_2_y: 0,
      hand_block_2_width: 0,
      hand_block_2_height: 0
    };

    const decisionPoints = [
      { id: "checkpoint-1", session_id: "session-1", timestamp_seconds: 243.58, source: "manual_annotation" as const }
    ];

    const annotationRow = {
      id: "annotation-1",
      session_id: "session-1",
      decision_point_id: "checkpoint-1",
      user_id: "user-1",
      original_timestamp_seconds: 243.58,
      action_type: "play_land",
      action_text: "Fetch steam vents",
      arguments_text: "I want my colors",
      aggregation_cluster_id: null,
      aggregated_action_label: null,
      aggregation_version: null,
      aggregated_at: null,
      locked_at: "2026-05-20T00:00:00.000Z",
      users: [{ email: "one@example.com" }],
      annotation_verdicts: [{ verdict: "same_play" as const }]
    };

    fakeSupabase.from.mockImplementation((table: string) => {
      if (table === "review_sessions") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: session })
            })
          })
        };
      }

      if (table === "decision_points") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: decisionPoints })
            })
          })
        };
      }

      if (table === "annotations") {
        return {
          select: (query: string) => ({
            eq: async () =>
              query.startsWith("id,session_id")
                ? { data: null, error: { message: "bad explicit select" } }
                : { data: [annotationRow], error: null }
          })
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const { default: PresenterPage } = await import("./page");
    const result = await PresenterPage({ params: Promise.resolve({ presenterSlug: "presenter-slug" }) });

    expect(isValidElement(result)).toBe(true);
    const props = (result as React.ReactElement<{ annotations: Array<{ actionText: string }> }>).props;
    expect(props.annotations).toHaveLength(1);
    expect(props.annotations[0].actionText).toBe("Fetch steam vents");
  });
});
