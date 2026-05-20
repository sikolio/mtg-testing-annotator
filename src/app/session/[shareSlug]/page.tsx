import { notFound } from "next/navigation";
import { ReviewerWorkspace } from "@/components/ReviewerWorkspace";
import { joinLocalReviewSession } from "@/lib/db/localStore";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/db/server";

export default async function ReviewerPage({
  params,
  searchParams
}: {
  params: Promise<{ shareSlug: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { shareSlug } = await params;
  const { email } = await searchParams;

  if (!hasSupabaseServerConfig()) {
    const local = await joinLocalReviewSession({ shareSlug, email });

    if (!local) {
      notFound();
    }

    if (!email || !local.user) {
      return (
        <main className="page-shell">
          <form className="panel form-grid">
            <h1>Join review</h1>
            <input name="email" type="email" required placeholder="you@example.com" />
            <button type="submit">Continue</button>
          </form>
        </main>
      );
    }

    return (
      <ReviewerWorkspace
        session={{
          id: local.session.id,
          youtubeVideoId: local.session.youtube_video_id,
          decklistText: local.session.decklist_text,
          handBlocks: [
            {
              enabled: local.session.hand_block_enabled,
              x: Number(local.session.hand_block_x),
              y: Number(local.session.hand_block_y),
              width: Number(local.session.hand_block_width),
              height: Number(local.session.hand_block_height)
            },
            {
              enabled: local.session.hand_block_2_enabled,
              x: Number(local.session.hand_block_2_x),
              y: Number(local.session.hand_block_2_y),
              width: Number(local.session.hand_block_2_width),
              height: Number(local.session.hand_block_2_height)
            }
          ]
        }}
        user={local.user}
        decisionPoints={local.decisionPoints.map((point) => ({
          id: point.id,
          sessionId: point.session_id,
          timestampSeconds: Number(point.timestamp_seconds),
          source: point.source
        }))}
      />
    );
  }

  const supabase = createSupabaseServerClient();

  const { data: session } = await supabase.from("review_sessions").select("*").eq("share_slug", shareSlug).single();

  if (!session) {
    notFound();
  }

  if (!email) {
    return (
      <main className="page-shell">
        <form className="panel form-grid">
          <h1>Join review</h1>
          <input name="email" type="email" required placeholder="you@example.com" />
          <button type="submit">Continue</button>
        </form>
      </main>
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert({ email: normalizedEmail }, { onConflict: "email" })
    .select("id,email")
    .single();

  if (userError || !user) {
    throw new Error("Could not join session.");
  }

  await supabase.from("session_participants").upsert({
    session_id: session.id,
    user_id: user.id,
    role: "reviewer"
  });

  const { data: decisionPoints } = await supabase
    .from("decision_points")
    .select("id,session_id,timestamp_seconds,source")
    .eq("session_id", session.id)
    .order("timestamp_seconds");

  return (
    <ReviewerWorkspace
      session={{
        id: session.id,
        youtubeVideoId: session.youtube_video_id,
        decklistText: session.decklist_text,
        handBlocks: [
          {
            enabled: session.hand_block_enabled,
            x: Number(session.hand_block_x),
            y: Number(session.hand_block_y),
            width: Number(session.hand_block_width),
            height: Number(session.hand_block_height)
          },
          {
            enabled: session.hand_block_2_enabled,
            x: Number(session.hand_block_2_x),
            y: Number(session.hand_block_2_y),
            width: Number(session.hand_block_2_width),
            height: Number(session.hand_block_2_height)
          }
        ]
      }}
      user={user}
      decisionPoints={(decisionPoints ?? []).map((point) => ({
        id: point.id,
        sessionId: point.session_id,
        timestampSeconds: Number(point.timestamp_seconds),
        source: point.source
      }))}
    />
  );
}
