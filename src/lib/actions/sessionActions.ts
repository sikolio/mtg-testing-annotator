"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { buildCreateSessionPayload, type CreateSessionInput } from "@/lib/actions/sessionPayload";
import { createSupabaseServerClient } from "@/lib/db/server";

function createSlug() {
  return randomUUID().replaceAll("-", "").slice(0, 16);
}

export async function createReviewSession(input: CreateSessionInput) {
  const payload = buildCreateSessionPayload(input);
  const supabase = createSupabaseServerClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert({ email: payload.presenterEmail }, { onConflict: "email" })
    .select("id,email")
    .single();

  if (userError) {
    throw new Error(userError.message);
  }

  const shareSlug = createSlug();
  const presenterSlug = createSlug();

  const { data: session, error: sessionError } = await supabase
    .from("review_sessions")
    .insert({
      presenter_user_id: user.id,
      share_slug: shareSlug,
      presenter_slug: presenterSlug,
      youtube_url: payload.youtubeUrl,
      youtube_video_id: payload.youtubeVideoId,
      decklist_text: payload.decklistText,
      hand_block_enabled: payload.handBlockEnabled,
      hand_block_x: payload.handBlockX,
      hand_block_y: payload.handBlockY,
      hand_block_width: payload.handBlockWidth,
      hand_block_height: payload.handBlockHeight
    })
    .select("id,share_slug,presenter_slug")
    .single();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const { error: participantError } = await supabase.from("session_participants").insert({
    session_id: session.id,
    user_id: user.id,
    role: "presenter"
  });

  if (participantError) {
    throw new Error(participantError.message);
  }

  revalidatePath("/");

  return {
    reviewerPath: `/session/${session.share_slug}`,
    presenterPath: `/presenter/${session.presenter_slug}`
  };
}
