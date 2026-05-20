import "@testing-library/jest-dom/vitest";
import { render, waitFor } from "@testing-library/react";
import React, { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubePlayer, type YouTubePlayerHandle } from "./YouTubePlayer";

const { playerFactory, playerState } = vi.hoisted(() => {
  const state = {
    destroy: vi.fn(),
    getCurrentTime: vi.fn(() => Promise.resolve(37.91)),
    pauseVideo: vi.fn(() => Promise.resolve()),
    seekTo: vi.fn(() => Promise.resolve())
  };

  return {
    playerFactory: vi.fn(() => state),
    playerState: state
  };
});

vi.mock("youtube-player", () => ({
  default: playerFactory
}));

afterEach(() => {
  playerState.destroy.mockClear();
  playerState.getCurrentTime.mockClear();
  playerState.pauseVideo.mockClear();
  playerState.seekTo.mockClear();
  playerFactory.mockClear();
});

describe("YouTubePlayer", () => {
  it("starts paused and can read the exact current time", async () => {
    const ref = createRef<YouTubePlayerHandle>();

    render(<YouTubePlayer ref={ref} videoId="LBkEDKfWpaA" handBlocks={[]} />);

    await waitFor(() => expect(playerFactory).toHaveBeenCalledTimes(1));

    await expect(ref.current?.getCurrentTime()).resolves.toBe(37.91);

    expect(playerFactory).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0
      },
      videoId: "LBkEDKfWpaA"
    });
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(1);
    expect(playerState.getCurrentTime).toHaveBeenCalledTimes(1);
  });

  it("seeks to a timestamp and pauses there", async () => {
    const ref = createRef<YouTubePlayerHandle>();

    render(<YouTubePlayer ref={ref} videoId="LBkEDKfWpaA" handBlocks={[]} />);

    await waitFor(() => expect(playerFactory).toHaveBeenCalledTimes(1));
    await ref.current?.seekTo(15.25);

    expect(playerState.seekTo).toHaveBeenCalledWith(15.25, true);
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(2);
  });
});
