# Lab access administration

The `/admin` navigation initially serves an empty document. It requests the admin page with the signed-in bearer token; the server verifies `/admin/me` before returning any admin markup. Guests, non-admins, invalid sessions, and verification failures see a blank page; the protected page endpoint returns an empty 404 response. The admin UI remains hidden until its own administrator check passes.

The `/admin` page lets administrators search existing accounts by email or username, grant or change complimentary access (30 days, one year, custom local date/time, or indefinitely), revoke grants, and inspect access history. The Account page shows a management link only after `/api/admin/me` confirms administrator permission. Every backend admin endpoint independently checks `lab_admins`; hiding the link is not an authorization control.

## Deployment

1. Apply `013_lab_admin.sql` from Daily-Element-API once, checking for existing columns/tables first. The additive migration must precede deployment. It has already been applied to the database used during implementation, and the requested administrator and legacy grant have been assigned there.
2. Deploy Daily-Element-API with `lab_admin.py`, updated `lab_billing.py`, `app.py`, `streak_freezes.py`, and `elelo_leaderboard.py`.
3. Deploy this frontend, including `/admin`, `lib/admin-proxy.js`, `lib/admin-page.js`, `scripts/admin-entry.js`, and the updated Lab/Account scripts.
4. Sign in with the assigned administrator account and open `/admin` or follow **Manage Lab access** on Account. Existing login sessions work; administrator permission is loaded from the database each request.

The current Railway CLI session requires `railway login` before CLI deployment. Changes are local until deployed.

## Access behavior

A valid Stripe membership or a valid complimentary grant enables every Lab feature, the public Lab badge, ad suppression, and two freeze slots. The grant source is private. The Account page privately labels complimentary access, lists expiry or lifetime access, and hides billing controls when there is no Stripe subscription. Lab replaces its pricing controls with access status and feature links. Expiry/revocation never creates a charge or deletes saved games. It does not consume the account's normal trial eligibility.

Grants are attached to permanent user IDs. The users table contains completed registrations; pending email verification does not create an eligible account. No pending invitations or notification emails are sent by this feature.

Changing a grant replaces its expiry. For a subscription that may still bill, both the UI and API require explicit acknowledgement that granting complimentary access does not cancel billing. Revoking a grant leaves valid paid access intact. Stripe synchronization updates paid fields only. Billing cancellation and payment-failure emails account for complimentary access that remains valid.

Imported manual memberships retain their legacy active fields so the old API continues granting access until deployment. The new API treats an imported grant without a Stripe subscription as complimentary only, so expiry or revocation cannot fall back to those legacy active fields. Original Vault start and expiry are preserved.

## Monitoring and audit

Filters cover paid/trial, active complimentary, complimentary ending in seven days, and ended complimentary grants (expired or revoked). Lists are paginated, 50 users per page. Each card shows its access dates, last daily completion, and Lab feature activity. Successful feature requests are recorded per user and UTC day; requests are not a count of unique sessions or games. Recording begins at backend deployment and does not reconstruct earlier activity. Access history includes actor, action, timestamp, expiry, and private reason, with the latest 100 changes shown per account.

The frontend caches presentation for at most 30 seconds; the ad-status cookie lasts at most 60 seconds. Known access expiry bounds these caches. Protected backend requests always check current entitlement. Existing open pages may retain their presentation until the next check; a revoked grant cannot authorize another protected request.

## Validation

Frontend: `npm run test:admin`, `npm run test:lab`, `npm run test:ads`, `npm run test:assets`.

Backend: `python -m unittest test_lab_admin test_lab_billing test_streak_freezes test_elelo_leaderboard test_game_history`. Admin tests cover authentication, revoked administrator roles, grant changes and revocation, expiry boundaries, paid billing acknowledgement, preservation of paid access and Vault start, audit history, and Stripe synchronization.
