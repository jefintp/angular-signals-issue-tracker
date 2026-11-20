import { computed, Injectable, linkedSignal, resource, signal } from '@angular/core';
import {
  CreateIssueInput,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  Issue,
  IssueEdit,
  IssuePriority,
  IssueStatus,
  isDateOnly,
  isIssuePriority,
  isIssueStatus,
  isIssueType,
  isStoryPoints,
  TeamMember,
} from '../models/issue';

const STORAGE_KEY = 'trackline.issue-tracker.v1';
const PRIORITY_RANK: Record<IssuePriority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};
const TRANSITIONS: Record<IssueStatus, readonly IssueStatus[]> = {
  'To Do': ['In Progress'],
  'In Progress': ['In Review', 'To Do'],
  'In Review': ['Done', 'In Progress'],
  Done: ['To Do'],
};

interface PersistedState {
  issues: Issue[];
  team: TeamMember[];
  reopenedIssueIds: string[];
}

const EMPTY_STATE: PersistedState = {
  issues: [],
  team: [],
  reopenedIssueIds: [],
};

export type IssueOperationResult =
  | { success: true; message: string; issue: Issue }
  | { success: false; message: string };

@Injectable({ providedIn: 'root' })
export class IssueStore {
  private readonly runtimeErrorState = signal<string | null>(null);
  private resolveInitialLoad!: () => void;
  private initialLoadSettled = false;
  readonly ready = new Promise<void>((resolve) => {
    this.resolveInitialLoad = resolve;
  });
  private readonly dataResource = resource<PersistedState, undefined>({
    defaultValue: EMPTY_STATE,
    loader: async ({ abortSignal }) => {
      try {
        return await this.loadInitialData(abortSignal);
      } finally {
        if (!this.initialLoadSettled) {
          this.initialLoadSettled = true;
          this.resolveInitialLoad();
        }
      }
    },
  });
  private readonly issuesState = linkedSignal(() => this.dataResource.value().issues);
  private readonly teamState = linkedSignal(() => this.dataResource.value().team);
  private readonly reopenedIssueIds = linkedSignal(
    () => new Set(this.dataResource.value().reopenedIssueIds),
  );
  private readonly searchTextState = signal('');
  private readonly debouncedSearchState = signal('');
  private readonly assigneeFilterState = signal('all');
  private readonly priorityFilterState = signal<IssuePriority | 'all'>('all');
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly issues = this.issuesState.asReadonly();
  readonly team = this.teamState.asReadonly();
  readonly loading = this.dataResource.isLoading;
  readonly readyForChanges = computed(() => this.dataResource.status() === 'resolved');
  readonly error = computed(() => {
    const runtimeError = this.runtimeErrorState();
    if (runtimeError !== null) {
      return runtimeError;
    }
    if (this.dataResource.status() === 'error') {
      return this.errorMessage(this.dataResource.error(), 'Could not load issue data.');
    }
    return null;
  });
  readonly searchText = this.searchTextState.asReadonly();
  readonly assigneeFilter = this.assigneeFilterState.asReadonly();
  readonly priorityFilter = this.priorityFilterState.asReadonly();
  readonly priorities = ISSUE_PRIORITIES;
  readonly statuses = ISSUE_STATUSES;
  readonly openIssueCount = computed(
    () => this.issuesState().filter((issue) => issue.status !== 'Done').length,
  );
  readonly overdueIssueCount = computed(
    () => this.issuesState().filter((issue) => this.isOverdue(issue)).length,
  );
  readonly completionPercentage = computed(() => {
    const issues = this.issuesState();
    const total = issues.reduce((sum, issue) => sum + issue.storyPoints, 0);
    if (total === 0) {
      return 0;
    }

    const done = issues
      .filter((issue) => issue.status === 'Done')
      .reduce((sum, issue) => sum + issue.storyPoints, 0);
    return Math.round((done / total) * 100);
  });
  readonly filteredIssues = computed(() => {
    const query = this.debouncedSearchState().trim().toLocaleLowerCase();
    const assignee = this.assigneeFilterState();
    const priority = this.priorityFilterState();

    return this.issuesState()
      .filter((issue) => {
        const matchesQuery =
          !query ||
          issue.title.toLocaleLowerCase().includes(query) ||
          issue.id.toLocaleLowerCase().includes(query);
        const matchesAssignee =
          assignee === 'all' ||
          (assignee === 'unassigned' ? issue.assigneeId === null : issue.assigneeId === assignee);
        const matchesPriority = priority === 'all' || issue.priority === priority;
        return matchesQuery && matchesAssignee && matchesPriority;
      })
      .sort((left, right) => {
        const priorityDifference = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
        if (priorityDifference !== 0) {
          return priorityDifference;
        }
        if (left.dueDate === null && right.dueDate !== null) {
          return 1;
        }
        if (left.dueDate !== null && right.dueDate === null) {
          return -1;
        }
        if (left.dueDate !== right.dueDate) {
          return (left.dueDate ?? '').localeCompare(right.dueDate ?? '');
        }
        return left.id.localeCompare(right.id, undefined, { numeric: true });
      });
  });
  readonly issuesByStatus = computed(() => {
    const grouped: Record<IssueStatus, Issue[]> = {
      'To Do': [],
      'In Progress': [],
      'In Review': [],
      Done: [],
    };
    for (const issue of this.filteredIssues()) {
      grouped[issue.status].push(issue);
    }
    return grouped;
  });
  readonly pointsByStatus = computed(() => {
    const grouped = this.issuesByStatus();
    return {
      'To Do': this.sumPoints(grouped['To Do']),
      'In Progress': this.sumPoints(grouped['In Progress']),
      'In Review': this.sumPoints(grouped['In Review']),
      Done: this.sumPoints(grouped.Done),
    };
  });

