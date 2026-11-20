# Skill: Angular Components

Use this skill when creating or updating standalone Angular components and their communication.

## Component standards
- Use standalone components.
- Use `ChangeDetectionStrategy.OnPush`.
- Keep each component focused on one responsibility.
- Prefer small reusable components over a single large component.
- Components display state and forward user intent; `IssueStore` owns issue data and business rules.

## Modern signal-based component APIs
- Use `input()` for optional inputs.
- Use `input.required()` for required inputs.
- Use `output()` for component events.
- Use `model()` only when a value genuinely needs two-way binding.
- Do not use decorator-based `@Input` or `@Output`.
- Do not use `EventEmitter`.
- Do not use `ngOnChanges`.

## Suggested Issue Tracker responsibilities
### Board/container
- Coordinates board layout, filters, selected issue, and opening the create form.
- Reads store signals and invokes store methods.
- Does not implement business-rule validation.

### IssueCard
- Receives one issue and any display data it needs through signal inputs.
- Displays ID, title, type, priority, assignee, due date, and overdue indicator.
- Emits a selection event using `output()`.
- Does not mutate the issue.

### IssueDetailPanel
- Receives the selected issue.
- Displays all issue fields.
- Supports editing title, priority, assignee, and story points.
- Provides Save and Cancel.
- Calls store methods for changes and status transitions.
- Shows clear validation errors returned by the store.
- Discards an old draft when the selected issue changes.

### Create Issue form
- Collects all required creation fields.
- Validates title (required, minimum 5 characters) and due date (not in the past).
- Disables Save while invalid.
- Calls the store to create; store validates again and assigns the next ID/status.

## Templates
- Use `@if` and `@for`, not `*ngIf` or `*ngFor`.
- Include a stable `track` expression in every `@for`.
- Use accessible labels and native semantic elements where appropriate.
- Avoid unnecessary subscriptions in components.
- Make loading, error, empty, and validation states explicit.

## State and business rules
- Read readonly signals from the store.
- Invoke store methods for updates.
- Never directly update an issue's status, assignee, or story points in a component.
- The store must validate a proposed operation before changing its signals.
