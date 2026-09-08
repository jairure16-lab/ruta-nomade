// GET /api/qr — genera el PNG del QR apuntando a PUBLIC_URL. vercel.json
// reescribe /qr.png -> /api/qr para que el <img src="/qr.png"> del host.html
// existente siga funcionando sin tocarlo. En local, server.js monta esto
// directo en /qr.png.
const QRCode = require('qrcode');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  const PORT = process.env.PORT || 3000;
  const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  try {
    const buf = await QRCode.toBuffer(PUBLIC_URL, { width: 500, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(buf);
  } catch (err) {
    res.status(500).end();
  }
};
