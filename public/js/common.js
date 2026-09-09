// Utilidades compartidas entre host.js y player.js

function getClientId() {
  let id = localStorage.getItem('rn_clientId');
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    localStorage.setItem('rn_clientId', id);
  }
  return id;
}

function getRole() {
  return localStorage.getItem('rn_role');
}

function setRole(role) {
  localStorage.setItem('rn_role', role);
}

function money(n) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return sign + '$' + abs.toLocaleString('es-AR');
}

function pct(n) {
  const sign = n > 0 ? '+' : '';
  return sign + n + '%';
}

function resultIcon(result) {
  if (result === 'positive') return '✓';
  if (result === 'negative') return '✗';
  if (result === 'novotes') return '—';
  return '•';
}

function resultClass(result) {
  if (result === 'positive') return 'r-pos';
  if (result === 'negative') return 'r-neg';
  if (result === 'novotes') return 'r-none';
  return 'r-neutral';
}
