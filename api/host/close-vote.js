// POST /api/host/close-vote — equivalente a host:closeVote. Lee los conteos
// finales de la ronda desde el store y los pasa a closeVoting().
const store = require('../../lib/store');
const { closeVoting, roundKeyFor } = require('../../lib/game');
const { getOrInitGame } = require('../../lib/get-or-init-game');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  try {
    const game = await getOrInitGame();
    if (game.phase === 'voting') {
      const roundKey = roundKeyFor(game);
      const rawCounts = await store.getVoteCounts(roundKey);
      closeVoting(game, rawCounts);
      await store.setGame(game);
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
};
