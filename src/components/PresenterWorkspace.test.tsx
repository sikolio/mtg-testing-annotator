import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PresenterWorkspace } from "./PresenterWorkspace";

const session = {
  youtubeVideoId: "LBkEDKfWpaA",
  decklistText: "4 Lightning Bolt",
  opponentDecklistText: "4 Thoughtseize",
  handBlocks: []
};

const decisionPoints = [
  { id: "checkpoint-1", sessionId: "session-1", timestampSeconds: 243.58, source: "manual_annotation" as const },
  { id: "checkpoint-2", sessionId: "session-1", timestampSeconds: 258.77, source: "manual_annotation" as const },
  { id: "checkpoint-3", sessionId: "session-1", timestampSeconds: 312.89, source: "manual_annotation" as const }
];

const annotations = [
  {
    id: "annotation-1",
    sessionId: "session-1",
    decisionPointId: "checkpoint-1",
    userId: "user-1",
    reviewerEmail: "one@example.com",
    originalTimestampSeconds: 243.58,
    actionType: "cast_spell" as const,
    actionText: "Lightning Bolt Ragavan",
    argumentsText: "Cleanest tempo line.",
    lockedAt: "2026-05-20T00:00:00.000Z",
    verdict: "same_play" as const
  },
  {
    id: "annotation-2",
    sessionId: "session-1",
    decisionPointId: "checkpoint-2",
    userId: "user-2",
    reviewerEmail: "two@example.com",
    originalTimestampSeconds: 258.77,
    actionType: "pass" as const,
    actionText: "Pass with Lightning Bolt up",
    argumentsText: "Keep options open.",
    lockedAt: "2026-05-20T00:00:00.000Z",
    verdict: "different_play" as const
  }
];

const { playerFactory, playerState } = vi.hoisted(() => {
  let stateChangeListener: ((event: { data: number }) => void) | null = null;
  const state = {
    cueVideoById: vi.fn(() => Promise.resolve()),
    destroy: vi.fn(),
    getCurrentTime: vi.fn(() => Promise.resolve(0)),
    mute: vi.fn(() => Promise.resolve()),
    off: vi.fn((listener: (event: { data: number }) => void) => {
      if (stateChangeListener === listener) {
        stateChangeListener = null;
      }
    }),
    on: vi.fn((eventName: string, listener: (event: { data: number }) => void) => {
      if (eventName === "stateChange") {
        stateChangeListener = listener;
      }
    }),
    pauseVideo: vi.fn(() => Promise.resolve()),
    playVideo: vi.fn(() => Promise.resolve()),
    seekTo: vi.fn(() => Promise.resolve())
  };

  return {
    playerFactory: vi.fn(() => state),
    playerState: {
      ...state,
      emitStateChange(data: number) {
        stateChangeListener?.({ data });
      }
    }
  };
});

vi.mock("youtube-player", () => ({
  default: playerFactory
}));

afterEach(() => {
  playerState.cueVideoById.mockClear();
  playerState.destroy.mockClear();
  playerState.getCurrentTime.mockClear();
  playerState.mute.mockClear();
  playerState.off.mockClear();
  playerState.on.mockClear();
  playerState.pauseVideo.mockClear();
  playerState.playVideo.mockClear();
  playerState.seekTo.mockClear();
  playerFactory.mockClear();
});

describe("PresenterWorkspace", () => {
  it("shows readable presenter checkpoint navigation and steps with previous and next", async () => {
    const user = userEvent.setup();

    render(<PresenterWorkspace session={session} decisionPoints={decisionPoints} annotations={annotations} />);

    expect(screen.getByRole("heading", { name: "Options at 4:03.58" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4:03.58" })).toHaveClass("active");

    const previousButton = screen.getByRole("button", { name: "Previous checkpoint" });
    const nextButton = screen.getByRole("button", { name: "Next checkpoint" });

    expect(previousButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    await waitFor(() => expect(playerFactory).toHaveBeenCalledTimes(1));
    await user.click(nextButton);

    expect(screen.getByRole("heading", { name: "Options at 4:18.77" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4:18.77" })).toHaveClass("active");
    expect(playerState.cueVideoById).toHaveBeenCalledWith("LBkEDKfWpaA", 258.77);
  });

  it("jumps directly to a presenter checkpoint and loads its annotations", async () => {
    const user = userEvent.setup();

    render(<PresenterWorkspace session={session} decisionPoints={decisionPoints} annotations={annotations} />);

    await waitFor(() => expect(playerFactory).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "4:18.77" }));

    expect(screen.getByText("Keep options open.")).toBeInTheDocument();
    expect(playerState.cueVideoById).toHaveBeenCalledWith("LBkEDKfWpaA", 258.77);
  });

  it("shows the aggregated label for a grouped presenter choice", () => {
    render(
      <PresenterWorkspace
        session={session}
        decisionPoints={decisionPoints}
        annotations={[
          {
            ...annotations[0],
            aggregationClusterId: "cluster-1",
            aggregatedActionLabel: "Kill Ragavan"
          }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: /Kill Ragavan · 1/i })).toBeInTheDocument();
  });
});
