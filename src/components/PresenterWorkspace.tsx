"use client";

import { useMemo, useState } from "react";
import { CardHoverText } from "@/components/CardHoverText";
import { DecklistPanel } from "@/components/DecklistPanel";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { parseDecklistCardNames } from "@/lib/domain/decklist";
import { groupAnnotationsForPresentation } from "@/lib/domain/presentation";
import type { Annotation, DecisionPoint, HandBlock } from "@/lib/types";

type PresenterWorkspaceProps = {
  session: {
    youtubeVideoId: string;
    decklistText: string;
    opponentDecklistText: string;
    handBlocks: HandBlock[];
  };
  decisionPoints: DecisionPoint[];
  annotations: Annotation[];
};

export function PresenterWorkspace({ session, decisionPoints, annotations }: PresenterWorkspaceProps) {
  const [activeDecisionPointId, setActiveDecisionPointId] = useState(decisionPoints[0]?.id ?? "");
  const [showIdentities, setShowIdentities] = useState(false);

  const activeAnnotations = annotations.filter((annotation) => annotation.decisionPointId === activeDecisionPointId);
  const groups = useMemo(() => groupAnnotationsForPresentation(activeAnnotations), [activeAnnotations]);
  const activePoint = decisionPoints.find((point) => point.id === activeDecisionPointId);
  const cardNames = useMemo(
    () => [...new Set([...parseDecklistCardNames(session.decklistText), ...parseDecklistCardNames(session.opponentDecklistText)])],
    [session.decklistText, session.opponentDecklistText]
  );

  return (
    <main className="workspace">
      <aside className="review-left">
        <DecklistPanel
          title="Opponent decklist"
          decklistText={session.opponentDecklistText}
          emptyMessage="No opponent decklist provided yet."
        />
      </aside>

      <section className="review-main">
        <YouTubePlayer videoId={session.youtubeVideoId} handBlocks={session.handBlocks} title="Presentation video" />
        <div className="panel">
          <h2>Decision points</h2>
          <div className="decision-rail">
            {decisionPoints.map((point) => (
              <button
                key={point.id}
                type="button"
                className={point.id === activeDecisionPointId ? "secondary active" : "secondary"}
                onClick={() => setActiveDecisionPointId(point.id)}
              >
                {point.timestampSeconds.toFixed(2)}s
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="review-side">
        <DecklistPanel
          title="Your decklist"
          decklistText={session.decklistText}
        />
        <div className="panel">
          <div className="presentation-header">
            <h2>{activePoint ? `Options at ${activePoint.timestampSeconds.toFixed(2)}s` : "No decisions yet"}</h2>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={showIdentities}
                onChange={(event) => setShowIdentities(event.target.checked)}
              />
              Reveal emails
            </label>
          </div>

          <div className="choice-groups">
            {groups.map((group) => (
              <article key={`${group.decisionPointId}-${group.actionType}`} className="choice-group">
                <h3>
                  {group.actionType.replaceAll("_", " ")} · {group.count}
                </h3>
                <p>
                  Same {group.verdictCounts.same_play} · Different {group.verdictCounts.different_play} · Unclear{" "}
                  {group.verdictCounts.unclear}
                </p>
                {group.annotations.map((annotation, index) => (
                  <div key={annotation.id} className="annotation-card">
                    <strong>{showIdentities ? annotation.reviewerEmail : `Reviewer ${index + 1}`}</strong>
                    <p><CardHoverText text={annotation.actionText} cardNames={cardNames} /></p>
                    <p><CardHoverText text={annotation.argumentsText} cardNames={cardNames} /></p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
