import { describe, expect, it } from "vitest";
import { parseYouTubeVideoId } from "./youtube";

describe("parseYouTubeVideoId", () => {
  it("parses a normal watch URL", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=LBkEDKfWpaA")).toBe("LBkEDKfWpaA");
  });

  it("parses a short youtu.be URL", () => {
    expect(parseYouTubeVideoId("https://youtu.be/LBkEDKfWpaA?t=12")).toBe("LBkEDKfWpaA");
  });

  it("parses an embed URL", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/embed/LBkEDKfWpaA")).toBe("LBkEDKfWpaA");
  });

  it("rejects non-YouTube URLs", () => {
    expect(() => parseYouTubeVideoId("https://example.com/watch?v=LBkEDKfWpaA")).toThrow(
      "Enter a valid YouTube URL."
    );
  });

  it("rejects malformed input", () => {
    expect(() => parseYouTubeVideoId("not a url")).toThrow("Enter a valid YouTube URL.");
  });
});
