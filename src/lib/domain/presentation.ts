import type { ActionType, Annotation, AnnotationVerdict } from "@/lib/types";

export type PresentationGroup = {
  decisionPointId: string;
  actionType: ActionType;
  label: string;
  count: number;
  annotations: Annotation[];
  verdictCounts: Record<AnnotationVerdict, number>;
};

export function groupAnnotationsForPresentation(annotations: Annotation[]): PresentationGroup[] {
  const groups = new Map<string, PresentationGroup>();

  for (const annotation of annotations) {
    const key = annotation.aggregationClusterId
      ? `${annotation.decisionPointId}:cluster:${annotation.aggregationClusterId}`
      : `${annotation.decisionPointId}:action:${annotation.actionText.trim().toLowerCase()}`;
    const existing =
      groups.get(key) ??
      ({
        decisionPointId: annotation.decisionPointId,
        actionType: annotation.actionType,
        label: annotation.aggregatedActionLabel ?? annotation.actionText,
        count: 0,
        annotations: [],
        verdictCounts: {
          same_play: 0,
          different_play: 0,
          unclear: 0
        }
      } satisfies PresentationGroup);

    existing.count += 1;
    existing.annotations.push(annotation);

    if (annotation.verdict) {
      existing.verdictCounts[annotation.verdict] += 1;
    }

    groups.set(key, existing);
  }

  return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
