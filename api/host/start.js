// POST /api/host/start — equivalente a host:start.
const store = require('../../lib/store');
const { advanceStep } = require('../../lib/game');
const { getOrInitGame } = require('../../lib/get-or-init-game');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  try {
    const game = await getOrInitGame();
    if (game.phase === 'lobby') {
      advanceStep(game);
      await store.setGame(game);
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
};
