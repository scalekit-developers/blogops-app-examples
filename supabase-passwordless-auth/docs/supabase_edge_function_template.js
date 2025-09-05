// Supabase Edge Function template (deploy via Supabase CLI)
// Save as edge-functions/hello-world/index.ts and deploy with supabase functions deploy hello-world

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  // Custom logic here
  return new Response('Hello from Supabase Edge Function!', {
    headers: { 'Content-Type': 'text/plain' },
  });
});
