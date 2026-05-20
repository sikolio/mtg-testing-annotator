"use client";

import React from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { DecklistPanel } from "@/components/DecklistPanel";
import { PlayTextComposer } from "@/components/PlayTextComposer";
import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/YouTubePlayer";
import { confirmAnnotation, draftAnnotation, submitVerdict } from "@/lib/actions/reviewActions";
import { parseDecklistCardNames } from "@/lib/domain/decklist";
import { useCardImageUrls } from "@/lib/useCardImageUrls";
import { type Annotation, type DecisionPoint, type HandBlock } from "@/lib/types";

type ReviewerWorkspaceProps = {
  session: {
    id: string;
    youtubeVideoId: string;
    decklistText: string;
    opponentDecklistText: string;
    handBlocks: HandBlock[];
  };
  user: {
    id: string;
    email: string;
  };
  decisionPoints: DecisionPoint[];
};

function formatCheckpointTime(timestampSeconds: number) {
  const minutes = Math.floor(timestampSeconds / 60);
  const seconds = timestampSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

export function ReviewerWorkspace({ session, user, decisionPoints }: ReviewerWorkspaceProps) {
  const playerRef = useRef<YouTubePlayerHandle | null>(null);
  const [timestampSeconds, setTimestampSeconds] = useState(0);
  const [pendingAnnotation, setPendingAnnotation] = useState<Annotation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionText, setActionText] = useState("");
  const [argumentsText, setArgumentsText] = useState("");
  const [parsedActionText, setParsedActionText] = useState("");
  const [activeDecisionPointId, setActiveDecisionPointId] = useState(decisionPoints[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const sortedDecisionPoints = [...decisionPoints].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  const deckCardSuggestions = useMemo(() => parseDecklistCardNames(session.decklistText), [session.decklistText]);
  const allCardNames = useMemo(
    () => [...new Set([...parseDecklistCardNames(session.decklistText), ...parseDecklistCardNames(session.opponentDecklistText)])],
    [session.decklistText, session.opponentDecklistText]
  );
  const imageUrls = useCardImageUrls(allCardNames);
  const activeDecisionPointIndex = sortedDecisionPoints.findIndex((point) => point.id === activeDecisionPointId);
  const activeDecisionPoint =
    activeDecisionPointIndex >= 0 ? sortedDecisionPoints[activeDecisionPointIndex] : sortedDecisionPoints[0] ?? null;

  function handleDraftAnnotation() {
    setMessage(null);
    startTransition(async () => {
      try {
        const saved = await draftAnnotation({
          sessionId: session.id,
          userId: user.id,
          timestampSeconds,
          rawActionText: actionText,
          argumentsText
        });

        setPendingAnnotation({
          id: saved.id,
          sessionId: session.id,
          decisionPointId: saved.decisionPointId,
          userId: user.id,
          originalTimestampSeconds: timestampSeconds,
          rawActionText: saved.rawActionText,
          actionType: saved.actionType,
          actionText: saved.actionText,
          argumentsText: saved.argumentsText,
          lockedAt: saved.lockedAt
        });
        setParsedActionText(saved.actionText);
        setMessage("Review the parsed interpretation, make any edits you want, and confirm it before continuing.");
      } catch (caught) {
        setMessage(caught instanceof Error ? caught.message : "Could not parse annotation.");
      }
    });
  }

  function handleConfirmAnnotation() {
    if (!pendingAnnotation) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const confirmed = await confirmAnnotation({
          annotationId: pendingAnnotation.id,
          actionText: parsedActionText
        });

        setPendingAnnotation({
          ...pendingAnnotation,
          actionType: confirmed.actionType,
          actionText: confirmed.actionText,
          lockedAt: confirmed.lockedAt
        });
        setActionText("");
        setArgumentsText("");
        setParsedActionText("");
        setMessage("Annotation locked. Continue the video, then record the verdict at the next pause.");
      } catch (caught) {
        setMessage(caught instanceof Error ? caught.message : "Could not confirm parsed play.");
      }
    });
  }

  function handleVerdict(formData: FormData) {
    if (!pendingAnnotation) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        await submitVerdict({
          annotationId: pendingAnnotation.id,
          verdict: String(formData.get("verdict")) as "same_play" | "different_play" | "unclear"
        });
        setPendingAnnotation(null);
        setMessage("Verdict saved.");
      } catch (caught) {
        setMessage(caught instanceof Error ? caught.message : "Could not save verdict.");
      }
    });
  }

  async function handleAddAnnotation() {
    await playerRef.current?.pause();
    const currentTime = await playerRef.current?.getCurrentTime();

    if (typeof currentTime === "number") {
      setTimestampSeconds(Number(currentTime.toFixed(2)));
    }
  }

  async function handleDecisionPointJump(point: DecisionPoint) {
    await playerRef.current?.seekTo(point.timestampSeconds);
    setActiveDecisionPointId(point.id);
    setTimestampSeconds(point.timestampSeconds);
    setMessage(
      pendingAnnotation?.lockedAt
        ? "Checkpoint loaded. Record the verdict for your previous play."
        : pendingAnnotation
          ? "Checkpoint loaded. Confirm your parsed play before continuing."
        : "Checkpoint loaded. Add your annotation for this decision."
    );
  }

  async function handleCheckpointStep(direction: -1 | 1) {
    if (sortedDecisionPoints.length === 0) {
      return;
    }

    const currentIndex = activeDecisionPointIndex >= 0 ? activeDecisionPointIndex : 0;
    const nextIndex = currentIndex + direction;
    const nextPoint = sortedDecisionPoints[nextIndex];

    if (!nextPoint) {
      return;
    }

    await handleDecisionPointJump(nextPoint);
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
        <YouTubePlayer ref={playerRef} videoId={session.youtubeVideoId} handBlocks={session.handBlocks} />
        <div className="panel timeline-panel">
          <div className="timeline-controls">
            <button type="button" onClick={handleAddAnnotation}>
              Add annotation
            </button>
            <label className="timestamp-field">
              Current timestamp
              <input
                type="number"
                min="0"
                step="0.1"
                value={timestampSeconds}
                onChange={(event) => setTimestampSeconds(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="checkpoint-panel">
            <div className="checkpoint-summary">
              <p>{decisionPoints.length} community checkpoints available.</p>
              {activeDecisionPoint ? (
                <span className="checkpoint-current">
                  {`Checkpoint ${Math.max(activeDecisionPointIndex, 0) + 1} of ${sortedDecisionPoints.length}: ${formatCheckpointTime(activeDecisionPoint.timestampSeconds)}`}
                </span>
              ) : null}
            </div>

            {sortedDecisionPoints.length > 0 ? (
              <>
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
                <div className="checkpoint-list" role="list" aria-label="Community checkpoints">
                  {sortedDecisionPoints.map((point) => (
                    <button
                      key={point.id}
                      type="button"
                      className={point.id === activeDecisionPoint?.id ? "secondary active checkpoint-item" : "secondary checkpoint-item"}
                      onClick={() => void handleDecisionPointJump(point)}
                    >
                      {formatCheckpointTime(point.timestampSeconds)}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
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
          <h2>{pendingAnnotation?.lockedAt ? "Video verdict" : pendingAnnotation ? "Confirm parsed play" : "Your play"}</h2>
          {message ? <p className="status-text">{message}</p> : null}

          {pendingAnnotation?.lockedAt ? (
            <form action={handleVerdict} className="form-grid">
              <select name="verdict" required>
                <option value="same_play">Same play</option>
                <option value="different_play">Different play</option>
                <option value="unclear">Unclear</option>
              </select>
              <button type="submit" disabled={isPending}>
                Save verdict
              </button>
            </form>
          ) : pendingAnnotation ? (
            <div className="form-grid">
              <label>
                Original input
                <textarea value={pendingAnnotation.rawActionText} rows={3} readOnly />
              </label>
              <PlayTextComposer
                name="parsedActionText"
                value={parsedActionText}
                onChange={setParsedActionText}
                cardNames={deckCardSuggestions}
                imageUrls={imageUrls}
                placeholder="Confirm the parsed play"
              />
              <button type="button" disabled={isPending} onClick={handleConfirmAnnotation}>
                Confirm play
              </button>
            </div>
          ) : (
            <form
              action={() => {
                handleDraftAnnotation();
              }}
              className="form-grid"
            >
              <PlayTextComposer
                name="actionText"
                value={actionText}
                onChange={setActionText}
                cardNames={deckCardSuggestions}
                imageUrls={imageUrls}
                placeholder="What play would you make?"
              />
              <textarea
                name="argumentsText"
                required
                rows={5}
                value={argumentsText}
                onChange={(event) => setArgumentsText(event.target.value)}
                placeholder="Why this play and not another?"
              />
              <button type="submit" disabled={isPending}>
                Parse play
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
