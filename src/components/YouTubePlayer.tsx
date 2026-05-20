"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { HandBlockOverlay } from "@/components/HandBlockOverlay";
import type { HandBlock } from "@/lib/types";

type YouTubePlayerInstance = {
  destroy?: () => void;
  getCurrentTime: () => number;
  pauseVideo: () => void;
};

type YouTubePlayerReadyEvent = {
  target: YouTubePlayerInstance;
};

type YouTubePlayerConstructor = new (
  element: HTMLElement,
  options: {
    events?: {
      onReady?: (event: YouTubePlayerReadyEvent) => void;
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
    title?: string;
  }
>(function YouTubePlayer({ videoId, handBlocks, title = "Review video" }, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const playerReadyPromiseRef = useRef<Promise<YouTubePlayerInstance> | null>(null);

  async function getReadyPlayer() {
    if (!playerReadyPromiseRef.current) {
      throw new Error("YouTube player is not ready yet.");
    }

    return playerReadyPromiseRef.current;
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
            }
          }
        });

        playerRef.current = player;
      });
    })();

    return () => {
      cancelled = true;
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
