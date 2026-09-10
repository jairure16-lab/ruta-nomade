const http = require('http');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3210;
const URL = `http://127.0.0.1:${PORT}`;
const PARTICIPANTS = 40;
const TIMEOUT_MS = 12000;

async function waitFor(check, label) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Tiempo agotado: ${label}`);
}

function serverIsReady() {
  return new Promise((resolve) => {
    const request = http.get(`${URL}/api/public-url`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    request.on('error', () => resolve(false));
  });
}

async function run() {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), PUBLIC_URL: URL },
    stdio: 'ignore'
  });
  const clients = [];

  try {
    await waitFor(serverIsReady, 'inicio del servidor');
    let latestState;
    const host = io(URL, { transports: ['websocket'] });
    clients.push(host);
    host.on('state', (state) => { latestState = state; });
    await waitFor(() => latestState && latestState.phase === 'lobby', 'host conectado');
    let hostAuthorized = false;
    host.on('host:authenticated', ({ ok }) => { hostAuthorized = ok; });
    host.emit('host:authenticate', { pin: '0101' });
    await waitFor(() => hostAuthorized, 'autenticación del host');

    for (let index = 0; index < PARTICIPANTS; index++) {
      clients.push(io(URL, { transports: ['websocket'] }));
    }
    await waitFor(() => clients.every((client) => client.connected), '40 participantes conectados');

    host.emit('host:start');
    await waitFor(() => latestState && latestState.phase === 'voting', 'apertura de votación');
    clients.slice(1).forEach((participant, index) => {
      participant.emit('player:vote', { clientId: `simulado-${index + 1}`, optionIndex: index % 3 });
    });
    await waitFor(() => latestState && latestState.currentDecision && latestState.currentDecision.voteCount === PARTICIPANTS, 'recepción de 40 votos');

    host.emit('host:closeVote');
    await waitFor(() => latestState && latestState.phase === 'reveal', 'revelado del resultado');
    if (latestState.reveal.totalVotes !== PARTICIPANTS) throw new Error(`Se esperaban ${PARTICIPANTS} votos y llegaron ${latestState.reveal.totalVotes}`);

    host.emit('host:reset');
    await waitFor(() => latestState && latestState.phase === 'lobby', 'reinicio de partida');

    const answerOrders = new Set();
    for (let game = 0; game < 6; game++) {
      host.emit('host:start');
      await waitFor(() => latestState && latestState.phase === 'voting', `inicio aleatorio ${game + 1}`);
      answerOrders.add(latestState.currentDecision.options.map((option) => option.text).join('|'));
      host.emit('host:reset');
      await waitFor(() => latestState && latestState.phase === 'lobby', `reinicio aleatorio ${game + 1}`);
    }
    if (answerOrders.size < 2) throw new Error('El orden de respuestas no varió entre partidas');
    console.log(`OK: simulación de ${PARTICIPANTS} participantes superada; ${answerOrders.size} órdenes de respuesta distintos verificados.`);
  } finally {
    clients.forEach((client) => client.close());
    server.kill();
  }
}

run().catch((error) => {
  console.error(`FALLO: ${error.message}`);
  process.exitCode = 1;
});
