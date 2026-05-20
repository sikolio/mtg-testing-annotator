import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Annotation } from "@/lib/types";

const aggregationClusterSchema = z.object({
  id: z.string(),
  label: z.string(),
  annotationIds: z.array(z.string())
});

const aggregationResponseSchema = z.object({
  clusters: z.array(aggregationClusterSchema)
});

type AggregationClient = {
  responses: {
    parse: (input: {
      model: string;
      input: Array<{
        role: "system" | "user";
        content: string;
      }>;
      text: {
        format: ReturnType<typeof zodTextFormat>;
      };
    }) => Promise<{
      output_parsed: z.infer<typeof aggregationResponseSchema> | null;
    }>;
  };
};

export type AggregationAssignment = {
  annotationId: string;
  clusterId: string;
  label: string;
};

export type AggregationResult = {
  assignments: AggregationAssignment[];
};

type AggregateDecisionPointInput = {
  decisionPointId: string;
  annotations: Annotation[];
  client?: AggregationClient | null;
  model?: string;
};

export const AGGREGATION_VERSION = "v3";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const GENERIC_LABEL_PATTERN =
  /\b(resource management|creature play|board development|color fixing|tempo play|mana fixing|line)\b/i;
const ACTION_VERB_PATTERN = /\b(fetch|cast|play|attack|block|activate|pass|hold up|bolt|kill|channel|cycle)\b/gi;

function buildDeterministicAssignments(annotations: Annotation[]): AggregationAssignment[] {
  return annotations.map((annotation) => ({
    annotationId: annotation.id,
    clusterId: `fallback-${annotation.actionText.trim().toLowerCase()}`,
    label: annotation.actionText
  }));
}

function getAggregationClient(): AggregationClient | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) as unknown as AggregationClient;
}

function buildPrompt(decisionPointId: string, annotations: Annotation[]) {
  return JSON.stringify({
    decisionPointId,
    annotations: annotations.map((annotation) => ({
      id: annotation.id,
      actionText: annotation.actionText,
      argumentsText: annotation.argumentsText
    }))
  });
}

function pickClusterLabel(label: string, clusterAnnotations: Annotation[]) {
  const trimmedLabel = label.trim();

  if (!trimmedLabel || GENERIC_LABEL_PATTERN.test(trimmedLabel)) {
    return [...clusterAnnotations]
      .sort((left, right) => {
        const leftVerbCount = [...left.actionText.toLowerCase().matchAll(ACTION_VERB_PATTERN)].length;
        const rightVerbCount = [...right.actionText.toLowerCase().matchAll(ACTION_VERB_PATTERN)].length;

        return (
          rightVerbCount - leftVerbCount ||
          right.actionText.length - left.actionText.length ||
          left.actionText.localeCompare(right.actionText)
        );
      })[0]
      ?.actionText ?? "Grouped play";
  }

  return trimmedLabel;
}

function coerceAssignments(
  annotations: Annotation[],
  parsed: z.infer<typeof aggregationResponseSchema> | null | undefined
): AggregationAssignment[] | null {
  if (!parsed) {
    return null;
  }

  const assignments: AggregationAssignment[] = [];
  const annotationIds = new Set(annotations.map((annotation) => annotation.id));
  const seen = new Set<string>();

  for (const cluster of parsed.clusters) {
    const clusterAnnotations = annotations.filter((annotation) => cluster.annotationIds.includes(annotation.id));
    const clusterLabel = pickClusterLabel(cluster.label, clusterAnnotations);

    for (const annotationId of cluster.annotationIds) {
      if (!annotationIds.has(annotationId) || seen.has(annotationId)) {
        continue;
      }

      seen.add(annotationId);
      assignments.push({
        annotationId,
        clusterId: cluster.id,
        label: clusterLabel
      });
    }
  }

  if (assignments.length !== annotations.length) {
    return null;
  }

  return assignments;
}

export async function aggregateDecisionPointAnnotations({
  decisionPointId,
  annotations,
  client = getAggregationClient(),
  model = process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL
}: AggregateDecisionPointInput): Promise<AggregationResult> {
  if (annotations.length === 0) {
    return { assignments: [] };
  }

  if (!client) {
    return { assignments: buildDeterministicAssignments(annotations) };
  }

  try {
    const response = await client.responses.parse({
      model,
      input: [
        {
          role: "system",
          content:
            "Group equivalent Magic: The Gathering play suggestions for one decision point. Cluster lines together when they describe the same intended play, even if one is shorthand, omits verbs, or uses a fetch land name instead of the fetched land. Use MTG knowledge and the reasoning text. Prefer concrete labels that preserve all key actions in order and avoid vague labels like resource management or color fixing. Output JSON only."
        },
        {
          role: "user",
          content: buildPrompt(decisionPointId, annotations)
        }
      ],
      text: {
        format: zodTextFormat(aggregationResponseSchema, "aggregation_result")
      }
    });

    const assignments = coerceAssignments(annotations, response.output_parsed);
    if (!assignments) {
      return { assignments: buildDeterministicAssignments(annotations) };
    }

    return { assignments };
  } catch {
    return { assignments: buildDeterministicAssignments(annotations) };
  }
}
