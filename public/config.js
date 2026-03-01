// config.js - Configurações do Supabase

const SUPABASE_URL = "https://eyxydyhpdahkplapitaut.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5eHlkeWhwZGFoa3BsYXBpdGF1dCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQwMTg2NzQ4LCJleHAiOjIwNTU3NjI3NDh9.COLE_A_PARTE_FINAL_DA_SUA_CHAVE_AQUI";

// Expõe para uso global
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log('✅ Config carregado');
console.log('🔗 URL:', SUPABASE_URL);
console.log('🔑 Key:', SUPABASE_ANON_KEY ? 'Configurada ✅' : '❌ VAZIA!');