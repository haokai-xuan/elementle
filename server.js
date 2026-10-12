// This branch intentionally serves maintenance only. Deploy main to restore Elementle.
require('dotenv').config();
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
app.disable('x-powered-by');
const maintenancePage = fs.readFileSync(path.join(__dirname, 'maintenance.html'), 'utf8');

app.use((req, res) => {
  res.set({
    'Cache-Control': 'no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  });

  // Railway must see a healthy maintenance deployment, even while MySQL is down.
  if (req.path === '/healthz' && ['GET', 'HEAD'].includes(req.method)) {
    return res.status(200).json({ status: 'maintenance' });
  }

  res.set('Retry-After', '60');
  if (req.path === '/api' || req.path.startsWith('/api/')) {
    return res.status(503).json({
      error: 'Elementle is undergoing maintenance. Please check back soon.',
      code: 'MAINTENANCE',
      maintenance: true
    });
  }
  // No static files, game code, authentication callbacks, or upstream APIs are served.
  return res.status(503).type('html').send(maintenancePage);
});

if (require.main === module) {
  const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Elementle maintenance server listening on port ${server.address().port}`);
  });
}
module.exports = app;
