// server.js — servidor local mínimo para probar antes de pushear a Vercel.
//
// Por qué existe esto en vez de solo usar `vercel dev`: `vercel dev` es más
// fiel a producción, pero levanta cada función de api/*.js en su propio
// proceso aislado — el store en memoria (lib/store.js sin KV_REST_API_URL)
// necesita vivir en UN solo proceso Node para que /api/state y /api/vote vean
// el mismo Map/Set. Este server.js es Express puro: sirve public/ tal cual
// (sin cambios) y monta los MISMOS módulos de api/*.js como rutas — el código
// de negocio es exactamente el mismo, no hay una copia local distinta.
//
// Si en algún momento el usuario prefiere probar contra Vercel KV real desde
// local, puede correr `vercel dev` con KV_REST_API_URL/KV_REST_API_TOKEN
// seteadas (o vinculadas via `vercel env pull`) y el mismo código en
// lib/store.js usará el backend de KV automáticamente, sin tocar nada.

const path = require('path');
const express = require('express');

const stateHandler = require('./api/state');
const voteHandler = require('./api/vote');
const publicUrlHandler = require('./api/public-url');
const qrHandler = require('./api/qr');
const hostStartHandler = require('./api/host/start');
const hostCloseVoteHandler = require('./api/host/close-vote');
const hostNextHandler = require('./api/host/next');
const hostResetHandler = require('./api/host/reset');

const store = require('./lib/store');

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/state', stateHandler);
app.post('/api/vote', voteHandler);
app.get('/api/public-url', publicUrlHandler);
app.get('/qr.png', qrHandler);
app.post('/api/host/start', hostStartHandler);
app.post('/api/host/close-vote', hostCloseVoteHandler);
app.post('/api/host/next', hostNextHandler);
app.post('/api/host/reset', hostResetHandler);

app.listen(PORT, () => {
  console.log(`Ruta Nómade (local) escuchando en puerto ${PORT}`);
  console.log(`PUBLIC_URL configurada como: ${PUBLIC_URL}`);
  console.log(`Store: ${store.usingKv() ? 'Vercel KV (Upstash Redis)' : 'memoria de proceso (fallback local, sin Redis)'}`);
});
