import { z } from "zod";
import { parseYouTubeVideoId } from "@/lib/domain/youtube";

const createSessionSchema = z.object({
  presenterEmail: z.string().trim().email(),
  youtubeUrl: z.string().trim().min(1),
  decklistText: z.string().trim().min(1, "Decklist is required."),
  handBlockEnabled: z.boolean(),
  handBlockX: z.coerce.number().min(0).max(100),
  handBlockY: z.coerce.number().min(0).max(100),
  handBlockWidth: z.coerce.number().min(0).max(100),
  handBlockHeight: z.coerce.number().min(0).max(100)
});

export type CreateSessionInput = z.input<typeof createSessionSchema>;

export function buildCreateSessionPayload(input: CreateSessionInput) {
  const parsed = createSessionSchema.parse({
    ...input,
    presenterEmail: input.presenterEmail.trim().toLowerCase(),
    decklistText: input.decklistText.trim(),
    youtubeUrl: input.youtubeUrl.trim()
  });

  return {
    ...parsed,
    youtubeVideoId: parseYouTubeVideoId(parsed.youtubeUrl)
  };
}
