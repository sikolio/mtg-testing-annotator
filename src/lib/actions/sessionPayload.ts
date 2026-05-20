import { z } from "zod";
import { parseYouTubeVideoId } from "@/lib/domain/youtube";

const createSessionSchema = z.object({
  presenterEmail: z.string().trim().email(),
  youtubeUrl: z.string().trim().min(1),
  decklistText: z.string().trim().min(1, "Decklist is required."),
  opponentDecklistText: z.string().trim().default(""),
  handBlockEnabled: z.boolean(),
  handBlockX: z.coerce.number().min(0).max(100),
  handBlockY: z.coerce.number().min(0).max(100),
  handBlockWidth: z.coerce.number().min(0).max(100),
  handBlockHeight: z.coerce.number().min(0).max(100),
  handBlock2Enabled: z.boolean().default(false),
  handBlock2X: z.coerce.number().min(0).max(100).default(52),
  handBlock2Y: z.coerce.number().min(0).max(100).default(70),
  handBlock2Width: z.coerce.number().min(0).max(100).default(45),
  handBlock2Height: z.coerce.number().min(0).max(100).default(30)
});

export type CreateSessionInput = z.input<typeof createSessionSchema>;

export function buildCreateSessionPayload(input: CreateSessionInput) {
  const parsed = createSessionSchema.parse({
    ...input,
    presenterEmail: input.presenterEmail.trim().toLowerCase(),
    decklistText: input.decklistText.trim(),
    opponentDecklistText: input.opponentDecklistText?.trim() ?? "",
    youtubeUrl: input.youtubeUrl.trim()
  });

  return {
    ...parsed,
    youtubeVideoId: parseYouTubeVideoId(parsed.youtubeUrl)
  };
}
