// config.js - Configurações do Supabase (gerado automaticamente)

// Tenta pegar das variáveis de ambiente primeiro (build time)
const SUPABASE_URL = typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL 
  ? process.env.SUPABASE_URL 
  : "https://eyxydyhpdahkplapitaut.supabase.co";

const SUPABASE_ANON_KEY = typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY
  ? process.env.SUPABASE_ANON_KEY
  : "sb_publishable_7V1-f16E8oOXGge7Wnqtvg_ARVGDj_0";

// Expõe para uso global
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log('✅ Config carregado');
console.log('🔗 URL:', SUPABASE_URL);
console.log('🔑 Key:', SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "" ? 'Configurada ✅' : '❌ VAZIA!');

// Cria cliente Supabase e expõe em window.sb para o app (no navegador)
if (typeof supabase !== "undefined" && typeof window !== "undefined") {
  try {
    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Cliente Supabase criado');
  } catch (error) {
    console.error('❌ Erro ao criar cliente Supabase:', error);
  }
}