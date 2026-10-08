# Element vault

The vault counts **main daily games only**, starting **October 8, 2026 (inclusive)**. An encounter begins with the first guess; unfinished games count in encounters and win rate. Average guesses uses wins. Tier counts are mutually exclusive, using each element’s highest earned tier.

Set `VAULT_START_DATE=YYYY-MM-DD` on **Daily-Element-API** and restart that service to change the cutoff. Both signed-in and guest views use that API setting. Existing stored history is retained when changing the cutoff. Historical guest games not recorded in this browser cannot be reconstructed.

Deploy the frontend and the backend's updated `app.py` plus new `vault.py`. No database migration is required; the endpoint reads existing `games` data and the hint columns from `003_hints.sql`.

Accounts use authenticated `/vault` API records. Guests store daily records in `elementle_vault_guest_daily_v1`, keyed by puzzle date, and import their currently cached daily game. Guest history stays separate from account history and is not synced across devices. The entrance identity scanner is a visual demo that always succeeds; account data still requires its existing token.

Routes: `/vault`, `/vault/1` through `/vault/118`. Returning from details skips the entrance. Reduced-motion users get immediate access after verification. The skip control also bypasses the animation.

Run `npm run test:vault` for aggregation, cutoff, proficiency thresholds and page coverage.
