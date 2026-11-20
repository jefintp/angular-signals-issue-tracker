# Skill: Angular UI Design

Use this skill when designing the Issue Tracker's layout, visual hierarchy, responsive behavior, and interaction feedback.

## Design goals
- Make the board easy to scan and use.
- Prioritize clarity and consistency over visual effects.
- Keep the interface professional, calm, and responsive.
- Do not add unrelated features that are outside the assignment.

## Board layout
- Show four clearly named columns: To Do, In Progress, In Review, Done.
- Each column header shows both issue count and total story points.
- Make the board usable on smaller screens with responsive columns or horizontal scrolling that is intentional and discoverable.
- Keep card spacing, typography, and alignment consistent.

## Issue cards
Display:
- Issue ID and title.
- Type and priority.
- Assignee name or `Unassigned`.
- Due date.
- Red `Overdue` label when the issue is overdue.

Use consistent priority styling. Do not communicate priority or status through color alone; include text labels or other visual cues.

## Story points and summaries
- Make story points easy to find on each card.
- Show the total story points in each column header alongside the issue count.
- The summary bar displays open issues, overdue issues, and completion percentage.
- Do not make filtered board values appear to be the all-issue summary values.

## Filters and feedback
- Provide a clearly labeled search input.
- Provide assignee and priority filters.
- Include `Showing X of Y issues` and a visible Clear filters action.
- Distinguish no issues in a column from no results matching the filters.
- Give feedback when a save, transition, or validation fails.

## Detail panel and forms
- Make the detail panel visually distinct without obscuring the board unnecessarily.
- Group issue information and editable fields logically.
- Make Save and Cancel easy to identify.
- Use clear field labels, inline validation, and disabled states.
- Explain why an action is unavailable when useful, especially for assignment and WIP-limit restrictions.

## Accessibility and responsive behavior
- Use semantic HTML and associated labels.
- Ensure keyboard navigation and visible focus styles.
- Maintain readable contrast and sensible text sizes.
- Buttons must have clear accessible names.
- Do not rely on color alone for overdue, priority, or status.
- Test the layout at desktop and narrow viewport sizes.

## States to design
- Initial loading.
- Loading error.
- Empty board.
- No matching filter results.
- Validation error.
- Successful save/update feedback.
- Disabled or rejected status transition.
