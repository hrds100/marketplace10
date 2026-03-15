import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(() => {
  return new Response(
    JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
