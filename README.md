## Demo

[Watch the issue tracker demo](./demo/issue-tracker.mp4)



# Trackline Issue Tracker

A Kanban-style issue tracker built with Angular 22 standalone components and Signals.

## Requirements

- Node.js `22.22.3` or later in the Node 22 line, or `24.15.0` or later in the Node 24 line.
- npm 11 (or a compatible npm release).

## Run locally

```bash
npm install
npm start
```

The app loads its initial issues and team members from `public/issues.json` and
`public/team.json` through Angular's `resource()` API. The create and detail
forms use Signal Forms. Edits are saved in browser local storage. Use **Reset
data** to restore the seed board. Cards sort by priority and then earliest due
date; issues without a due date sort after dated issues of the same priority.

## Project structure

- `src/app/services/issue-store.ts` owns issue state, filtering, derived board
  summaries, persistence, and business-rule validation.
- `src/app/components/` contains the issue card, detail panel, and create form.
- `src/app/models/issue.ts` defines the issue, team-member, and validation types.
- `public/` contains the seed data loaded by the app.

## Checks

```bash
npm test
npm run build
```


## Features and architecture

Trackline is an Angular 22 Kanban issue tracker with To Do, In Progress, In Review, and Done columns. It supports issue search and filters, summary metrics, issue creation and editing, and validated status transitions.

- `IssueStore` owns issue data, loading, derived state, persistence, and business-rule enforcement.
- Angular `resource()` loads the seed data; Signals and `computed()` manage shared and derived state.
- The issue card, detail panel, and create form are separate components. The forms use Signal Forms.
- Seed issues and team members are in `public/issues.json` and `public/team.json`.

## Data and reset

Changes are saved in this browser's local storage under `trackline.issue-tracker.v1`. They survive page refreshes but are not shared across browsers or users.

**Reset data** clears saved changes and reloads the seed data. **Clear filters** only resets the active filters.

## Verification

The production build passed, and all 15 unit tests passed.
