import React from "react";
import { notFound } from "next/navigation";
import { PresenterWorkspace } from "@/components/PresenterWorkspace";
import { ensureSessionAggregation } from "@/lib/actions/aggregationActions";
import { updateLocalAnnotationAggregations, getLocalPresenterSession } from "@/lib/db/localStore";
import { createSupabaseServerClient, shouldUseLocalDevelopmentStore } from "@/lib/db/server";
import type { ActionType, Annotation, AnnotationVerdict } from "@/lib/types";

function mapPresenterAnnotation(annotation: {
  id: string;
  session_id: string;
  decision_point_id: string;
  user_id: string;
  reviewer_email?: string;
  original_timestamp_seconds: number | string;
  raw_action_text: string;
  action_type: ActionType;
  action_text: string;
  arguments_text: string;
  aggregation_cluster_id?: string | null;
  aggregated_action_label?: string | null;
  aggregation_version?: string | null;
  aggregated_at?: string | null;
  locked_at: string | null;
  verdict?: AnnotationVerdict;
}): Annotation {
  return {
    id: annotation.id,
    sessionId: annotation.session_id,
    decisionPointId: annotation.decision_point_id,
    userId: annotation.user_id,
    reviewerEmail: annotation.reviewer_email,
    originalTimestampSeconds: Number(annotation.original_timestamp_seconds),
    rawActionText: annotation.raw_action_text,
    actionType: annotation.action_type,
    actionText: annotation.action_text,
    argumentsText: annotation.arguments_text,
    aggregationClusterId: annotation.aggregation_cluster_id ?? undefined,
    aggregatedActionLabel: annotation.aggregated_action_label ?? undefined,
    aggregationVersion: annotation.aggregation_version ?? undefined,
    aggregatedAt: annotation.aggregated_at ?? undefined,
    lockedAt: annotation.locked_at,
    verdict: annotation.verdict
  };
}

function getJoinedEmail(users: { email: string | null } | Array<{ email: string | null }> | null | undefined) {
  if (Array.isArray(users)) {
    return users[0]?.email ?? undefined;
  }

  return users?.email ?? undefined;
}

function getJoinedVerdict(
  verdicts:
    | { verdict: AnnotationVerdict | null }
    | Array<{ verdict: AnnotationVerdict | null }>
    | null
    | undefined
) {
  if (Array.isArray(verdicts)) {
    return verdicts[0]?.verdict ?? undefined;
  }

  return verdicts?.verdict ?? undefined;
}

async function fetchPresenterAnnotations(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  sessionId: string
) {
  const explicit = await supabase
    .from("annotations")
    .select(
      "id,session_id,decision_point_id,user_id,original_timestamp_seconds,raw_action_text,action_type,action_text,arguments_text,aggregation_cluster_id,aggregated_action_label,aggregation_version,aggregated_at,locked_at,users(email),annotation_verdicts(verdict)"
    )
    .eq("session_id", sessionId)
    .not("locked_at", "is", null);

  if (!explicit.error) {
    return explicit;
  }

  const legacy = await supabase
    .from("annotations")
    .select("*, users(email), annotation_verdicts(verdict)")
    .eq("session_id", sessionId)
    .not("locked_at", "is", null);

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }

  return legacy;
}

