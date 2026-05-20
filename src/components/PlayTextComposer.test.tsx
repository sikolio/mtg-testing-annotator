import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayTextComposer } from "./PlayTextComposer";

const { createPopperMock } = vi.hoisted(() => ({
  createPopperMock: vi.fn(() => ({
    destroy: vi.fn(),
    update: vi.fn()
  }))
}));

vi.mock("@popperjs/core", () => ({
  createPopper: createPopperMock
}));

describe("PlayTextComposer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createPopperMock.mockClear();
  });

  it("inserts a matching card into freeform text instead of replacing the whole field", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    function Harness() {
      const [value, setValue] = React.useState("");
      return (
        <PlayTextComposer
          name="actionText"
          value={value}
          onChange={(nextValue) => {
            setValue(nextValue);
            handleChange(nextValue);
          }}
          cardNames={["Lightning Bolt", "Ragavan, Nimble Pilferer"]}
          placeholder="What play would you make?"
        />
      );
    }

    render(<Harness />);

    const textbox = screen.getByPlaceholderText("What play would you make?");
    await user.type(textbox, "Cast light");
    await user.click(screen.getByRole("button", { name: "Lightning Bolt" }));

    expect(textbox).toHaveValue("Cast Lightning Bolt");
    expect(handleChange).toHaveBeenLastCalledWith("Cast Lightning Bolt");
  });

  it("highlights recognized card names in the freeform text", () => {
    render(
      <PlayTextComposer
        name="actionText"
        value="Cast Lightning Bolt and pass"
        onChange={() => undefined}
        cardNames={["Lightning Bolt"]}
        placeholder="What play would you make?"
      />
    );

    expect(screen.getByText("Lightning Bolt", { selector: "mark" })).toBeInTheDocument();
  });

  it("suggests cards from shorthand references like single words and acronyms", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [value, setValue] = React.useState("");
      return (
        <PlayTextComposer
          name="actionText"
          value={value}
          onChange={setValue}
          cardNames={["Lightning Bolt", "Dragon's Rage Channeler", "Ragavan, Nimble Pilferer"]}
          placeholder="What play would you make?"
        />
      );
    }

    render(<Harness />);

    const textbox = screen.getByPlaceholderText("What play would you make?");
    await user.type(textbox, "Bolt");

    expect(screen.getByRole("button", { name: "Lightning Bolt" })).toBeInTheDocument();

    await user.clear(textbox);
    await user.type(textbox, "attack with drc");

    expect(screen.getByRole("button", { name: "Dragon's Rage Channeler" })).toBeInTheDocument();
  });

  it("positions suggestion previews with Popper", async () => {
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

    function Harness() {
      const [value, setValue] = React.useState("");
      return (
        <PlayTextComposer
          name="actionText"
          value={value}
          onChange={setValue}
          cardNames={["Lightning Bolt"]}
          placeholder="What play would you make?"
        />
      );
    }

    render(<Harness />);

    await user.type(screen.getByPlaceholderText("What play would you make?"), "Bolt");
    const suggestion = screen.getByRole("button", { name: "Lightning Bolt" });
    await user.hover(suggestion);

    await waitFor(() => expect(screen.getByAltText("Lightning Bolt preview")).toBeInTheDocument());
    expect(createPopperMock).toHaveBeenCalledWith(
      suggestion,
      expect.any(HTMLSpanElement),
      expect.objectContaining({
        placement: "top"
      })
    );
  });
});
