# Karen announcement visibility

Owner and organizer roles can show/hide the announcement from Overview or Campaign. The database defaults every campaign to hidden; the current campaign remains hidden. The public API exposes only the visibility boolean. Anonymous readers cannot change it. Concurrent conflicting saves and active-campaign switches are rejected.

The homepage starts with a hidden placeholder and renders the personal message only after an explicit true flag is loaded. The same flag controls the full invitation in birthday details. Language changes, event refreshes and deep links do not reveal a hidden message. The birthday's basic agenda entry, attendance, calendar and QR options remain available.

This is a presentation control, not a private-content access restriction: published source/previous downloads can still contain the invitation. No role or financial-data access was broadened.

Verification: default-false/public API flag, owner/organizer show/hide, restricted roles, invalid values, conflicts, campaign scope, idempotent database setup, fail-closed DOM rendering and visibility changes across locales/events. No production attendance or message test records were created. Browser visual verification remains unavailable in the supported session tooling.
