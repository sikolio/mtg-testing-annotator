"use client";

import { useMemo, useState } from "react";
import { DecklistPanel } from "@/components/DecklistPanel";
import { YouTubePlayer } from "@/components/YouTubePlayer";
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

  return (
    <main className="workspace">
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
          decklistText={session.decklistText}
          opponentDecklistText={session.opponentDecklistText}
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
                    <p>{annotation.actionText}</p>
                    <p>{annotation.argumentsText}</p>
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
