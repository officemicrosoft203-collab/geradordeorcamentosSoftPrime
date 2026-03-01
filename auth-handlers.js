// auth-handlers.js — Manipuladores de eventos da autenticação (SEM GOOGLE)

document.addEventListener('DOMContentLoaded', () => {
  
  console.log('[AUTH] Handlers inicializados');
  
  // Elementos
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const authMessage = document.getElementById('authMessage');
  const logoutBtn = document.getElementById('logoutBtn');

  // Função para mostrar mensagem
  function showMessage(message, type = 'info') {
    if (!authMessage) return;
    
    console.log(`[AUTH] Mensagem (${type}):`, message);
    
    authMessage.textContent = message;
    authMessage.style.display = 'block';
    
    if (type === 'success') {
      authMessage.style.background = '#d1fae5';
      authMessage.style.color = '#065f46';
      authMessage.style.border = '1px solid #6ee7b7';
    } else if (type === 'error') {
      authMessage.style.background = '#fee2e2';
      authMessage.style.color = '#991b1b';
      authMessage.style.border = '1px solid #fca5a5';
    } else {
      authMessage.style.background = '#dbeafe';
      authMessage.style.color = '#1e40af';
      authMessage.style.border = '1px solid #93c5fd';
    }

    setTimeout(() => {
      authMessage.style.display = 'none';
    }, 5000);
  }

  // Função para alternar abas
  function switchToLogin() {
    console.log('[AUTH] Alternando para Login');
    if (tabLogin) {
      tabLogin.style.color = '#0d7de0';
      tabLogin.style.borderBottom = '3px solid #0d7de0';
    }
    if (tabSignup) {
      tabSignup.style.color = '#6b7280';
      tabSignup.style.borderBottom = '3px solid transparent';
    }
    if (loginForm) loginForm.style.display = 'block';
    if (signupForm) signupForm.style.display = 'none';
    if (authMessage) authMessage.style.display = 'none';
  }

  function switchToSignup() {
    console.log('[AUTH] Alternando para Cadastro');
    if (tabSignup) {
      tabSignup.style.color = '#0d7de0';
      tabSignup.style.borderBottom = '3px solid #0d7de0';
    }
    if (tabLogin) {
      tabLogin.style.color = '#6b7280';
      tabLogin.style.borderBottom = '3px solid transparent';
    }
    if (signupForm) signupForm.style.display = 'block';
    if (loginForm) loginForm.style.display = 'none';
    if (authMessage) authMessage.style.display = 'none';
  }

  // Event listeners das abas
  if (tabLogin) {
    tabLogin.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      switchToLogin();
    });
  }

  if (tabSignup) {
    tabSignup.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      switchToSignup();
    });
  }

  // Login com Email/Senha
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      console.log('[AUTH] Tentando login com email:', email);

      if (!email || !password) {
        showMessage('Preencha todos os campos', 'error');
        return;
      }

      if (!window.authManager) {
        showMessage('Sistema de autenticação não inicializado. Verifique as configurações.', 'error');
        console.error('[AUTH] authManager não encontrado');
        return;
      }

      showMessage('🔄 Entrando...', 'info');

      const result = await window.authManager.signIn(email, password);
      
      if (result.success) {
        showMessage(result.message, 'success');
        loginForm.reset();
      } else {
        showMessage(result.message, 'error');
      }
    });
  }

  // Cadastro
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;

      console.log('[AUTH] Tentando cadastro:', { name, email });

      if (!name || !email || !password) {
        showMessage('Preencha todos os campos', 'error');
        return;
      }

      if (password.length < 6) {
        showMessage('A senha deve ter no mínimo 6 caracteres', 'error');
        return;
      }

      if (!window.authManager) {
        showMessage('Sistema de autenticação não inicializado. Verifique as configurações.', 'error');
        console.error('[AUTH] authManager não encontrado');
        return;
      }

      showMessage('🔄 Criando conta...', 'info');

      const result = await window.authManager.signUp(email, password, name);
      
      if (result.success) {
        showMessage(result.message, 'success');
        signupForm.reset();
        setTimeout(() => {
          switchToLogin();
        }, 3000);
      } else {
        showMessage(result.message, 'error');
      }
    });
  }

  // Esqueci minha senha
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const email = document.getElementById('loginEmail').value.trim();
      
      if (!email) {
        showMessage('Digite seu email no campo acima primeiro', 'error');
        document.getElementById('loginEmail').focus();
        return;
      }

      if (!confirm(`Enviar email de recuperação para ${email}?`)) return;

      if (!window.authManager) {
        showMessage('Sistema de autenticação não inicializado.', 'error');
        return;
      }

      showMessage('🔄 Enviando email...', 'info');

      const result = await window.authManager.resetPassword(email);
      
      if (result.success) {
        showMessage(result.message, 'success');
      } else {
        showMessage(result.message, 'error');
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[AUTH] Tentando logout');
      
      if (!confirm('Deseja realmente sair?')) return;

      if (!window.authManager) {
        showMessage('Sistema de autenticação não inicializado.', 'error');
        return;
      }

      const result = await window.authManager.signOut();
      
      if (result.success) {
        showMessage(result.message, 'success');
      } else {
        showMessage(result.message, 'error');
      }
    });
  }

  // Inicializa na aba de Login
  switchToLogin();

});