const crypto = require('node:crypto');

const cookieName = 'elementle_ad_session';
const pagePaths = /^\/(?:index\.html|(?:lab|how-to-play|stats|account|about|disclaimer|terms_of_service_and_privacy)(?:\.html)?|analysis|game-history|reset\.html|verify\.html|(?:elements|vault)(?:\/[^/]+)?)?\/?$/;
const sessionId = token => crypto.createHash('sha256').update(token).digest('hex');

module.exports = function registerAdSession(app, { apiBaseUrl, apiKey, now = Date.now }) {
  // Shared API keys keep signatures stable across replicas; an explicit secret
  // can be supplied independently. A restart without either safely invalidates caches.
  const signingKey = process.env.AD_SESSION_SECRET || apiKey || crypto.randomBytes(32);
  const ttl = 60000;
  const sign = value => crypto.createHmac('sha256', signingKey).update('elementle-ad-status-v1:' + value).digest('base64url');
  function encode(value) {
    const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
    return payload + '.' + sign(payload);
  }
  function decode(value) {
    try {
      const [payload, signature, extra] = value.split('.');
      const expected = Buffer.from(sign(payload));
      const actual = Buffer.from(signature || '');
      if (extra || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (data.v !== 1 || !/^[a-f0-9]{64}$/.test(data.id) || !Number.isSafeInteger(data.expires) || ![true, false, null].includes(data.isLab)) return null;
      return data;
    } catch { return null; }
  }
  const options = { httpOnly: true, secure: !(process.env.FRONTEND_BASE_URL || 'https://elementlegame.com').startsWith('http://'), sameSite: 'lax', path: '/', maxAge: 30 * 86400000 };
  async function status(token) {
    const response = await fetch(`${apiBaseUrl}/billing/status`, {
      headers: { Authorization: `Bearer ${token}`, 'X-API-Key': apiKey.trim() },
      signal: AbortSignal.timeout(12000), cache: 'no-store'
    });
    if (!response.ok) throw new Error('Membership unavailable');
    const data = await response.json();
    if (typeof data.isLab !== 'boolean') throw new Error('Invalid membership response');
    return data;
  }
  function sameOrigin(req) {
    if (req.headers['sec-fetch-site'] === 'cross-site') return false;
    if (!req.headers.origin) return true;
    try { return new URL(req.headers.origin).host === req.headers.host; } catch { return false; }
  }
  app.post('/api/ad-session', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!sameOrigin(req)) return res.sendStatus(403);
    const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token || token.length > 3500) return res.sendStatus(401);
    try {
      const data = await status(token);
      let expires = now() + ttl;
      // Never cache beyond a known token or membership expiry. The backend has
      // already authenticated the token; this only shortens the ad-status cache.
      try {
        const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        if (Number.isFinite(claims.exp)) expires = Math.min(expires, claims.exp * 1000);
      } catch {}
      const end = data.status === 'past_due' ? data.paymentGraceUntil : data.status === 'trialing' ? data.trialEnd : data.currentPeriodEnd;
      if (data.isLab && Number.isFinite(end)) expires = Math.min(expires, end * 1000);
      res.cookie(cookieName, encode({ v: 1, id: sessionId(token), isLab: data.isLab, expires }), options);
      res.json({ sessionId: sessionId(token), isLab: data.isLab, expiresAt: expires });
    } catch {
      // Overwrite a previously free cache on failure, so later pages also fail closed.
      res.cookie(cookieName, encode({ v: 1, id: sessionId(token), isLab: null, expires: now() }), options);
      res.status(503).json({ error: 'Unable to verify membership. Ads remain disabled.' });
    }
  });
  app.delete('/api/ad-session', (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!sameOrigin(req)) return res.sendStatus(403);
    const { maxAge, ...clearOptions } = options;
    res.clearCookie(cookieName, clearOptions);
    res.sendStatus(204);
  });
  app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) || !pagePaths.test(req.path)) return next();
    const encoded = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(cookieName + '='));
    let cached = null;
    try { cached = encoded ? decode(decodeURIComponent(encoded.slice(cookieName.length + 1))) : null; } catch {}
    // HTML delivery performs only a local signature/expiry check, never a fetch.
    const verified = Boolean(cached && cached.expires > now() && typeof cached.isLab === 'boolean');
    const state = !encoded ? 'guest' : verified && !cached.isLab ? 'free' : 'blocked';
    const identity = cached?.id || '';
    const expires = cached?.expires || 0;
    const send = res.send;
    res.send = function (body) {
      if (typeof body === 'string' && (res.get('Content-Type') || '').includes('text/html')) {
        res.set('Cache-Control', 'private, no-store');
        res.vary('Cookie');
        const settings = `<meta name="elementle-ad-state" content="${state}" data-session-id="${identity}" data-session-verified="${verified ? 1 : 0}" data-session-expires="${expires}">` +
          (state === 'blocked' ? '\n  <meta id="mediavine-settings" data-blocklist-all="1">' : '');
        body = body.replace('<!-- mediavine-membership-settings -->', () => settings);
      }
      return send.call(this, body);
    };
    next();
  });
};
