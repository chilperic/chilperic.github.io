# Red Banner platform audit and redesign

Date: 9 October 2026. Scope: community hub, campaign, organizer workspace, analytics, report, mobile interaction, and shared-data flows.

## Findings and changes

| Area | Audit finding | Implemented change |
| --- | --- | --- |
| Primary purpose | Karen's collection needed stronger visibility alongside broader community activity. | First-priority fund card, live net total/goal/progress/supporter count, visible contribution chart and recent supporter records, prominent contribution link. |
| Navigation | Large home panels followed users into every section; returning home did not reliably return to the top. | Separate views, stable hash navigation, desktop sidebar, phone bottom navigation and More sheet. |
| Event identity | Event categories shared similar visual treatments. | Consistent red solidarity, blue social, purple learning, amber food, green outdoors identities with text labels and icons. |
| Phone design | Dense controls, weak hierarchy and inconsistent spacing. | Stacked cards, large primary controls, 16px form inputs, safe-area spacing, responsive dialogs, compact priority shortcuts. |
| Private contact | No member-to-organizer conversation path. | Private conversations, member replies, owner/organizer inbox, unread indicators, search/status filters, resolve/reopen flow. |
| Delivery truth | Failed shared writes could appear successful through silent local fallback. | No simulated group save. Failed writes retain form contents and show an error; uninstalled RPCs show setup pending. |
| Public requests | Hub sent a publishable API key as a Bearer token. | Publishable key is sent through the `apikey` header, matching the existing campaign client. |
| Poll state | Selecting a date could look like a saved vote. | Explicit unsaved/saved availability, all eight Friday/Saturday dates in November 2026, editable votes and leading dates. Existing device identity preserved. |
| Event planning | Limited attendance and discovery controls. | Going/interested/cannot-attend, My plans, category/search filters, calendar download, community proposals and visible cancellations/postponements. |
| Calendar accuracy | Unknown times and local timezone could be ambiguous. | Unknown-time events are all-day and labelled TBD; timed exports specify Europe/Berlin with daylight-saving rules. Downloads explain they do not auto-update. |
| Recurring brunch | A single list mixed recurring sessions. | First-Saturday monthly selector, separate bringing lists, shared suggestions and removal of one's own commitments. November legacy list remains usable pending activation. |
| Stale home details | Changes could be hidden in the board while priority cards remained unchanged. | Latest public event updates propagate to event cards, training panel and brunch heading. Training location/time read from the published campaign event. |
| Visual consistency | Campaign and organizer screens retained older competing typography and colours. | Shared platform styling across campaign, organizer, analytics and report; earlier editorial overrides retired. Finance controls and existing translations retained. |
| Data privacy | Private messages needed an access boundary independent of the public board. | Direct table access revoked; member capability tokens are hashed on the server; organizer access checked by existing credentials on every RPC. Supporter names remain consent gated. |
| Cache | Previous shell did not include new hub assets. | Service-worker cache version updated. Private/cross-origin API requests remain outside the shell cache. |

## Verification

- JavaScript syntax checks passed for hub, admin and private inbox modules.
- All six hub views checked in Chromium at widths 320, 390 and 1440px: no document horizontal overflow or JavaScript exceptions.
- Campaign, organizer login, analytics and report checked at 390 and 1440px: no document horizontal overflow or JavaScript exceptions.
- Screenshots inspected; corrected crowded mobile poll rows, missing spaces where line breaks collapse, inherited serif styles, and inconsistent message-card structure.
- 20 database checks passed in disposable PGlite, including access denial and monthly isolation. Repeatable test included in `tests/`.
- 19 browser-to-local-Postgres checks passed: campaign totals, chart visibility, vote persistence, attendance, filtered plans, calendar download, proposals, postponement propagation, brunch session isolation/removal, private message delivery, organizer reply, member reply, failed-write preservation, and honest setup-pending state.
- Public campaign data read through the Supabase connector: 13 confirmed records, net EUR 740, target EUR 1,000. Values are fetched at runtime, never seeded into the app as live amounts.
- Local browser access to the real Supabase endpoint was blocked by the environment's certificate trust (`ERR_CERT_AUTHORITY_INVALID`). Browser flow verification therefore used actual public campaign data fixtures and a disposable local database. Production writes were not used for testing.

## Activation status

`database/community-platform-v2.sql` is prepared and locally verified, but NOT applied to production.

Automatic approval review rejected the attempted migration because it creates persistent tables, alters the brunch schema, migrates attendance records, and exposes anonymous RPCs for private conversations; it required explicit approval of this database deployment and access design.

The migration adds private conversation/message tables; grants members access only through a random conversation token and organizers through existing owner/organizer credentials; adds aggregate attendance and month-scoped brunch RPCs. Existing November brunch records retain a November 7 session date, and existing karting interest is copied to the new attendance table. It does not change campaign contribution records.

Until approval and application, the preview shows setup-pending errors for private messaging, new attendance saving and future-month brunch lists. The existing public board, poll, November brunch list and campaign continue through their existing endpoints.

