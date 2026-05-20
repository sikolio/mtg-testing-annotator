"use client";

import React from "react";
import { useState, useTransition } from "react";
import { createReviewSession } from "@/lib/actions/sessionActions";
import { DEFAULT_YOUTUBE_URL } from "@/lib/config";
import { parseYouTubeVideoId } from "@/lib/domain/youtube";

type CreatedLinks = {
  reviewerPath: string;
  presenterPath: string;
};

export function SessionCreateForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<CreatedLinks | null>(null);
  const [handBlockEnabled, setHandBlockEnabled] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState(DEFAULT_YOUTUBE_URL);
  const [handBlockX, setHandBlockX] = useState("3");
  const [handBlockY, setHandBlockY] = useState("68");
  const [handBlockWidth, setHandBlockWidth] = useState("38");
  const [handBlockHeight, setHandBlockHeight] = useState("24");

  let previewVideoId: string | null = null;
  try {
    previewVideoId = parseYouTubeVideoId(youtubeUrl);
  } catch {
    previewVideoId = null;
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createReviewSession({
          presenterEmail: String(formData.get("presenterEmail") ?? ""),
          youtubeUrl,
          decklistText: String(formData.get("decklistText") ?? ""),
          handBlockEnabled,
          handBlockX: Number(handBlockX || 0),
          handBlockY: Number(handBlockY || 0),
          handBlockWidth: Number(handBlockWidth || 0),
          handBlockHeight: Number(handBlockHeight || 0)
        });
        setLinks(result);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not create session.");
      }
    });
  }

  return (
    <form action={onSubmit} className="panel form-grid">
      <label>
        Presenter email
        <input name="presenterEmail" type="email" required placeholder="teammate@example.com" />
      </label>

      <label>
        YouTube URL
        <input name="youtubeUrl" required value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} />
      </label>

      <label>
        Decklist
        <textarea name="decklistText" required rows={12} placeholder={"4 Lightning Bolt\n4 Ragavan, Nimble Pilferer"} />
      </label>

      <label className="inline-check">
        <input
          type="checkbox"
          checked={handBlockEnabled}
          onChange={(event) => setHandBlockEnabled(event.target.checked)}
        />
        Enable static hand-hidden-block
      </label>

      {handBlockEnabled ? (
        <div className="block-settings">
          {previewVideoId ? (
            <div className="video-frame block-preview">
              <img
                title="Hand-hidden-block positioning preview"
                src={`https://i.ytimg.com/vi/${previewVideoId}/hqdefault.jpg`}
                alt=""
              />
              <div
                className="hand-block"
                style={{
                  left: `${Number(handBlockX || 0)}%`,
                  top: `${Number(handBlockY || 0)}%`,
                  width: `${Number(handBlockWidth || 0)}%`,
                  height: `${Number(handBlockHeight || 0)}%`
                }}
                aria-label="Preview hidden hand information"
              />
            </div>
          ) : (
            <p className="error-text">Enter a valid YouTube URL to preview the block.</p>
          )}

          <div className="block-grid">
            <input
              name="handBlockX"
              type="number"
              min="0"
              max="100"
              value={handBlockX}
              onChange={(event) => setHandBlockX(event.target.value)}
              aria-label="Block x percent"
            />
            <input
              name="handBlockY"
              type="number"
              min="0"
              max="100"
              value={handBlockY}
              onChange={(event) => setHandBlockY(event.target.value)}
              aria-label="Block y percent"
            />
            <input
              name="handBlockWidth"
              type="number"
              min="0"
              max="100"
              value={handBlockWidth}
              onChange={(event) => setHandBlockWidth(event.target.value)}
              aria-label="Block width percent"
            />
            <input
              name="handBlockHeight"
              type="number"
              min="0"
              max="100"
              value={handBlockHeight}
              onChange={(event) => setHandBlockHeight(event.target.value)}
              aria-label="Block height percent"
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create review session"}
      </button>

      {links ? (
        <div className="result-box">
          <strong>Session created</strong>
          <a href={links.reviewerPath}>Reviewer link</a>
          <a href={links.presenterPath}>Presenter link</a>
        </div>
      ) : null}
    </form>
  );
}
