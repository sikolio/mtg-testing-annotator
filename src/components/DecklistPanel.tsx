import React from "react";

export function DecklistPanel({
  title,
  decklistText,
  emptyMessage
}: {
  title: string;
  decklistText: string;
  emptyMessage?: string;
}) {
  return (
    <aside className="panel decklist-panel">
      <h2>{title}</h2>
      <pre>{decklistText || emptyMessage || "No decklist provided yet."}</pre>
    </aside>
  );
}
