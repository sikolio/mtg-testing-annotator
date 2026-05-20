import React from "react";

export function DecklistPanel({ decklistText }: { decklistText: string }) {
  return (
    <aside className="panel decklist-panel">
      <h2>Decklist</h2>
      <pre>{decklistText}</pre>
    </aside>
  );
}
