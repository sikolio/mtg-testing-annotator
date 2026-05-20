import "@testing-library/jest-dom/vitest";
import { render, waitFor } from "@testing-library/react";
import React, { act, createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubePlayer, type YouTubePlayerHandle } from "./YouTubePlayer";

const playerState = {
  getCurrentTime: vi.fn(() => 37.91),
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

describe("YouTubePlayer", () => {
  it("starts paused and can read the exact current time", async () => {
    (window as { YT?: unknown }).YT = { Player: playerConstructor };
    const ref = createRef<YouTubePlayerHandle>();

    render(<YouTubePlayer ref={ref} videoId="LBkEDKfWpaA" handBlocks={[]} />);

    await waitFor(() => expect(playerConstructor).toHaveBeenCalledTimes(1));

    await expect(ref.current?.getCurrentTime()).resolves.toBe(37.91);

    expect(playerState.pauseVideo).toHaveBeenCalledTimes(1);
    expect(playerState.getCurrentTime).toHaveBeenCalledTimes(1);
  });

  it("seeks to a timestamp and pauses there", async () => {
    (window as { YT?: unknown }).YT = { Player: playerConstructor };
    const ref = createRef<YouTubePlayerHandle>();

    render(<YouTubePlayer ref={ref} videoId="LBkEDKfWpaA" handBlocks={[]} />);

    await waitFor(() => expect(playerConstructor).toHaveBeenCalledTimes(1));
    await ref.current?.seekTo(15.25);

    expect(playerState.seekTo).toHaveBeenCalledWith(15.25, true);
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(2);
  });
});
