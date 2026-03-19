// ParticleProvider — pass-through wrapper
// Particle ConnectKit SDK removed due to alpha build incompatibility with Vite/Rollup
// Wallet creation handled server-side via particle-generate-jwt Edge Function
// This wrapper is kept so App.tsx doesn't need changing

import React from 'react';

export default function ParticleProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
