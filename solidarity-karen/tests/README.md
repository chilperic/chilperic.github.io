# Local database verification

Run `npm install --prefix tests && npm test --prefix tests` from `solidarity-karen`.

The tests create a disposable in-memory Postgres instance, apply community migrations v1 and v2, and exercise the functions as the anonymous role. They never connect to Supabase or production. The credential checker is a test shim with dummy role names; the SHA-256 digest shim uses Postgres's built-in SHA-256. Live Supabase authentication and extension configuration still need a smoke test after the approved migration.

Coverage: private thread creation and retrieval, wrong-token and wrong-role denial, revoked table reads, organizer replies, idempotent thread creation, unread state, reopening resolved threads, attendance replacement, valid-event checking, separate brunch sessions, owner-only item removal, hidden device IDs, and first-Saturday validation.
