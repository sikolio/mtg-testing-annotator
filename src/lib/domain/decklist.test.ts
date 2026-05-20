import { describe, expect, it } from "vitest";
import { buildCardReferenceMap, findCardAliasMatches, parseDecklistCardNames } from "./decklist";

describe("parseDecklistCardNames", () => {
  it("extracts unique card names from counted decklist lines", () => {
    expect(
      parseDecklistCardNames("4 Lightning Bolt\n2x Ragavan, Nimble Pilferer\n4 Lightning Bolt\n")
    ).toEqual(["Lightning Bolt", "Ragavan, Nimble Pilferer"]);
  });

  it("keeps non-empty lines when no leading count is present", () => {
    expect(parseDecklistCardNames("Brainstorm\n\nSideboard")).toEqual(["Brainstorm", "Sideboard"]);
  });

  it("builds useful aliases for shorthand card references", () => {
    expect(buildCardReferenceMap(["Lightning Bolt", "Dragon's Rage Channeler"])).toEqual([
      {
        cardName: "Lightning Bolt",
        aliases: ["Lightning Bolt", "Lightning", "Bolt", "LB"]
      },
      {
        cardName: "Dragon's Rage Channeler",
        aliases: ["Dragon's Rage Channeler", "Dragon", "Rage", "Channeler", "DRC"]
      }
    ]);
  });

  it("matches aliases only at token boundaries", () => {
    expect(findCardAliasMatches("Cast Dragon's Rage Channeler", ["Steam Vents", "Dragon's Rage Channeler"])).toEqual([
      { text: "Cast " },
      { text: "Dragon's Rage Channeler", cardName: "Dragon's Rage Channeler" }
    ]);
  });
});
