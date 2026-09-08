// POST /api/host/reset — equivalente a host:reset. Genera un gameId nuevo
// (freshGame()), lo que también hace que los roundKeys de la partida anterior
// queden huérfanos en el store (nunca se reutilizan, así que no interfieren).
const store = require('../../lib/store');
const { freshGame } = require('../../lib/game');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  try {
    const game = freshGame();
    await store.setGame(game);
    res.status(200).json({ ok: true, gameId: game.gameId });
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
};
