let summaryText = '';

const contentEl = document.getElementById('content');
const footerEl = document.getElementById('footer');
const copyBtn = document.getElementById('copyBtn');
const closeBtn = document.getElementById('closeBtn');

// Render summary text using safe DOM methods
function renderSummary(text) {
  summaryText = text;

  // Clear content
  contentEl.textContent = '';

  // Check if the response has bullet-style lines
  const lines = text.split('\n').filter(l => l.trim());
  const hasBullets = lines.some(l => /^[-\u2022*]\s/.test(l.trim()));

  if (hasBullets) {
    const ul = document.createElement('ul');
    ul.style.paddingLeft = '18px';
    ul.style.margin = '0';
    ul.style.listStyle = 'disc';
    lines.forEach(line => {
      const clean = line.trim().replace(/^[-\u2022*]\s*/, '');
      const li = document.createElement('li');
      li.textContent = clean;
      ul.appendChild(li);
    });
    contentEl.appendChild(ul);
  } else {
    contentEl.textContent = text;
  }

  footerEl.style.display = 'flex';
}

// Listen for summary result from main process
window.electronAPI.onSummaryResult((text) => {
  renderSummary(text);
});

// Listen for errors
window.electronAPI.onSummaryError((message) => {
  contentEl.textContent = message;
  contentEl.classList.add('error');
});

// Copy button
copyBtn.addEventListener('click', () => {
  if (summaryText) {
    window.electronAPI.summaryCopy(summaryText);
    copyBtn.textContent = 'Copiado!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'Copiar';
      copyBtn.classList.remove('copied');
    }, 1500);
  }
});

// Close button
closeBtn.addEventListener('click', () => {
  window.electronAPI.summaryClose();
});

// ESC to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.electronAPI.summaryClose();
  }
});
