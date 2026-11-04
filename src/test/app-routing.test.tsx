import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/modules/auth/auth-context";

describe("App routing", () => {
  it("protects the overview page and directs signed-out users to login", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  });

  it("renders a not-found page for unknown paths", () => {
    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <AuthProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
