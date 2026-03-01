// config.js - Configurações do Supabase

const SUPABASE_URL = "https://eyxydyhpdahkplapitaut.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7V1-f16E8oOXGge7Wnqtvg_ARVGDj_0";

// Expõe para uso global
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// Cria cliente Supabase (se a biblioteca estiver carregada)
if (typeof supabase !== "undefined") {
  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}