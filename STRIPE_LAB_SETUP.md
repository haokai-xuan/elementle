# Elementle Lab setup

Elementle Lab uses Stripe-hosted Checkout and the Stripe customer portal. Prices are $1.99 USD/month and $17.99 USD/year (about $1.50/month; 24.7% savings, rounded to 25%). The first subscription per Elementle account includes a seven-day free trial. A payment method is required; cancellation before the trial ends avoids the first charge.

Lab explicitly sets `managed_payments[enabled]=false` for Checkout. This uses standard Stripe Billing even if the account defaults to Managed Payments, keeping the card-only payment setting, custom recovery schedule, and Elementle email flow compatible. You do not need to change the account-wide Managed Payments setting.

For fully local testing, start the API on port 8000 and set the website's `API_BASE_URL=http://127.0.0.1:8000`; restart the website after changing it. Set the API's `FRONTEND_BASE_URL=http://localhost:3000` for local Checkout/portal return URLs. Opening localhost alone does not select the local API: a Railway `API_BASE_URL` still sends billing requests to Railway. Forward Stripe test webhooks to `localhost:8000/billing/webhook` using Stripe CLI and use its signing secret on the local API.

## Deploy and configure

1. Run `008_lab.sql`, then `009_lab_billing_details.sql`, against the **Daily-Element-API MySQL database** before deploying the API. This creates billing accounts, an event deduplication table, and the durable email outbox. Check the target database first and apply only migrations that are not already present; do not rerun either migration. No existing account gets a paid membership automatically.
2. Deploy the updated API (`app.py`, `streak_freezes.py`, `lab_billing.py`, `lab_emails.py`, `lab_email_worker.py`, and `assets/lab_icon.png`) and this website. There are no new package dependencies; the API uses its existing `requests` library and pins Stripe requests to API version `2025-06-30.basil`.
3. In Stripe's sandbox/test environment, create a product named **Elementle Lab**, with two recurring flat-rate prices: **USD 1.99 every month** and **USD 17.99 every year**, each with interval count 1. Use the real Price IDs (`price_…`), not Product IDs or Payment Links. Disable optional adjustable quantities and do not add another trial in a separate Payment Link. The API supplies the trial itself.
4. Add these environment variables to **Daily-Element-API**, never browser code:
   - `STRIPE_SECRET_KEY`: the test secret API key (`sk_test_…`).
   - `STRIPE_LAB_MONTHLY_PRICE_ID`: the monthly Price ID.
   - `STRIPE_LAB_YEARLY_PRICE_ID`: the yearly Price ID.
   - `STRIPE_WEBHOOK_SECRET`: the signing secret for the webhook below (`whsec_…`).
   - `FRONTEND_BASE_URL`: `https://elementlegame.com`, or your local frontend URL for testing.
   The website keeps its existing `API_BASE_URL` and `API_KEY`; it needs no Stripe secret or publishable key. Reusing the existing frontend URL is sufficient.
5. In Stripe Workbench → Webhooks, add a **snapshot event destination** pointing directly to `https://YOUR-API-HOST/billing/webhook`. Use the Flask API hostname, not the website hostname. This endpoint bypasses the site's API key and verifies Stripe's signature over the raw body. Choose the stable webhook API version `2026-09-30.endive` (not Preview). Stripe may only offer the current stable version in this dashboard. The webhook reads event identity/customer fields, then retrieves current billing resources using the explicitly pinned `2025-06-30.basil` request version; the destination version does not change that request header. Subscribe to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `customer.updated`
   - `payment_method.updated`
   - `invoice.updated`
   - `invoice.paid`
   - `invoice.payment_failed`
   Copy this destination's signing secret to `STRIPE_WEBHOOK_SECRET`. Stripe CLI forwarding uses a different signing secret.
