// lib/store.js
// -----------------------------------------------------------------------------
// Capa de estado con UNA sola interfaz async, usada tal cual desde api/*.js sin
// ramas condicionales por entorno. Detrás de esa interfaz hay dos backends:
//
//   - KV (Upstash Redis vía @vercel/kv): cuando existen KV_REST_API_URL y
//     KV_REST_API_TOKEN (Vercel, storage conectado desde el dashboard).
//   - Memoria de proceso (Map/Set): fallback para local sin Redis. Vive
//     mientras el proceso Node esté arriba (server.js), que es exactamente lo
//     que necesitamos para probar en la laptop antes de la charla.
//
// El dedupe de "clientId ya votó esta ronda" usa el equivalente de SADD
// (atómico también en el fallback: es un solo Set.add síncrono por evento
// loop, no hay condición de carrera entre el check y el write). El conteo de
// votos por opción usa el equivalente de HINCRBY (atómico también en el
// fallback). api/vote.js NUNCA hace "leer conteo, sumar 1, escribir": siempre
// pasa por estas dos primitivas atómicas.
// -----------------------------------------------------------------------------

const GAME_KEY = 'rn:game';

function hasKvEnv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function createKvBackend() {
  // Import diferido: si no hay env vars de KV nunca se requiere el paquete,
  // así que local sin Redis no necesita ni siquiera que @vercel/kv esté
  // configurado (basta con tenerlo instalado, que es requisito de todos modos).
  const { kv } = require('@vercel/kv');

  return {
    async getGame() {
      const game = await kv.get(GAME_KEY);
      return game || null;
    },
    async setGame(game) {
      await kv.set(GAME_KEY, game);
    },
    // SADD-equivalente: devuelve true solo si `clientId` NO estaba en el set
    // (es decir, este es su primer voto en la ronda). Atómico en Redis.
    async markVotedIfNew(roundKey, clientId) {
      const added = await kv.sadd(`rn:voters:${roundKey}`, clientId);
      return added === 1;
    },
    // HINCRBY-equivalente: incremento atómico del contador de una opción.
    async incrVote(roundKey, optionIndex) {
      return kv.hincrby(`rn:votes:${roundKey}`, String(optionIndex), 1);
    },
    async getVoteCounts(roundKey) {
      const raw = await kv.hgetall(`rn:votes:${roundKey}`);
      return raw || {};
    },
    async getVoterCount(roundKey) {
      return kv.scard(`rn:voters:${roundKey}`);
    }
  };
}

function createMemoryBackend() {
  let game = null;
  const voters = new Map(); // roundKey -> Set<clientId>
  const votes = new Map(); // roundKey -> { [optionIndex]: count }

  return {
    async getGame() {
      return game;
    },
    async setGame(g) {
      game = g;
    },
    async markVotedIfNew(roundKey, clientId) {
      let set = voters.get(roundKey);
      if (!set) {
        set = new Set();
        voters.set(roundKey, set);
      }
      if (set.has(clientId)) return false;
      set.add(clientId);
      return true;
    },
    async incrVote(roundKey, optionIndex) {
      let counts = votes.get(roundKey);
      if (!counts) {
        counts = {};
        votes.set(roundKey, counts);
      }
      const key = String(optionIndex);
      counts[key] = (counts[key] || 0) + 1;
      return counts[key];
    },
    async getVoteCounts(roundKey) {
      return votes.get(roundKey) || {};
    },
    async getVoterCount(roundKey) {
      const set = voters.get(roundKey);
      return set ? set.size : 0;
    }
  };
}

let backend = null;
function getBackend() {
  if (!backend) {
    backend = hasKvEnv() ? createKvBackend() : createMemoryBackend();
  }
  return backend;
}

module.exports = {
  usingKv: hasKvEnv,
  getGame: (...args) => getBackend().getGame(...args),
  setGame: (...args) => getBackend().setGame(...args),
  markVotedIfNew: (...args) => getBackend().markVotedIfNew(...args),
  incrVote: (...args) => getBackend().incrVote(...args),
  getVoteCounts: (...args) => getBackend().getVoteCounts(...args),
  getVoterCount: (...args) => getBackend().getVoterCount(...args)
};
