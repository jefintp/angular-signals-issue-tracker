# Skill: Angular Signals

Use this skill when implementing application state, derived values, reactive calculations, or persistence for the Issue Tracker.

## Core principles
- Use `signal()` for writable state owned by the service.
- Keep writable signals private. Expose readonly versions (for example, with `asReadonly()`).
- Read a signal by calling it: `issues()`.
- Update state immutably with `.set()` or `.update()`.
- Use `computed()` for values derived from other signals.
- Do not use `effect()` to derive state or synchronize signal-to-signal values.
- Use `effect()` only for genuine side effects, especially persistence, and guard it until initial loading/restoration is complete.
- Do not introduce `BehaviorSubject` as a replacement store.

## Issue Tracker state guidance
The `IssueStore` should own:
- Issues and team members.
- Loading and error state.
- Search and filter state, where appropriate.
- Selected issue/edit-related state if it is shared across components.
- Methods for creating, editing, assigning, and transitioning issues.
- Business-rule validation.
- Persistence and reset behavior.

Expose readonly signals for consumers. Components should never mutate the issue array or issue objects directly.

## Derived values
Use `computed()` for:
- Open issue count.
- Overdue issues/count.
- Total story points.
- Done story points.
- Completion percentage.
- Filtered issue list.
- Issues grouped by status.
- Per-column issue counts and story-point totals.
- Sorted issue lists.

Keep summary calculations based on all issues. Keep board column calculations based on filtered issues.

## Story points
- Accept only `1`, `2`, `3`, `5`, or `8`.
- A column's total is the sum of the story points of the issues currently displayed in that filtered column.
- Completion is `Done story points / all issue story points * 100`, rounded to a whole number.
- If all issue story points sum to zero, completion is 0%.
- Do not calculate completion using the number of completed tickets.

## Search debounce
The visible search input may update immediately, but the search used for filtering must update only after 300 ms without typing. Choose an Angular-appropriate implementation that does not create unmanaged subscriptions or unnecessary duplicate state. Clean up any timer/resource when its owner is destroyed.

## Persistence and loading
- Load seed JSON data using `httpResource()` or `resource()` where suitable.
- Restore saved data deliberately and avoid overwriting saved data with seed data during initialization.
- Persist changes only after initialization/restoration is complete.
- Reset must clear saved state and restore seed data reliably.
- Handle loading and errors explicitly.

## linkedSignal()
Use `linkedSignal()` when a value should be reset or recomputed in response to a source signal while remaining writable locally. A suitable example may be a local editable draft tied to the currently selected issue. Do not use it merely to satisfy an API checklist.

## Avoid
- Mutating objects/arrays in place.
- Exposing writable signals to components.
- Effects that update other signals.
- Duplicating values that can be derived with `computed()`.
- Subscribing in components for store state or HTTP loading.