6. Configure and activate Stripe's **customer portal**. Enable payment-method updates, invoice history, and cancellation. Set cancellation at the end of the billing period so paid members retain the time they purchased. If enabling plan switching, restrict it to the two Lab prices and choose your proration behavior. Use `https://elementlegame.com/account` as the return URL. The account page includes separate **Update payment method** and **Manage billing** buttons. The method-update button opens the Stripe portal directly into its payment-method flow. Customer default-payment-method changes are synchronized to the Lab subscription so renewals use the newly selected method. The site creates authenticated portal sessions; do not substitute a public portal login link.
7. In **Billing → Revenue recovery → Retries**, disable Smart Retries and configure a **custom schedule with exactly one retry, 3 days after the first failure**. Remove additional retries. Set the final outcome to **mark the subscription unpaid** so the user can recover the outstanding payment; access is revoked after the retry fails. Do not configure immediate cancellation after the first failure. Changes apply to future retries. New Lab Checkout sessions accept card payments to use this retry policy.
8. Configure your business details, statement descriptor, branding, support email, and terms/privacy URLs. Elementle sends its own activation, cancellation, trial reminder, and payment-failure emails; disable duplicate Stripe trial-reminder/dunning emails if you want only the Elementle versions (Stripe receipts can stay enabled). `customer.subscription.trial_will_end` triggers the Elementle reminder three days before trial end. A reminder is skipped for canceled trials.
9. Ensure `RESEND_API_KEY` is set and `EMAIL_FROM` uses a sender on your verified Resend domain, e.g. `Elementle <noreply@elementlegame.com>`. These are the same variables the API already uses for account emails.
10. Create a **separate worker service from Daily-Element-API**, with the same DB, Stripe, frontend URL, Resend, and sender environment as the API. Its start command is `python lab_email_worker.py`. It drains pending emails every minute, safely locks messages across multiple workers, and retries failures with backoff. Alternatively, on Railway schedule `python lab_email_worker.py --once` every five minutes (`*/5 * * * *`); Railway cron runs must be at least five minutes apart. Do not run it as a second web server. Without a worker, emails are queued but not delivered. Monitor worker failures and pending outbox rows; the API continues processing subscription updates if Resend is down.

## Test before accepting payments

- Sign in to a test Elementle account and visit `/lab`. Checkout must show a 7-day trial and exactly the selected recurring price, with a payment method collected. Use Stripe's documented test card `4242 4242 4242 4242`, any future expiry, and any CVC in test mode only.
- Return from checkout and confirm the account shows **Lab free trial active**. A signed webhook or the authenticated status refresh grants access; the success URL alone cannot grant membership.
- Confirm archives, freeplay, vault, and elBot analysis work, the freeze capacity is 2, and the browser makes no Mediavine ad-script request. Guests and free accounts should receive 401/402 on protected API endpoints and have one freeze slot.
- Reopen Checkout while subscribed: the API must direct you to manage the existing subscription. Repeated checkout clicks reuse an open session; changing plans expires the old session.
- Cancel through Manage subscription and verify the cancellation date. Test immediate cancellation in Stripe too: access must be revoked. Test trial expiry and failed payments with Stripe test clocks where applicable. On the first failed invoice, confirm Lab and its two freeze slots remain active for three days, and a comprehensive branded email is queued/delivered. Advance the clock to the configured retry, simulate failure, and confirm access and capacity are reduced; settle the invoice and confirm access is restored. Check that recovery before the retry and older failure events cannot reopen a grace window or remove paid access. Resubscribing to the same account must not grant another trial.
- Replay a webhook: it should return 200 without double-processing. Deliver an older event after a newer one: current Stripe state must win. Tampered or unsigned webhooks must return 400. Check Workbench for successful deliveries.
- Verify the customer portal works in both test and live mode; each environment has separate configuration.

## Go live

Activate the Stripe account, create the same product/prices in live mode, configure the live portal and live webhook destination, then replace the four Stripe environment variables with live values and redeploy the API. Keep test and live keys, prices, and webhook secrets paired. If testing against an existing production database, use separate test Elementle accounts and clear their `lab_accounts`/`lab_stripe_events` test records before live use; test Customer IDs cannot be used with live keys. Prefer a separate test database.

Stripe Tax is not enabled automatically by this integration. If you want Stripe to calculate and collect tax, configure registrations/tax settings and add `automatic_tax[enabled]=true` plus any required address-collection/customer-update fields to the Checkout request before launch. Set your two Price tax behaviors consistently. No taxes are added by the current code.

## Behavior and maintenance

