"use server";

import { z } from "zod";
import { CHECKPOINT_MERGE_THRESHOLD_SECONDS } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/db/server";
import { findNearestDecisionPoint, normalizeTimestampSeconds } from "@/lib/domain/checkpoints";
import { ACTION_TYPES, VERDICTS } from "@/lib/types";

const annotationSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  timestampSeconds: z.coerce.number().nonnegative(),
  actionType: z.enum(ACTION_TYPES),
  actionText: z.string().trim().min(1, "Play is required."),
  argumentsText: z.string().trim().min(1, "Reasoning is required.")
});

export async function commitAnnotation(input: z.input<typeof annotationSchema>) {
  const payload = annotationSchema.parse(input);
  const supabase = createSupabaseServerClient();
  const normalizedTimestamp = normalizeTimestampSeconds(payload.timestampSeconds);

  const { data: existingPoints, error: pointsError } = await supabase
    .from("decision_points")
    .select("id,session_id,timestamp_seconds,source")
    .eq("session_id", payload.sessionId);

  if (pointsError) {
    throw new Error(pointsError.message);
  }

  const nearest = findNearestDecisionPoint(
    (existingPoints ?? []).map((point) => ({
      id: point.id,
      sessionId: point.session_id,
      timestampSeconds: Number(point.timestamp_seconds),
      source: point.source
    })),
    normalizedTimestamp,
    CHECKPOINT_MERGE_THRESHOLD_SECONDS
  );

  let decisionPointId = nearest?.id;

  if (!decisionPointId) {
    const { data: createdPoint, error: createPointError } = await supabase
      .from("decision_points")
      .insert({
        session_id: payload.sessionId,
        timestamp_seconds: normalizedTimestamp,
        source: "manual_annotation"
      })
      .select("id")
      .single();

    if (createPointError) {
      throw new Error(createPointError.message);
    }

    decisionPointId = createdPoint.id;
  }

  const { data: annotation, error: annotationError } = await supabase
    .from("annotations")
    .insert({
      session_id: payload.sessionId,
      decision_point_id: decisionPointId,
      user_id: payload.userId,
      original_timestamp_seconds: normalizedTimestamp,
      action_type: payload.actionType,
      action_text: payload.actionText,
      arguments_text: payload.argumentsText
    })
    .select("id,decision_point_id,locked_at")
    .single();

  if (annotationError) {
    throw new Error(annotationError.message);
  }

  return annotation;
}

const verdictSchema = z.object({
  annotationId: z.string().uuid(),
  verdict: z.enum(VERDICTS)
});

export async function submitVerdict(input: z.input<typeof verdictSchema>) {
  const payload = verdictSchema.parse(input);
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("annotation_verdicts").upsert({
    annotation_id: payload.annotationId,
    verdict: payload.verdict
  });

  if (error) {
    throw new Error(error.message);
  }
}

const mergeSchema = z.object({
  sessionId: z.string().uuid(),
  fromDecisionPointId: z.string().uuid(),
  toDecisionPointId: z.string().uuid(),
  mergedByUserId: z.string().uuid()
});

export async function mergeDecisionPoints(input: z.input<typeof mergeSchema>) {
  const payload = mergeSchema.parse(input);
  const supabase = createSupabaseServerClient();

  const { error: updateError } = await supabase
    .from("annotations")
    .update({ decision_point_id: payload.toDecisionPointId })
    .eq("decision_point_id", payload.fromDecisionPointId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: mergeError } = await supabase.from("decision_point_merges").insert({
    session_id: payload.sessionId,
    from_decision_point_id: payload.fromDecisionPointId,
    to_decision_point_id: payload.toDecisionPointId,
    merged_by_user_id: payload.mergedByUserId
  });

  if (mergeError) {
    throw new Error(mergeError.message);
  }
}
