# Skill: Angular Testing

Use this skill when writing tests or verifying the Issue Tracker. Prefer focused tests of `IssueStore` business rules, then component and integration tests for important user flows.

## Testing principles
- Test observable behavior and business rules, not private implementation details.
- Use deterministic dates and seed data in tests.
- Test both successful and rejected operations.
- For rejected store operations, verify the issue state remains unchanged.
- Run the relevant test command and report the actual result.

## IssueStore test coverage

### Status transitions (BR-1)
Verify every allowed transition:
- To Do → In Progress.
- In Progress → In Review.
- In Progress → To Do.
- In Review → Done.
- In Review → In Progress.
- Done → To Do.

Verify disallowed transitions are rejected and state is unchanged.

### Assignee rules (BR-2)
- Cannot move an unassigned issue to In Progress.
- Cannot unassign an issue while it is In Progress.
- Can assign an issue when the resulting state is valid.

### WIP limit (BR-3)
- A member can have exactly 3 issues In Progress.
- Reject a fourth In Progress issue for that member.
- Enforce the limit when moving an issue and when reassigning one.
- Do not incorrectly count an issue twice when it remains with the same assignee.
- Verify rejected operations do not mutate state.

### Story points (BR-4)
- Accept 1, 2, 3, 5, and 8.
- Reject values outside that set during creation and editing.
- Verify invalid edits leave existing points unchanged.

### Reopening and due dates (BR-5)
- Done → To Do clears the due date.
- An issue reopened to To Do cannot move to In Progress without a due date.
- Setting a valid due date permits the transition if other rules pass.

### Overdue dates (BR-6)
- Yesterday is overdue for a non-Done issue.
- Today is not overdue.
- Future date is not overdue.
- Done issue is not overdue even if its due date is in the past.
- Use a controlled clock or fixed date to avoid flaky tests.

### Completion (BR-7)
- Completion uses Done story points divided by all story points.
- Result is rounded to a whole number.
- Zero total points returns 0%.
- Changing filters does not change summary completion.

### Filtering and board totals (BR-8)
- Search matches title and ID without case sensitivity.
- Search is applied after 300 ms debounce.
- Assignee and priority filters work independently and together.
- Clear filters restores all issues.
- Column counts and story-point totals use filtered issues.
- Summary metrics use all issues.
- `Showing X of Y issues` uses filtered X and total Y.

### Creation and editing
- Title is required and minimum length is 5.
- Past due dates are rejected; today is allowed.
- New IDs are sequential.
- New issues start in To Do.
- Editing and Cancel behavior work as expected.
- Switching selected issues discards the previous unsaved draft.

### Loading and persistence
- Loading state is shown while seed data is loading.
- Loading errors are represented.
- Saved changes survive reload.
- Reset clears persisted changes and restores seed data.
- Initialization does not overwrite saved data prematurely.

## UI/manual verification
Manually verify:
- Four columns and required card fields.
- Overdue indicator.
- Detail panel and create form.
- Save/Cancel and validation feedback.
- Responsive layout and keyboard-accessible controls.
- Loading, error, empty, and no-results states.

## Final verification report
Report:
- Tests and build commands executed.
- Passed and failed checks.
- Bugs fixed.
- Remaining unverified requirements.
Never report a test as passing unless it was actually run.
