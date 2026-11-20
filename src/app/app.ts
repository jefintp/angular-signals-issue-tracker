import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IssueCardComponent } from './components/issue-card/issue-card';
import { IssueDetailPanelComponent } from './components/issue-detail-panel/issue-detail-panel';
import { CreateIssuePanelComponent } from './components/create-issue-panel/create-issue-panel';
import { Issue, IssueEdit, IssueStatus } from './models/issue';
import { IssueStore } from './services/issue-store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IssueCardComponent, IssueDetailPanelComponent, CreateIssuePanelComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(IssueStore);
  protected readonly selectedIssueId = signal<string | null>(null);
  protected readonly creatingIssue = signal(false);
  protected readonly feedback = signal('');
  protected readonly selectedIssue = computed(() =>
    this.store.issues().find((issue) => issue.id === this.selectedIssueId()) ?? null,
  );
  protected readonly statuses: readonly IssueStatus[] = [
    'To Do',
    'In Progress',
    'In Review',
    'Done',
  ];

  protected selectIssue(id: string): void {
    this.feedback.set('');
    this.creatingIssue.set(false);
    this.selectedIssueId.set(id);
  }

  protected openCreateForm(): void {
    this.selectedIssueId.set(null);
    this.feedback.set('');
    this.creatingIssue.set(true);
  }

  protected closePanel(): void {
    this.selectedIssueId.set(null);
    this.creatingIssue.set(false);
    this.feedback.set('');
  }

  protected saveIssue(edit: IssueEdit): void {
    const result = this.store.updateIssue(edit);
    this.feedback.set(result.success ? 'Issue updated.' : result.message);
  }

  protected transitionIssue(status: IssueStatus): void {
    const issue = this.selectedIssue();
    if (!issue) {
      return;
    }

    const result = this.store.transitionIssue(issue.id, status);
    this.feedback.set(result.success ? `Moved to ${status}.` : result.message);
  }

  protected createIssue(issue: Omit<Issue, 'id' | 'status'>): void {
    const result = this.store.createIssue(issue);
    if (result.success) {
      this.closePanel();
      this.feedback.set(`Created ${result.issue.id}.`);
    } else {
      this.feedback.set(result.message);
    }
  }

  protected clearFilters(): void {
    this.store.clearFilters();
  }

  protected resetData(): void {
    this.closePanel();
    this.store.resetData();
  }
}
