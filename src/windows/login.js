const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const loader = document.getElementById('loader');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Input validation
  if (!email || !password) {
    showError('Por favor, preencha todos os campos');
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError('Email inválido');
    return;
  }

  // Password length validation
  if (password.length < 6) {
    showError('Senha deve ter no mínimo 6 caracteres');
    return;
  }

  setLoading(true);
  hideError();

  try {
    if (!window.electronAPI) {
      throw new Error('Erro de segurança: API não disponível');
    }

    await window.electronAPI.login(email, password);
    // Login successful - window will be closed by main process
  } catch (error) {
    console.error('Login error:', error);
    const safeMessage = error.message || 'Erro ao fazer login';
    // Sanitize error message to prevent XSS
    const div = document.createElement('div');
    div.textContent = safeMessage;
    showError(div.innerHTML);
    setLoading(false);
  }
});

function setLoading(loading) {
  loginBtn.disabled = loading;
  loginBtn.textContent = loading ? 'Entrando...' : 'Entrar';
  loader.classList.toggle('show', loading);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
}

function hideError() {
  errorMessage.classList.remove('show');
}

// Security: Remove debug logs in production
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('DOMContentLoaded', () => {
    console.log('Login page loaded');
    console.log('electronAPI available:', !!window.electronAPI);
  });
}
