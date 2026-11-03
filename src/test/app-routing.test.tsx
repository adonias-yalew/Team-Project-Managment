import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { StoreProvider } from "@/lib/store";

describe("App routing", () => {
  it("renders the overview page at /", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <StoreProvider>
          <App />
        </StoreProvider>
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
  });
});
