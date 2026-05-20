import { notFound } from "next/navigation";
import { PresenterWorkspace } from "@/components/PresenterWorkspace";
import { createSupabaseServerClient } from "@/lib/db/server";
import type { ActionType, AnnotationVerdict } from "@/lib/types";

export default async function PresenterPage({ params }: { params: Promise<{ presenterSlug: string }> }) {
  const { presenterSlug } = await params;
  const supabase = createSupabaseServerClient();

  const { data: session } = await supabase
    .from("review_sessions")
    .select("*")
    .eq("presenter_slug", presenterSlug)
    .single();

  if (!session) {
    notFound();
  }

  const { data: decisionPoints } = await supabase
    .from("decision_points")
    .select("id,session_id,timestamp_seconds,source")
    .eq("session_id", session.id)
    .order("timestamp_seconds");

  const { data: annotations } = await supabase
    .from("annotations")
    .select("*, users(email), annotation_verdicts(verdict)")
    .eq("session_id", session.id);

  return (
    <PresenterWorkspace
      session={{
        youtubeVideoId: session.youtube_video_id,
        decklistText: session.decklist_text,
        handBlock: {
          enabled: session.hand_block_enabled,
          x: Number(session.hand_block_x),
          y: Number(session.hand_block_y),
          width: Number(session.hand_block_width),
          height: Number(session.hand_block_height)
        }
      }}
      decisionPoints={(decisionPoints ?? []).map((point) => ({
        id: point.id,
        sessionId: point.session_id,
        timestampSeconds: Number(point.timestamp_seconds),
        source: point.source
      }))}
      annotations={(annotations ?? []).map((annotation) => ({
        id: annotation.id,
        sessionId: annotation.session_id,
        decisionPointId: annotation.decision_point_id,
        userId: annotation.user_id,
        reviewerEmail: annotation.users?.email,
        originalTimestampSeconds: Number(annotation.original_timestamp_seconds),
        actionType: annotation.action_type as ActionType,
        actionText: annotation.action_text,
        argumentsText: annotation.arguments_text,
        lockedAt: annotation.locked_at,
        verdict: annotation.annotation_verdicts?.verdict as AnnotationVerdict | undefined
      }))}
    />
  );
}
