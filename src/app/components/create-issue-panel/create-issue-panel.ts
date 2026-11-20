import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  FormField,
  form,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import {
  CreateIssueInput,
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  IssuePriority,
  IssueType,
  STORY_POINT_VALUES,
  TeamMember,
  isDateOnly,
  isStoryPoints,
} from '../../models/issue';

interface CreateIssueFormModel {
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  storyPoints: string;
  assigneeId: string;
  dueDate: string;
}

const initialDraft = (): CreateIssueFormModel => ({
  title: '',
  description: '',
  type: 'Task',
  priority: 'Medium',
  assigneeId: '',
  storyPoints: '3',
  dueDate: '',
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField],
  selector: 'app-create-issue-panel',
  templateUrl: './create-issue-panel.html',
  styleUrl: './create-issue-panel.css',
})
export class CreateIssuePanelComponent {
  readonly team = input.required<TeamMember[]>();
  readonly feedback = input('');
  readonly closed = output<void>();
  readonly created = output<CreateIssueInput>();
  protected readonly draft = signal<CreateIssueFormModel>(initialDraft());
  protected readonly types = ISSUE_TYPES;
  protected readonly priorities = ISSUE_PRIORITIES;
  protected readonly pointValues = STORY_POINT_VALUES;
  protected readonly today = this.localToday();
  protected readonly issueForm = form(this.draft, (fields) => {
    required(fields.title, { message: 'Title is required.' });
    minLength(fields.title, 5, { message: 'Use at least 5 characters.' });
    validate(fields.title, ({ value }) =>
      value().trim().length < 5
        ? { kind: 'title-minimum', message: 'Use at least 5 non-space characters.' }
        : undefined,
    );
    validate(fields.dueDate, ({ value }) => {
      const dueDate = value();
      return dueDate && (!isDateOnly(dueDate) || dueDate < this.today)
        ? { kind: 'past-due-date', message: 'Due date cannot be in the past.' }
        : undefined;
    });
    validate(fields.storyPoints, ({ value }) =>
      isStoryPoints(Number(value()))
        ? undefined
        : { kind: 'invalid-story-points', message: 'Choose 1, 2, 3, 5, or 8 points.' },
    );
  });
  protected readonly valid = computed(() => this.issueForm().valid());

  protected submit(): void {
    if (!this.valid()) {
      return;
    }

    const draft = this.draft();
    const storyPoints = Number(draft.storyPoints);
    if (!isStoryPoints(storyPoints)) {
      return;
    }

    this.created.emit({
      title: draft.title,
      description: draft.description,
      type: draft.type,
      priority: draft.priority,
      storyPoints,
      assigneeId: draft.assigneeId || null,
      dueDate: draft.dueDate || null,
    });
  }

  private localToday(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
