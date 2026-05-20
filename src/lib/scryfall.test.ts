import { afterEach, describe, expect, it, vi } from "vitest";
import { clearScryfallImageCache, fetchCardImageUrls, getScryfallImageUrl } from "./scryfall";

describe("getScryfallImageUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearScryfallImageCache();
  });

  it("prefers direct image uris when available", () => {
    expect(
      getScryfallImageUrl({
        image_uris: {
          normal: "https://img.scryfall.com/cards/normal/front.jpg"
        }
      })
    ).toBe("https://img.scryfall.com/cards/normal/front.jpg");
  });

  it("falls back to card face image uris for multi-face cards", () => {
    expect(
      getScryfallImageUrl({
        card_faces: [
          {
            image_uris: {
              normal: "https://img.scryfall.com/cards/normal/face.jpg"
            }
          }
        ]
      })
    ).toBe("https://img.scryfall.com/cards/normal/face.jpg");
  });

  it("fetches a collection of card image urls in one request", async () => {
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => ({
      ok: true,
      json: async () => ({
        data: [
          {
            name: "Lightning Bolt",
            image_uris: {
              normal: "https://img.scryfall.com/cards/normal/lightning-bolt.jpg"
            }
          },
          {
            name: "Counterspell",
            image_uris: {
              normal: "https://img.scryfall.com/cards/normal/counterspell.jpg"
            }
          }
        ]
      })
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCardImageUrls(["Lightning Bolt", "Counterspell"])).resolves.toEqual({
      "Lightning Bolt": "https://img.scryfall.com/cards/normal/lightning-bolt.jpg",
      Counterspell: "https://img.scryfall.com/cards/normal/counterspell.jpg"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.scryfall.com/cards/collection",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          identifiers: [{ name: "Lightning Bolt" }, { name: "Counterspell" }]
        })
      })
    );
  });
});
