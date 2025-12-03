const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const port = Number(process.env.PORT) || 5173;
const host = process.env.HOST || '127.0.0.1';
const root = __dirname;

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const createServer = () => http.createServer(async (req, res) => {
  const safePath = req.url.split('?')[0].replace(/\/+$/, '') || '/';

  if (safePath === '/api/superfrete' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const json = body ? JSON.parse(body) : {};
        const token = process.env.SUPERFRETE_TOKEN;
        if (!token) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Token ausente no ambiente (SUPERFRETE_TOKEN)' }));
          return;
        }
        const response = await fetch('https://api.superfrete.com/api/v0/calculator', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(json),
        });
        const text = await response.text();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(text);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error', detail: error.message }));
      }
    });
    return;
  }

  const filePath = path.join(root, safePath === '/' ? '/index.html' : safePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const start = (p, attempts = 0) => {
  const server = createServer();
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const next = p === 0 ? 0 : Number(p) + 1;
      if (attempts > 15) {
        console.error('Muitas portas em uso. Defina PORT para um valor disponível.');
        process.exit(1);
      }
      console.warn(`Porta ${p} em uso. Tentando ${next || 'aleatória'}...`);
      start(next, attempts + 1);
      return;
    }
    if (err.code === 'EPERM') {
      if (p !== 0 && attempts < 3) {
        console.warn(`Permissão negada na porta ${p}. Tentando porta aleatória...`);
        start(0, attempts + 1);
        return;
      }
      console.error('Sistema não permitiu abrir servidor local. Defina outra porta via PORT ou use outro método de preview (ex: python -m http.server).');
      process.exit(1);
    }
    throw err;
  });
  server.listen(p, host, () => {
    console.log(`Dev server running at http://${host}:${p}`);
  });
};

start(port);
