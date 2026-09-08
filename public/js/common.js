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

// --- Transporte: polling REST en vez de socket.io -------------------------
// El servidor es serverless (Vercel), así que no hay WebSockets persistentes:
// el cliente pide el estado por fetch cada POLL_INTERVAL_MS y vuelve a llamar
// a la misma función de render que antes recibía el payload del evento
// 'state' de socket.io.
const POLL_INTERVAL_MS = 1200;

function fetchState() {
  return fetch('/api/state').then((r) => r.json());
}

// Arranca el polling y devuelve el intervalId (por si algún día hace falta
// pararlo). Hace un primer fetch inmediato para no esperar el primer tick.
function startPolling(renderFn) {
  const tick = () => fetchState().then(renderFn).catch(() => {});
  tick();
  return setInterval(tick, POLL_INTERVAL_MS);
}

// Refresca el estado fuera de ciclo (justo después de un POST propio) para
// que la UI se sienta responsiva sin esperar hasta el próximo tick del poll.
function refreshNow(renderFn) {
  fetchState().then(renderFn).catch(() => {});
}

function postJSON(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  }).then((r) => r.json().catch(() => ({})));
}
