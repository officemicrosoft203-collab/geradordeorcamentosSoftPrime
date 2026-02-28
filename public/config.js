// config.js (gerado no build)
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

// Cria cliente Supabase e expõe em window.sb para o app (no navegador)
if (typeof supabase !== "undefined" && typeof window !== "undefined") {
  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
