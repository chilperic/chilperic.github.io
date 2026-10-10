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
