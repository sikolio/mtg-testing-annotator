import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { ACTION_TYPES, type ActionType } from "@/lib/types";

const parseActionSchema = z.object({
  actionType: z.enum(ACTION_TYPES),
  parsedActionText: z.string().trim().min(1)
});

type ParseActionClient = {
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
      output_parsed: z.infer<typeof parseActionSchema> | null;
    }>;
  };
};

export type ParsedAnnotationAction = {
  actionType: ActionType;
  parsedActionText: string;
};

type ParseAnnotationActionInput = {
  rawActionText: string;
  argumentsText: string;
  previousConfirmedActions: string[];
  client?: ParseActionClient | null;
  model?: string;
};

export const ACTION_PARSE_VERSION = "v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export function inferActionTypeFromText(actionText: string): ActionType {
  const normalized = actionText.trim().toLowerCase();

  if (/\bplay\b.*\bland\b|\bland\b/.test(normalized)) {
    return "play_land";
  }

  if (/\battack\b|\bcombat\b|\bswing\b/.test(normalized)) {
    return "attack";
  }

  if (/\bblock\b/.test(normalized)) {
    return "block";
  }

  if (/\bactivate\b|\bchannel\b|\bcycle\b/.test(normalized)) {
    return "activate_ability";
  }

  if (/\bpass\b|\bhold up\b/.test(normalized)) {
    return "pass";
  }

  if (/\bcast\b|\bbolt\b|\bkill\b|\bfetch\b|\bplay\b/.test(normalized)) {
    return "cast_spell";
  }

  return "other";
}

function getParseActionClient(): ParseActionClient | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) as unknown as ParseActionClient;
}

function buildPrompt(input: ParseAnnotationActionInput) {
  return JSON.stringify({
    rawActionText: input.rawActionText,
    argumentsText: input.argumentsText,
    previousConfirmedActions: input.previousConfirmedActions
  });
}

export async function parseAnnotationAction({
  rawActionText,
  argumentsText,
  previousConfirmedActions,
  client = getParseActionClient(),
  model = process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL
}: ParseAnnotationActionInput): Promise<ParsedAnnotationAction> {
  const fallback = {
    actionType: inferActionTypeFromText(rawActionText),
    parsedActionText: rawActionText.trim()
  } satisfies ParsedAnnotationAction;

  if (!client) {
    return fallback;
  }

  try {
    const response = await client.responses.parse({
      model,
      input: [
        {
          role: "system",
          content:
            "You normalize one Magic: The Gathering play suggestion into a concise canonical action. Preserve meaning, do not add hidden information, and when the new play is genuinely the same as one of the provided confirmed actions, reuse that existing wording exactly. Return JSON only."
        },
        {
          role: "user",
          content: buildPrompt({
            rawActionText,
            argumentsText,
            previousConfirmedActions
          })
        }
      ],
      text: {
        format: zodTextFormat(parseActionSchema, "parsed_action")
      }
    });

    return response.output_parsed ?? fallback;
  } catch {
    return fallback;
  }
}
