// POST /api/vote  { clientId, optionIndex }
// Aplica el voto de forma atómica: dedupe de clientId vía markVotedIfNew
// (SADD-equivalente) que decide si el incremento del conteo sucede o no. No
// hay ventana de "leer si ya votó, después escribir": el propio store
// resuelve esa carrera.
const store = require('../lib/store');
const { DECISIONS, roundKeyFor } = require('../lib/game');
const { getOrInitGame } = require('../lib/get-or-init-game');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = req.body || {};
  const { clientId, optionIndex } = body;
  if (!clientId || typeof clientId !== 'string' || typeof optionIndex !== 'number') {
    res.status(400).json({ error: 'invalid payload' });
    return;
  }

  try {
    const game = await getOrInitGame();
    if (game.phase !== 'voting') {
      res.status(409).json({ error: 'not voting' });
      return;
    }

    const decision = DECISIONS[game.currentDecisionIndex];
    if (optionIndex < 0 || optionIndex >= decision.options.length) {
      res.status(400).json({ error: 'invalid option' });
      return;
    }

    const roundKey = roundKeyFor(game);
    const isNewVoter = await store.markVotedIfNew(roundKey, clientId);
    if (!isNewVoter) {
      // Ya había votado esta ronda: se ignora en silencio (idempotente).
      res.status(200).json({ ok: true, alreadyVoted: true });
      return;
    }

    await store.incrVote(roundKey, optionIndex);
    res.status(200).json({ ok: true, gameId: game.gameId, optionIndex });
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
};
