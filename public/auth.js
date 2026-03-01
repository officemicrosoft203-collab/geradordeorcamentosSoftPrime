// auth.js — Sistema de Autenticação com Supabase

class AuthManager {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.init();
  }

  async init() {
    try {
      if (typeof supabase === 'undefined') {
        console.error('❌ Supabase não está carregado');
        return;
      }

      if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error('❌ Credenciais do Supabase não configuradas');
        return;
      }

      console.log('🔄 Inicializando Supabase...');
      this.supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      
      // Verifica sessão atual
      const { data: { session } } = await this.supabase.auth.getSession();
      
      if (session) {
        console.log('✅ Usuário já logado:', session.user.email);
        this.currentUser = session.user;
        this.showApp();
      } else {
        console.log('ℹ️ Nenhum usuário logado');
        this.showAuth();
      }

      // Listener para mudanças de autenticação
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔔 Auth event:', event);
        
        if (session) {
          this.currentUser = session.user;
          this.showApp();
        } else {
          this.currentUser = null;
          this.showAuth();
        }
      });

    } catch (error) {
      console.error('❌ Erro ao inicializar auth:', error);
    }
  }

  showAuth() {
    const authScreen = document.getElementById('authScreen');
    const appScreen = document.getElementById('appScreen');
    if (authScreen) authScreen.style.display = 'flex';
    if (appScreen) appScreen.style.display = 'none';
    console.log('🔐 Mostrando tela de login');
  }

  showApp() {
    const authScreen = document.getElementById('authScreen');
    const appScreen = document.getElementById('appScreen');
    if (authScreen) authScreen.style.display = 'none';
    if (appScreen) appScreen.style.display = 'block';
    
    // Atualiza nome do usuário no header
    const userNameEl = document.getElementById('userName');
    if (userNameEl && this.currentUser) {
      const displayName = this.currentUser.user_metadata?.full_name || 
                          this.currentUser.email.split('@')[0];
      userNameEl.textContent = displayName;
    }
    
    // Renderiza dados da aplicação
    if (typeof renderAll === 'function') {
      console.log('🔄 Carregando dados do usuário...');
      renderAll();
    }
    
    console.log('✅ App carregado para:', this.currentUser.email);
  }

  async signUp(email, password, fullName) {
    try {
      console.log('🔄 Cadastrando usuário:', email);
      
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

      console.log('✅ Cadastro realizado');
      return { 
        success: true, 
        message: '✅ Conta criada! Você já pode fazer login.' 
      };
      
    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      return { 
        success: false, 
        message: `❌ ${error.message}` 
      };
    }
  }

  async signIn(email, password) {
    try {
      console.log('🔄 Fazendo login:', email);
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      console.log('✅ Login realizado');
      return { 
        success: true, 
        message: '✅ Login realizado com sucesso!' 
      };
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      
      let message = error.message;
      if (message.includes('Invalid login credentials')) {
        message = 'Email ou senha incorretos';
      } else if (message.includes('Email not confirmed')) {
        message = 'Confirme seu email antes de fazer login';
      }
      
      return { 
        success: false, 
        message: `❌ ${message}` 
      };
    }
  }

  async signOut() {
    try {
      console.log('🔄 Fazendo logout...');
      
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;

      console.log('✅ Logout realizado');
      return { 
        success: true, 
        message: '✅ Você saiu com sucesso!' 
      };
      
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      return { 
        success: false, 
        message: `❌ ${error.message}` 
      };
    }
  }

  async resetPassword(email) {
    try {
      console.log('🔄 Enviando email de recuperação para:', email);
      
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`
      });

      if (error) throw error;

      console.log('✅ Email enviado');
      return { 
        success: true, 
        message: '✅ Email de recuperação enviado! Verifique sua caixa de entrada.' 
      };
      
    } catch (error) {
      console.error('❌ Erro ao recuperar senha:', error);
      return { 
        success: false, 
        message: `❌ ${error.message}` 
      };
    }
  }

  getUserId() {
    return this.currentUser ? this.currentUser.id : null;
  }

  getUserEmail() {
    return this.currentUser ? this.currentUser.email : null;
  }

  getSupabase() {
    return this.supabase;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }
}

// Instância global
window.authManager = new AuthManager();
console.log('✅ AuthManager carregado');