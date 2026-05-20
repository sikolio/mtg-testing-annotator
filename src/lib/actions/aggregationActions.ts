import { AGGREGATION_VERSION, type AggregationAssignment, aggregateDecisionPointAnnotations } from "@/lib/aggregation";
import type { Annotation } from "@/lib/types";

type EnsureSessionAggregationInput = {
  sessionId: string;
  annotations: Annotation[];
  aggregateDecisionPoint?: typeof aggregateDecisionPointAnnotations;
  persistAssignments?: (input: {
    sessionId: string;
    decisionPointId: string;
    assignments: AggregationAssignment[];
    aggregationVersion: string;
    aggregatedAt: string;
  }) => Promise<void>;
};

export async function ensureSessionAggregation({
  sessionId,
  annotations,
  aggregateDecisionPoint = aggregateDecisionPointAnnotations,
  persistAssignments = async () => undefined
}: EnsureSessionAggregationInput) {
  const annotationsByDecisionPoint = new Map<string, Annotation[]>();

  for (const annotation of annotations) {
    const current = annotationsByDecisionPoint.get(annotation.decisionPointId) ?? [];
    current.push(annotation);
    annotationsByDecisionPoint.set(annotation.decisionPointId, current);
  }

  const updatedDecisionPointIds: string[] = [];

  for (const [decisionPointId, pointAnnotations] of annotationsByDecisionPoint) {
    const isCurrent = pointAnnotations.every((annotation) => annotation.aggregationVersion === AGGREGATION_VERSION);
    if (isCurrent) {
      continue;
    }

    const result = await aggregateDecisionPoint({
      decisionPointId,
      annotations: pointAnnotations
    });

    const aggregatedAt = new Date().toISOString();
    await persistAssignments({
      sessionId,
      decisionPointId,
      assignments: result.assignments,
      aggregationVersion: AGGREGATION_VERSION,
      aggregatedAt
    });
    updatedDecisionPointIds.push(decisionPointId);
  }

  return { updatedDecisionPointIds };
}
