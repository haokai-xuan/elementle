# Maintenance deployment branch

Deploy `codex/system-maintenance` for an always-on, Elementle-branded maintenance screen. This branch replaces the normal Node server entry point and never imports the game routes, contacts the Python API, or connects to MySQL. No environment flag or database-health detector is involved.

## Railway

1. Open the **Elementle frontend service**, not the Python API service.
2. Set the service's source branch to `codex/system-maintenance`.
3. Keep the start command as `npm start` (or `node server.js`).
4. If a deployment health check is enabled, set its path to `/healthz`. It returns HTTP 200 with `{"status":"maintenance"}`. All user-facing paths deliberately return HTTP 503, so `/` must not be used as the maintenance health check.
5. Deploy the latest commit from this branch.
6. To reopen the site, switch the source back to `main`, restore the normal health-check setting (main does not provide `/healthz`), and deploy.

All website routes show the maintenance page. All `/api` routes and methods return `503` with `code: MAINTENANCE`. Static game assets and source files are not served. Responses are not cacheable and include `Retry-After: 60`; this is a retry interval, not a promise of a one-minute outage. There are no interactive controls or third-party resources on the page.

An already-open tab may retain previously downloaded UI or local-only gameplay until refreshed, but server requests reaching this deployment are blocked. A frontend-only deployment does not shut down the separately hosted Python API or other clients using it directly. If a CDN caches old pages/assets ahead of Railway, purge that cache when activating maintenance.

Do not merge this branch into `main`: it is a deployment switch. The main checkout's unfinished work is preserved separately.

Test with `node --test scripts/test-maintenance.js`.
