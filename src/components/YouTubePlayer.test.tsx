import "@testing-library/jest-dom/vitest";
import { render, waitFor } from "@testing-library/react";
import React, { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubePlayer, type YouTubePlayerHandle } from "./YouTubePlayer";

const { playerFactory, playerState } = vi.hoisted(() => {
  let stateChangeListener: ((event: { data: number }) => void) | null = null;
  const state = {
    cueVideoById: vi.fn(() => Promise.resolve()),
    destroy: vi.fn(),
    getCurrentTime: vi.fn(() => Promise.resolve(37.91)),
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

  it("cues a timestamp without wedging the player before first playback", async () => {
    const ref = createRef<YouTubePlayerHandle>();

    render(<YouTubePlayer ref={ref} videoId="LBkEDKfWpaA" handBlocks={[]} />);

    await waitFor(() => expect(playerFactory).toHaveBeenCalledTimes(1));
    await ref.current?.seekTo(15.25);
    await ref.current?.play();

    expect(playerState.cueVideoById).toHaveBeenCalledWith("LBkEDKfWpaA", 15.25);
    expect(playerState.seekTo).not.toHaveBeenCalled();
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(1);
    expect(playerState.playVideo).toHaveBeenCalledTimes(1);
  });

  it("seeks and pauses after playback has started once", async () => {
    const ref = createRef<YouTubePlayerHandle>();

    render(<YouTubePlayer ref={ref} videoId="LBkEDKfWpaA" handBlocks={[]} />);

    await waitFor(() => expect(playerFactory).toHaveBeenCalledTimes(1));
    playerState.emitStateChange(1);
    await ref.current?.seekTo(15.25);

    expect(playerState.cueVideoById).not.toHaveBeenCalled();
    expect(playerState.seekTo).toHaveBeenCalledWith(15.25, true);
    expect(playerState.pauseVideo).toHaveBeenCalledTimes(2);
  });
});
