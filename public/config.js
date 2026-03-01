// config.js - Configurações do Supabase

const SUPABASE_URL = "https://eyxydyhpdahkplapitaut.supabase.co";
const SUPABASE_ANON_KEY = "COLE_AQUI_A_CHAVE_QUE_VOCÊ_COPIOU";

// Expõe para uso global
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log('✅ Config carregado');
console.log('🔗 URL:', SUPABASE_URL);
console.log('🔑 Key:', SUPABASE_ANON_KEY ? 'Configurada ✅' : '❌ VAZIA!');