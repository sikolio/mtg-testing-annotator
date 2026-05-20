import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { act } from "react";
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
  handBlocks: []
};

const user = {
  id: "user-1",
  email: "player@example.com"
};

const playerState = {
  getCurrentTime: vi.fn(() => 42.37),
  pauseVideo: vi.fn(),
  seekTo: vi.fn()
};

let latestPlayerEvents:
  | {
      onReady?: (event: { target: typeof playerState }) => void;
      onStateChange?: (event: { data: number; target: typeof playerState }) => void;
    }
  | undefined;

const playerConstructor = vi.fn(
  (
    _element: HTMLElement,
    options: {
      events?: {
        onReady?: (event: { target: typeof playerState }) => void;
        onStateChange?: (event: { data: number; target: typeof playerState }) => void;
      };
    }
  ) => {
    latestPlayerEvents = options.events;
    options.events?.onReady?.({ target: playerState });
    return playerState;
  }
);

afterEach(() => {
  vi.useRealTimers();
  playerState.getCurrentTime.mockClear();
  playerState.pauseVideo.mockClear();
  playerConstructor.mockClear();
  latestPlayerEvents = undefined;
  delete (window as { YT?: unknown; onYouTubeIframeAPIReady?: unknown }).YT;
  delete (window as { YT?: unknown; onYouTubeIframeAPIReady?: unknown }).onYouTubeIframeAPIReady;
  document.head.innerHTML = "";
});

describe("ReviewerWorkspace", () => {
  it("pauses the video and copies the exact current player timestamp into the annotation field", async () => {
    (window as { YT?: unknown }).YT = { Player: playerConstructor };
    const userEventApi = userEvent.setup();

    render(<ReviewerWorkspace session={session} user={user} decisionPoints={[]} />);

    await userEventApi.click(screen.getByRole("button", { name: "Add annotation" }));

    await waitFor(() => expect(screen.getByLabelText("Current timestamp")).toHaveValue(42.37));
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(2);
    expect(playerState.getCurrentTime).toHaveBeenCalledTimes(1);
  });

  it("jumps to a decision point and pauses there when clicked", async () => {
    (window as { YT?: unknown }).YT = { Player: playerConstructor };
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

    await waitFor(() => expect(playerConstructor).toHaveBeenCalledTimes(1));
    await userEventApi.click(screen.getByRole("button", { name: "Jump to 10.00s" }));

    expect(screen.getByLabelText("Current timestamp")).toHaveValue(10);
    expect(playerState.seekTo).toHaveBeenCalledWith(10, true);
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(2);
  });
});
