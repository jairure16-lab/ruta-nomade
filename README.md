# Ruta Nómade: Camino al Millón

Juego multijugador en vivo para el cierre de una charla universitaria sobre tendencias del consumidor. Una pantalla de "host" (proyector) guía la partida por 8 decisiones de marketing y 3 eventos aleatorios, mientras el público vota en vivo desde el celular escaneando un QR, tratando de llevar a una cafetería ficticia (Ruta Nómade) de $50.000 a $1.000.000 de valor de mercado sin quebrar.

## Arquitectura

La app corre como funciones **serverless en Vercel** (`api/*.js`) en vez de un servidor Node persistente: no hay WebSockets ni estado en memoria de proceso a nivel de producción, porque cada invocación de una función puede caer en una instancia distinta.

- **Transporte**: el cliente (`public/js/host.js`, `public/js/player.js`) hace `fetch('/api/state')` cada 1.2s (polling corto, ver `startPolling` en `public/js/common.js`) en vez de escuchar un evento de socket.io. Cada acción (votar, iniciar, cerrar votación, siguiente, reset) hace un POST y después un fetch inmediato de `/api/state` para que la UI se sienta responsiva sin esperar el próximo tick.
- **Estado**: vive en `lib/store.js`, con una sola interfaz async (`getGame`, `setGame`, `markVotedIfNew`, `incrVote`, `getVoteCounts`, `getVoterCount`) usada tal cual desde `api/*.js`. Detrás de esa interfaz hay dos backends intercambiables:
  - **Vercel KV** (Redis administrado vía Upstash, paquete `@vercel/kv`) cuando existen las variables de entorno `KV_REST_API_URL` y `KV_REST_API_TOKEN` — el caso de producción.
  - **Memoria de proceso** (Map/Set) cuando esas variables no están seteadas — el caso por defecto en local, sin depender de Redis real.
  
  El dedupe de "este `clientId` ya votó esta ronda" usa el equivalente de `SADD` (atómico), y el conteo de votos por opción usa el equivalente de `HINCRBY` (atómico) — nunca un "leer conteo, sumar, escribir" no atómico.
- **Lógica de juego**: `lib/game.js` es un port directo de la lógica que antes vivía en el `server.js` original (secuencia de 8 decisiones + 3 eventos random sin repetir después de rondas 2/4/6, cálculo de caja/valor, bancarrota, éxito/estancada, empates al azar, `publicState()`). No cambió ni una regla de negocio — solo pasó de operar sobre una variable global `game` a recibir/devolver un objeto `game` explícito, que `api/*.js` persiste vía `lib/store.js` entre invocaciones.
- **Contenido** (`data/content.js`): sin cambios.
- **Frontend visual** (`public/css/style.css`, estructura de `host.html`/`player.html`, render en `host.js`/`player.js`): sin cambios de diseño ni de render — solo cambió cómo se obtiene el estado y cómo se mandan las acciones.

## Correr en local

```bash
npm install
npm run dev
```

(`npm start` hace exactamente lo mismo — es el mismo comando bajo dos nombres.)

Esto levanta `server.js`, un servidor Express **local** que sirve `public/` tal cual y monta los mismos módulos de `api/*.js` como rutas (no hay lógica duplicada). Se eligió este camino en vez de `vercel dev` por una razón concreta: `vercel dev` levanta cada función en un proceso más aislado, y el store en memoria (fallback sin Redis) necesita vivir en un único proceso Node para que `/api/state` y `/api/vote` compartan el mismo `Map`/`Set`. Con `server.js` eso queda garantizado. Si en algún momento se quiere probar contra Vercel KV real desde la laptop, se puede usar `vercel dev` con `KV_REST_API_URL`/`KV_REST_API_TOKEN` seteadas (por ejemplo con `vercel env pull`) — el mismo código de `lib/store.js` detecta esas variables y usa el backend de KV automáticamente, sin tocar nada.

El servidor arranca en el puerto `3000` por defecto (`http://localhost:3000`) y al arrancar imprime qué store está usando (`memoria de proceso` o `Vercel KV`).

