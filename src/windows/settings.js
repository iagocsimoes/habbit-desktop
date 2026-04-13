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

  const isMacPlatform = navigator.platform.toUpperCase().includes('MAC');

  // Map e.code to a readable key name that matches node-global-key-listener
  function codeToKeyName(code) {
    const codeMap = {
      'Period': '.', 'Comma': ',', 'Slash': '/', 'Backslash': '\\',
      'BracketLeft': '[', 'BracketRight': ']', 'Semicolon': ';',
      'Quote': "'", 'Minus': '-', 'Equal': '=', 'Backquote': '`',
      'Space': 'SPACE', 'Enter': 'ENTER', 'Backspace': 'BACKSPACE',
      'Tab': 'TAB', 'Escape': 'ESC',
      'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
    };
    if (codeMap[code]) return codeMap[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return code.slice(6);
    return code.toUpperCase();
  }

  shortcutInput.addEventListener('keydown', (e) => {
    e.preventDefault();

    const keys = [];

    if (isMacPlatform) {
      if (e.metaKey) keys.push('Cmd');
      if (e.ctrlKey) keys.push('Ctrl');
    } else {
      if (e.ctrlKey) keys.push('Ctrl');
    }
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (!isMacPlatform && e.metaKey) keys.push('Cmd');

    // Use e.code to get the physical key, not the OS-transformed character
    if (!['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'].includes(e.code)) {
      keys.push(codeToKeyName(e.code));
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

// Notification settings
async function loadNotificationSettings() {
  try {
    const settings = await window.electronAPI.getNotificationSettings();
    document.getElementById('notifEnabled').checked = settings.enabled;
    document.getElementById('notifStyle').value = settings.style || 'minimal';
    updateStyleVisibility(settings.enabled);
  } catch (error) {
    console.error('Error loading notification settings:', error);
  }
}

function updateStyleVisibility(enabled) {
  document.getElementById('notifStyleGroup').style.opacity = enabled ? '1' : '0.4';
  document.getElementById('notifStyleGroup').style.pointerEvents = enabled ? 'auto' : 'none';
}

async function saveNotificationSettings() {
  const settings = {
    enabled: document.getElementById('notifEnabled').checked,
    style: document.getElementById('notifStyle').value,
  };
  try {
    await window.electronAPI.updateNotificationSettings(settings);
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}

function setupNotificationToggles() {
  document.getElementById('notifEnabled').addEventListener('change', (e) => {
    updateStyleVisibility(e.target.checked);
    saveNotificationSettings();
  });
  document.getElementById('notifStyle').addEventListener('change', saveNotificationSettings);
}

// Tab navigation
function setupTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// Load data on page load
setupTabs();
loadUserData();
loadStats();
loadNotificationSettings();
setupNotificationToggles();

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
