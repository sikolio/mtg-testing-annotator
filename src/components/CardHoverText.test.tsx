import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearScryfallImageCache } from "@/lib/scryfall";
import { CardHoverText } from "./CardHoverText";

const { createPopperMock } = vi.hoisted(() => ({
  createPopperMock: vi.fn(() => ({
    destroy: vi.fn(),
    update: vi.fn()
  }))
}));

vi.mock("@popperjs/core", () => ({
  createPopper: createPopperMock
}));

describe("CardHoverText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createPopperMock.mockClear();
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

    const mention = screen.getByText("Lightning Bolt");
    await user.hover(mention);

    await waitFor(() =>
      expect(screen.getByAltText("Lightning Bolt preview")).toHaveAttribute(
        "src",
        "https://img.scryfall.com/cards/normal/lightning-bolt.jpg"
      )
    );

    expect(createPopperMock).toHaveBeenCalledWith(
      mention,
      expect.any(HTMLDivElement),
      expect.objectContaining({
        strategy: "fixed",
        placement: "top",
        modifiers: expect.arrayContaining([
          expect.objectContaining({ name: "flip" }),
          expect.objectContaining({ name: "preventOverflow" })
        ])
      })
    );
  });

  it("renders only one preview even if the same card appears twice in the text", async () => {
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
    render(
      <CardHoverText
        text={"Main\n4 Lightning Bolt\nSideboard\n1 Lightning Bolt"}
        cardNames={["Lightning Bolt"]}
      />
    );

    await user.hover(screen.getAllByText("Lightning Bolt")[0]);

    await waitFor(() => expect(screen.getAllByAltText("Lightning Bolt preview")).toHaveLength(1));
  });

  it("uses preloaded image urls without fetching on hover", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <CardHoverText
        text="Cast Lightning Bolt"
        cardNames={["Lightning Bolt"]}
        imageUrls={{ "Lightning Bolt": "https://img.scryfall.com/cards/normal/lightning-bolt.jpg" }}
      />
    );

    await user.hover(screen.getByText("Lightning Bolt"));

    await waitFor(() =>
      expect(screen.getByAltText("Lightning Bolt preview")).toHaveAttribute(
        "src",
        "https://img.scryfall.com/cards/normal/lightning-bolt.jpg"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("repositions the preview after the card image loads", async () => {
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

    const preview = await screen.findByAltText("Lightning Bolt preview");
    fireEvent.load(preview);

    const popperInstance = createPopperMock.mock.results[0]?.value;
    expect(popperInstance?.update).toHaveBeenCalled();
  });
});
