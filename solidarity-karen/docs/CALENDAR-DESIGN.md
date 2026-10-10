# Collective interface and calendar release

The hub now uses a red-and-black masthead with the ecological banner emblem, warm paper surfaces, a dark navigation bar and distinct event category colours. Karen's live collection, the chart and the solidarity training retain their priority. PayPal buttons use the official unmodified PayPal mark and recognizable yellow/blue treatment, including the campaign page and mobile payment action.

New calendar picker: Google Calendar, Outlook.com, Microsoft 365, Apple Calendar and other ICS-compatible apps. Google/Outlook open a prefilled event for the member to review and save. Apple/other options download a file for import; the app does not claim that the event was saved. Provider login or the operating system may add steps.

Berlin time is converted to UTC for timed events, including the summer/winter offset. Events with an unknown time become clearly labeled all-day placeholders. If the end time is absent, exports reserve one hour and disclose that assumption. Cancelled/postponed events cannot be exported. Reminder selection applies only to ICS files; Google/Outlook use their own settings. Imported copies do not update automatically.

Members can save a personal shortlist on their device and export all dated, eligible plans as one calendar file. Event details offer a directions link when an address exists. This is separate from following event updates and from RSVP attendance. Neither saving nor opening a calendar sends a message or changes attendance.

Validation: Node tests cover Berlin offsets, overnight times, all-day exclusive end dates, reminders, cancellations, multi-event exports and safe UTF-8 ICS folding. Browser tests cover the picker, generated Google URL, Apple file download, saved agenda, EN/FR/DE and 320/390px light/dark/high-contrast layouts. Actual third-party account imports were not performed.

Reference for Google template links: https://developers.google.com/workspace/calendar/api/concepts/inviting-attendees-to-events
PayPal mark source: https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-mark-color.svg
