// Ruta Nómade: Camino al Millón — servidor Express + Socket.io
// Estado del juego vive completamente en memoria (objeto `game` más abajo).
// No hay base de datos: al reiniciar el proceso se pierde la partida (esperado,
// es una dinámica efímera para una sola charla/evento).

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

const {
  STARTING_CASH,
  STARTING_VALUE,
  GOAL_VALUE,
  BRIEFING,
  DECISIONS,
  EVENTS,
  EVENT_SLOTS_AFTER_DECISION
} = require('./data/content');

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const HOST_PIN = process.env.HOST_PIN || '0101';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/qr.png', async (req, res) => {
  try {
    const buf = await QRCode.toBuffer(PUBLIC_URL, { width: 500, margin: 1 });
    res.type('png').send(buf);
  } catch (err) {
    res.status(500).end();
  }
});

app.get('/api/public-url', (req, res) => {
  res.json({ publicUrl: PUBLIC_URL });
});

// ---------------------------------------------------------------------------
// Baraja criptográficamente segura: evita patrones predecibles entre partidas.
function secureShuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Construcción de la secuencia de pasos de una partida: 8 decisiones + 3
// eventos aleatorios (sin repetir) intercalados después de las rondas 2, 4 y 6.
// ---------------------------------------------------------------------------
function buildSequence() {
  const shuffledEvents = secureShuffle([...EVENTS.keys()]);
  const chosenEventIndexes = shuffledEvents.slice(0, 3);

  const sequence = [];
  let decisionsSoFar = 0;
  let eventSlot = 0;
  for (let i = 0; i < DECISIONS.length; i++) {
    sequence.push({ type: 'decision', decisionIndex: i });
    decisionsSoFar++;
    if (
      eventSlot < EVENT_SLOTS_AFTER_DECISION.length &&
      decisionsSoFar === EVENT_SLOTS_AFTER_DECISION[eventSlot]
    ) {
      sequence.push({ type: 'event', eventIndex: chosenEventIndexes[eventSlot] });
      eventSlot++;
    }
  }
  return sequence;
}

function freshGame() {
  return {
    gameId: crypto.randomUUID(),
    phase: 'lobby', // lobby | voting | reveal | event | bankrupt | success | stagnant
    cash: STARTING_CASH,
    value: STARTING_VALUE,
    decisions: DECISIONS.map((decision) => ({
      ...decision,
      options: secureShuffle(decision.options)
    })),
    sequence: buildSequence(),
    pointer: 0, // índice del próximo paso a ejecutar
    decisionNumber: 0, // cuántas decisiones ya se resolvieron (para la tabla)
    history: [], // filas ya resueltas para la tabla de progresión
    votes: {}, // clientId -> optionIndex, solo durante 'voting'
    voters: new Set(), // clientIds que ya votaron esta ronda
    currentDecisionIndex: null,
    currentEventIndex: null,
    lastReveal: null, // datos completos de la última decisión revelada
    lastEvent: null // datos completos del último evento aplicado
  };
}

let game = freshGame();

function totalDecisions() {
  return DECISIONS.length;
}

function clamp(n) {
  return Math.round(n * 100) / 100;
}

function applyEffect(cashDelta, valorPct) {
  const cashBefore = game.cash;
  const valueBefore = game.value;
  game.cash = clamp(game.cash + cashDelta);
  game.value = clamp(game.value * (1 + valorPct / 100));
  return { cashBefore, valueBefore, cashAfter: game.cash, valueAfter: game.value };
}

function checkBankrupt() {
  if (game.cash <= 0) {
    game.phase = 'bankrupt';
    return true;
  }
  return false;
}

// Avanza al siguiente paso de la secuencia (o termina el juego si no quedan pasos).
function advance() {
  if (game.pointer >= game.sequence.length) {
    finishGame();
    return;
  }
  const step = game.sequence[game.pointer];
  game.pointer++;

  if (step.type === 'decision') {
    game.currentDecisionIndex = step.decisionIndex;
    game.votes = {};
    game.voters = new Set();
    game.phase = 'voting';
  } else {
    // Evento: se aplica de inmediato, no requiere votación.
    const eventData = EVENTS[step.eventIndex];
    const effect = applyEffect(eventData.cash, eventData.valorPct);
    const row = {
      num: game.history.length + 1,
      type: 'event',
      theme: 'Evento inesperado',
      title: eventData.title,
      icon: eventData.icon,
      result: eventData.valorPct >= 0 && eventData.cash >= 0 ? 'positive'
        : (eventData.valorPct < 0 && eventData.cash < 0 ? 'negative' : 'neutral'),
      cashAfter: effect.cashAfter,
      valueAfter: effect.valueAfter
    };
    game.history.push(row);
    game.lastEvent = {
      ...eventData,
      ...effect
    };
    game.currentEventIndex = step.eventIndex;

    if (checkBankrupt()) return;
    game.phase = 'event';
  }
}

