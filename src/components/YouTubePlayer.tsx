"use client";

import { HandBlockOverlay } from "@/components/HandBlockOverlay";
import type { HandBlock } from "@/lib/types";

export function YouTubePlayer({
  videoId,
  handBlock,
  title = "Review video"
}: {
  videoId: string;
  handBlock: HandBlock;
  title?: string;
}) {
  return (
    <div className="video-frame">
      <iframe
        title={title}
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
      <HandBlockOverlay block={handBlock} />
    </div>
  );
}
