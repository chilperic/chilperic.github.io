# Platform review · 14 October 2026

Scope: community homepage, agenda, PowerPoint availability poll, brunch, commons, public messages and private organizer conversation; shared appearance/language/notification/calendar code; campaign, organizer, observatory, report and personal-page markup. This is a source review and focused regression check, not a new authenticated end-to-end audit of every production API.

## Changes shipped

| Finding | Change |
| --- | --- |
| Anti-chauvinist identity appeared mainly as brunch humour | A prominent homepage line states “Against chauvinism. For international solidarity.” Practical political principles explain internationalism, autonomy, mutual aid, ecology and constructive self-criticism. EN/FR/DE included. |
| Valuable features were difficult to discover | Three category-coloured participation paths open brunch suggestions, the availability poll and the commons. They sit below Karen’s collection and immediate event priorities. |
| Agenda order depended on insertion order | Chronological/reverse ordering; undated proposals stay last; active plans are the default, while cancelled and postponed plans remain explicitly accessible. |
| Search ignored translated titles | Search checks original and translated event titles/places plus descriptions and trims whitespace. |
| Filters lacked recovery and feedback | Result count with a live region and a reset action restoring the default agenda. |
| Featured poll stayed labelled open after closure or load failure | Homepage status and navigation badge reflect readiness/closure. Closed polls link to results. |
| Locale switching left the date/session labels in the original language | Date heading and brunch session options now refresh with the selected language while preserving the selected month. |
| Installed notification shortcut opened the homepage | #notifications now opens the signal-box dialog. |
| Keyboard navigation changed panels without a focus destination | Keyboard-triggered navigation focuses the destination heading. Unlabelled existing dialogs use their own visible title as an accessible name. |
| Reduced motion did not cover every component | Shared reduced-motion rules cover scrolling, animation and transitions. Shared link actions retain 44px targets. |

## Retained capabilities and boundaries

Karen’s live totals, progress, chart, records and branded PayPal contribution action remain the first major homepage content. Brunch suggestions remain prominent and continue to use the existing contribution form for quantity, dietary labels, allergens, equipment and shared tasks. Commons provides mutual aid, event ideas, shared journeys, presentation topics, recipes and reflections. Private organizer messages remain separate from the public group board.

Poll participation stays named by default; members can choose a random private ID or anonymity toward other members. The entered name is available only to authorized organizers after poll closure. These identity/security APIs were not changed in this release. No member, donation, attendance or message records were written during verification.

Existing background browser push, opt-in preferences, quiet hours and digest controls remain. SMS/WhatsApp automatic delivery still requires configured sender credentials; Signal remains a share action. Calendar copies support Google, Outlook/Office and ICS with Berlin timezone and explicit time-TBD placeholders. Copies are not subscriptions and do not update themselves after event changes.

Existing theme, density, layout, text-size and language controls remain. Shared category meaning is preserved: red solidarity, blue social, violet learning, amber food and green outdoors. Political language is editorial; practical actions retain direct labels. Member-written text is not automatically translated.

## Validation and outstanding work

Passed JavaScript syntax checks, unique HTML/control-ID checks and the agenda regression suite: chronological/reverse ordering, undated placement, active/cancelled filters, translated search, counts, closed/unavailable poll states and required EN/FR/DE strings. The test evaluates the actual rendering functions against a DOM adapter; it is not a browser rendering test.

Fresh visual/browser QA is unavailable in this managed session because the required browser-control skill is not exposed. Mobile additions use single-column layouts under 700px, shrinkable grid tracks and wrapping filters; visual fit is not claimed as newly verified. No production schema or authorization changes were made. Authenticated role regression, real device push delivery and provider setup remain separate integration checks. Vercel domain renaming remains blocked by the connected account’s team-access denial; the existing production URL is retained.
