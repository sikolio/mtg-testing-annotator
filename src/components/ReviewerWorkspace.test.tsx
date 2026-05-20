import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmAnnotation, draftAnnotation } from "@/lib/actions/reviewActions";
import { ReviewerWorkspace } from "./ReviewerWorkspace";

vi.mock("@/lib/actions/reviewActions", () => ({
  draftAnnotation: vi.fn(),
  confirmAnnotation: vi.fn(),
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
  playerState.destroy.mockClear();
  playerState.cueVideoById.mockClear();
  playerState.getCurrentTime.mockClear();
  playerState.mute.mockClear();
  playerState.off.mockClear();
  playerState.on.mockClear();
  playerState.pauseVideo.mockClear();
  playerState.playVideo.mockClear();
  playerState.seekTo.mockClear();
  playerFactory.mockClear();
  vi.mocked(draftAnnotation).mockReset();
  vi.mocked(confirmAnnotation).mockReset();
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

  it("offers opponent deck cards in the freeform play suggestions too", async () => {
    const userEventApi = userEvent.setup();

    render(
      <ReviewerWorkspace
        session={{
          ...session,
          decklistText: "4 Lightning Bolt",
          opponentDecklistText: "4 Thoughtseize\n2 Orcish Bowmasters"
        }}
        user={user}
        decisionPoints={[]}
      />
    );

    await userEventApi.type(screen.getByPlaceholderText("What play would you make?"), "thought");

    expect(screen.getByRole("button", { name: "Thoughtseize" })).toBeInTheDocument();
  });

  it("parses a play, shows the editable interpretation, and only then moves to verdicts", async () => {
    const userEventApi = userEvent.setup();
    vi.mocked(draftAnnotation).mockResolvedValue({
      id: "annotation-1",
      decisionPointId: "checkpoint-1",
      rawActionText: "bolt ragavan before combat",
      actionText: "Cast Lightning Bolt targeting Ragavan, Nimble Pilferer before combat",
      argumentsText: "Keep them off snowballing.",
      actionType: "cast_spell",
      lockedAt: null
    } as never);
    vi.mocked(confirmAnnotation).mockResolvedValue({
      lockedAt: "2026-05-20T00:00:00.000Z"
    } as never);

    render(<ReviewerWorkspace session={session} user={user} decisionPoints={[]} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    await userEventApi.type(screen.getByPlaceholderText("What play would you make?"), "bolt ragavan before combat");
    await userEventApi.type(screen.getByPlaceholderText("Why this play and not another?"), "Keep them off snowballing.");
    await userEventApi.click(screen.getByRole("button", { name: "Parse play" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Confirm parsed play" })).toBeInTheDocument());
    expect(screen.getByText("bolt ragavan before combat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cast Lightning Bolt targeting Ragavan, Nimble Pilferer before combat")).toBeInTheDocument();

    await userEventApi.clear(screen.getByDisplayValue("Cast Lightning Bolt targeting Ragavan, Nimble Pilferer before combat"));
    await userEventApi.type(
      screen.getByPlaceholderText("Confirm the parsed play"),
      "Cast Lightning Bolt on Ragavan, Nimble Pilferer before combat"
    );
    await userEventApi.click(screen.getByRole("button", { name: "Confirm play" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Video verdict" })).toBeInTheDocument());
    expect(vi.mocked(confirmAnnotation)).toHaveBeenCalledWith({
      annotationId: "annotation-1",
      actionText: "Cast Lightning Bolt on Ragavan, Nimble Pilferer before combat"
    });
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
            timestampSeconds: 243.58,
            source: "manual_annotation"
          }
        ]}
      />
    );

    await waitFor(() => expect(playerFactory).toHaveBeenCalledTimes(1));
    await userEventApi.click(screen.getByRole("button", { name: "4:03.58" }));

    expect(screen.getByLabelText("Current timestamp")).toHaveValue(243.58);
    expect(playerState.cueVideoById).toHaveBeenCalledWith("LBkEDKfWpaA", 243.58);
    expect(playerState.seekTo).not.toHaveBeenCalled();
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(1);
  });

  it("navigates checkpoints with prev and next buttons", async () => {
    const userEventApi = userEvent.setup();

    render(
      <ReviewerWorkspace
        session={session}
        user={user}
        decisionPoints={[
          {
            id: "checkpoint-1",
            sessionId: session.id,
            timestampSeconds: 243.58,
            source: "manual_annotation"
          },
          {
            id: "checkpoint-2",
            sessionId: session.id,
            timestampSeconds: 258.77,
            source: "manual_annotation"
          },
          {
            id: "checkpoint-3",
            sessionId: session.id,
            timestampSeconds: 312.89,
            source: "manual_annotation"
          }
        ]}
      />
    );

    const previousButton = screen.getByRole("button", { name: "Previous checkpoint" });
    const nextButton = screen.getByRole("button", { name: "Next checkpoint" });

    expect(previousButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    await userEventApi.click(nextButton);

    expect(screen.getByLabelText("Current timestamp")).toHaveValue(258.77);
    expect(playerState.cueVideoById).toHaveBeenCalledWith("LBkEDKfWpaA", 258.77);
    expect(screen.getByRole("button", { name: "4:18.77" })).toHaveClass("active");

    await userEventApi.click(previousButton);

    expect(screen.getByLabelText("Current timestamp")).toHaveValue(243.58);
    expect(screen.getByRole("button", { name: "4:03.58" })).toHaveClass("active");
  });
});
