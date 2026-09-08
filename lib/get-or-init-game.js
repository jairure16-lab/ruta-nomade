// Pequeño helper compartido por todos los handlers de api/*.js: obtiene la
// partida actual del store, o la crea si es la primera invocación (proceso
// serverless recién frío, o primera vez que se toca el store en memoria).
const store = require('./store');
const { freshGame } = require('./game');

async function getOrInitGame() {
  let game = await store.getGame();
  if (!game) {
    game = freshGame();
    await store.setGame(game);
  }
  return game;
}

module.exports = { getOrInitGame };
