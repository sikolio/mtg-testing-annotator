import React from "react";

export function DecklistPanel({
  decklistText,
  opponentDecklistText
}: {
  decklistText: string;
  opponentDecklistText: string;
}) {
  return (
    <aside className="panel decklist-panel">
      <h2>Decklists</h2>
      <div>
        <h3>Your decklist</h3>
        <pre>{decklistText}</pre>
      </div>
      <div>
        <h3>Opponent decklist</h3>
        <pre>{opponentDecklistText || "No opponent decklist provided yet."}</pre>
      </div>
    </aside>
  );
}
