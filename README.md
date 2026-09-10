# Ruta Nómade: Camino al Millón

Juego multijugador en vivo para el cierre de una charla universitaria sobre tendencias del consumidor. Una pantalla de "host" (proyector) guía la partida por 8 decisiones de marketing y 3 eventos aleatorios, mientras el público vota en vivo desde el celular escaneando un QR, tratando de llevar a una cafetería ficticia (Ruta Nómade) de $50.000 a $1.000.000 de valor de mercado sin quebrar.

## Correr en local

```bash
npm install
npm start
```

El servidor arranca en el puerto `3000` por defecto (`http://localhost:3000`).

Para simular varios jugadores desde una sola máquina: abrí `http://localhost:3000` en una pestaña y elegí "Somos el equipo" (queda como host en `/host.html`), y en otras pestañas — idealmente en modo incógnito o navegadores distintos, porque el rol y el `clientId` se guardan en `localStorage` — elegí "Soy del público" (`/player.html`) para cada jugador simulado. El estado del juego vive en memoria en el servidor: todos los clientes conectados ven la misma partida en tiempo real vía Socket.io.

Para reiniciar el rol guardado en una pestaña (por ejemplo, para volver a elegir host/jugador), hay que borrar `localStorage` de ese origen o abrir una ventana de incógnito nueva.

## Variables de entorno

- `PORT` — puerto donde escucha el servidor. Por defecto `3000`.
- `PUBLIC_URL` — URL pública fija que se codifica en el QR (`/qr.png`) y se muestra como texto en la pantalla de lobby del host. En local, si no se define, cae por defecto a `http://localhost:PORT`. En producción hay que setearla a la URL real donde el público pueda acceder (ver despliegue en Render abajo).
- `HOST_PIN` — código requerido para controlar la pantalla de host. Para esta presentación es `0101`; configurarlo en Render evita que el público pueda avanzar o reiniciar la partida.

## Desplegar en Render

1. Crear un **Web Service** nuevo en Render, conectado a este repositorio de Git.
2. **Build command**: `npm install`
3. **Start command**: `npm start`
4. Desplegar una primera vez sin `PUBLIC_URL` (o con cualquier valor provisorio). Render va a asignar una URL fija tipo `https://ruta-nomade.onrender.com`.
5. Una vez que Render asignó esa URL, ir a **Environment** en el dashboard del servicio y agregar las variables `PUBLIC_URL` con el valor exacto de esa URL (por ejemplo `https://ruta-nomade.onrender.com`, sin barra final) y `HOST_PIN` con `0101`.
6. Hacer un **redeploy manual** (o esperar a que el cambio de variable dispare uno automático) para que el servidor levante con el `PUBLIC_URL` correcto — si no se redespliega después de setear la variable, el QR sigue apuntando a `localhost`.
7. Verificar abriendo `/qr.png` y `/api/public-url` en la URL de Render: el link mostrado en la pantalla de host debe coincidir con la URL pública real, no con `localhost`.

Nota: el estado del juego es enteramente en memoria (no hay base de datos), así que un reinicio del servicio en Render (deploy, restart, o el plan free "durmiendo" por inactividad) reinicia la partida. Para el evento en vivo, conviene tener el servicio "despierto" un rato antes de empezar.
