import { describe, expect, it } from "vitest";
import { getScryfallImageUrl } from "./scryfall";

describe("getScryfallImageUrl", () => {
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
});
