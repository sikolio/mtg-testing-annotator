"use client";

import React, { useMemo, useState } from "react";
import { buildCardReferenceMap } from "@/lib/domain/decklist";
import { fetchCardImageUrl } from "@/lib/scryfall";

type Segment = {
  text: string;
  cardName?: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSegments(text: string, cardNames: string[]) {
  const references = buildCardReferenceMap(cardNames);
  const aliasEntries = references
    .flatMap((reference) => reference.aliases.map((alias) => ({ alias, cardName: reference.cardName })))
    .sort((left, right) => right.alias.length - left.alias.length);

  if (aliasEntries.length === 0) {
    return [{ text }] satisfies Segment[];
  }

  const matcher = new RegExp(aliasEntries.map((entry) => escapeRegExp(entry.alias)).join("|"), "gi");
  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(matcher)) {
    const start = match.index ?? 0;
    const matchedText = match[0];
    const aliasEntry = aliasEntries.find((entry) => entry.alias.toLowerCase() === matchedText.toLowerCase());

    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start) });
    }

    segments.push({ text: matchedText, cardName: aliasEntry?.cardName });
    cursor = start + matchedText.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

export function CardHoverText({
  text,
  cardNames,
  className
}: {
  text: string;
  cardNames: string[];
  className?: string;
}) {
  const [previewCardName, setPreviewCardName] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const segments = useMemo(() => buildSegments(text, cardNames), [text, cardNames]);

  async function showPreview(cardName: string) {
    setPreviewCardName(cardName);
    setPreviewImageUrl(null);
    const imageUrl = await fetchCardImageUrl(cardName);
    setPreviewImageUrl((current) => (previewCardName === cardName || current === null ? imageUrl : current));
  }

  return (
    <span className={`card-hover-text ${className ?? ""}`.trim()}>
      {segments.map((segment, index) =>
        segment.cardName ? (
          <span
            key={`${segment.text}-${index}`}
            className="card-mention"
            onMouseEnter={() => void showPreview(segment.cardName as string)}
            onMouseLeave={() => {
              setPreviewCardName(null);
              setPreviewImageUrl(null);
            }}
          >
            {segment.text}
            {previewCardName === segment.cardName ? (
              <span className="card-preview">
                {previewImageUrl ? (
                  <img src={previewImageUrl} alt={`${segment.cardName} preview`} />
                ) : (
                  <span className="card-preview-loading">Loading...</span>
                )}
              </span>
            ) : null}
          </span>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        )
      )}
    </span>
  );
}
