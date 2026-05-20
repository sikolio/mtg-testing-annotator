"use client";

import React from "react";
import { useMemo, useRef, useState } from "react";
import { CardHoverText } from "@/components/CardHoverText";
import { DecklistPanel } from "@/components/DecklistPanel";
import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/YouTubePlayer";
import { parseDecklistCardNames } from "@/lib/domain/decklist";
import { groupAnnotationsForPresentation } from "@/lib/domain/presentation";
import { useCardImageUrls } from "@/lib/useCardImageUrls";
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

function formatCheckpointTime(timestampSeconds: number) {
  const minutes = Math.floor(timestampSeconds / 60);
  const seconds = timestampSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

export function PresenterWorkspace({ session, decisionPoints, annotations }: PresenterWorkspaceProps) {
  const playerRef = useRef<YouTubePlayerHandle | null>(null);
  const [activeDecisionPointId, setActiveDecisionPointId] = useState(decisionPoints[0]?.id ?? "");
  const [showIdentities, setShowIdentities] = useState(false);

  const sortedDecisionPoints = [...decisionPoints].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  const activeDecisionPointIndex = sortedDecisionPoints.findIndex((point) => point.id === activeDecisionPointId);
  const activePoint =
    activeDecisionPointIndex >= 0 ? sortedDecisionPoints[activeDecisionPointIndex] : sortedDecisionPoints[0] ?? null;
  const activeAnnotations = annotations.filter((annotation) => annotation.decisionPointId === activePoint?.id);
  const groups = useMemo(() => groupAnnotationsForPresentation(activeAnnotations), [activeAnnotations]);
  const cardNames = useMemo(
    () => [...new Set([...parseDecklistCardNames(session.decklistText), ...parseDecklistCardNames(session.opponentDecklistText)])],
    [session.decklistText, session.opponentDecklistText]
  );
  const imageUrls = useCardImageUrls(cardNames);

  async function handleDecisionPointChange(point: DecisionPoint) {
    setActiveDecisionPointId(point.id);
    await playerRef.current?.seekTo(point.timestampSeconds);
  }

  async function handleCheckpointStep(direction: -1 | 1) {
    if (sortedDecisionPoints.length === 0) {
      return;
    }

    const currentIndex = activeDecisionPointIndex >= 0 ? activeDecisionPointIndex : 0;
    const nextPoint = sortedDecisionPoints[currentIndex + direction];

    if (!nextPoint) {
      return;
    }

    await handleDecisionPointChange(nextPoint);
  }

  return (
    <main className="workspace">
      <aside className="review-left">
        <DecklistPanel
          title="Opponent decklist"
          decklistText={session.opponentDecklistText}
          imageUrls={imageUrls}
          emptyMessage="No opponent decklist provided yet."
        />
      </aside>

      <section className="review-main">
        <YouTubePlayer ref={playerRef} videoId={session.youtubeVideoId} handBlocks={session.handBlocks} title="Presentation video" />
        <div className="panel checkpoint-panel">
          <div className="checkpoint-summary">
            <h2>Decision points</h2>
            {activePoint ? (
              <span className="checkpoint-current">
                {`Checkpoint ${Math.max(activeDecisionPointIndex, 0) + 1} of ${sortedDecisionPoints.length}: ${formatCheckpointTime(activePoint.timestampSeconds)}`}
              </span>
            ) : null}
          </div>
          <div className="checkpoint-nav">
            <button
              type="button"
              className="secondary"
              onClick={() => void handleCheckpointStep(-1)}
              disabled={(activeDecisionPointIndex >= 0 ? activeDecisionPointIndex : 0) === 0}
            >
              Previous checkpoint
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void handleCheckpointStep(1)}
              disabled={
                sortedDecisionPoints.length === 0 ||
                (activeDecisionPointIndex >= 0 ? activeDecisionPointIndex : 0) === sortedDecisionPoints.length - 1
              }
            >
              Next checkpoint
            </button>
          </div>
          <div className="checkpoint-list" role="list" aria-label="Presentation checkpoints">
            {sortedDecisionPoints.map((point) => (
              <button
                key={point.id}
                type="button"
                className={point.id === activePoint?.id ? "secondary active checkpoint-item" : "secondary checkpoint-item"}
                onClick={() => void handleDecisionPointChange(point)}
              >
                {formatCheckpointTime(point.timestampSeconds)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="review-side">
        <DecklistPanel
          title="Your decklist"
          decklistText={session.decklistText}
          imageUrls={imageUrls}
        />
        <div className="panel">
          <div className="presentation-header">
            <h2>{activePoint ? `Options at ${formatCheckpointTime(activePoint.timestampSeconds)}` : "No decisions yet"}</h2>
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
                    <p><CardHoverText text={annotation.actionText} cardNames={cardNames} imageUrls={imageUrls} /></p>
                    <p><CardHoverText text={annotation.argumentsText} cardNames={cardNames} imageUrls={imageUrls} /></p>
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
