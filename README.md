Game built to practice HTML, CSS, JS.

Guess the daily mystery element.

Deployed at: https://elementlegame.com/

Bandwidth optimizations:

- Express compresses HTML, JavaScript, CSS and JSON with gzip when supported by the client.
- Public images have a one-day browser cache; scripts, styles and catalogs revalidate on each visit so deployments stay current.
- Pages use a 216px WebP Lab icon and 320px WebP elBot frames (twice their largest display size). Original PNGs remain as source assets. Analysis loads animation frames only for the current mood, and skips animation downloads for reduced motion.
- Only public asset directories and documents are served; repository files and preview artifacts are excluded.

On Railway, if the API and frontend share a project and environment, set the frontend's `API_BASE_URL` to `http://<api-service>.railway.internal:<api-port>` using the API service's actual name and listening port. This keeps proxy traffic on Railway's private network without egress fees. Keep the API's public URL for mobile clients and other external consumers. See [Railway private networking](https://docs.railway.com/networking/private-networking).

After starting the server, run `node scripts/audit-delivery.js` to check compression, cache headers, conditional image requests and public routes. Set `TEST_BASE_URL` to test a different server.

Mediavine installation:

- `lib/page-template.js` includes the standard executable async Mediavine wrapper in the HTML `<head>` of every rendered page, including reset and verification pages. Generated element and Vault pages inherit it.
- `lib/ad-session.js` reads a signed, 60-second membership result locally before sending HTML. It never contacts billing while serving a page. Lab members and expired, invalid, or unknown sessions receive Mediavine's non-expiring `data-blocklist-all="1"` setting before its static wrapper.
- The Secure, HttpOnly, SameSite=Lax cookie contains only a token fingerprint, membership result, and expiry, signed with HMAC-SHA256. It contains no bearer token and never authorizes paid game features. `AD_SESSION_SECRET` optionally provides a signing key; otherwise the existing server-side `API_KEY` is used. Without either, a process-local key safely invalidates caches on restart. Replicas should share a key. Set `FRONTEND_BASE_URL` to an HTTP localhost URL for local cookie tests; production defaults to secure cookies.
- `scripts/ad-guard.js` is embedded inline before the wrapper. Unknown signed-in visitors start ad-free. Verification runs through `/api/ad-session` after DOM readiness and refreshes when the 60-second result expires. Guests and fresh cached sessions need no initial request. Routine checks do not reload pages; initially unknown free visitors get one reload to enable ads through the static wrapper. Confirmed subscribers remain on the current page. Failed checks keep ads disabled. Blocked cookies cannot cause reload loops.
- Membership changes are briefly cached for at most 60 seconds (and never beyond a known token or subscription expiry). Verified upgrades and Stripe-return/account-change events force a refresh. The browser synchronizes login/logout, account changes, and restored pages. Backend paid-feature authorization is unchanged.
- Personalized HTML uses `Cache-Control: private, no-store` and varies on cookies so a CDN cannot share subscriber-specific settings. Neither guests nor signed-in HTML requests wait on a billing lookup.
- With the server running, use `node scripts/audit-mediavine.js` (or set `TEST_BASE_URL`) to check all 251 guest page routes. Run `npm run test:ads` for subscriber session/blocklist tests and `npm run test:lab` for paid-feature access checks.
- Deploying restarts the server and rebuilds its HTML templates. Purge any separately configured CDN HTML cache after deployment. Mediavine still performs its normal live installation review.
