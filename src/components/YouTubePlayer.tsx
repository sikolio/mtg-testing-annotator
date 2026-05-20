"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { HandBlockOverlay } from "@/components/HandBlockOverlay";
import type { HandBlock } from "@/lib/types";

export type YouTubePlayerHandle = {
  getCurrentTime: () => Promise<number>;
  pause: () => void;
};

function postYouTubeCommand(iframe: HTMLIFrameElement | null, func: string) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, {
  videoId: string;
  handBlocks: HandBlock[];
  title?: string;
}>(function YouTubePlayer({ videoId, handBlocks, title = "Review video" }, ref) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const latestTimeRef = useRef(0);
  const pendingTimeRequestsRef = useRef<Array<(time: number) => void>>([]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      let payload: unknown;

      try {
        payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      const currentTime =
        typeof payload === "object" && payload !== null && "info" in payload
          ? (payload as { info?: { currentTime?: unknown } }).info?.currentTime
          : undefined;

      if (typeof currentTime !== "number") {
        return;
      }

      latestTimeRef.current = currentTime;
      const pendingRequests = pendingTimeRequestsRef.current.splice(0);
      pendingRequests.forEach((resolve) => resolve(currentTime));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useImperativeHandle(ref, () => ({
    pause() {
      postYouTubeCommand(iframeRef.current, "pauseVideo");
    },
    getCurrentTime() {
      postYouTubeCommand(iframeRef.current, "getCurrentTime");

      return new Promise((resolve) => {
        const timeout = window.setTimeout(() => {
          pendingTimeRequestsRef.current = pendingTimeRequestsRef.current.filter((candidate) => candidate !== resolve);
          resolve(latestTimeRef.current);
        }, 500);

        pendingTimeRequestsRef.current.push((time) => {
          window.clearTimeout(timeout);
          resolve(time);
        });
      });
    }
  }));

  return (
    <div className="video-frame">
      <iframe
        ref={iframeRef}
        title={title}
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
      <HandBlockOverlay blocks={handBlocks} />
    </div>
  );
});
