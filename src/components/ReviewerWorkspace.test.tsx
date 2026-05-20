import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { ReviewerWorkspace } from "./ReviewerWorkspace";

vi.mock("@/lib/actions/reviewActions", () => ({
  commitAnnotation: vi.fn(),
  submitVerdict: vi.fn()
}));

const session = {
  id: "session-1",
  youtubeVideoId: "LBkEDKfWpaA",
  decklistText: "4 Lightning Bolt",
  handBlocks: []
};

const user = {
  id: "user-1",
  email: "player@example.com"
};

describe("ReviewerWorkspace", () => {
  it("pauses the video and captures the current player timestamp when adding an annotation", async () => {
    const userEventApi = userEvent.setup();
    const postMessage = vi.fn();
    vi.spyOn(HTMLIFrameElement.prototype, "contentWindow", "get").mockReturnValue({ postMessage } as unknown as Window);

    render(<ReviewerWorkspace session={session} user={user} decisionPoints={[]} />);

    await userEventApi.click(screen.getByRole("button", { name: "Add annotation" }));

    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
      "*"
    );
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ event: "command", func: "getCurrentTime", args: [] }),
      "*"
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          event: "infoDelivery",
          info: {
            currentTime: 42.37
          }
        })
      })
    );

    await waitFor(() => expect(screen.getByLabelText("Current timestamp")).toHaveValue(42.37));
  });
});