- An account is a Lab member while its stored Stripe subscription is `active` or `trialing` with unexpired access, or while its subscription is `past_due` with one failed attempt and an unexpired three-day grace window. A second scheduled failure or `unpaid` status revokes access immediately. An unrecovered invoice also loses access when its grace deadline passes, even if retry webhooks are delayed. Status is read from the database, never from local storage, email matching, or a JWT membership claim.
- Billing status: `GET /billing/status` (website proxy `/api/billing/status`). `?refresh=1` reconciles with Stripe and is used on the subscription and account pages to recover delayed webhooks.
- Membership updates read the latest Stripe subscription state under an account lock; retries and out-of-order events are safe. Failed processing returns 503 so Stripe retries. Monitor webhook delivery failures and resend them in Workbench after outages. An outage extending past the stored access/grace period can temporarily suspend access until renewal sync succeeds.
- The account page displays subscription status, monthly/yearly price, the next billing date (or no upcoming renewal when canceled), and only masked payment details (brand, last four digits, expiry). Full card numbers and CVCs are never requested or stored by Elementle.
- Billing emails share one Elementle dark/green template, Lab icon, text fallback, account-management link, and support contact. They are queued in the same transaction as verified billing state. Stable notification keys prevent repeated webhook/status refresh emails; the worker uses Resend idempotency keys as protection during delivery retries. Resend keys expire after 24 hours; a crash after sending but before recording delivery can still cause a duplicate if retried more than 24 hours later.
- Stripe controls the actual charge attempts. Hard declines or missing payment methods may prevent a retry from executing until the user updates the method. The failure email explains this; the app still limits grace to three days. The API does not make an extra manual charge, so it cannot double-charge alongside Stripe's retry.
- Trial use is recorded from actual Stripe subscriptions, not checkout clicks. The limit is per Elementle account. Creating another account is not detected as the same person.
- Free capacity is one and Lab capacity is two; becoming a member adds capacity, not a free freeze. Downgrading clamps any stored balance of two to one on the next daily game/stats reconciliation. Existing free accounts previously able to store two freezes will follow the new one-slot rule.
- Guests can still play the main daily game. Saved daily results continue accumulating and can be viewed in the vault after subscribing. Practice progress and daily stats remain separate.
- Logged-in visitors whose membership cannot be verified do not load ads; free visitors load the existing ad tag after membership resolution. Logging in/out after ads have loaded reloads the page to apply the new account status.

