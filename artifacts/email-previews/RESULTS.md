# Elementle email test results

Tested October 10, 2026. All 13 messages were accepted by Resend and subsequently reported as delivered. Test subjects were clearly labeled; sample verification/reset tokens are invalid. No customer records, subscriptions, or payments were changed.

Tests used the actual authentication send functions and actual billing worker, with isolated SQLite outbox data. 87 backend regression tests passed, including duplicate notification protection, transport failure retries, escaping, and all copy branches.

## Delivery results

- monthly-trialing: **delivered** (billing-worker).
- monthly-active: **delivered** (billing-worker).
- monthly-trial-reminder: **delivered** (billing-worker).
- yearly-trialing: **delivered** (billing-worker).
- yearly-active: **delivered** (billing-worker).
- yearly-trial-reminder: **delivered** (billing-worker).
- canceled-at-period-end: **delivered** (billing-worker).
- canceled-immediately: **delivered** (billing-worker).
- payment-first-failure: **delivered** (billing-worker).
- payment-second-failure: **delivered** (billing-worker).
- payment-grace-expired: **delivered** (billing-worker).
- account-verification: **delivered** (auth-sdk).
- password-reset: **delivered** (auth-sdk).

## Appearance and production requirements

Open [the preview gallery](index.html) in a browser. It includes desktop and mobile width controls, plus each original HTML and plain-text message.

Billing: charcoal background, dark green rounded card, Elementle wordmark, Lab icon, white heading, muted body copy, and green subscription-management button. Authentication: dark gray rounded card with green verification/reset button and a fallback URL.

The API currently has FRONTEND_BASE_URL=http://localhost:3000/. This batch deliberately used https://elementlegame.com for samples. Production must use the public frontend URL; local links cannot work on other users’ devices.

https://elementlegame.com/images/lab_icon.png returned HTTP 404 during testing. Deploy the frontend asset; gallery copies use the local image so the intended design is visible.

Automatic subscription notifications require the billing migrations, deployed webhook handling, and a running lab_email_worker.py service. This controlled batch tests the sender and isolated worker; it does not prove a deployed Stripe webhook or worker is running.

The configured database has all three billing tables. Its real outbox has **2 pending emails**. Those were left untouched so this test did not send messages to other recipients. A deployed worker still needs to process them.

## Inline icon fix

The latest billing template embeds the icon as a CID attachment, using bundled API asset `assets/lab_icon.png` (128px, 31 KB). Public image hosting is no longer required for new billing emails. The preview gallery uses a local copy of that same attachment. Deploy both the updated API and worker with the asset; previously sent emails cannot be changed. 20 focused billing/email tests passed.
