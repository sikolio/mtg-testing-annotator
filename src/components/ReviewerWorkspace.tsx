"use client";

import React from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { DecklistPanel } from "@/components/DecklistPanel";
import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/YouTubePlayer";
import { commitAnnotation, submitVerdict } from "@/lib/actions/reviewActions";
import { ACTION_TYPES, type ActionType, type Annotation, type DecisionPoint, type HandBlock } from "@/lib/types";

type ReviewerWorkspaceProps = {
  session: {
    id: string;
    youtubeVideoId: string;
    decklistText: string;
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
  const handledCheckpointIdsRef = useRef<Set<string>>(new Set());
  const [timestampSeconds, setTimestampSeconds] = useState(0);
  const [pendingAnnotation, setPendingAnnotation] = useState<Annotation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    handledCheckpointIdsRef.current = new Set();
  }, [session.id]);

  useEffect(() => {
    if (decisionPoints.length === 0) {
      return;
    }

    const sortedDecisionPoints = [...decisionPoints].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    const interval = window.setInterval(async () => {
      const currentTime = await playerRef.current?.getCurrentTime();

      if (typeof currentTime !== "number") {
        return;
      }

      const checkpoint = sortedDecisionPoints.find(
        (point) =>
          !handledCheckpointIdsRef.current.has(point.id) && currentTime >= point.timestampSeconds
      );

      if (!checkpoint) {
        return;
      }

      handledCheckpointIdsRef.current.add(checkpoint.id);
      await playerRef.current?.pause();
      setTimestampSeconds(checkpoint.timestampSeconds);
      setMessage(
        pendingAnnotation
          ? "Checkpoint reached. Record the verdict for your previous play."
          : "Checkpoint reached. Add your annotation for this decision."
      );
    }, 750);

    return () => window.clearInterval(interval);
  }, [decisionPoints, pendingAnnotation]);

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

  return (
    <main className="workspace">
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
        </div>
      </section>

      <section className="review-side">
        <DecklistPanel decklistText={session.decklistText} />

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
              <input name="actionText" required placeholder="What play would you make?" />
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
