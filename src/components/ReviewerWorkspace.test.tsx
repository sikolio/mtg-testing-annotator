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
  handBlocks: []
};

const user = {
  id: "user-1",
  email: "player@example.com"
};

const playerState = {
  getCurrentTime: vi.fn(() => 42.37),
  pauseVideo: vi.fn()
};

const playerConstructor = vi.fn((_element: HTMLElement, options: { events?: { onReady?: (event: unknown) => void } }) => {
  options.events?.onReady?.({ target: playerState });
  return playerState;
});

afterEach(() => {
  playerState.getCurrentTime.mockClear();
  playerState.pauseVideo.mockClear();
  playerConstructor.mockClear();
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
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(1);
    expect(playerState.getCurrentTime).toHaveBeenCalledTimes(1);
  });
});