## Practical limits and next opportunities

- Member identity is browser-local, as in the existing open-link participation model. Clearing browser storage loses anonymous conversation access and may create a new voting identity. Private replies appear inside the app; no email/push delivery is implemented.
- Anyone with the link can post public community updates, including event changes. These are labelled as community updates, not authenticated organizer announcements.
- The private inbox lists the 200 most recent conversations. Basic per-client/per-thread rate limits are included, but anonymous device IDs are not a strong anti-abuse identity. Account-based membership and moderation would be a next phase if the group grows.
- Shared records refresh every 30 seconds; open private conversations/inbox refresh every 15 seconds. This is polling of recorded contributions, not a new automatic PayPal settlement integration.
- Existing campaign translations remain available. The redesigned community hub is currently English.
- Useful next phases: organizer-approved announcements, event-specific packing/carpool lists, optional member accounts with cross-device inbox access, and opt-in notifications.

## 10 October follow-up audit: identity, themes and navigation

Findings: category accents were too small; display preferences were absent; the poll had no identity or privacy choice; private inbox activation remained blocked. Added category header panels with distinct red/blue/purple/amber/green meanings and existing category icons/labels. Added device-local daylight, midnight, high-contrast and system themes; comfortable/compact spacing; cards/agenda event layouts; standard/larger text; reduced motion. Preferences apply across hub, campaign, organizer, observatory and report.

Polling now defaults to named participation. Every identity vote requires a self-declared name or recognizable nickname. Choosing public-name privacy substitutes a server-generated random ID. The consent text explicitly states that authorized organizers can retrieve the name after closing; it is not full anonymity. Names and vote tokens are never returned by the public endpoint for private-name votes. Organizer read hides private names until final closure. Older votes remain counted but have no name mapping; this cannot be reconstructed. Capability tokens protect edits and legacy endpoints cannot overwrite enrolled votes. Closing also locks legacy voting. No reopening is provided because identity disclosure cannot be undone.

Verification: 35 local PostgreSQL checks passed, including direct table denial, wrong-token denial, public-name privacy before/after closure, organizer role restrictions, legacy edit prevention, invalid dates, withdrawal and closed voting. Browser-to-local-PostgreSQL checks passed name validation, named default, private-ID submission and settings persistence. Checked 54 view/theme/viewport combinations (320,390,1440 px; light,dark,contrast; six hub views), with larger text and agenda layout enabled; no page overflow or JavaScript exceptions. Fixed small-screen header and message-button overflow found by these checks. Also checked appearance controls and phone overflow on campaign, organizer login, observatory and report. Inspected phone poll screenshot and corrected dark-theme text/button contrast. Browser uses test fixtures; no live member votes or messages were created.

Activation remains blocked by automatic approval review for the combined v2/v3 production migration. No database permissions changed. The identity voting form reports setup pending until approval and does not silently submit to the old anonymous endpoint. Existing aggregate results still load. Private organizer chat, RSVP storage and monthly brunch storage likewise remain pending. Required approval covers the new tables, anonymous capability-protected APIs, organizer authorization and post-close identity disclosure.

## Assembly identity and role workspaces — 10 October follow-up

The interface now uses an assembly masthead, red political identity, larger event-poster headings and restrained revolutionary humour. Karen's fund remains the primary home card. Personal event preparation checklists persist on the current device; they are explicitly not shared tasks. Core community navigation, forms, privacy explanations and built-in event labels have English/French/German translations. User-authored messages, notices and event descriptions are preserved. Existing campaign language controls are retained. Legacy finance administration has not been fully translated; this is not a claim of complete platform-wide translation coverage.

A permission audit found that the existing `karen_admin_action(list)` exposes private contribution records to owner, organizer, treasurer and auditor. Those existing role permissions remain unchanged in this release. New reader, editor and developer workspaces never call that endpoint. Reader can read public official notices; editor can read/create/update those notices; developer can read public notices and non-sensitive feature availability flags. None receives private chat, poll identities, financial records, account management or deployment credentials. Owner-controlled role assignment is prepared in v4. New roles are not offered in account selectors unless the server advertises v4 availability. Unknown UI roles no longer inherit the owner's tab set. This is defense in depth, not a substitute for server authorization.

Official notices have a distinct table: anonymous participants may read them but cannot write them directly. They are separate from the existing public community board and do not retroactively authenticate earlier event updates. Existing public event change notices are still community suggestions, not a new organizer-only confirmation workflow.

Database verification: 45 local checks passed, including reader/developer write denial, editor notice publishing, developer/reader inbox denial, editor poll-identity denial, and anonymous official-notice insert denial. Role authentication remains a local shim; no production accounts were created or changed.

Production activation of v2, v3 and v4 remains pending explicit approval following automatic review rejection. Prepared migration files are reviewable in the repository. No database access-control changes were executed. New private messaging, identity polls, scoped roles and official notice publishing must not be described as active until migrations are applied and verified.
