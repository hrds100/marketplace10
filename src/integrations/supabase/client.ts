// Re-export bridge — real file is at src/core/database/client.ts
// This bridge exists so frozen zones (invest, nfstay) can keep importing from @/integrations/supabase/client
export { supabase } from '@/core/database/client';
