// auth-handlers.js — Manipuladores de eventos da autenticação

document.addEventListener('DOMContentLoaded', () => {
  
  // Elementos
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const authMessage = document.getElementById('authMessage');
  const logoutBtn = document.getElementById('logoutBtn');

  // Função para mostrar mensagem
  function showMessage(message, type = 'info') {
    if (!authMessage) return;
    
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

  // Alternar entre Login e Cadastro
  if (tabLogin) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      tabLogin.style.color = '#0d7de0';
      tabLogin.style.borderBottom = '3px solid #0d7de0';
      tabSignup.style.color = '#6b7280';
      tabSignup.style.borderBottom = '3px solid transparent';
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
      authMessage.style.display = 'none';
    });
  }

  if (tabSignup) {
    tabSignup.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      tabSignup.style.color = '#0d7de0';
      tabSignup.style.borderBottom = '3px solid #0d7de0';
      tabLogin.style.color = '#6b7280';
      tabLogin.style.borderBottom = '3px solid transparent';
      signupForm.style.display = 'block';
      loginForm.style.display = 'none';
      authMessage.style.display = 'none';
    });
  }

  // Login com Email/Senha
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        showMessage('Preencha todos os campos', 'error');
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

      if (!name || !email || !password) {
        showMessage('Preencha todos os campos', 'error');
        return;
      }

      if (password.length < 6) {
        showMessage('A senha deve ter no mínimo 6 caracteres', 'error');
        return;
      }

      showMessage('🔄 Criando conta...', 'info');

      const result = await window.authManager.signUp(email, password, name);
      
      if (result.success) {
        showMessage(result.message, 'success');
        signupForm.reset();
        // Volta para a aba de login após 3 segundos
        setTimeout(() => {
          if (tabLogin) tabLogin.click();
        }, 3000);
      } else {
        showMessage(result.message, 'error');
      }
    });
  }

  // Login com Google
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      showMessage('🔄 Redirecionando para o Google...', 'info');
      const result = await window.authManager.signInWithGoogle();
      
      if (!result.success && result.message) {
        showMessage(result.message, 'error');
      }
    });
  }

  // Esqueci minha senha
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async () => {
      const email = document.getElementById('loginEmail').value.trim();
      
      if (!email) {
        showMessage('Digite seu email no campo acima primeiro', 'error');
        document.getElementById('loginEmail').focus();
        return;
      }

      if (!confirm(`Enviar email de recuperação para ${email}?`)) return;

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
    logoutBtn.addEventListener('click', async () => {
      if (!confirm('Deseja realmente sair?')) return;

      const result = await window.authManager.signOut();
      
      if (result.success) {
        showMessage(result.message, 'success');
      } else {
        showMessage(result.message, 'error');
      }
    });
  }

});