  reload(): void {
    this.runtimeErrorState.set(null);
    this.dataResource.reload();
  }

  setSearchText(value: string): void {
    this.searchTextState.set(value);
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.debouncedSearchState.set(value);
      this.searchTimer = null;
    }, 300);
  }

  setAssigneeFilter(value: string): void {
    this.assigneeFilterState.set(
      value === 'all' || value === 'unassigned' || this.teamState().some((member) => member.id === value)
        ? value
        : 'all',
    );
  }

  setPriorityFilter(value: string): void {
    this.priorityFilterState.set(value === 'all' || !isIssuePriority(value) ? 'all' : value);
  }

  clearFilters(): void {
    this.searchTextState.set('');
    this.debouncedSearchState.set('');
    this.assigneeFilterState.set('all');
    this.priorityFilterState.set('all');
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  assigneeName(assigneeId: string | null): string {
    if (assigneeId === null) {
      return 'Unassigned';
    }
    return this.teamState().find((member) => member.id === assigneeId)?.name ?? 'Unknown assignee';
  }

  isOverdue(issue: Issue, today = this.today()): boolean {
    return issue.status !== 'Done' && issue.dueDate !== null && issue.dueDate < today;
  }

  statusClass(status: IssueStatus): string {
    switch (status) {
      case 'To Do':
        return 'status-todo';
      case 'In Progress':
        return 'status-progress';
      case 'In Review':
        return 'status-review';
      case 'Done':
        return 'status-done';
    }
  }

  allowedTransitions(status: IssueStatus): readonly IssueStatus[] {
    return TRANSITIONS[status];
  }

  updateIssue(edit: IssueEdit): IssueOperationResult {
    if (!this.readyForChanges()) {
      return this.reject('Issue data is not ready yet.');
    }
    const current = this.issuesState().find((issue) => issue.id === edit.id);
    if (!current) {
      return this.reject('This issue no longer exists.');
    }

    const title = edit.title.trim();
    if (title.length < 5) {
      return this.reject('Title must contain at least 5 characters.');
    }
    if (!isIssuePriority(edit.priority)) {
      return this.reject('Choose a valid priority.');
    }
    if (!isStoryPoints(edit.storyPoints)) {
      return this.reject('Story points must be 1, 2, 3, 5, or 8.');
    }
    if (
      edit.dueDate !== null &&
      (!isDateOnly(edit.dueDate) ||
        (edit.dueDate !== current.dueDate && edit.dueDate < this.today()))
    ) {
      return this.reject('Due date cannot be in the past.');
    }
    if (edit.assigneeId !== null && !this.teamState().some((member) => member.id === edit.assigneeId)) {
      return this.reject('Choose a valid team member.');
    }
    if (current.status === 'In Progress' && edit.assigneeId === null) {
      return this.reject('An issue in progress must have an assignee.');
    }
    if (
      current.status === 'In Progress' &&
      edit.assigneeId !== current.assigneeId &&
      edit.assigneeId !== null &&
      this.countInProgress(edit.assigneeId, current.id) >= 3
    ) {
      return this.reject(`${this.assigneeName(edit.assigneeId)} already has 3 issues in progress.`);
    }

    const updated: Issue = {
      ...current,
      ...edit,
      title,
      storyPoints: edit.storyPoints as Issue['storyPoints'],
    };
    this.commitIssues(this.issuesState().map((issue) => (issue.id === updated.id ? updated : issue)));
    return { success: true, message: 'Issue updated.', issue: updated };
  }

  transitionIssue(issueId: string, nextStatus: IssueStatus): IssueOperationResult {
    if (!this.readyForChanges()) {
      return this.reject('Issue data is not ready yet.');
    }
    const current = this.issuesState().find((issue) => issue.id === issueId);
    if (!current) {
      return this.reject('This issue no longer exists.');
    }
    if (!TRANSITIONS[current.status].includes(nextStatus)) {
      return this.reject(`Moving from ${current.status} to ${nextStatus} is not allowed.`);
    }
    if (nextStatus === 'In Progress') {
      if (current.assigneeId === null) {
        return this.reject('Assign this issue before moving it to In Progress.');
      }
      if (this.reopenedIssueIds().has(current.id) && current.dueDate === null) {
        return this.reject('Set a due date before moving this reopened issue to In Progress.');
      }
      if (this.countInProgress(current.assigneeId, current.id) >= 3) {
        return this.reject(`${this.assigneeName(current.assigneeId)} already has 3 issues in progress.`);
      }
    }

    const updated: Issue = {
      ...current,
      status: nextStatus,
      dueDate: current.status === 'Done' && nextStatus === 'To Do' ? null : current.dueDate,
    };
    if (current.status === 'Done' && nextStatus === 'To Do') {
      this.reopenedIssueIds.update((ids) => new Set([...ids, current.id]));
    }
    if (nextStatus === 'In Progress') {
      this.reopenedIssueIds.update((ids) => {
        const updatedIds = new Set(ids);
        updatedIds.delete(current.id);
        return updatedIds;
      });
    }
    this.commitIssues(this.issuesState().map((issue) => (issue.id === issueId ? updated : issue)));
    return { success: true, message: `Moved to ${nextStatus}.`, issue: updated };
  }

  createIssue(input: CreateIssueInput): IssueOperationResult {
    if (!this.readyForChanges()) {
      return this.reject('Issue data is not ready yet.');
    }
    const title = input.title.trim();
    if (title.length < 5) {
      return this.reject('Title is required and must contain at least 5 characters.');
    }
    if (!isIssueType(input.type)) {
      return this.reject('Choose a valid issue type.');
    }
    if (!isIssuePriority(input.priority)) {
      return this.reject('Choose a valid priority.');
    }
    if (!isStoryPoints(input.storyPoints)) {
      return this.reject('Story points must be 1, 2, 3, 5, or 8.');
    }
    if (input.dueDate !== null && (!isDateOnly(input.dueDate) || input.dueDate < this.today())) {
      return this.reject('Due date cannot be in the past.');
    }
    if (input.assigneeId !== null && !this.teamState().some((member) => member.id === input.assigneeId)) {
      return this.reject('Choose a valid team member.');
    }

    const issue: Issue = {
      ...input,
      id: this.nextIssueId(),
      title,
      status: 'To Do',
    };
    this.commitIssues([...this.issuesState(), issue]);
    return { success: true, message: `Created ${issue.id}.`, issue };
  }

  resetData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.runtimeErrorState.set(null);
      this.dataResource.reload();
    } catch (error) {
      this.runtimeErrorState.set(this.errorMessage(error, 'Could not reset saved data.'));
    }
  }

  private async loadInitialData(abortSignal: AbortSignal): Promise<PersistedState> {
    const [issuesResponse, teamResponse] = await Promise.all([
      fetch('/issues.json', { signal: abortSignal }),
      fetch('/team.json', { signal: abortSignal }),
    ]);
    if (!issuesResponse.ok || !teamResponse.ok) {
      throw new Error('Could not load seed JSON files.');
    }

    const [issueData, teamData]: [unknown, unknown] = await Promise.all([
      issuesResponse.json(),
      teamResponse.json(),
    ]);
    if (!this.isIssueArray(issueData) || !this.isTeamArray(teamData)) {
      throw new Error('Seed data has an invalid format.');
    }
    this.validateReferences(issueData, teamData);

    const saved = localStorage.getItem(STORAGE_KEY);
    const restored = saved === null ? null : this.parsePersistedState(saved);
    return {
      issues: restored?.issues ?? this.cloneIssues(issueData),
      team: restored?.team ?? this.cloneTeam(teamData),
      reopenedIssueIds: restored?.reopenedIssueIds ?? [],
    };
  }

  private parsePersistedState(serialized: string): PersistedState {
    let value: unknown;
    try {
      value = JSON.parse(serialized);
    } catch {
      throw new Error('Saved issue data is corrupted. Reset data to restore the seed board.');
    }
    if (
      typeof value !== 'object' ||
      value === null ||
      !('issues' in value) ||
      !('team' in value) ||
      !('reopenedIssueIds' in value) ||
      !this.isIssueArray(value.issues) ||
      !this.isTeamArray(value.team) ||
      !Array.isArray(value.reopenedIssueIds) ||
      !value.reopenedIssueIds.every((id: unknown) => typeof id === 'string')
    ) {
      throw new Error('Saved issue data has an invalid format. Reset data to restore the seed board.');
    }
    this.validateReferences(value.issues, value.team);
    const savedIssueIds = new Set(value.issues.map((issue) => issue.id));
    if (!value.reopenedIssueIds.every((id: string) => savedIssueIds.has(id))) {
      throw new Error('Saved issue data contains an invalid reopened issue reference.');
    }
    return {
      issues: this.cloneIssues(value.issues),
      team: this.cloneTeam(value.team),
      reopenedIssueIds: [...value.reopenedIssueIds],
    };
  }

  private commitIssues(issues: Issue[]): void {
    this.issuesState.set(issues);
    this.persist();
  }

  private persist(): void {
    try {
      const payload: PersistedState = {
        issues: this.issuesState(),
        team: this.teamState(),
        reopenedIssueIds: [...this.reopenedIssueIds()],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      this.runtimeErrorState.set(null);
    } catch (error) {
      this.runtimeErrorState.set(
        this.errorMessage(error, 'Changes are in memory but could not be saved.'),
      );
    }
  }

  private countInProgress(assigneeId: string, excludedId: string): number {
    return this.issuesState().filter(
      (issue) =>
        issue.id !== excludedId &&
        issue.status === 'In Progress' &&
        issue.assigneeId === assigneeId,
    ).length;
  }

  private nextIssueId(): string {
    const largest = this.issuesState().reduce((highest, issue) => {
      const number = Number(issue.id.match(/^TRK-(\d+)$/)?.[1] ?? 0);
      return Math.max(highest, number);
    }, 100);
    return `TRK-${largest + 1}`;
  }

  private sumPoints(issues: Issue[]): number {
    return issues.reduce((sum, issue) => sum + issue.storyPoints, 0);
  }

  private today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private reject(message: string): IssueOperationResult {
    return { success: false, message };
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  private cloneIssues(issues: Issue[]): Issue[] {
    return issues.map((issue) => ({ ...issue }));
  }

  private cloneTeam(team: TeamMember[]): TeamMember[] {
    return team.map((member) => ({ ...member }));
  }

  private isIssueArray(value: unknown): value is Issue[] {
    return (
      Array.isArray(value) &&
      value.every(
        (issue: unknown) =>
          typeof issue === 'object' &&
          issue !== null &&
          'id' in issue &&
          typeof issue.id === 'string' &&
          'title' in issue &&
          typeof issue.title === 'string' &&
          'description' in issue &&
          typeof issue.description === 'string' &&
          'type' in issue &&
          isIssueType(issue.type) &&
          'priority' in issue &&
          isIssuePriority(issue.priority) &&
          'status' in issue &&
          isIssueStatus(issue.status) &&
          'assigneeId' in issue &&
          (typeof issue.assigneeId === 'string' || issue.assigneeId === null) &&
          'storyPoints' in issue &&
          typeof issue.storyPoints === 'number' &&
          isStoryPoints(issue.storyPoints) &&
          'dueDate' in issue &&
          (issue.dueDate === null || isDateOnly(issue.dueDate)),
      )
    );
  }

  private isTeamArray(value: unknown): value is TeamMember[] {
    return (
      Array.isArray(value) &&
      value.every(
        (member: unknown) =>
          typeof member === 'object' &&
          member !== null &&
          'id' in member &&
          typeof member.id === 'string' &&
          'name' in member &&
          typeof member.name === 'string',
      )
    );
  }

  private validateReferences(issues: Issue[], team: TeamMember[]): void {
    const memberIds = new Set(team.map((member) => member.id));
    const issueIds = new Set<string>();
    for (const issue of issues) {
      if (issueIds.has(issue.id)) {
        throw new Error(`Issue data contains duplicate ID ${issue.id}.`);
      }
      issueIds.add(issue.id);
      if (issue.assigneeId !== null && !memberIds.has(issue.assigneeId)) {
        throw new Error(`Issue ${issue.id} refers to an unknown team member.`);
      }
    }
  }
}
