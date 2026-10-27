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
