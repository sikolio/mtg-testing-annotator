"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import youTubePlayer from "youtube-player";
import { HandBlockOverlay } from "@/components/HandBlockOverlay";
import type { HandBlock } from "@/lib/types";

type YouTubePlayerInstance = {
  cueVideoById: (videoId: string, startSeconds?: number) => Promise<void>;
  destroy?: () => Promise<void> | void;
  getCurrentTime: () => Promise<number>;
  off: (listener: (event: { data: number }) => void) => void;
  on: (eventName: string, listener: (event: { data: number }) => void) => void;
  pauseVideo: () => Promise<void>;
  playVideo: () => Promise<void>;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => Promise<void>;
};

export type YouTubePlayerHandle = {
  getCurrentTime: () => Promise<number>;
  pause: () => Promise<void>;
  play: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
};

const PLAYER_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
} as const;

export const YouTubePlayer = forwardRef<
  YouTubePlayerHandle,
  {
    videoId: string;
    handBlocks: HandBlock[];
    title?: string;
  }
>(function YouTubePlayer({ videoId, handBlocks, title = "Review video" }, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const hasStartedPlaybackRef = useRef(false);

  async function getReadyPlayer() {
    const player = playerRef.current;

    if (!player) {
      throw new Error("YouTube player is not ready yet.");
    }

    return player;
  }

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const player = youTubePlayer(hostRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0
      }
    });

    playerRef.current = player;
    hasStartedPlaybackRef.current = false;
    void player.pauseVideo();

    const handleStateChange = (event: { data: number }) => {
      if (
        event.data === PLAYER_STATE.PLAYING ||
        event.data === PLAYER_STATE.PAUSED ||
        event.data === PLAYER_STATE.BUFFERING ||
        event.data === PLAYER_STATE.ENDED
      ) {
        hasStartedPlaybackRef.current = true;
      }
    };

    player.on("stateChange", handleStateChange);

    return () => {
      player.off(handleStateChange);
      void player.destroy?.();
      playerRef.current = null;
      hasStartedPlaybackRef.current = false;
    };
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    async pause() {
      const player = await getReadyPlayer();
      await player.pauseVideo();
    },
    async play() {
      const player = await getReadyPlayer();
      await player.playVideo();
    },
    async getCurrentTime() {
      const player = await getReadyPlayer();
      return player.getCurrentTime();
    },
    async seekTo(seconds: number) {
      const player = await getReadyPlayer();

      if (!hasStartedPlaybackRef.current) {
        await player.cueVideoById(videoId, seconds);
        return;
      }

      await player.seekTo(seconds, true);
      await player.pauseVideo();
    }
  }), [videoId]);

  return (
    <div className="video-frame" aria-label={title}>
      <div ref={hostRef} />
      <HandBlockOverlay blocks={handBlocks} />
    </div>
  );
});
