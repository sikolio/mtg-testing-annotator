import React from "react";
import { CardHoverText } from "@/components/CardHoverText";
import { parseDecklistCardNames } from "@/lib/domain/decklist";

export function DecklistPanel({
  title,
  decklistText,
  imageUrls,
  emptyMessage
}: {
  title: string;
  decklistText: string;
  imageUrls?: Record<string, string | null>;
  emptyMessage?: string;
}) {
  const cardNames = parseDecklistCardNames(decklistText);

  return (
    <aside className="panel decklist-panel">
      <h2>{title}</h2>
      <pre>
        {decklistText ? <CardHoverText text={decklistText} cardNames={cardNames} imageUrls={imageUrls} /> : emptyMessage || "No decklist provided yet."}
      </pre>
    </aside>
  );
}
