# Notification delivery: implemented and next connection

## Live in this release

- Bell button: a device-local inbox with read/unread state and clear-history controls.
- Follow an event from its details. Changes detected on the next successful community refresh create an inbox item. These are explicitly labelled community updates, not verified organizer instructions.
- Official announcements are polled separately. The initial announcement history is loaded as read, avoiding a burst of old alerts.
- Private replies use existing per-conversation tokens. Alert bodies contain only a generic reply notice, never message content, names or subjects.
- Optional browser alerts are requested only after a click. They run while the app is open and visible. **There is no background push transport in this release.**
- Event sharing opens WhatsApp's composer, or the native share sheet for Signal, Messages and other installed apps. The user chooses recipients and sends. This is not automatic delivery.
- Calendar exports for events with a confirmed time include a 2-hour display alarm in Europe/Berlin time. Unknown-time events have no alarm. Calendar applications control whether imported alarms are honored. Calendar copies do not receive later updates automatically.
- Device-local preferences and history do not synchronize across devices. Clearing browser data removes them. Phone numbers are not collected.

## Automatic phone delivery: required setup

A provider and sender must be chosen before collecting phone subscriptions or claiming delivery:

| Channel | Required connection | Operational trade-off |
| --- | --- | --- |
| Web Push | VAPID keys, private subscription storage, delivery worker and event queue | No phone number required; iPhone users install to Home Screen and grant permission |
| WhatsApp | Approved Business sender, explicit opt-in, approved notification templates, server-only API credentials | Provider/Meta fees and template rules apply |
| SMS | Registered sender/provider account, verified recipient numbers and explicit opt-in | Per-message charges; no end-to-end encryption |
| Signal | Dedicated account or linked device on an always-on host running signal-cli | Unofficial integration requiring ongoing maintenance |

Before activation, implement verified ownership of phone numbers, unsubscribe, event-topic choices, language, quiet hours (Europe/Berlin), rate limits, deduplicated queue jobs, retry limits, provider receipts and failed-delivery visibility. Store numbers/subscription endpoints privately with server-enforced access. Never expose provider credentials in config.js or browser storage. Organizer notifications should contain only a generic new-message notice and an authenticated inbox link.

Suggested first automatic channel: Web Push, with optional WhatsApp after sender registration. Do not let members assume that enabling the current browser-alert toggle enables background delivery.

## Reference documentation checked October 10, 2026

- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates
- https://www.twilio.com/docs/whatsapp/key-concepts
- https://github.com/AsamK/signal-cli

## Verification

Local browser checks cover event deep links, follow state, change alerts, deduplication, private-reply redaction, read state, failed refreshes, EN/FR/DE dialog widths and a Berlin-time calendar alarm. No real external messages or production votes were sent. Actual OS notification presentation and delivery through WhatsApp/Signal/SMS are not claimed as tested.
