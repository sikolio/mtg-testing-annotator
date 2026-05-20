import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SessionCreateForm } from "./SessionCreateForm";

vi.mock("@/lib/actions/sessionActions", () => ({
  createReviewSession: vi.fn()
}));

describe("SessionCreateForm", () => {
  it("shows a live video preview for positioning the hand block", async () => {
    const user = userEvent.setup();
    render(<SessionCreateForm />);

    await user.click(screen.getByLabelText("Enable static hand-hidden-block"));

    expect(screen.getByTitle("Hand-hidden-block positioning preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Block x percent")).toHaveValue(3);
    expect(screen.getByLabelText("Block y percent")).toHaveValue(70);
    expect(screen.getByLabelText("Block width percent")).toHaveValue(94);
    expect(screen.getByLabelText("Block height percent")).toHaveValue(30);

    const xInput = screen.getByLabelText("Block x percent");
    await user.clear(xInput);
    await user.type(xInput, "12");

    expect(screen.getByLabelText("Preview hidden hand information")).toHaveStyle({ left: "12%" });
  });
});
