import { supabase } from '@/integrations/supabase/client';

// Untyped passthrough — the auto-generated Database type does not yet
// include pcrm_* tables, and the types file is frozen. Casting at the
// API boundary keeps the rest of the feature strongly typed against
// the hand-written interfaces in ../types.ts.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sb = supabase as any;
