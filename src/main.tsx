// Ensure TextEncoder/TextDecoder are on globalThis/global BEFORE any imports.
// vite-plugin-node-polyfills replaces 'global' with a polyfill object that lacks
// browser APIs. Particle SDK's WASM layer needs global.TextEncoder.
if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  if (!g.TextEncoder) g.TextEncoder = TextEncoder;
  if (!g.TextDecoder) g.TextDecoder = TextDecoder;
  if (typeof global !== 'undefined' && !(global as any).TextEncoder) {
    (global as any).TextEncoder = TextEncoder;
    (global as any).TextDecoder = TextDecoder;
  }
}

import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

// Sentry: silently no-ops if DSN is not set
const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

function FallbackUI() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#fafafa' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 24px' }}>The app encountered an unexpected error. Please try reloading.</p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<FallbackUI />}>
    <App />
  </Sentry.ErrorBoundary>
);
