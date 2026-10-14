# Whole-hub UX review and brunch improvements · 14 October 2026

| Finding | Resolution |
| --- | --- |
| Brunch suggestions were buried in a collapsed legacy section | A prominent standalone suggestion deck follows the session/date information. All suggested food, drinks, equipment and tasks are visible. |
| Quick suggestions used the legacy list and skipped quantities/allergens | Suggestions now open the current shared contribution form. Food, equipment and volunteer tasks use their appropriate fields and categories. |
| Existing offers were hard to spot | Per-item offer badges use entries from the selected month. A stable suggestion key preserves matching when the interface or saved title changes language. |
| Bringing equipment prompted dietary information | Equipment hides and disables food-only fields; equipment cards display an equipment label. |
| Reflections lacked a clear purpose | “Self-criticism & memories” invites constructive notes about what worked and what to improve next time. Existing consent-based photo controls remain. |
| Long German context labels pushed the language picker beyond 320px | The context row can wrap and its label can shrink within the screen. Long translated headings and member-written strings stay inside cards. |
| Empty saved-agenda instructions added vertical noise | Empty saved-agenda cards are more compact, with export and saved-plan behavior retained. |

The communist vocabulary appears in playful editorial text around practical, clearly labelled actions. Chauvinism, comprador, reactionaries, rightists, evil landlord, opportunism and self-criticism appear in context. Buttons such as “I’ll bring it”, “Coordinate this task”, and “Add a suggestion” continue to state the action. EN/FR/DE copy is included. The uploaded glossary informed terminology; its PDF is not published with the app.

No production schema or member records changed. Public community suggestions use the existing post API; contribution metadata uses the existing capability-protected commons API. Legacy contributions remain accessible. Test writes were sent only to a local database fixture.

Verification: actual commons SQL exercises quantities, allergens, monthly scope, stable suggestion matching, tasks, equipment fields and custom suggestion persistence. HTML-shaped member input renders as text. Layouts were checked across seven hub views, three languages, 320/390/860/1440px, and light/dark/contrast themes. No uncaught JS errors or horizontal overflow in those tests. Images of English/French/German brunch layouts were inspected.

Regression test: tests/brunch-suggestions.cjs. Existing test-only dependencies: PGlite 0.3.14, runner playwright-core and Chromium 138.0.2. No new production dependency.