export default async function PresenterPage({ params }: { params: Promise<{ presenterSlug: string }> }) {
  const { presenterSlug } = await params;

  if (shouldUseLocalDevelopmentStore()) {
    let local = await getLocalPresenterSession(presenterSlug);

    if (!local) {
      notFound();
    }

    await ensureSessionAggregation({
      sessionId: local.session.id,
      annotations: local.annotations.map((annotation) =>
        mapPresenterAnnotation({
          ...annotation,
          action_type: annotation.action_type as ActionType
        })
      ),
      persistAssignments: async ({ decisionPointId, assignments, aggregationVersion, aggregatedAt }) =>
        updateLocalAnnotationAggregations({
          decisionPointId,
          assignments,
          aggregationVersion,
          aggregatedAt
        })
    });

    local = await getLocalPresenterSession(presenterSlug);

    if (!local) {
      notFound();
    }

    return (
      <PresenterWorkspace
        session={{
          youtubeVideoId: local.session.youtube_video_id,
          decklistText: local.session.decklist_text,
          opponentDecklistText: local.session.opponent_decklist_text,
          handBlocks: [
            {
              enabled: local.session.hand_block_enabled,
              x: Number(local.session.hand_block_x),
              y: Number(local.session.hand_block_y),
              width: Number(local.session.hand_block_width),
              height: Number(local.session.hand_block_height)
            },
            {
              enabled: local.session.hand_block_2_enabled,
              x: Number(local.session.hand_block_2_x),
              y: Number(local.session.hand_block_2_y),
              width: Number(local.session.hand_block_2_width),
              height: Number(local.session.hand_block_2_height)
            }
          ]
        }}
        decisionPoints={local.decisionPoints.map((point) => ({
          id: point.id,
          sessionId: point.session_id,
          timestampSeconds: Number(point.timestamp_seconds),
          source: point.source
        }))}
        annotations={local.annotations.map((annotation) => ({
          ...mapPresenterAnnotation({
            ...annotation,
            action_type: annotation.action_type as ActionType
          })
        }))}
      />
    );
  }

  const supabase = createSupabaseServerClient();

  const { data: session } = await supabase
    .from("review_sessions")
    .select("*")
    .eq("presenter_slug", presenterSlug)
    .single();

  if (!session) {
    notFound();
  }

  const initialAnnotationsResponse = await fetchPresenterAnnotations(supabase, session.id);

  await ensureSessionAggregation({
    sessionId: session.id,
    annotations: (initialAnnotationsResponse.data ?? []).map((annotation) =>
      mapPresenterAnnotation({
        ...annotation,
        reviewer_email: getJoinedEmail(annotation.users),
        action_type: annotation.action_type as ActionType,
        verdict: getJoinedVerdict(annotation.annotation_verdicts)
      })
    ),
    persistAssignments: async ({ assignments, aggregationVersion, aggregatedAt }) => {
      if (assignments.length === 0) {
        return;
      }

      for (const assignment of assignments) {
        const { error } = await supabase
          .from("annotations")
          .update({
            aggregation_cluster_id: assignment.clusterId,
            aggregated_action_label: assignment.label,
            aggregation_version: aggregationVersion,
            aggregated_at: aggregatedAt
          })
          .eq("id", assignment.annotationId);

        if (error) {
          throw new Error(error.message);
        }
      }
    }
  });

  const { data: decisionPoints } = await supabase
    .from("decision_points")
    .select("id,session_id,timestamp_seconds,source")
    .eq("session_id", session.id)
    .order("timestamp_seconds");

  const { data: annotations } = await fetchPresenterAnnotations(supabase, session.id);

  return (
    <PresenterWorkspace
      session={{
        youtubeVideoId: session.youtube_video_id,
        decklistText: session.decklist_text,
        opponentDecklistText: session.opponent_decklist_text ?? "",
        handBlocks: [
          {
            enabled: session.hand_block_enabled,
            x: Number(session.hand_block_x),
            y: Number(session.hand_block_y),
            width: Number(session.hand_block_width),
            height: Number(session.hand_block_height)
          },
          {
            enabled: session.hand_block_2_enabled,
            x: Number(session.hand_block_2_x),
            y: Number(session.hand_block_2_y),
            width: Number(session.hand_block_2_width),
            height: Number(session.hand_block_2_height)
          }
        ]
      }}
      decisionPoints={(decisionPoints ?? []).map((point) => ({
        id: point.id,
        sessionId: point.session_id,
        timestampSeconds: Number(point.timestamp_seconds),
        source: point.source
      }))}
      annotations={(annotations ?? []).map((annotation) => ({
        ...mapPresenterAnnotation({
          ...annotation,
          reviewer_email: getJoinedEmail(annotation.users),
          action_type: annotation.action_type as ActionType,
          verdict: getJoinedVerdict(annotation.annotation_verdicts)
        })
      }))}
    />
  );
}
