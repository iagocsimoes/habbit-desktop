let currentUser = null;

// Sanitize text to prevent XSS
function sanitizeText(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Sanitize and limit string length
function sanitizeAndLimit(text, maxLength = 255) {
  if (typeof text !== 'string') return 'Não definido';
  return sanitizeText(text.slice(0, maxLength));
}

async function loadUserData() {
  try {
    currentUser = await window.electronAPI.getCurrentUser();

    if (currentUser) {
      document.getElementById('userEmail').innerHTML = sanitizeAndLimit(currentUser.email);
      document.getElementById('userName').innerHTML = sanitizeAndLimit(currentUser.name || 'Não definido');
      document.getElementById('userPlan').innerHTML = sanitizeAndLimit(currentUser.plan, 20);
      document.getElementById('shortcut').value = sanitizeAndLimit(currentUser.shortcut, 50);
      document.getElementById('correctionStyle').value = sanitizeAndLimit(currentUser.correctionStyle || 'correct', 20);

      // Setup shortcut capture
      setupShortcutCapture();
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function setupShortcutCapture() {
  const shortcutInput = document.getElementById('shortcut');

  shortcutInput.addEventListener('keydown', (e) => {
    e.preventDefault();

    const keys = [];

    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey) keys.push('Cmd');

    // Get the actual key (not modifiers)
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      keys.push(e.key.toUpperCase());
    }

    if (keys.length > 1) {
      shortcutInput.value = keys.join('+');
    }
  });

  shortcutInput.addEventListener('click', () => {
    shortcutInput.value = '';
    shortcutInput.placeholder = 'Pressione as teclas...';
  });
}

async function loadStats() {
  try {
    const stats = await window.electronAPI.getStats();

    // Sanitize and validate numeric values
    const sanitizeNumber = (value) => {
      const num = parseInt(value, 10);
      return isNaN(num) ? 0 : Math.max(0, Math.min(num, 999999));
    };

    document.getElementById('totalCorrections').textContent = sanitizeNumber(stats.totalCorrections);
    document.getElementById('monthlyLimit').textContent = sanitizeNumber(stats.monthlyLimit);
    document.getElementById('tokensUsed').textContent = sanitizeNumber(stats.totalTokensUsed);
    document.getElementById('remaining').textContent = sanitizeNumber(stats.remaining);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

document.getElementById('shortcutForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const shortcut = document.getElementById('shortcut').value.trim();

  if (!shortcut) return;

  try {
    await window.electronAPI.updateShortcut(shortcut);

    const successMsg = document.getElementById('shortcutSuccess');
    successMsg.classList.add('show');
    setTimeout(() => successMsg.classList.remove('show'), 3000);
  } catch (error) {
    const safeMessage = sanitizeAndLimit(error?.message || 'Erro desconhecido', 200);
    alert('Erro ao atualizar atalho: ' + safeMessage);
  }
});

document.getElementById('styleForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const style = document.getElementById('correctionStyle').value;

  if (!style) return;

  try {
    await window.electronAPI.updateCorrectionStyle(style);

    const successMsg = document.getElementById('styleSuccess');
    successMsg.classList.add('show');
    setTimeout(() => successMsg.classList.remove('show'), 3000);
  } catch (error) {
    const safeMessage = sanitizeAndLimit(error?.message || 'Erro desconhecido', 200);
    alert('Erro ao atualizar estilo: ' + safeMessage);
  }
});

async function handleLogout() {
  if (confirm('Tem certeza que deseja sair?')) {
    await window.electronAPI.logout();
  }
}

function handleCloseWindow() {
  window.electronAPI.closeWindow();
}

function handleMinimizeWindow() {
  window.electronAPI.minimizeWindow();
}

// Load data on page load
loadUserData();
loadStats();

// Auto-refresh stats every 30 seconds
setInterval(() => {
  if (currentUser) {
    loadStats();
  }
}, 30000);

// Listen for auth state changes
window.electronAPI.onAuthStateChanged((user) => {
  currentUser = user;
  if (user) {
    loadUserData();
    loadStats();
  }
});
