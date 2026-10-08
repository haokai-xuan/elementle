Freeplay: `/?mode=freeplay`. Resume the active round on reload; after a win or eight guesses, choose Next random element. Consecutive rounds exclude the previous element.

Lab archives: calendar on the stats page, beginning July 21, 2026. Only saved past dates are enabled. An archive attempt can be resumed; once completed it can only be viewed. Accounts persist across devices; guests use a browser UUID (clearing browser storage creates a new guest identity).

Practice requests go through `/api/practice/{archives,start,guess}` to the Flask API. Games live exclusively in `practice_games`, never daily games, guesses, user counters or guess distributions. Guest requests forward X-Guest-ID; authenticated requests forward the JWT.

Database migration `Daily-Element-API/002_practice.sql` has been applied. All 79 dates from July 21 through October 7 were verified present. Deploy both repositories and ensure the daily scheduler runs the updated `generate_element.py`: history is retained indefinitely, with an 80-calendar-day exclusion window and a MySQL advisory lock for retry-safe generation. No historical answers were synthesized.

Validation: JavaScript syntax checks, existing 118-page audit, and live Flask/MySQL checks for archive bounds/resume/completion, eight-guess loss, new Freeplay rounds and guest ownership. Browser checked calendar loading and Freeplay through the Node proxy. Production code has not been deployed.

Local development: `npm run dev` starts the sibling Daily-Element-API Python environment on port 8000 and the website on port 3000. Optional overrides: LOCAL_API_DIR, LOCAL_API_PYTHON, LOCAL_API_PORT and PORT. `npm start` remains the production entry point, using API_BASE_URL. A missing deployed practice route now returns an explicit 503 deployment message instead of a JSON parsing 502.

Mode refinements: the calendar routes the player’s local current date to `/`; only earlier dates open archive attempts. The API accepts localDate for archive bounds and guessNumber for idempotent retries. Practice guesses render immediately, persist locally, and synchronize in order; interrupted saves expose Retry and resume after reload. New Freeplay rounds use the existing page rather than reloading. Background SVG lab scenery is decorative, pointer-transparent, and respects reduced motion.

Archive calendars render owner-scoped cached dates and local progress immediately on return navigation. Back/forward-cache restoration, tab focus, visibility changes and cross-tab storage events trigger background refreshes. Server responses cannot erase newer local archive progress. Regression checks: `npm run test:archives` and `npm run test:stats`.
