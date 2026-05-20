import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createReviewSession } from "@/lib/actions/sessionActions";
import { SessionCreateForm } from "./SessionCreateForm";

vi.mock("@/lib/actions/sessionActions", () => ({
  createReviewSession: vi.fn()
}));

describe("SessionCreateForm", () => {
  it("shows a live video preview for positioning the hand block", async () => {
    const user = userEvent.setup();
    render(<SessionCreateForm />);

    await user.click(screen.getByLabelText("Enable static hand-hidden-block"));

    const preview = screen.getByTitle("Hand-hidden-block positioning preview");
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute("src", expect.stringContaining("controls=1"));
    expect(screen.getByLabelText("Block x percent")).toHaveValue(3);
    expect(screen.getByLabelText("Block y percent")).toHaveValue(0);
    expect(screen.getByLabelText("Block width percent")).toHaveValue(94);
    expect(screen.getByLabelText("Block height percent")).toHaveValue(8);
    expect(screen.getByLabelText("Enable second hand-hidden-block")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Enable second hand-hidden-block"));
    expect(screen.getByLabelText("Second preview hidden hand information")).toBeInTheDocument();

    const xInput = screen.getByLabelText("Block x percent");
    await user.clear(xInput);
    await user.type(xInput, "12");

    expect(screen.getByLabelText("Preview hidden hand information")).toHaveStyle({ left: "12%" });
  });

  it("submits the opponent decklist when provided", async () => {
    const user = userEvent.setup();
    vi.mocked(createReviewSession).mockResolvedValue({
      reviewerPath: "/session/reviewer",
      presenterPath: "/presenter/presenter"
    });

    render(<SessionCreateForm />);

    await user.type(screen.getByLabelText("Presenter email"), "player@example.com");
    await user.clear(screen.getByLabelText("Decklist"));
    await user.type(screen.getByLabelText("Decklist"), "4 Lightning Bolt");
    await user.type(screen.getByLabelText("Opponent decklist"), "4 Thoughtseize");
    await user.click(screen.getByRole("button", { name: "Create review session" }));

    expect(createReviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        opponentDecklistText: "4 Thoughtseize"
      })
    );
  });
});
