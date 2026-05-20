"use client";

import React from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { DecklistPanel } from "@/components/DecklistPanel";
import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/YouTubePlayer";
import { commitAnnotation, submitVerdict } from "@/lib/actions/reviewActions";
import { parseDecklistCardNames } from "@/lib/domain/decklist";
import { ACTION_TYPES, type ActionType, type Annotation, type DecisionPoint, type HandBlock } from "@/lib/types";

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

export function ReviewerWorkspace({ session, user, decisionPoints }: ReviewerWorkspaceProps) {
  const playerRef = useRef<YouTubePlayerHandle | null>(null);
  const [timestampSeconds, setTimestampSeconds] = useState(0);
  const [pendingAnnotation, setPendingAnnotation] = useState<Annotation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sortedDecisionPoints = [...decisionPoints].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  const deckCardSuggestions = useMemo(() => parseDecklistCardNames(session.decklistText), [session.decklistText]);

  function handleAnnotation(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      try {
        const saved = await commitAnnotation({
          sessionId: session.id,
          userId: user.id,
          timestampSeconds,
          actionType: String(formData.get("actionType")) as ActionType,
          actionText: String(formData.get("actionText") ?? ""),
          argumentsText: String(formData.get("argumentsText") ?? "")
        });

        setPendingAnnotation({
          id: saved.id,
          sessionId: session.id,
          decisionPointId: saved.decision_point_id,
          userId: user.id,
          originalTimestampSeconds: timestampSeconds,
          actionType: String(formData.get("actionType")) as ActionType,
          actionText: String(formData.get("actionText") ?? ""),
          argumentsText: String(formData.get("argumentsText") ?? ""),
          lockedAt: saved.locked_at
        });
        setMessage("Annotation locked. Continue the video, then record the verdict at the next pause.");
      } catch (caught) {
        setMessage(caught instanceof Error ? caught.message : "Could not save annotation.");
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
    setTimestampSeconds(point.timestampSeconds);
    setMessage(
      pendingAnnotation
        ? "Checkpoint loaded. Record the verdict for your previous play."
        : "Checkpoint loaded. Add your annotation for this decision."
    );
  }

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
        <YouTubePlayer ref={playerRef} videoId={session.youtubeVideoId} handBlocks={session.handBlocks} />
        <div className="panel timeline-panel">
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
          <p>{decisionPoints.length} community checkpoints available.</p>
          {sortedDecisionPoints.length > 0 ? (
            <div className="checkpoint-list">
              {sortedDecisionPoints.map((point) => (
                <button key={point.id} type="button" onClick={() => handleDecisionPointJump(point)}>
                  {`Jump to ${point.timestampSeconds.toFixed(2)}s`}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="review-side">
        <DecklistPanel
          title="Your decklist"
          decklistText={session.decklistText}
        />

        <div className="panel">
          <h2>{pendingAnnotation ? "Video verdict" : "Your play"}</h2>
          {message ? <p className="status-text">{message}</p> : null}

          {pendingAnnotation ? (
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
          ) : (
            <form action={handleAnnotation} className="form-grid">
              <select name="actionType" required>
                {ACTION_TYPES.map((actionType) => (
                  <option key={actionType} value={actionType}>
                    {actionType.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <input
                name="actionText"
                required
                list="deck-card-suggestions"
                placeholder="What play would you make?"
              />
              <datalist id="deck-card-suggestions">
                {deckCardSuggestions.map((cardName) => (
                  <option key={cardName} value={cardName} />
                ))}
              </datalist>
              <textarea name="argumentsText" required rows={5} placeholder="Why this play and not another?" />
              <button type="submit" disabled={isPending}>
                Commit and continue
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
