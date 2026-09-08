// lib/game.js
// -----------------------------------------------------------------------------
// Lógica de negocio de "Ruta Nómade: Camino al Millón" — idéntica a la que
// vivía en el server.js original de Socket.io. Lo único que cambia es DÓNDE
// vive el estado: en vez de una variable `game` module-level, estas funciones
// reciben y devuelven un objeto `game` plano y serializable (JSON), que
// api/*.js persiste a través de lib/store.js (KV o memoria) entre invocaciones.
//
// Los votos NO viven dentro de este objeto `game` (a diferencia del original):
// viven en el store, indexados por "roundKey", porque necesitan las
// primitivas atómicas (SADD/HINCRBY) que el store expone. `closeVoting` recibe
// los conteos ya resueltos desde afuera.
// -----------------------------------------------------------------------------

const crypto = require('crypto');
const {
  STARTING_CASH,
  STARTING_VALUE,
  GOAL_VALUE,
  BRIEFING,
  DECISIONS,
  EVENTS,
  EVENT_SLOTS_AFTER_DECISION
} = require('../data/content');

function buildSequence() {
  const shuffledEvents = [...EVENTS.keys()];
  for (let i = shuffledEvents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledEvents[i], shuffledEvents[j]] = [shuffledEvents[j], shuffledEvents[i]];
  }
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
    sequence: buildSequence(),
    pointer: 0,
    decisionNumber: 0,
    history: [],
    currentDecisionIndex: null,
    currentEventIndex: null,
    lastReveal: null,
    lastEvent: null
  };
}

function totalDecisions() {
  return DECISIONS.length;
}

function clamp(n) {
  return Math.round(n * 100) / 100;
}

function applyEffect(game, cashDelta, valorPct) {
  const cashBefore = game.cash;
  const valueBefore = game.value;
  game.cash = clamp(game.cash + cashDelta);
  game.value = clamp(game.value * (1 + valorPct / 100));
  return { cashBefore, valueBefore, cashAfter: game.cash, valueAfter: game.value };
}

function checkBankrupt(game) {
  if (game.cash <= 0) {
    game.phase = 'bankrupt';
    return true;
  }
  return false;
}

// Clave estable para el store de votos de la ronda de votación actual. Cada
// decisionIndex aparece una sola vez por partida, y gameId cambia en cada
// reset, así que esta clave nunca se reutiliza entre partidas ni rondas.
function roundKeyFor(game) {
  return `${game.gameId}:${game.currentDecisionIndex}`;
}

// Avanza al siguiente paso de la secuencia (o termina el juego si no quedan
// pasos). Muta `game` in place y lo devuelve.
function advanceStep(game) {
  if (game.pointer >= game.sequence.length) {
    finishGame(game);
    return game;
  }
  const step = game.sequence[game.pointer];
  game.pointer++;

  if (step.type === 'decision') {
    game.currentDecisionIndex = step.decisionIndex;
    game.phase = 'voting';
  } else {
    const eventData = EVENTS[step.eventIndex];
    const effect = applyEffect(game, eventData.cash, eventData.valorPct);
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
    game.lastEvent = { ...eventData, ...effect };
    game.currentEventIndex = step.eventIndex;

    if (checkBankrupt(game)) return game;
    game.phase = 'event';
  }
  return game;
}

function resultLabelForOption(option) {
  if (!option) return 'neutral';
  if (option.type === 'correct') return 'positive';
  if (option.type === 'incorrect') return 'negative';
  return 'neutral';
}

// `rawCounts` viene del store: un objeto { "0": n, "1": n, ... } (claves de
// string porque así es como quedan los hash fields en Redis). Se normaliza a
// un array alineado con las opciones de la decisión.
function closeVoting(game, rawCounts) {
  if (game.phase !== 'voting') return game;
  const decision = DECISIONS[game.currentDecisionIndex];
  const counts = decision.options.map((_, idx) => Number(rawCounts[String(idx)] || 0));
  const totalVotes = counts.reduce((a, b) => a + b, 0);

  let winningIndex = null;
  if (totalVotes > 0) {
    const maxVotes = Math.max(...counts);
    const tied = counts.map((c, idx) => (c === maxVotes ? idx : -1)).filter((i) => i >= 0);
    winningIndex = tied[Math.floor(Math.random() * tied.length)];
  }

  let effect = { cashBefore: game.cash, valueBefore: game.value, cashAfter: game.cash, valueAfter: game.value };
  let winningOption = null;
  if (winningIndex !== null) {
    winningOption = decision.options[winningIndex];
    effect = applyEffect(game, winningOption.cash, winningOption.valorPct);
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

  if (checkBankrupt(game)) return game;
  game.phase = 'reveal';
  return game;
}

function finishGame(game) {
  game.phase = game.value >= GOAL_VALUE ? 'success' : 'stagnant';
  return game;
}

// ---------------------------------------------------------------------------
// Serialización del estado hacia los clientes (host y jugador reciben la
// misma forma de datos; el jugador simplemente no usa los controles de host).
// `extra.voteCount` es el conteo en vivo de votantes de la ronda actual
// (viene del store, calculado aparte porque no vive dentro de `game`).
// ---------------------------------------------------------------------------
function publicState(game, extra) {
  extra = extra || {};
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
    const decision = DECISIONS[game.currentDecisionIndex];
    base.currentDecision = {
      theme: decision.theme,
      title: decision.title,
      scenario: decision.scenario,
      options: decision.options.map((o) => ({ text: o.text })),
      voteCount: extra.voteCount || 0
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

module.exports = {
  DECISIONS,
  EVENTS,
  freshGame,
  totalDecisions,
  advanceStep,
  closeVoting,
  finishGame,
  roundKeyFor,
  publicState
};
