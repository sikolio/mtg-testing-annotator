import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearScryfallImageCache } from "@/lib/scryfall";
import { CardHoverText } from "./CardHoverText";

describe("CardHoverText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearScryfallImageCache();
  });

  it("fetches and shows a Scryfall image preview on hover", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          image_uris: {
            normal: "https://img.scryfall.com/cards/normal/lightning-bolt.jpg"
          }
        })
      }))
    );

    const user = userEvent.setup();
    render(<CardHoverText text="Cast Lightning Bolt" cardNames={["Lightning Bolt"]} />);

    await user.hover(screen.getByText("Lightning Bolt"));

    await waitFor(() =>
      expect(screen.getByAltText("Lightning Bolt preview")).toHaveAttribute(
        "src",
        "https://img.scryfall.com/cards/normal/lightning-bolt.jpg"
      )
    );
  });
});
