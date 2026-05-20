"use server";

import { z } from "zod";
import { parseAnnotationAction, inferActionTypeFromText } from "@/lib/actionParsing";
import { CHECKPOINT_MERGE_THRESHOLD_SECONDS } from "@/lib/config";
import {
  commitLocalAnnotation,
  getLocalConfirmedActionTextsForDecisionPoint,
  mergeLocalDecisionPoints,
  submitLocalVerdict,
  updateLocalAnnotation
} from "@/lib/db/localStore";
import { createSupabaseServerClient, shouldUseLocalDevelopmentStore } from "@/lib/db/server";
import { findNearestDecisionPoint, normalizeTimestampSeconds } from "@/lib/domain/checkpoints";
import { VERDICTS } from "@/lib/types";

const draftAnnotationSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  timestampSeconds: z.coerce.number().nonnegative(),
  rawActionText: z.string().trim().min(1, "Play is required."),
  argumentsText: z.string().trim().min(1, "Reasoning is required.")
});

async function resolveDecisionPoint(sessionId: string, timestampSeconds: number) {
  const supabase = createSupabaseServerClient();
  const normalizedTimestamp = normalizeTimestampSeconds(timestampSeconds);

  const { data: existingPoints, error: pointsError } = await supabase
    .from("decision_points")
    .select("id,session_id,timestamp_seconds,source")
    .eq("session_id", sessionId);

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

  if (nearest?.id) {
    return {
      decisionPointId: nearest.id,
      normalizedTimestamp
    };
  }

  const { data: createdPoint, error: createPointError } = await supabase
    .from("decision_points")
    .insert({
      session_id: sessionId,
      timestamp_seconds: normalizedTimestamp,
      source: "manual_annotation"
    })
    .select("id")
    .single();

  if (createPointError) {
    throw new Error(createPointError.message);
  }

  return {
    decisionPointId: createdPoint.id,
    normalizedTimestamp
  };
}

export async function draftAnnotation(input: z.input<typeof draftAnnotationSchema>) {
  const payload = draftAnnotationSchema.parse(input);

  if (shouldUseLocalDevelopmentStore()) {
    const localDraft = await commitLocalAnnotation({
      sessionId: payload.sessionId,
      userId: payload.userId,
      timestampSeconds: payload.timestampSeconds,
      rawActionText: payload.rawActionText,
      actionType: inferActionTypeFromText(payload.rawActionText),
      actionText: payload.rawActionText,
      argumentsText: payload.argumentsText,
      lockedAt: null
    });

    const previousConfirmedActions = await getLocalConfirmedActionTextsForDecisionPoint({
      sessionId: payload.sessionId,
      decisionPointId: localDraft.decision_point_id
    });

    const parsed = await parseAnnotationAction({
      rawActionText: payload.rawActionText,
      argumentsText: payload.argumentsText,
      previousConfirmedActions
    });

    await updateLocalAnnotation({
      annotationId: localDraft.id,
      actionType: parsed.actionType,
      actionText: parsed.parsedActionText,
      lockedAt: null
    });

    return {
      id: localDraft.id,
      decisionPointId: localDraft.decision_point_id,
      rawActionText: payload.rawActionText,
      actionType: parsed.actionType,
      actionText: parsed.parsedActionText,
      argumentsText: payload.argumentsText,
      lockedAt: null
    };
  }

  const { decisionPointId, normalizedTimestamp } = await resolveDecisionPoint(payload.sessionId, payload.timestampSeconds);
  const supabase = createSupabaseServerClient();

  const { data: confirmedAnnotations, error: annotationsError } = await supabase
    .from("annotations")
    .select("action_text")
    .eq("session_id", payload.sessionId)
    .eq("decision_point_id", decisionPointId)
    .not("locked_at", "is", null);

  if (annotationsError) {
    throw new Error(annotationsError.message);
  }

  const parsed = await parseAnnotationAction({
    rawActionText: payload.rawActionText,
    argumentsText: payload.argumentsText,
    previousConfirmedActions: (confirmedAnnotations ?? []).map((annotation) => annotation.action_text)
  });

  const { data: annotation, error: annotationError } = await supabase
    .from("annotations")
    .insert({
      session_id: payload.sessionId,
      decision_point_id: decisionPointId,
      user_id: payload.userId,
      original_timestamp_seconds: normalizedTimestamp,
      raw_action_text: payload.rawActionText,
      action_type: parsed.actionType,
      action_text: parsed.parsedActionText,
      arguments_text: payload.argumentsText,
      locked_at: null
    })
    .select("id,decision_point_id,raw_action_text,action_type,action_text,arguments_text,locked_at")
    .single();

  if (annotationError) {
    throw new Error(annotationError.message);
  }

  return {
    id: annotation.id,
    decisionPointId: annotation.decision_point_id,
    rawActionText: annotation.raw_action_text,
    actionType: annotation.action_type,
    actionText: annotation.action_text,
    argumentsText: annotation.arguments_text,
    lockedAt: annotation.locked_at
  };
}

const confirmAnnotationSchema = z.object({
  annotationId: z.string().uuid(),
  actionText: z.string().trim().min(1, "Parsed play is required.")
});

export async function confirmAnnotation(input: z.input<typeof confirmAnnotationSchema>) {
  const payload = confirmAnnotationSchema.parse(input);
  const lockedAt = new Date().toISOString();
  const actionType = inferActionTypeFromText(payload.actionText);

  if (shouldUseLocalDevelopmentStore()) {
    await updateLocalAnnotation({
      annotationId: payload.annotationId,
      actionType,
      actionText: payload.actionText,
      lockedAt
    });
    return { lockedAt, actionType, actionText: payload.actionText };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("annotations")
    .update({
      action_type: actionType,
      action_text: payload.actionText,
      locked_at: lockedAt
    })
    .eq("id", payload.annotationId)
    .is("locked_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return { lockedAt, actionType, actionText: payload.actionText };
}

const verdictSchema = z.object({
  annotationId: z.string().uuid(),
  verdict: z.enum(VERDICTS)
});

export async function submitVerdict(input: z.input<typeof verdictSchema>) {
  const payload = verdictSchema.parse(input);

  if (shouldUseLocalDevelopmentStore()) {
    await submitLocalVerdict(payload);
    return;
  }

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

  if (shouldUseLocalDevelopmentStore()) {
    await mergeLocalDecisionPoints(payload);
    return;
  }

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
