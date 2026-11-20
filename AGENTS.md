# AGENTS.md — Angular Signals Issue Tracker

## 1. Project goal
Build a Kanban-style Issue Tracker using Angular 22 and signal-based APIs. Follow the assignment requirements exactly. Prefer a clear, maintainable implementation over unnecessary features.

## 2. Working approach
- Before making changes, inspect the existing project structure and read this file plus relevant files in `skills/`.
- Work incrementally. Implement only the scope requested in the current task.
- Explain what you changed, which files were affected, and the important Angular concepts in beginner-friendly language.
- Do not silently skip requirements. If a requirement cannot be implemented, explain why.
- Run the relevant checks after each meaningful change. Do not claim something works unless it has been checked.
- Do not automatically commit or push Git changes. The user handles commits manually.
- Do not delete, overwrite, or discard existing user work without permission.

## 3. Required technology and architecture
- Angular 22.
- Standalone components.
- Default change detection strategy with `ChangeDetectionStrategy.OnPush`.
- Use Angular Signals for shared application state.
- Keep all issue data and business-rule enforcement in an `IssueStore` service.
- Keep writable signals private inside the store and expose readonly signals to consumers.
- Components read state and call store methods; they must not directly mutate issue data.
- Use immutable updates for arrays and objects.
- Use `computed()` for derived state.
- Use `linkedSignal()` where a value needs to stay linked to changing source state while allowing local updates; do not add it artificially if there is no suitable use.
- Use `effect()` only for side effects such as persisting state. Do not use effects to calculate derived state or to copy one signal into another.
- Do not use `BehaviorSubject` as the application store.
- Prefer `httpResource()` or `resource()` for asynchronous loading. Do not use `.subscribe()` in components.
- Prefer Signal Forms when practical; Reactive Forms are acceptable.
- Do not add state-management libraries unless explicitly requested.

## 4. Required Angular APIs and template syntax
- Use `input()`, `input.required()`, `output()`, and `model()` where appropriate.
- Do not use `@Input`, `@Output`, or `EventEmitter`.
- Do not use `ngOnChanges`.
- Use `@if` and `@for` in templates, with a stable `track` expression.
- Do not use `*ngIf` or `*ngFor`.
- Do not set signals inside `effect()`.
- Do not use subscriptions in components to manage HTTP loading or shared state.

## 5. Data model

### Issue
Each issue contains:
- `id`: string, sequential format such as `TRK-101`, `TRK-102`.
- `title`: string.
- `description`: string.
- `type`: `Bug | Task | Story`.
- `priority`: `Critical | High | Medium | Low`.
- `status`: `To Do | In Progress | In Review | Done`.
- `assigneeId`: string or `null`.
- `storyPoints`: one of `1 | 2 | 3 | 5 | 8`.
- `dueDate`: ISO date string or `null`.

### Team member
Each team member contains:
- `id`: string.
- `name`: string.

### Seed data
- `public/issues.json` must contain at least 15 issues.
- `public/team.json` must contain at least 4 team members.
- Include overdue issues, unassigned issues, and at least one team member with 3 issues already in `In Progress`.
- Use realistic, varied seed data and valid references between issues and team members.

## 6. Functional requirements

### FR-1: Kanban board
- Display four columns: `To Do`, `In Progress`, `In Review`, and `Done`.
- Each column header displays the number of issues and the sum of their story points.
- Each card displays issue ID, title, type, priority, assignee name (or `Unassigned`), and due date.
- Show a red `Overdue` label for overdue issues.
- Sort cards by priority (`Critical`, `High`, `Medium`, `Low`), then by earliest due date. Define a consistent rule for null due dates and apply it consistently.

### FR-2: Filters
- Search by issue title or ID, case-insensitively.
- Apply search filtering 300 ms after the user stops typing.
- Assignee filter options: `All`, `Unassigned`, and each team member.
- Priority filter options: `All` and each priority.
- Apply filters across all four columns.
- Display `Showing X of Y issues`.
- Provide a `Clear filters` action.
- Board columns and their counts/points use filtered issues. The `Y` value is the total number of all loaded issues.

### FR-3: Summary bar
Display:
- Open issue count (all issues whose status is not `Done`).
- Overdue issue count.
- Completion percentage.

Completion percentage must be:
`(sum of story points for Done issues / sum of story points for all issues) * 100`, rounded to the nearest whole number. If total story points are zero, return 0%.
Summary values must always use ALL issues, not filtered issues.

### FR-4: Issue detail panel
- Clicking a card opens a side panel showing all issue fields.
- Allow editing of title, priority, assignee, and story points.
- Provide Save and Cancel.
- Cancel discards unsaved changes.
- Clicking another issue while editing discards the previous unsaved changes and opens the newly selected issue.
- Display only status transition actions allowed by BR-1.
- Store methods, not components, enforce business rules.

### FR-5: Create issue
Provide a New Issue form with:
- Title, description, type, priority, story points, due date, and optional assignee.
- Title is required and must contain at least 5 characters.
- Due date cannot be in the past.
- Disable Save while the form is invalid.
- Generate the next sequential ID (for example, `TRK-116` after `TRK-115`).
- New issues start in `To Do`.
- Validate again in the store before adding the issue.

