// auth.js — Sistema de Autenticação com Supabase
// Login com Email/Senha e Google

class AuthManager {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.init();
  }

  async init() {
    try {
      // Verifica se o Supabase está configurado
      if (typeof supabase === 'undefined') {
        console.error('Supabase não está carregado');
        return;
      }

      if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.warn('Credenciais do Supabase não configuradas');
        return;
      }

      this.supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      
      // Verifica se já está logado
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        this.currentUser = session.user;
        this.showApp();
      } else {
        this.showAuth();
      }

      // Listener para mudanças de autenticação
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        if (session) {
          this.currentUser = session.user;
          this.showApp();
        } else {
          this.currentUser = null;
          this.showAuth();
        }
      });

    } catch (error) {
      console.error('Erro ao inicializar auth:', error);
    }
  }

  showAuth() {
    const authScreen = document.getElementById('authScreen');
    const appScreen = document.getElementById('appScreen');
    if (authScreen) authScreen.style.display = 'flex';
    if (appScreen) appScreen.style.display = 'none';
  }

  showApp() {
    const authScreen = document.getElementById('authScreen');
    const appScreen = document.getElementById('appScreen');
    if (authScreen) authScreen.style.display = 'none';
    if (appScreen) appScreen.style.display = 'block';
    
    // Atualiza nome do usuário no header
    const userNameEl = document.getElementById('userName');
    if (userNameEl && this.currentUser) {
      userNameEl.textContent = this.currentUser.email || 'Usuário';
    }
    
    // Renderiza os dados do usuário
    if (typeof renderAll === 'function') {
      renderAll();
    }
  }

  async signUp(email, password, fullName) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) throw error;

      return { success: true, message: '✅ Conta criada! Verifique seu email para confirmar.' };
    } catch (error) {
      console.error('Erro no cadastro:', error);
      return { success: false, message: `❌ Erro: ${error.message}` };
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      return { success: true, message: '✅ Login realizado com sucesso!' };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, message: `❌ Erro: ${error.message}` };
    }
  }

  async signInWithGoogle() {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Erro no login com Google:', error);
      return { success: false, message: `❌ Erro: ${error.message}` };
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      
      // Limpa dados locais
      localStorage.clear();
      
      return { success: true, message: '✅ Logout realizado com sucesso!' };
    } catch (error) {
      console.error('Erro no logout:', error);
      return { success: false, message: `❌ Erro: ${error.message}` };
    }
  }

  async resetPassword(email) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      return { success: true, message: '✅ Email de recuperação enviado!' };
    } catch (error) {
      console.error('Erro ao recuperar senha:', error);
      return { success: false, message: `❌ Erro: ${error.message}` };
    }
  }

  getUserId() {
    return this.currentUser ? this.currentUser.id : null;
  }

  getUserEmail() {
    return this.currentUser ? this.currentUser.email : null;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }
}

// Instância global
window.authManager = new AuthManager();