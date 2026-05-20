"use client";

import React, { useMemo, useRef, useState } from "react";
import { CardPreviewPopover } from "@/components/CardPreviewPopover";
import { findCardAliasMatches } from "@/lib/domain/decklist";
import { fetchCardImageUrl } from "@/lib/scryfall";

export function CardHoverText({
  text,
  cardNames,
  imageUrls,
  className
}: {
  text: string;
  cardNames: string[];
  imageUrls?: Record<string, string | null>;
  className?: string;
}) {
  const [previewCardName, setPreviewCardName] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewAnchorElement, setPreviewAnchorElement] = useState<HTMLElement | null>(null);
  const requestIdRef = useRef(0);
  const segments = useMemo(() => findCardAliasMatches(text, cardNames), [text, cardNames]);

  async function showPreview(cardName: string, anchorElement: HTMLElement) {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setPreviewCardName(cardName);
    setPreviewAnchorElement(anchorElement);
    const preloadedImageUrl = imageUrls?.[cardName];

    if (typeof preloadedImageUrl !== "undefined") {
      setPreviewImageUrl(preloadedImageUrl);
      return;
    }

    setPreviewImageUrl(null);
    const imageUrl = await fetchCardImageUrl(cardName);

    if (requestId === requestIdRef.current) {
      setPreviewImageUrl(imageUrl);
    }
  }

  function hidePreview() {
    requestIdRef.current += 1;
    setPreviewCardName(null);
    setPreviewAnchorElement(null);
    setPreviewImageUrl(null);
  }

  return (
    <span className={`card-hover-text ${className ?? ""}`.trim()}>
      {segments.map((segment, index) =>
        segment.cardName ? (
          <span
            key={`${segment.text}-${index}`}
            className="card-mention"
            onMouseEnter={(event) => void showPreview(segment.cardName as string, event.currentTarget)}
            onMouseLeave={hidePreview}
          >
            {segment.text}
          </span>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        )
      )}
      <CardPreviewPopover anchorElement={previewAnchorElement} cardName={previewCardName} imageUrl={previewImageUrl} />
    </span>
  );
}
