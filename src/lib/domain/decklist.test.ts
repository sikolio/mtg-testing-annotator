import { describe, expect, it } from "vitest";
import { parseDecklistCardNames } from "./decklist";

describe("parseDecklistCardNames", () => {
  it("extracts unique card names from counted decklist lines", () => {
    expect(
      parseDecklistCardNames("4 Lightning Bolt\n2x Ragavan, Nimble Pilferer\n4 Lightning Bolt\n")
    ).toEqual(["Lightning Bolt", "Ragavan, Nimble Pilferer"]);
  });

  it("keeps non-empty lines when no leading count is present", () => {
    expect(parseDecklistCardNames("Brainstorm\n\nSideboard")).toEqual(["Brainstorm", "Sideboard"]);
  });
});
