import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "../app/App";

describe("StatSimple app flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = "";
  });

  it("loads a sample dataset and shows overview summary", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /start with student outcomes/i }));
    const main = screen.getByRole("main");

    expect(await within(main).findByText(/what matters in student outcomes\?/i)).toBeInTheDocument();
    expect(within(main).getByText(/^rows$/i)).toBeInTheDocument();
    expect(within(main).getAllByText(/^variables$/i).length).toBeGreaterThan(0);
  });

  it("runs a guided correlation and reveals technical details", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /start with student outcomes/i }));
    await user.click(screen.getByRole("button", { name: /^analyze$/i }));
    await user.click(await screen.findByRole("button", { name: /explore a relationship/i }));
    const main = screen.getByRole("main");

    const variable1 = screen.getByLabelText(/variable 1/i);
    const variable2 = screen.getByLabelText(/variable 2/i);
    await user.selectOptions(
      variable1,
      within(variable1).getByRole("option", { name: /study_hours/i }),
    );
    await user.selectOptions(
      variable2,
      within(variable2).getByRole("option", { name: /exam_score/i }),
    );
    await user.click(screen.getByRole("button", { name: /run analysis/i }));

    expect(await within(main).findByText(/have a strong positive relationship/i)).toBeInTheDocument();

    await user.click(within(main).getByText(/show statistical details/i));
    expect(await within(main).findByText(/degrees of freedom/i)).toBeInTheDocument();
  });

  it("marks history entries as stale after a data edit", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /start with student outcomes/i }));
    await user.click(screen.getByRole("button", { name: /^analyze$/i }));
    await user.click(await screen.findByRole("button", { name: /explore a relationship/i }));
    const main = screen.getByRole("main");
    const variable1 = screen.getByLabelText(/variable 1/i);
    const variable2 = screen.getByLabelText(/variable 2/i);
    await user.selectOptions(
      variable1,
      within(variable1).getByRole("option", { name: /study_hours/i }),
    );
    await user.selectOptions(
      variable2,
      within(variable2).getByRole("option", { name: /exam_score/i }),
    );
    await user.click(screen.getByRole("button", { name: /run analysis/i }));
    expect(await within(main).findByText(/strong positive relationship/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^data$/i }));
    const input = (await screen.findAllByLabelText(/study_hours value/i))[0];
    await user.clear(input);
    await user.type(input, "2.5");
    await user.tab();

    await user.click(screen.getByRole("button", { name: /history/i }));
    const drawer = screen.getByText(/recent analyses/i).closest("aside");
    expect(drawer).toBeInTheDocument();
    expect(within(drawer as HTMLElement).getByText(/used dataset revision/i)).toBeInTheDocument();
  });
});
