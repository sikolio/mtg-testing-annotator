import "@testing-library/jest-dom/vitest";
import { render, waitFor } from "@testing-library/react";
import React, { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubePlayer, type YouTubePlayerHandle } from "./YouTubePlayer";

const playerState = {
  getCurrentTime: vi.fn(() => 37.91),
  pauseVideo: vi.fn()
};

const playerConstructor = vi.fn((_element: HTMLElement, options: { events?: { onReady?: (event: { target: typeof playerState }) => void } }) => {
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

describe("YouTubePlayer", () => {
  it("uses the YouTube iframe API to pause and read the exact current time", async () => {
    (window as { YT?: unknown }).YT = { Player: playerConstructor };
    const ref = createRef<YouTubePlayerHandle>();

    render(<YouTubePlayer ref={ref} videoId="LBkEDKfWpaA" handBlocks={[]} />);

    await waitFor(() => expect(playerConstructor).toHaveBeenCalledTimes(1));

    ref.current?.pause();
    await expect(ref.current?.getCurrentTime()).resolves.toBe(37.91);

    expect(playerState.pauseVideo).toHaveBeenCalledTimes(1);
    expect(playerState.getCurrentTime).toHaveBeenCalledTimes(1);
  });
});