function resultLabelForOption(option) {
  if (!option) return 'neutral';
  if (option.type === 'correct') return 'positive';
  if (option.type === 'incorrect') return 'negative';
  return 'neutral';
}

function closeVoting() {
  if (game.phase !== 'voting') return;
  const decision = game.decisions[game.currentDecisionIndex];
  const counts = decision.options.map((_, idx) =>
    Object.values(game.votes).filter((v) => v === idx).length
  );
  const totalVotes = counts.reduce((a, b) => a + b, 0);

  let winningIndex = null;
  if (totalVotes > 0) {
    const maxVotes = Math.max(...counts);
    const tied = counts.map((c, idx) => (c === maxVotes ? idx : -1)).filter((i) => i >= 0);
    winningIndex = tied[crypto.randomInt(tied.length)];
  }

  let effect = { cashBefore: game.cash, valueBefore: game.value, cashAfter: game.cash, valueAfter: game.value };
  let winningOption = null;
  if (winningIndex !== null) {
    winningOption = decision.options[winningIndex];
    effect = applyEffect(winningOption.cash, winningOption.valorPct);
  }

  game.decisionNumber++;
  const row = {
    num: game.history.length + 1,
    type: 'decision',
    theme: decision.theme,
    title: decision.title,
    result: winningIndex === null ? 'novotes' : resultLabelForOption(winningOption),
    cashAfter: effect.cashAfter,
    valueAfter: effect.valueAfter
  };
  game.history.push(row);

  game.lastReveal = {
    decisionIndex: game.currentDecisionIndex,
    theme: decision.theme,
    title: decision.title,
    scenario: decision.scenario,
    options: decision.options,
    counts,
    totalVotes,
    winningIndex,
    winningOption,
    ...effect
  };

  if (checkBankrupt()) return;
  game.phase = 'reveal';
}

function finishGame() {
  game.phase = game.value >= GOAL_VALUE ? 'success' : 'stagnant';
}

function resetGame() {
  game = freshGame();
}

// ---------------------------------------------------------------------------
// Serialización del estado hacia los clientes (host y jugador reciben la
// misma forma de datos; el jugador simplemente no usa los controles de host).
// ---------------------------------------------------------------------------
function publicState() {
  const base = {
    gameId: game.gameId,
    phase: game.phase,
    cash: game.cash,
    value: game.value,
    goal: GOAL_VALUE,
    startingCash: STARTING_CASH,
    startingValue: STARTING_VALUE,
    totalDecisions: totalDecisions(),
    decisionNumber: game.decisionNumber,
    history: game.history,
    briefing: BRIEFING
  };

  if (game.phase === 'voting') {
    const decision = game.decisions[game.currentDecisionIndex];
    base.currentDecision = {
      theme: decision.theme,
      title: decision.title,
      scenario: decision.scenario,
      options: decision.options.map((o) => ({ text: o.text })),
      voteCount: game.voters.size
    };
  }

  if (game.phase === 'reveal') {
    base.reveal = game.lastReveal;
  }

  if (game.phase === 'event') {
    base.event = game.lastEvent;
  }

  return base;
}

function broadcastState() {
  io.emit('state', publicState());
}

// ---------------------------------------------------------------------------
// Socket.io
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  socket.emit('state', publicState());

  socket.on('host:authenticate', ({ pin } = {}) => {
    socket.data.isHost = typeof pin === 'string' && pin === HOST_PIN;
    socket.emit('host:authenticated', { ok: socket.data.isHost });
  });

  socket.on('player:vote', ({ clientId, optionIndex }) => {
    if (!clientId || typeof optionIndex !== 'number') return;
    if (game.phase !== 'voting') return;
    if (game.voters.has(clientId)) return; // ya votó esta ronda
    const decision = game.decisions[game.currentDecisionIndex];
    if (optionIndex < 0 || optionIndex >= decision.options.length) return;

    game.votes[clientId] = optionIndex;
    game.voters.add(clientId);
    socket.emit('vote:ack', { gameId: game.gameId, roundIndex: game.pointer, optionIndex });
    broadcastState();
  });

  socket.on('host:start', () => {
    if (!socket.data.isHost) return;
    if (game.phase !== 'lobby') return;
    advance();
    broadcastState();
  });

  socket.on('host:closeVote', () => {
    if (!socket.data.isHost) return;
    closeVoting();
    broadcastState();
  });

  socket.on('host:next', () => {
    if (!socket.data.isHost) return;
    if (game.phase !== 'reveal' && game.phase !== 'event') return;
    advance();
    broadcastState();
  });

  socket.on('host:reset', () => {
    if (!socket.data.isHost) return;
    resetGame();
    broadcastState();
  });
});

server.listen(PORT, () => {
  console.log(`Ruta Nómade escuchando en puerto ${PORT}`);
  console.log(`PUBLIC_URL configurada como: ${PUBLIC_URL}`);
});