Para simular varios jugadores desde una sola máquina: abrí `http://localhost:3000` en una pestaña y elegí "Somos el equipo" (queda como host en `/host.html`), y en otras pestañas — idealmente en modo incógnito o navegadores distintos, porque el rol y el `clientId` se guardan en `localStorage` — elegí "Soy del público" (`/player.html`) para cada jugador simulado.

Para reiniciar el rol guardado en una pestaña (por ejemplo, para volver a elegir host/jugador), hay que borrar `localStorage` de ese origen o abrir una ventana de incógnito nueva.

## Variables de entorno

- `PORT` — puerto donde escucha `server.js` en local. Por defecto `3000`. No aplica en Vercel (las funciones serverless no escuchan un puerto).
- `PUBLIC_URL` — URL pública fija que se codifica en el QR (`/qr.png` → `api/qr.js`) y se muestra como texto en la pantalla de lobby del host. En local, si no se define, cae por defecto a `http://localhost:PORT`. En producción hay que setearla a la URL real donde el público pueda acceder (ver despliegue en Vercel abajo).
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — credenciales de Vercel KV / Upstash Redis. Se inyectan automáticamente al conectar el storage desde el dashboard de Vercel (ver abajo); **no hace falta setearlas a mano**. Si no están presentes, `lib/store.js` cae solo al store en memoria.

## Desplegar en Vercel

1. En [vercel.com](https://vercel.com), **Add New → Project** y conectá este repositorio de GitHub (`jairure16-lab/ruta-nomade`). Vercel detecta que es un proyecto Node con carpeta `api/` y sirve `public/` como estáticos automáticamente — no hace falta configurar build command ni output directory.
2. Desplegar una primera vez sin `PUBLIC_URL` (o con cualquier valor provisorio). Vercel va a asignar una URL fija tipo `https://ruta-nomade.vercel.app`.
3. Ir a la pestaña **Storage** del proyecto en el dashboard de Vercel → **Connect Database** (o **Create Database**) → elegir **Upstash for Redis** (aparece también como "Vercel KV" en algunos planes). Seguir el flujo de creación/conexión — esto lo tiene que hacer el usuario a mano desde el dashboard, no se puede hacer por API/CLI desde acá.
4. Al conectar el storage, Vercel inyecta automáticamente `KV_REST_API_URL` y `KV_REST_API_TOKEN` (y alguna variable más de Upstash) como variables de entorno del proyecto — no hay que copiarlas ni pegarlas a mano.
5. Ir a **Settings → Environment Variables** y agregar `PUBLIC_URL` con el valor exacto de la URL que asignó Vercel en el paso 2 (por ejemplo `https://ruta-nomade.vercel.app`, sin barra final).
6. Hacer un **redeploy** (desde la pestaña Deployments, "Redeploy" en el último deploy) para que las funciones levanten con `PUBLIC_URL` y las variables de KV ya disponibles — si no se redespliega después de conectar el storage o setear `PUBLIC_URL`, el QR sigue apuntando a `localhost` y/o el juego no encuentra Redis.
7. Verificar abriendo `/qr.png` y `/api/public-url` en la URL de Vercel: el link mostrado en la pantalla de host debe coincidir con la URL pública real, no con `localhost`.

Nota: con Vercel KV conectado, el estado de la partida sobrevive entre invocaciones de distintas funciones y distintas instancias (a diferencia de un servidor en memoria). Igual conviene, para el evento en vivo, apretar "Reiniciar" desde el host justo antes de empezar, para arrancar con un `gameId` limpio.

### Alternativa: Render (servidor persistente con Socket.io)

La arquitectura original de este proyecto (antes de esta migración) era un servidor Express + Socket.io con estado en memoria, pensada para desplegarse en Render como Web Service persistente. Esa versión sigue siendo válida como alternativa si en algún momento se prefiere volver a un servidor con estado, pero implicaría revertir esta migración (los endpoints hoy son REST + polling, no eventos de socket). No se documentan los pasos acá porque el despliegue actual apunta a Vercel; si hace falta retomar esa ruta, el historial de git anterior a esta migración tiene el `server.js` original con Socket.io.
