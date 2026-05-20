"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import youTubePlayer from "youtube-player";
import { HandBlockOverlay } from "@/components/HandBlockOverlay";
import type { HandBlock } from "@/lib/types";

type YouTubePlayerInstance = {
  destroy?: () => Promise<void> | void;
  getCurrentTime: () => Promise<number>;
  pauseVideo: () => Promise<void>;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => Promise<void>;
};

export type YouTubePlayerHandle = {
  getCurrentTime: () => Promise<number>;
  pause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
};

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
    void player.pauseVideo();

    return () => {
      void player.destroy?.();
      playerRef.current = null;
    };
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    async pause() {
      const player = await getReadyPlayer();
      await player.pauseVideo();
    },
    async getCurrentTime() {
      const player = await getReadyPlayer();
      return player.getCurrentTime();
    },
    async seekTo(seconds: number) {
      const player = await getReadyPlayer();
      await player.seekTo(seconds, true);
      await player.pauseVideo();
    }
  }));

  return (
    <div className="video-frame" aria-label={title}>
      <div ref={hostRef} />
      <HandBlockOverlay blocks={handBlocks} />
    </div>
  );
});
