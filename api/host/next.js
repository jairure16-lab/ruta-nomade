// POST /api/host/next — equivalente a host:next.
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
    if (game.phase === 'reveal' || game.phase === 'event') {
      advanceStep(game);
      await store.setGame(game);
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
};