### FR-6: Loading, persistence, and reset
- Show loading and error states while loading JSON data.
- Load seed data from the JSON files.
- Persist changes so they survive a page refresh.
- Provide Reset data to clear saved changes and reload the original seed data.
- Avoid race conditions between initial loading, restoring persisted data, and persistence effects.

## 7. Business rules — enforce in IssueStore

### BR-1: Allowed status transitions
- `To Do` → `In Progress`
- `In Progress` → `In Review` or `To Do`
- `In Review` → `Done` or `In Progress`
- `Done` → `To Do` (reopen)
Reject all other transitions.

### BR-2: Assignee requirement
- An issue cannot move to `In Progress` without an assignee.
- An issue already in `In Progress` cannot be unassigned.

### BR-3: Work-in-progress limit
- A team member may have at most 3 issues in `In Progress`.
- Reject a move or reassignment that would exceed the limit.
- Moving an issue already assigned to the same member within the applicable workflow must not be incorrectly counted as an additional issue.
- Return a clear, user-readable validation message.

### BR-4: Story point values
Only allow `1`, `2`, `3`, `5`, or `8`. Validate on creation and editing.

### BR-5: Reopening a Done issue
- When moving `Done` → `To Do`, clear its due date.
- A due date must be set before that issue can move to `In Progress` again.
- Enforce this in the store.

### BR-6: Overdue definition
An issue is overdue when its due date is earlier than today's date and its status is not `Done`. An issue due today is not overdue. Compare date-only values consistently and avoid timezone-related off-by-one errors.

### BR-7: Completion
Use story-point-weighted completion as specified in FR-3. If total points are zero, completion is 0%.

### BR-8: Filter scope
- Summary bar calculations always use all issues.
- Board cards, column counts, and column story-point totals use filtered issues.
- `Showing X of Y issues` uses filtered count for X and all issue count for Y.

### Validation integrity
- Validate proposed changes before changing any signal.
- If a store operation is rejected, leave the state unchanged.
- Return a result or clear error that the UI can display.
- Keep all business-rule logic in the store, not duplicated in components.

## 8. Components and responsibilities
At minimum, keep these concerns separate:
- Main board/container component: coordinates layout and selected issue.
- `IssueCard`: reusable presentation component for one issue; receives data through signal inputs and emits user actions through outputs.
- `IssueDetailPanel`: displays and edits the selected issue.
- Create Issue form: handles user input and form-level feedback.
- `IssueStore`: owns issue/team state, derived state, persistence, and business rules.

Use sensible component names and file organization. Avoid putting the entire application in one component.

## 9. UI and accessibility
- Create a clean, readable Kanban interface that works on desktop and smaller screens.
- Make status, priority, and overdue state visually distinguishable without relying on color alone.
- Use clear labels, keyboard-accessible controls, visible focus states, and appropriate form error messages.
- Include loading, error, empty-board, and no-filter-results states.
- Avoid decorative complexity that makes the assignment harder to use or maintain.

## 10. Verification checklist
Before declaring the assignment complete, verify:

### Data and loading
- At least 15 seed issues and 4 team members load.
- Seed data includes overdue, unassigned, and a member with 3 In Progress issues.
- Loading and error states are visible and understandable.
- Changes survive refresh; Reset restores seed data.

### Board and filters
- Four columns render correctly.
- Cards show all required fields and overdue labels.
- Priority and due-date sorting works.
- Search is case-insensitive and debounced by 300 ms.
- Assignee and priority filters work together.
- Clear filters works.
- Filtered counts and points differ appropriately from all-issue summary calculations.

### Summary and story points
- Open count excludes Done issues.
- Overdue count follows BR-6.
- Column story-point totals are correct.
- Completion uses Done story points divided by all story points, rounded to a whole number.
- Zero total story points returns 0%.

### Detail, create, and business rules
- Edit, Save, and Cancel work.
- Switching selected issue discards unsaved edits.
- Only allowed status transitions are offered and accepted.
- No transition to In Progress without an assignee.
- In Progress issue cannot be unassigned.
- WIP limit of 3 is enforced for moves and reassignment.
- Invalid story points are rejected.
- Reopening Done clears due date; a due date is required before returning to In Progress.
- Create form validates title and due date; Save is disabled when invalid.
- New IDs are sequential and new issues start in To Do.
- Rejected store operations do not mutate state.

### Technical checks
- Standalone components and OnPush are used.
- Signal APIs and template control flow follow the rules above.
- No forbidden legacy APIs or component subscriptions are introduced.
- Business rules reside in IssueStore.
- Run the production build and relevant automated tests.
- Report checks that passed, failed, or remain unverified. Do not claim full completion if any required item is outstanding.

## 11. Final response after each task
Briefly state:
1. What was implemented.
2. Files created or changed.
3. Important concepts explained simply.
4. Commands/checks run and their actual results.
5. Remaining work or known limitations.
