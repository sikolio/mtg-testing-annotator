import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewerWorkspace } from "./ReviewerWorkspace";

vi.mock("@/lib/actions/reviewActions", () => ({
  commitAnnotation: vi.fn(),
  submitVerdict: vi.fn()
}));

const session = {
  id: "session-1",
  youtubeVideoId: "LBkEDKfWpaA",
  decklistText: "4 Lightning Bolt",
  opponentDecklistText: "4 Thoughtseize",
  handBlocks: []
};

const user = {
  id: "user-1",
  email: "player@example.com"
};

const { playerFactory, playerState } = vi.hoisted(() => {
  let stateChangeListener: ((event: { data: number }) => void) | null = null;
  const state = {
    cueVideoById: vi.fn(() => Promise.resolve()),
    destroy: vi.fn(),
    getCurrentTime: vi.fn(() => Promise.resolve(42.37)),
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
  playerState.destroy.mockClear();
  playerState.cueVideoById.mockClear();
  playerState.getCurrentTime.mockClear();
  playerState.off.mockClear();
  playerState.on.mockClear();
  playerState.pauseVideo.mockClear();
  playerState.playVideo.mockClear();
  playerState.seekTo.mockClear();
  playerFactory.mockClear();
});

describe("ReviewerWorkspace", () => {
  it("shows opponent decklist on its own panel alongside the player's decklist", () => {
    render(<ReviewerWorkspace session={session} user={user} decisionPoints={[]} />);

    expect(screen.getByRole("heading", { name: "Opponent decklist" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your decklist" })).toBeInTheDocument();
    expect(screen.getByText("Thoughtseize")).toBeInTheDocument();
    expect(screen.getByText("Lightning Bolt")).toBeInTheDocument();
  });

  it("offers in-line deck card suggestions for the freeform play input", async () => {
    const userEventApi = userEvent.setup();

    render(
      <ReviewerWorkspace
        session={{
          ...session,
          decklistText: "4 Lightning Bolt\n2 Ragavan, Nimble Pilferer"
        }}
        user={user}
        decisionPoints={[]}
      />
    );

    await userEventApi.type(screen.getByPlaceholderText("What play would you make?"), "Cast rag");

    expect(screen.getByRole("button", { name: "Ragavan, Nimble Pilferer" })).toBeInTheDocument();
  });

  it("pauses the video and copies the exact current player timestamp into the annotation field", async () => {
    const userEventApi = userEvent.setup();

    render(<ReviewerWorkspace session={session} user={user} decisionPoints={[]} />);

    await userEventApi.click(screen.getByRole("button", { name: "Add annotation" }));

    await waitFor(() => expect(screen.getByLabelText("Current timestamp")).toHaveValue(42.37));
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(2);
    expect(playerState.getCurrentTime).toHaveBeenCalledTimes(1);
  });

  it("cues a decision point before the first play so the video can still start normally", async () => {
    const userEventApi = userEvent.setup();

    render(
      <ReviewerWorkspace
        session={session}
        user={user}
        decisionPoints={[
          {
            id: "checkpoint-1",
            sessionId: session.id,
            timestampSeconds: 10,
            source: "manual_annotation"
          }
        ]}
      />
    );

    await waitFor(() => expect(playerFactory).toHaveBeenCalledTimes(1));
    await userEventApi.click(screen.getByRole("button", { name: "Jump to 10.00s" }));

    expect(screen.getByLabelText("Current timestamp")).toHaveValue(10);
    expect(playerState.cueVideoById).toHaveBeenCalledWith("LBkEDKfWpaA", 10);
    expect(playerState.seekTo).not.toHaveBeenCalled();
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(1);
  });
});
