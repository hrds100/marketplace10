// STUB — Phase 0 mock presence.
// Phase 1: Supabase realtime channel `presence:smsv2`.
import { useState } from 'react';
import { CURRENT_AGENT } from '../data/mockAgents';
import type { AgentStatus } from '../types';

export function useAgentPresence() {
  const [status, setStatus] = useState<AgentStatus>(CURRENT_AGENT.status);
  return { status, setStatus };
}
