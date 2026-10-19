import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initializeTheme } from "./components/ThemeToggle.jsx";
import App from "./App.jsx";
import "./index.css";

initializeTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
