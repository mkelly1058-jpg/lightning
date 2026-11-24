# Lightning PE HQ

A responsive school athletics prototype based on the Lightning PE HQ App PRD. It opens in a staff workspace and includes an administrator view and a separate, read-only Student Sports Hub.

## Run locally

Requires Node.js 20 or newer. There are no package installation steps.

```sh
npm run dev
```

Open http://localhost:4173. Use the profile menu to switch between Alex Morgan (staff), Mark Kelly (administrator) and other demo staff. **Student view** opens the curated student schedule and team results.

```sh
npm run check
npm test
```

## Try the prototype

- Open an overdue task and update its status. Try Waiting, which requires a waiting party and a chase date.
- As Mark, open Overview and drill into Unassigned or Decisions. In Fixtures, open a fixture and generate its preparation checklist. Changes to its lead or date flow through to unfinished inherited or relative tasks.
- Open System Health to preview an invented import, run reminder jobs, export CSV records or save and restore a JSON snapshot.
- Open Student view, filter by sport, then select Fixture details to find the venue, arrival time and what to bring.

The prototype stores invented operational records in the current browser's local storage. The role switch demonstrates visibility and actions. A live pilot requires managed sign-in, server-enforced permissions, a relational database and a verified school export. Student fixtures and results are curated examples in a separate module and do not change when staff edit operational records. The dashboard shows manual source review. The production logo and actual source records were not supplied.

The static site lives in `dist/`. `model.js` contains business rules, `app.js` handles interactions, `view.js` and `forms.js` render the interface, and `seed.js` and `student.js` supply invented data. See [the product design and PRD coverage](docs/product.md) for scope and release dependencies.