Official references: [fixed retry schedules](https://docs.stripe.com/billing/revenue-recovery/smart-retries), [Resend delivery idempotency](https://resend.com/docs/api-reference/emails/send-email), [Checkout trials](https://docs.stripe.com/payments/checkout/free-trials), [subscription states](https://docs.stripe.com/api/subscriptions/object), [webhook verification](https://docs.stripe.com/events/manage-webhook-endpoints), [customer portal](https://docs.stripe.com/customer-management).

Billing emails embed the bundled `assets/lab_icon.png` as an inline CID attachment through Resend. Include that asset when deploying both API and worker. It is a 128px export of the website Lab icon, displayed at 64px; no public image URL is needed. Existing queued messages keep their original template and payload to preserve delivery idempotency.


## Checkout branding

New Checkout Sessions use Elementle Lab as the brand name, background #191919, button #538d4e, Inter font, and rounded controls. Checkout text lists all six Lab benefits, the selected Monthly/Yearly plan, its billing cadence, automatic renewal/cancellation terms, and a seven-day trial only for eligible accounts. The yearly equivalent is about $1.50/month, billed $17.99 once per year. Existing open sessions with older styling are expired and replaced on the next checkout request.

For the small icon, use Stripe's icon field (not its logo field or a product image). Stripe controls its displayed size; hosted Checkout does not support arbitrary CSS.

- Recommended: grant **Files: Write** temporarily on the restricted Stripe key so the bundled `assets/lab_icon.png` can be uploaded with purpose `business_icon`. Set the returned `file_…` ID as `STRIPE_LAB_ICON_FILE_ID` on the API. Files permission is not needed to create future sessions once uploaded, so it can then be removed. Test and live mode use their own file IDs.
- Dashboard alternative: open https://dashboard.stripe.com/settings/branding/checkout, upload `assets/lab_icon.png` as the **icon**, and leave the **logo** unset. Leave `STRIPE_LAB_ICON_FILE_ID` empty to inherit this branding.

The restricted live key rejected the icon upload during setup because it lacks Files Write. The code and local icon are ready; the Stripe upload remains to be completed. Colors and benefit text were accepted by a temporary live session, which was expired without entering payment details or creating a subscription.

## Personal Vault start date

Apply `011_lab_vault_start.sql`, then `012_lab_vault_local_date.sql`, once each before deploying the updated `lab_billing.py` and `vault.py`. These add `lab_accounts.first_subscribed_at`, `vault_start_date` and `vault_timezone`. Stripe synchronization records the earliest confirmed Lab subscription start, including a free trial, and never moves it forward on cancellation or resubscription. Incomplete checkouts do not establish a start date.

Legacy accounts are backfilled from Stripe subscription history on billing refresh or the first Vault visit. New checkouts record the browser’s IANA timezone on the Stripe subscription. The first confirmed subscription fixes `vault_start_date` in that timezone; later timezone changes and resubscriptions cannot change it. Legacy subscriptions without timezone metadata use UTC because the original timezone cannot be recovered. The Vault filters daily games from this fixed calendar date; it no longer uses the global `VAULT_START_DATE` for registered users. Games during membership gaps after the original date still count when the user returns. No new cron job is required.


## Browser membership status cache

The frontend reuses authenticated Lab status for at most 30 seconds across page
navigation in the same tab. Cache entries are tied to the signed-in token and
expire no later than the known trial, subscription or payment-grace end. Reading
an entry does not extend its lifetime. Concurrent checks are deduplicated.

Ordinary Account and Lab visits reuse the short-lived database-status cache.
Stripe Checkout/portal returns and manual billing refreshes bypass the cache and
synchronize with Stripe. Portal return URLs include `?billing=return`. Ordinary visible-page checks run every
30 seconds against the backend database; they do not call Stripe. Returning to a
visible page rechecks an expired entry. Login/logout invalidates cached status,
and billing refreshes signal other tabs to invalidate their cache. A paid-feature
HTTP 402 response clears the cache and rechecks immediately. Failed checks clear
cached membership and display the verification error on protected pages.

Caching controls presentation only. The backend still verifies every paid-feature
request against current database entitlement. External billing changes become
visible after their webhook reaches the API and the next status check, generally
within 30 seconds on a visible page; instantaneous updates while offline cannot
be guaranteed. Deploying this cache requires only the frontend changes.


## Billing latency diagnostics

The Flask API logs `[billing timing]` for billing and paid-feature routes, including
`total_ms`, `stripe_ms`, `stripe_calls` and `db_read_ms`. `db_read_ms` measures the
membership read including connection setup and close; it is not the total SQL time
of a full synchronization. The frontend proxy logs `[billing proxy]`, including
its total upstream time, and forwards the backend's `Server-Timing` header.
These logs omit authorization, email addresses, request bodies and Stripe URLs.

Ordinary membership checks read the database without calling Stripe. Account/Lab
page entry no longer initiates a full Stripe synchronization; webhooks update saved
status, while billing returns and explicit refreshes still synchronize. Stripe API
calls reuse an HTTP session per worker thread to avoid repeated connection setup.

When Flask is on Railway and MySQL is on an external VM, each database operation
crosses that network link. If `db_read_ms` dominates, check database reachability
and locate the API near MySQL. A slow proxy with a fast backend can indicate HTTP
network delay or request queueing before Flask handles the request. Large
`stripe_ms` points to Stripe calls. These timings do not measure the subsequent
loading of Stripe's own hosted page after redirect.


## Daily game membership lookup

Ordinary daily-game loading does not call `/api/billing/status`, and focus or
visibility changes on the daily page do not start a membership request. The page
uses a valid existing cache or waits for the existing game response. Its
server-provided freeze capacity supplies the access flag (two for Lab, one for
free accounts), including after guess submissions. No additional subscription
query is sent by the browser for this information.

This access-only cache lasts at most 30 seconds and can be used by paid-feature
gates. Account and Lab billing views do not reuse an access-only entry as billing
details; they retrieve the full saved status. Explicit billing changes from
another tab and paid-feature denials still invalidate/recheck membership. While
membership is unknown, a signed-in daily page holds ads until the game response
confirms whether they should load. Backend paid-feature authorization is unchanged.
