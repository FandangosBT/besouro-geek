const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.SUPERFRETE_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'Token ausente no ambiente (SUPERFRETE_TOKEN)' });
    return;
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const upstream = await fetch('https://api.superfrete.com/api/v0/calculator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload || {}),
    });

    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error', detail: error.message });
  }
};
