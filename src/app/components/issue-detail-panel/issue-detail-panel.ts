import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import {
  FormField,
  form,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import {
  ISSUE_PRIORITIES,
  Issue,
  IssueEdit,
  IssuePriority,
  IssueStatus,
  STORY_POINT_VALUES,
  TeamMember,
  isStoryPoints,
} from '../../models/issue';

interface IssueEditFormModel {
  id: string;
  title: string;
  priority: IssuePriority;
  assigneeId: string;
  storyPoints: string;
  dueDate: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField],
  selector: 'app-issue-detail-panel',
  templateUrl: './issue-detail-panel.html',
  styleUrl: './issue-detail-panel.css',
})
export class IssueDetailPanelComponent {
  readonly issue = input.required<Issue>();
  readonly team = input.required<TeamMember[]>();
  readonly allowedTransitions = input.required<readonly IssueStatus[]>();
  readonly assigneeName = input.required<string>();
  readonly overdue = input(false);
  readonly feedback = input('');
  readonly closed = output<void>();
  readonly saved = output<IssueEdit>();
  readonly transitionRequested = output<IssueStatus>();
  readonly priorities = ISSUE_PRIORITIES;
  readonly pointValues = STORY_POINT_VALUES;
  readonly draft = linkedSignal(() => this.toFormModel(this.issue()));
  protected readonly issueForm = form(this.draft, (fields) => {
    required(fields.title, { message: 'Title is required.' });
    minLength(fields.title, 5, { message: 'Use at least 5 characters.' });
    validate(fields.title, ({ value }) =>
      value().trim().length < 5
        ? { kind: 'title-minimum', message: 'Use at least 5 non-space characters.' }
        : undefined,
    );
    validate(fields.storyPoints, ({ value }) =>
      isStoryPoints(Number(value()))
        ? undefined
        : { kind: 'invalid-story-points', message: 'Choose 1, 2, 3, 5, or 8 points.' },
    );
  });
  protected readonly valid = computed(() => this.issueForm().valid());

  protected save(): void {
    if (!this.valid()) {
      return;
    }

    const draft = this.draft();
    const storyPoints = Number(draft.storyPoints);
    if (!isStoryPoints(storyPoints)) {
      return;
    }
    this.saved.emit({
      id: draft.id,
      title: draft.title,
      priority: draft.priority,
      assigneeId: draft.assigneeId || null,
      storyPoints,
      dueDate: draft.dueDate || null,
    });
  }

  protected transition(status: IssueStatus): void {
    this.transitionRequested.emit(status);
  }

  private toFormModel(issue: Issue): IssueEditFormModel {
    return {
      id: issue.id,
      title: issue.title,
      priority: issue.priority,
      assigneeId: issue.assigneeId ?? '',
      storyPoints: String(issue.storyPoints),
      dueDate: issue.dueDate ?? '',
    };
  }
}
