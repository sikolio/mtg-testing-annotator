import React from "react";
import { CardHoverText } from "@/components/CardHoverText";
import { parseDecklistCardNames } from "@/lib/domain/decklist";

export function DecklistPanel({
  title,
  decklistText,
  emptyMessage
}: {
  title: string;
  decklistText: string;
  emptyMessage?: string;
}) {
  const cardNames = parseDecklistCardNames(decklistText);

  return (
    <aside className="panel decklist-panel">
      <h2>{title}</h2>
      <pre>
        {decklistText ? <CardHoverText text={decklistText} cardNames={cardNames} /> : emptyMessage || "No decklist provided yet."}
      </pre>
    </aside>
  );
}
