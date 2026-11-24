# Prototype design and scope

Lightning PE HQ is a department operations workspace. The product requirements are taken from the supplied Lightning PE HQ App PRD v1.0. The implementation treats the PRD's delivery stages, external links, and release gates as product context. The prototype uses simulated records and accounts.

## Design direction

- Editorial sports photography and large, tightly set headlines establish a school athletics identity. A neutral workspace, thin dividers and restrained crimson support frequent operational use.
- My Day starts with the next action and date buckets. A quick-update task form keeps context in view. Desktop uses a permanent sidebar. Mobile prioritises a short navigation bar and one-column actions.
- A separate Student view puts the next approved fixture first. Sport filters and fixture details support the journey from finding an event to checking where and when it starts. The results tab shows approved team outcomes. The student dataset is a separate, curated fixture/results sample. Student sign-in, team eligibility and permissions need a school-approved design before use with real records.
- The bolt is a temporary wordmark. The approved school logo was not supplied.

## Requirements coverage

| PRD area | Prototype implementation | Production dependency |
| --- | --- | --- |
| My Day and role-aware navigation | Task buckets, scoped search, personal task and request forms, staff/admin demo switch, separate student journey | Invited school identity, role checks on every API read and write |
| Mark overview | Drilldowns for due, overdue, waiting, unassigned, decisions and upcoming fixtures, owner/support counts | Reconcile counts after verified migration |
| Tasks | Assignment, due-date reasons, waiting details, completion and evidence, reopen/cancel, comments, related records, audit and version checks | Server transactions, database constraints and cross-user concurrency tests |
| Fixtures | List/calendar, filters, conflict and logistics flags, lead and date propagation, idempotent checklist, cancellation preview | Confirm the fixture checklist and lead mapping |
| Projects and trips | Membership, milestones, readiness, approval evidence, payment milestones and cancellation | Approved thresholds and separate school finance/consent workflows |
| Results and recognition | Fixture/project outcome entry, review and approval metadata | Approved student reference policy and an authorised release process |
| Requests and documents | Request intake and decision, linked task, authoritative link/evidence directory and link flags | Pilot Drive permissions and request owners |
| System health | Manual-source indicator, baseline reconciliation note, import preview, duplicate/conflict checks, trial staff admin, data quality, job retry, audit, CSV and JSON backup/restore | Approved workbook snapshot, database restore test, retention, job monitoring |
| Notifications and recurrence | Local assignment and material-change alerts, due/overdue/chase reminders, read/snooze, weekly/termly recurrence | Server scheduler, managed delivery, idempotency across workers and retries |
| Release conditions | Responsive prototype with example data and regression checks | AC01/02/11/13 need production-equivalent verification. AC12 timing and accessibility, data policy, pilot approval, performance and all go-live gates require validation. |

## Screen paths

1. Staff opens My Day, chooses a task and saves progress, a waiting reason or completion.
2. Administrator opens Overview, drills into a count, checks fixture readiness, changes the lead or date and reviews linked work.
3. Student opens Student view, filters the schedule, reads a fixture and checks team results.
4. Administrator opens System Health to preview a sample import, review conflicts and export records or a backup.

Only invented data is included. The supplied workbook was not accessed. Its documented baseline is 44 fixtures, 55 tasks and 12 fixtures with a missing lead. Later phases such as parent access, calendar, email/WhatsApp delivery, Drive monitoring and AI are outside this prototype. A relational, server-authorised implementation remains the MVP path. A browser backup documents the demo environment only. Production backup and restoration must be owned and validated in the approved test environment.
