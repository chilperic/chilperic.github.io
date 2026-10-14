# Red Banner interface and coordination audit · 14 October 2026

Production target: https://karen-solidarity.vercel.app/ · GitHub main, solidarity-karen folder.

## Findings and changes

| Finding | Change |
| --- | --- |
| Several successive visual layers competed for typography, theme and category colours | Shared design tokens and one final design system across the hub, campaign, organizer, observatory, public report and personal record. Previous calendar/agenda utility styles retained; competing collective identity styles removed. |
| Pastel event posters did not create a strong separation | Saturated red solidarity, blue social, violet learning, amber brunch and green outdoors. Icons and labels remain present, so colour is not the only cue. |
| Desktop navigation consumed horizontal space and could overflow | Fixed side rail, direct active states and footer links to organizer and campaign workspaces. |
| Phone admin messaging was difficult to discover | Direct 44px header control, home action panel and an event-specific admin contact action. |
| Poll identity controls did not clearly offer ID-only participation | Named participation explicitly marked as the default, random-ID generation, separate member-anonymity choice and a visible privacy preview. |
| “Anonymous” could imply that no one could ever identify the participant | Explicit explanation: authorized owner/organizer accounts can read the entered name after closure. An ID-only entry remains an ID-only entry; an admin cannot infer a name that was never provided. |
| Initial loading fetched hidden boards and duplicated fund calls during language startup | Commons boards load when visited, concurrent loads are deduplicated, fund loading is deduplicated, independent public announcements/session requests run together. |
| Large hero artwork delayed access to Karen’s collection | Compact masthead, a clearer vector emblem and prominent live collection/training. Training precedes charts on narrow phones. |
| Event searching did not distinguish active/cancelled proposals | Event-status filter added alongside activity search and personal plans. |
| Sharing an individual plan required manual navigation | Share/copy link in event details, using the existing event-link parameter. Personal addresses remain in private messages. |
| Collective activity lacked a useful summary | Upcoming plans within 30 days, actual PowerPoint response count and next brunch date, computed from existing data. |
| Poll coordination crowded the organizer inbox | Poll closing/identity coordination moved into an expandable section after conversations. |
| Public report overflowed at 320px | Responsive report toolbar, headings, grids and consistent themes. Organizer login and financial/analytics surfaces use the shared system. |

## Existing backend verified

No production data or schema was changed in this release. Existing functions already implement the requested access model:

- rb_contact_member: browser-held conversation capability required; messages persist in the admin inbox. Replies return to the same private conversation.
- rb_contact_admin: only owner/organizer can read or reply. Reader/editor/developer do not gain private inbox access through the redesign.
- rb_poll_vote: requires a name or ID plus secure vote capability; allowed November Friday/Saturday dates are validated; finalized polls reject later votes.
- rb_poll_public: private names always remain hidden from members, including after closure.
- rb_poll_admin: private names are hidden while the poll is open and disclosed only to authorized owner/organizer after closing.
- The legacy voting RPC cannot replace an identity-protected vote and respects poll closure.
- Private conversation and poll-identity tables have RLS and no direct anonymous SELECT permission.

Names are self-declared. Browser capabilities are not verified legal identity or cross-device authentication. Clearing browser data loses edit/conversation access. Existing notification provider setup requirements remain unchanged.

## Validation

- 43 existing commons SQL checks passed for ownership, capacity, conflicts, roles, templates, privacy and digests.
- Actual production poll/chat function definitions were loaded into local PGlite fixtures. Tests exercise the real functions with local-only credential/hash stubs, never production writes.
- Browser flow: default named vote, generated ID, private display, protected vote editing, closing through organizer UI, private identity mapping after closure, denied reader access, private admin message and reply, event filters/share/contact.
- Main hub: seven views, EN/FR/DE, 320/390/860/1440px and light/dark/contrast. No horizontal overflow or uncaught JS errors in those flows.
- Separate campaign, organizer, observatory, report and personal record pages: 320/390/1440px and all themes. Actual member/financial records were not modified during testing.
- Event poster text in all five categories met WCAG 4.5:1 contrast in the tested palette.
- Existing brunch forms, claim/undo, memories, organizer templates, calendar/delivery controls and phone notification gating were checked for regressions.

Tests: tests/redesign.cjs, tests/workspaces.cjs, tests/commons-db.cjs, tests/commons-browser.cjs, tests/delivery.cjs. Production RPC fixtures: tests/production-poll-chat.sql and tests/coordination-fixture.cjs. Dependencies are test-only: PGlite 0.3.14, runner playwright-core, Chromium 138.0.2. No new production dependency is introduced.
