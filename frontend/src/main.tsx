import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "lenis/dist/lenis.css";

import { ReactLenis } from 'lenis/react';
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ReactLenis root>
        <App />
      </ReactLenis>
    </BrowserRouter>
  </StrictMode>,
);
