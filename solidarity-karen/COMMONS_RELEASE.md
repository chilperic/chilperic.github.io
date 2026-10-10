# The Red Banner commons release · 10 October 2026

Production: https://karen-solidarity.vercel.app/

## Member workflows

- Brunch: separate monthly bringing lists, quantities, dietary labels, ingredients/allergens, needs with remaining quantities, volunteer tasks, shared journeys, recipes and reflections. Earlier bringing lists remain available in a disclosure below the new board.
- Commitments: claim or withdraw quantities; the server locks an entry while checking capacity. Authors can edit, close or remove entries, with a short undo action and version checks to prevent overwriting concurrent edits.
- Private dietary/access information goes to the existing organizer inbox. It is not published with food labels.
- The commons: offers and requests for mutual aid; private, participant-only conversations associated with entries.
- Ideas can gather interest, progress to a date poll, and be confirmed by an organizer into the existing event/calendar system. Dates lock once date voting begins. Named voting is the default. Optional private display uses a pseudonym publicly; the idea author and authorized organizers may see names when the poll closes. This is not an irreversibly anonymous ballot.
- PowerPoint Night: proposed topics, speaking time totals and organizer-controlled running order.
- Every event detail opens shared journeys, tasks and memories. Confirmed times support an optional one-day reminder. Existing Google, Outlook and ICS calendar options remain available.
- Photos require explicit consent, are resized and re-encoded on the device, and are publicly visible to anyone with the link. Personal addresses belong in private messages.
- EN/FR/DE interface strings, responsive layouts and the existing theme controls apply to the new boards.

## Organizers

Open Organizer workspace → Permissions → Organize the commons. Select an event by name. Owner, organizer and community editor can change sessions, save/apply templates, confirm ideas and set presentation order. Reader, developer, auditor and treasurer have no write access to these tools. Only owner and organizer receive the closed-poll identity report.

A postponed brunch keeps its original session key, bringing list and commitments. Changing one occurrence does not alter the monthly series. Templates copy open needs/tasks without copying claims or attendance. Members can acknowledge the latest organizer update; acknowledgement resets when the update changes.

## Delivery

Browser push remains opt-in. Delivery preferences offer immediate updates or a daily digest at 18:00 Europe/Berlin. Quiet hours apply; requested event reminders stay separate from digests. Peer alerts contain no message text. Pending reminders are rescheduled or cancelled when organizers change a session.

SMS and WhatsApp code remains gated until provider sender credentials, verification and approved WhatsApp template settings are configured. This release does not activate paid phone delivery or send test messages to real members. Browser controls and queue logic were verified locally; device/OS receipt depends on notification permission and provider delivery.

## Data and access

Additive migrations, applied in order:
1. server/commons/schema.sql
2. server/commons/admin.sql
3. server/commons/notifications.sql

All nine commons tables use RLS with no direct anon/authenticated table grants. Public data is projected through rb_commons. Writes and private reads require a 256-bit browser-held capability whose server value is SHA-256 hashed. Organizer calls validate the existing organizer credential and role. Push linking requires both member and delivery-device capabilities. Raw private identities and capability hashes are absent from public results.

This follows the app's existing browser identity model: clearing saved browser data loses edit and conversation access. It is not cross-device account recovery. Members should keep that browser data. New public entries and conversations are persisted in the shared database, not only in local storage.

The Supabase advisor reports expected informational RLS-without-policy notices and warnings for deliberately callable capability-checking SECURITY DEFINER RPCs. Trigger functions are not publicly executable, and the delivery worker claim RPC is service-role-only.

## Verification

- 43 database assertions exercise ownership, invalid capabilities, edit conflicts, capacities, cancellation, versioned acknowledgements, templates, private thread access, pseudonymous voting, organizer roles, photos, digest grouping and raw-table denial.
- Browser tests run actual commons SQL through a local PGlite fixture: mobile forms, claims, undo, private dietary entry, mutual aid, poll defaults, programme, photo consent, organizer templates and rescheduling, EN/FR/DE, 320/390/1440 widths and light/dark/contrast.
- Delivery UI checks cover opt-in/out, preferences, digest frequency, reminder add/remove, subscription removal and inactive phone-channel gating.
- Calendar checks cover Berlin DST, Google dates, unknown-time placeholders, overnight events, alarms, cancellation, escaping and ICS folding.
- Local test fixtures stub cryptographic hashing and organizer credential validation solely to exercise SQL branches without production credentials. Production uses pgcrypto and the existing credential validator.

Test dependencies: @electric-sql/pglite 0.3.14, playwright-core from the runner, Chromium 138. Tests accept PGLITE_PATH, PLAYWRIGHT_PATH and CHROMIUM_PATH environment variables. No new production JS dependency is required.
