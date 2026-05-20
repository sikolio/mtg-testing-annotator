import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalReviewSession, getLocalPresenterSession, joinLocalReviewSession } from "./localStore";

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
  delete process.env.LOCAL_DEV_DB_PATH;
});

describe("localStore", () => {
  it("stores sessions locally when Supabase is not configured", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mtg-review-"));
    process.env.LOCAL_DEV_DB_PATH = join(tempDir, "dev-db.json");

    const links = await createLocalReviewSession({
      payload: {
        presenterEmail: "presenter@example.com",
        youtubeUrl: "https://www.youtube.com/watch?v=LBkEDKfWpaA",
        youtubeVideoId: "LBkEDKfWpaA",
        decklistText: "4 Lightning Bolt",
        opponentDecklistText: "4 Thoughtseize",
        handBlockEnabled: true,
        handBlockX: 3,
        handBlockY: 70,
        handBlockWidth: 94,
        handBlockHeight: 30,
        handBlock2Enabled: true,
        handBlock2X: 52,
        handBlock2Y: 70,
        handBlock2Width: 45,
        handBlock2Height: 30
      },
      createSlug: () => randomUUID().replaceAll("-", "").slice(0, 16)
    });

    const reviewerSession = await joinLocalReviewSession({
      shareSlug: links.reviewerPath.split("/").pop() ?? "",
      email: "reviewer@example.com"
    });
    const presenterSession = await getLocalPresenterSession(links.presenterPath.split("/").pop() ?? "");

    expect(reviewerSession?.session.decklist_text).toBe("4 Lightning Bolt");
    expect(reviewerSession?.session.opponent_decklist_text).toBe("4 Thoughtseize");
    expect(reviewerSession?.user?.email).toBe("reviewer@example.com");
    expect(presenterSession?.session.hand_block_width).toBe(94);
    expect(presenterSession?.session.hand_block_2_enabled).toBe(true);
    expect(presenterSession?.session.hand_block_2_width).toBe(45);
  });
});
