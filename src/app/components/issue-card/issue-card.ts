import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Issue } from '../../models/issue';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-issue-card',
  templateUrl: './issue-card.html',
  styleUrl: './issue-card.css',
})
export class IssueCardComponent {
  readonly issue = input.required<Issue>();
  readonly assigneeName = input.required<string>();
  readonly overdue = input(false);
  readonly selected = output<string>();
}
