import type { Annotation } from "@/lib/types";

export function hasPendingVerdict(annotation: Annotation): boolean {
  return annotation.verdict === undefined;
}

export function assertCanEditAnnotation(annotation: Annotation): void {
  if (annotation.lockedAt) {
    throw new Error("Locked annotations cannot be edited.");
  }
}
