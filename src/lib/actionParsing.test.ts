import { describe, expect, it } from "vitest";
import { parseAnnotationAction } from "./actionParsing";

describe("parseAnnotationAction", () => {
  it("reuses an existing confirmed action label when the model matches it", async () => {
    const result = await parseAnnotationAction({
      rawActionText: "kill ragavan with bolt precombat",
      argumentsText: "Keep them off snowballing.",
      previousConfirmedActions: ["Cast Lightning Bolt targeting Ragavan, Nimble Pilferer before combat"],
      model: "test-model",
      client: {
        responses: {
          parse: async () => ({
            output_parsed: {
              actionType: "cast_spell",
              parsedActionText: "Cast Lightning Bolt targeting Ragavan, Nimble Pilferer before combat"
            }
          })
        }
      } as never
    });

    expect(result).toEqual({
      actionType: "cast_spell",
      parsedActionText: "Cast Lightning Bolt targeting Ragavan, Nimble Pilferer before combat"
    });
  });
});
