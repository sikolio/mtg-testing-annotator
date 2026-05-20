import { describe, expect, it } from "vitest";
import { buildCreateSessionPayload } from "./sessionPayload";

describe("buildCreateSessionPayload", () => {
  it("normalizes creator email and parses the YouTube ID", () => {
    const payload = buildCreateSessionPayload({
      presenterEmail: " Player@One.COM ",
      youtubeUrl: "https://www.youtube.com/watch?v=LBkEDKfWpaA",
      decklistText: "4 Lightning Bolt",
      handBlockEnabled: false,
      handBlockX: 0,
      handBlockY: 0,
      handBlockWidth: 0,
      handBlockHeight: 0,
      handBlock2Enabled: true,
      handBlock2X: 10,
      handBlock2Y: 20,
      handBlock2Width: 30,
      handBlock2Height: 40
    });

    expect(payload.presenterEmail).toBe("player@one.com");
    expect(payload.youtubeVideoId).toBe("LBkEDKfWpaA");
    expect(payload.handBlock2Enabled).toBe(true);
    expect(payload.handBlock2Width).toBe(30);
  });

  it("rejects an empty decklist", () => {
    expect(() =>
      buildCreateSessionPayload({
        presenterEmail: "player@example.com",
        youtubeUrl: "https://www.youtube.com/watch?v=LBkEDKfWpaA",
        decklistText: " ",
        handBlockEnabled: false,
        handBlockX: 0,
        handBlockY: 0,
        handBlockWidth: 0,
        handBlockHeight: 0
      })
    ).toThrow("Decklist is required.");
  });
});
