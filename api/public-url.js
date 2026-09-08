// GET /api/public-url — igual que antes: devuelve la URL pública fija que se
// codifica en el QR y se muestra en la pantalla de lobby del host.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const PORT = process.env.PORT || 3000;
  const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  res.status(200).json({ publicUrl: PUBLIC_URL });
};
