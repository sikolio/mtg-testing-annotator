import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { PlayTextComposer } from "./PlayTextComposer";

describe("PlayTextComposer", () => {
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
});
