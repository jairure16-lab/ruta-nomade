// GET /api/state — equivalente al payload que antes viajaba por el evento
// 'state' de socket.io. El cliente (host.js / player.js) hace polling de esto.
const store = require('../lib/store');
const { publicState, roundKeyFor } = require('../lib/game');
const { getOrInitGame } = require('../lib/get-or-init-game');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  try {
    const game = await getOrInitGame();
    let voteCount = 0;
    if (game.phase === 'voting') {
      voteCount = await store.getVoterCount(roundKeyFor(game));
    }
    res.status(200).json(publicState(game, { voteCount }));
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
};
