"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { HandBlockOverlay } from "@/components/HandBlockOverlay";
import type { HandBlock } from "@/lib/types";

const YOUTUBE_PLAYER_STATE_PLAYING = 1;

type YouTubePlayerInstance = {
  destroy?: () => void;
  getCurrentTime: () => number;
  pauseVideo: () => void;
};

type YouTubePlayerReadyEvent = {
  target: YouTubePlayerInstance;
};

type YouTubePlayerStateChangeEvent = {
  data: number;
  target: YouTubePlayerInstance;
};

type YouTubePlayerConstructor = new (
  element: HTMLElement,
  options: {
    events?: {
      onReady?: (event: YouTubePlayerReadyEvent) => void;
      onStateChange?: (event: YouTubePlayerStateChangeEvent) => void;
    };
    height?: string;
    playerVars?: Record<string, number | string>;
    videoId: string;
    width?: string;
  }
) => YouTubePlayerInstance;

declare global {
  interface Window {
    YT?: {
      Player: YouTubePlayerConstructor;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type YouTubePlayerHandle = {
  getCurrentTime: () => Promise<number>;
  pause: () => Promise<void>;
};

let youtubeIframeApiPromise: Promise<YouTubePlayerConstructor> | null = null;

function loadYouTubeIframeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT.Player);
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');

    window.onYouTubeIframeAPIReady = () => {
      if (window.YT?.Player) {
        resolve(window.YT.Player);
      }
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return youtubeIframeApiPromise;
}

export const YouTubePlayer = forwardRef<
  YouTubePlayerHandle,
  {
    videoId: string;
    handBlocks: HandBlock[];
    onTimeChange?: (time: number) => void;
    title?: string;
  }
>(function YouTubePlayer({ videoId, handBlocks, onTimeChange, title = "Review video" }, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const playerReadyPromiseRef = useRef<Promise<YouTubePlayerInstance> | null>(null);
  const onTimeChangeRef = useRef(onTimeChange);
  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  async function getReadyPlayer() {
    if (!playerReadyPromiseRef.current) {
      throw new Error("YouTube player is not ready yet.");
    }

    return playerReadyPromiseRef.current;
  }

  function stopTimePolling() {
    if (pollingIntervalRef.current !== null) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }

  function startTimePolling(player: YouTubePlayerInstance) {
    stopTimePolling();
    pollingIntervalRef.current = window.setInterval(() => {
      onTimeChangeRef.current?.(player.getCurrentTime());
    }, 500);
  }

  useEffect(() => {
    let cancelled = false;

    playerReadyPromiseRef.current = (async () => {
      const Player = await loadYouTubeIframeApi();

      if (cancelled || !hostRef.current) {
        throw new Error("YouTube player was unmounted before initialization.");
      }

      return new Promise<YouTubePlayerInstance>((resolve) => {
        const player = new Player(hostRef.current as HTMLElement, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            enablejsapi: 1,
            rel: 0
          },
          events: {
            onReady: (event) => {
              playerRef.current = event.target;
              resolve(event.target);
            },
            onStateChange: (event) => {
              if (event.data === YOUTUBE_PLAYER_STATE_PLAYING) {
                startTimePolling(event.target);
                return;
              }

              stopTimePolling();
            }
          }
        });

        playerRef.current = player;
      });
    })();

    return () => {
      cancelled = true;
      stopTimePolling();
      playerRef.current?.destroy?.();
      playerRef.current = null;
      playerReadyPromiseRef.current = null;
    };
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    async pause() {
      const player = await getReadyPlayer();
      player.pauseVideo();
    },
    async getCurrentTime() {
      const player = await getReadyPlayer();
      return player.getCurrentTime();
    }
  }));

  return (
    <div className="video-frame">
      <div ref={hostRef} aria-label={title} />
      <HandBlockOverlay blocks={handBlocks} />
    </div>
  );
});
