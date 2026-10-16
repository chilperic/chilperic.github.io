# Organizer controls review - 16 October 2026

## Findings and changes

- Useful controls existed but were scattered. Overview now offers role-appropriate shortcuts to campaign text, events/brunch, journal, milestones, translations, QR sharing and inbox. Tabs unavailable to the current role are omitted from these shortcuts.
- The Permissions workspace contained the full commons coordinator. Those same server-protected tools are now also available directly in Events: event/session details, brunch planning, ideas and presentation coordination. Existing event editors remain available below them.
- Campaign title, subtitle, story and localized payment labels could be edited but the hub did not use them. Hub rendering now consumes saved campaign/localized values. Long stories use an expandable section rather than overwhelming Karen's collection card.
- Collection start date was absent from campaign editing. It is now editable, with date bounds and validation against the saved deadline. The dedicated last-collection-day editor remains available in Overview and Campaign.
- Existing campaign edits could overwrite concurrent edits without warning. The new campaign-save path locks the active campaign and compares the loaded update timestamp, rejecting stale saves. HTTPS payment links and non-empty titles are validated. Closing, archiving or drafting an active campaign prompts an explicit lifecycle confirmation.
- Existing milestones and journal posts could be created/deleted but not edited. Expandable editors now update labels, thresholds/order, title/body and public visibility. Event records cannot be modified through the journal endpoint. Changes are scoped to the active campaign and authorized owner/organizer credentials.
- Campaign editing lacked unsaved-change protection. Typing marks the section dirty, automatic overview refresh respects dirty editors, tab changes request discard confirmation, and page exit triggers the browser's unsaved warning.
- QR codes previously existed only as external downloads. A local QR centre now provides PayPal, community, training, agenda, poll, brunch, commons and contact links with PNG/SVG downloads, link copying and print cards. Homepage, campaign page and organizer sharing tab expose it; event details expose an event-specific code. Public PayPal QR generation reads the latest campaign link. QR symbols retain a four-module quiet zone and contain only public URLs, with no session/conversation credentials.

## Permissions and verification

New write APIs preserve the existing capability-authentication model. They accept only owner/organizer roles, validate the active campaign and modify explicitly supported fields. Raw financial/member tables and access policies are unchanged. No member, contribution or message records were written during verification.

Local database regression tests cover permitted/denied roles, valid campaign/journal/milestone updates, HTTPS/date/title validation, stale campaign saves, campaign scope, visibility and reserved event-record protection. JavaScript syntax checks passed. Eight SVG codes generated through the actual bundled QR encoder and export function were rasterized and decoded to their exact URLs.

Fresh browser/device visual verification is not available through this session's supported browser tooling. Source checks confirm single-column-compatible controls, wrapping action groups and constrained QR canvases. No new browser dependency or third-party QR service was added.

PayPal pool lifecycle/deadline changes still require PayPal; the platform cannot change provider settings. SMS/WhatsApp automation still depends on sender setup. Neither is claimed as activated by this release. Existing financial-role separation and public/private-message separation remain.
