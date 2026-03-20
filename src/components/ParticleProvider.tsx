// ParticleProvider — safe pass-through wrapper
// AuthCoreContextProvider crashed the entire app at runtime
// Particle wallet creation is handled via Edge Functions (JWT approach)
// The client SDK will be re-added when a stable version is confirmed working with Vite

import React from 'react';

export default function ParticleProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
