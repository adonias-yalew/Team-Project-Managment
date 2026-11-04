import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/modules/auth/auth-context";
import { Toaster } from "@/components/ui/sonner";
import "./styles.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.warn("Service worker registration failed.", error);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <App />
          <Toaster />
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
