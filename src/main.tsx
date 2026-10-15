console.log('Main.tsx entry point executing');
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress harmless WebSocket promise rejections from Vite HMR and Supabase Realtime
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = event.reason ? (event.reason.message || String(event.reason)) : '';
  if (
    reasonStr.includes("WebSocket") || 
    reasonStr.includes("closed without opened") ||
    reasonStr.includes("failed to connect to websocket")
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.includes("WebSocket") || 
    msg.includes("closed without opened") ||
    msg.includes("failed to connect to websocket")
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

console.log('Creating root...');
const rootElement = document.getElementById("root");
console.log('Root element:', rootElement);

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('Root rendered');
} else {
  console.error('Root element not found');
}
