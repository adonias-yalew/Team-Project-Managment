import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <App />
        <Toaster />
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
