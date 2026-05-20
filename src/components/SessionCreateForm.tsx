"use client";

import { useState, useTransition } from "react";
import { createReviewSession } from "@/lib/actions/sessionActions";
import { DEFAULT_YOUTUBE_URL } from "@/lib/config";

type CreatedLinks = {
  reviewerPath: string;
  presenterPath: string;
};

export function SessionCreateForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<CreatedLinks | null>(null);
  const [handBlockEnabled, setHandBlockEnabled] = useState(false);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createReviewSession({
          presenterEmail: String(formData.get("presenterEmail") ?? ""),
          youtubeUrl: String(formData.get("youtubeUrl") ?? ""),
          decklistText: String(formData.get("decklistText") ?? ""),
          handBlockEnabled,
          handBlockX: Number(formData.get("handBlockX") ?? 0),
          handBlockY: Number(formData.get("handBlockY") ?? 0),
          handBlockWidth: Number(formData.get("handBlockWidth") ?? 0),
          handBlockHeight: Number(formData.get("handBlockHeight") ?? 0)
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
        <input name="youtubeUrl" required defaultValue={DEFAULT_YOUTUBE_URL} />
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
        <div className="block-grid">
          <input name="handBlockX" type="number" min="0" max="100" defaultValue="3" aria-label="Block x percent" />
          <input name="handBlockY" type="number" min="0" max="100" defaultValue="68" aria-label="Block y percent" />
          <input
            name="handBlockWidth"
            type="number"
            min="0"
            max="100"
            defaultValue="38"
            aria-label="Block width percent"
          />
          <input
            name="handBlockHeight"
            type="number"
            min="0"
            max="100"
            defaultValue="24"
            aria-label="Block height percent"
          />
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
