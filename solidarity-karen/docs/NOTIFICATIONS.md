# Notification delivery

## Current status

Browser push backend is deployed to Supabase `btygzxeyesnaxljfciqv`, function `red-banner-notifications` version 3. The `red-banner-push-delivery` cron job runs every two minutes. It sends announcements, followed-event updates and organizer-reply alerts to opted-in devices. Browser permission and a working OS push service are required; delivery is not guaranteed. On iPhone, install the app on the Home Screen first.

SMS and WhatsApp implementation is present but disabled until sender credentials, verification and opt-out handling are configured. No phone numbers are requested while these channels are unavailable. Signal remains a manual sharing option.

Notification text is generic: no private message body, poll identity or contribution amount is transmitted. Quiet hours default to 22:00–08:00 Europe/Berlin. Choosing identical hours disables quiet hours. Explicit tests bypass quiet hours. Device capability tokens stay in browser storage; only hashes are saved server-side. Private reply subscriptions additionally require proof of access to each conversation. Removing all subscriptions deletes the device and its associated queue and conversation bindings. Devices inactive for 180 days stop receiving newly queued updates; there is currently no automatic historical-record purge.

## Phone sender setup

Add secrets in https://supabase.com/dashboard/project/btygzxeyesnaxljfciqv/functions/secrets — never in public JavaScript or chat:

- TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
- TWILIO_VERIFY_SERVICE_SID (SMS ownership verification)
- TWILIO_MESSAGING_SERVICE_SID (SMS sender, with Advanced Opt-Out)
- TWILIO_WHATSAPP_FROM (approved sender, including `whatsapp:` prefix)
- TWILIO_WHATSAPP_CONTENT_SID (approved template with variables `1` = generic alert, `2` = app URL)
- TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, restricted to karen-solidarity.vercel.app
- TWILIO_WEBHOOK_URL = https://btygzxeyesnaxljfciqv.supabase.co/functions/v1/red-banner-notifications?twilio=1
- TWILIO_OPT_OUT_CONFIGURED = true only after incoming STOP delivery and signature verification are tested

Configure the exact webhook URL above for the messaging service and WhatsApp sender. The receiver verifies the Twilio signature and disables both phone channels on STOP. Provider registration, template approval, usage charges and a sender account are external prerequisites. No paid account or messages were created as part of deployment.

## Reproduction

The notification SQL builds on the existing community schema. Apply schema.sql, functions.sql, permissions.sql, enable pg_cron and pg_net, then apply schedule.sql. Deploy index.ts, core.mjs and deno.json with entrypoint index.ts and import_map_path deno.json. JWT verification is deliberately off: device capability proofs, a private worker token and signed provider webhooks implement authorization. VAPID private keys and worker tokens are generated and stored only in the service-role-only configuration table.

Five jobs are claimed atomically at a time, with leases, four attempts and retry backoff. Provider acceptance is recorded as `accepted`, not confirmed delivery. Retries are at-least-once and may produce duplicates after a network failure. Same-event enqueueing is deduplicated per device/channel. Subscription endpoint hosts are allowlisted. Provider quotas and per-device limits apply.

## Verification on 2026-10-11

- Active cron job and successful scheduled tick confirmed.
- Authenticated worker HTTP 200 with zero jobs; no member messages sent.
- Public capabilities: push=true, sms=false, whatsapp=false.
- Invalid device and worker credentials: 401. Foreign browser origin: 403.
- Browser automation with mocked transports checks opt-in, saved quiet hours, test enqueue, opt-out, device deletion, disabled phone UI and mobile width.
- No actual iPhone, SMS or WhatsApp receipt has been verified. Use the explicit “Send me a test notification” button on a subscribed device for the first receipt check.

Run tests/delivery.cjs with PLAYWRIGHT_PATH pointing to playwright-core and CHROMIUM_PATH to a Chromium executable. It starts its own local server and never sends real notifications.
