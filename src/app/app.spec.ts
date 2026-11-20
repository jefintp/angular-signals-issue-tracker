import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Issue, TeamMember } from './models/issue';
import { IssueStore } from './services/issue-store';

const team: TeamMember[] = [
  { id: 'member-one', name: 'One Member' },
  { id: 'member-two', name: 'Two Member' },
];

const today = (): string => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const offsetDate = (offset: number): string => {
  const date = new Date(`${today()}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
  id: 'TRK-101',
  title: 'Review account permissions',
  description: 'Check the current access rules.',
  type: 'Task',
  priority: 'Medium',
  status: 'To Do',
  assigneeId: 'member-one',
  storyPoints: 3,
  dueDate: offsetDate(2),
  ...overrides,
});

const baseIssues: Issue[] = [
  makeIssue({ id: 'TRK-101', status: 'In Progress', assigneeId: 'member-one', priority: 'High' }),
  makeIssue({
    id: 'TRK-102',
    title: 'Investigate duplicate alerts',
    status: 'To Do',
    assigneeId: null,
    priority: 'Critical',
    dueDate: offsetDate(-1),
  }),
  makeIssue({
    id: 'TRK-103',
    title: 'Review completed export',
    status: 'Done',
    storyPoints: 5,
    priority: 'Low',
    dueDate: offsetDate(-2),
  }),
];

function mockSeedFetch(issues: Issue[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      json: async () => (String(input).includes('issues.json') ? issues : team),
    })),
  );
}

async function createStore(issues = baseIssues): Promise<IssueStore> {
  localStorage.clear();
  mockSeedFetch(issues);
  const store = TestBed.runInInjectionContext(() => new IssueStore());
  await waitForReady(store);
  return store;
}

async function waitForReady(store: IssueStore): Promise<void> {
  await store.ready;
  await vi.waitFor(() => {
    expect(store.readyForChanges()).toBe(true);
  });
}

describe('IssueStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    vi.useRealTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('keeps summary metrics independent from board filters and computes weighted completion', async () => {
    const store = await createStore();
    store.setPriorityFilter('Critical');

    expect(store.filteredIssues().map((issue) => issue.id)).toEqual(['TRK-102']);
    expect(store.openIssueCount()).toBe(2);
    expect(store.overdueIssueCount()).toBe(1);
    expect(store.completionPercentage()).toBe(45);
    expect(store.pointsByStatus()['To Do']).toBe(3);
  });

  it('rejects a reassignment that would exceed the assignee WIP limit without changing state', async () => {
    const issues = [
      makeIssue({ id: 'TRK-101', status: 'In Progress', assigneeId: 'member-one' }),
      makeIssue({ id: 'TRK-102', status: 'In Progress', assigneeId: 'member-two' }),
      makeIssue({ id: 'TRK-103', status: 'In Progress', assigneeId: 'member-two' }),
      makeIssue({ id: 'TRK-104', status: 'In Progress', assigneeId: 'member-two' }),
    ];
    const store = await createStore(issues);
    const original = store.issues().find((issue) => issue.id === 'TRK-101');

    const result = store.updateIssue({
      id: 'TRK-101',
      title: 'Review account permissions',
      priority: 'Medium',
      assigneeId: 'member-two',
      storyPoints: 3,
      dueDate: offsetDate(2),
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('already has 3 issues in progress');
    expect(store.issues().find((issue) => issue.id === 'TRK-101')).toEqual(original);
  });

  it('requires an assignee when entering and staying in progress', async () => {
    const unassignedTodo = makeIssue({ id: 'TRK-101', assigneeId: null });
    const assignedInProgress = makeIssue({
      id: 'TRK-102',
      status: 'In Progress',
      assigneeId: 'member-one',
    });
    const store = await createStore([unassignedTodo, assignedInProgress]);

    const moveResult = store.transitionIssue('TRK-101', 'In Progress');
    expect(moveResult.success).toBe(false);
    expect(store.issues()[0]).toEqual(unassignedTodo);

    const unassignResult = store.updateIssue({
      id: 'TRK-102',
      title: assignedInProgress.title,
      priority: assignedInProgress.priority,
      assigneeId: null,
      storyPoints: assignedInProgress.storyPoints,
      dueDate: assignedInProgress.dueDate,
    });
    expect(unassignResult.success).toBe(false);
    expect(store.issues()[1]).toEqual(assignedInProgress);
  });

  it('rejects moving an issue into progress when its assignee is at the WIP limit', async () => {
    const issues = [
      makeIssue({ id: 'TRK-101', status: 'In Progress', assigneeId: 'member-one' }),
      makeIssue({ id: 'TRK-102', status: 'In Progress', assigneeId: 'member-one' }),
      makeIssue({ id: 'TRK-103', status: 'In Progress', assigneeId: 'member-one' }),
      makeIssue({ id: 'TRK-104', status: 'To Do', assigneeId: 'member-one' }),
    ];
    const store = await createStore(issues);

    const result = store.transitionIssue('TRK-104', 'In Progress');

    expect(result.success).toBe(false);
    expect(result.message).toContain('already has 3 issues in progress');
    expect(store.issues().find((issue) => issue.id === 'TRK-104')).toEqual(issues[3]);
  });

  it('rejects invalid status transitions and story-point values without mutating state', async () => {
    const doneIssue = makeIssue({ id: 'TRK-101', status: 'Done' });
    const store = await createStore([doneIssue]);

    const transition = store.transitionIssue('TRK-101', 'In Progress');
    expect(transition.success).toBe(false);
    expect(store.issues()[0]).toEqual(doneIssue);

    const edit = store.updateIssue({
      id: 'TRK-101',
      title: doneIssue.title,
      priority: doneIssue.priority,
      assigneeId: doneIssue.assigneeId,
      storyPoints: 4,
      dueDate: doneIssue.dueDate,
    });
    expect(edit.success).toBe(false);
    expect(store.issues()[0]).toEqual(doneIssue);
  });

  it('allows editing other fields on an overdue issue without changing its past due date', async () => {
    const overdueIssue = makeIssue({
      id: 'TRK-101',
      status: 'In Progress',
      dueDate: offsetDate(-1),
    });
    const store = await createStore([overdueIssue]);

    const result = store.updateIssue({
      id: overdueIssue.id,
      title: 'Review updated account permissions',
      priority: 'High',
      assigneeId: 'member-one',
      storyPoints: 3,
      dueDate: overdueIssue.dueDate,
    });

    expect(result.success).toBe(true);
    expect(store.issues()[0].dueDate).toBe(overdueIssue.dueDate);
  });

  it('clears a due date on reopen and requires a new one before returning to progress', async () => {
    const store = await createStore([
      makeIssue({ id: 'TRK-101', status: 'Done', dueDate: offsetDate(-1) }),
    ]);

    expect(store.transitionIssue('TRK-101', 'To Do').success).toBe(true);
    expect(store.issues()[0].dueDate).toBeNull();
    const blocked = store.transitionIssue('TRK-101', 'In Progress');
    expect(blocked.success).toBe(false);
    expect(store.issues()[0].status).toBe('To Do');

    const updated = store.updateIssue({
      id: 'TRK-101',
      title: 'Review account permissions',
      priority: 'Medium',
      assigneeId: 'member-one',
      storyPoints: 3,
      dueDate: offsetDate(4),
    });
    expect(updated.success).toBe(true);
    expect(store.transitionIssue('TRK-101', 'In Progress').success).toBe(true);
  });

  it('debounces case-insensitive search by 300 milliseconds', async () => {
    const store = await createStore();
    vi.useFakeTimers();

    store.setSearchText('ACCOUNT');
    expect(store.filteredIssues()).toHaveLength(3);
    vi.advanceTimersByTime(299);
    expect(store.filteredIssues()).toHaveLength(3);
    vi.advanceTimersByTime(1);
    expect(store.filteredIssues().map((issue) => issue.id)).toEqual(['TRK-101']);
  });

  it('validates creation and assigns the next sequential ID', async () => {
    const store = await createStore();
    const invalid = store.createIssue({
      title: 'No',
      description: '',
      type: 'Task',
      priority: 'Medium',
      assigneeId: null,
      storyPoints: 3,
      dueDate: null,
    });
    expect(invalid.success).toBe(false);
    expect(store.issues()).toHaveLength(3);

    const created = store.createIssue({
      title: 'Add project search',
      description: 'Search all project work.',
      type: 'Story',
      priority: 'High',
      assigneeId: null,
      storyPoints: 5,
      dueDate: null,
    });
    expect(created.success).toBe(true);
    if (!created.success) {
      throw new Error(created.message);
    }
    expect(created.issue.id).toBe('TRK-104');
    expect(created.issue.status).toBe('To Do');
  });

  it('rejects creating an issue with a past due date without changing the board', async () => {
    const store = await createStore();

    const result = store.createIssue({
      title: 'Add project search',
      description: '',
      type: 'Story',
      priority: 'High',
      assigneeId: null,
      storyPoints: 5,
      dueDate: offsetDate(-1),
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Due date cannot be in the past');
    expect(store.issues()).toHaveLength(baseIssues.length);
  });

  it('combines assignee and priority filters and sorts by priority then due date', async () => {
    const store = await createStore([
      makeIssue({ id: 'TRK-101', priority: 'Medium', dueDate: offsetDate(1) }),
      makeIssue({ id: 'TRK-102', priority: 'High', dueDate: offsetDate(3) }),
      makeIssue({ id: 'TRK-103', priority: 'High', dueDate: offsetDate(1) }),
      makeIssue({
        id: 'TRK-104',
        priority: 'Critical',
        assigneeId: 'member-two',
        dueDate: offsetDate(0),
      }),
    ]);

    expect(store.filteredIssues().map((issue) => issue.id)).toEqual([
      'TRK-104',
      'TRK-103',
      'TRK-102',
      'TRK-101',
    ]);

    store.setAssigneeFilter('member-one');
    store.setPriorityFilter('High');
    expect(store.filteredIssues().map((issue) => issue.id)).toEqual(['TRK-103', 'TRK-102']);
  });

  it('does not mutate or persist issues before seed data has loaded', async () => {
    let resolveIssues: ((value: { ok: boolean; json: () => Promise<unknown> }) => void) | undefined;
    const response = (value: unknown) => ({
      ok: true,
      json: async () => value,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        if (String(input).includes('issues.json')) {
          return new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
            resolveIssues = resolve;
          });
        }
        return Promise.resolve(response(team));
      }),
    );
    const store = TestBed.runInInjectionContext(() => new IssueStore());

    const result = store.createIssue({
      title: 'Add project search',
      description: '',
      type: 'Story',
      priority: 'High',
      assigneeId: null,
      storyPoints: 5,
      dueDate: null,
    });
    expect(result.success).toBe(false);
    expect(store.issues()).toHaveLength(0);
    expect(localStorage.getItem('trackline.issue-tracker.v1')).toBeNull();

    await vi.waitFor(() => {
      expect(resolveIssues).toBeTypeOf('function');
    });
    const resolve = resolveIssues;
    if (!resolve) {
      throw new Error('Issue seed request was not started.');
    }
    resolve(response(baseIssues));
    await waitForReady(store);
    expect(store.readyForChanges()).toBe(true);
  });

  it('restores persisted updates when a new store instance loads', async () => {
    const store = await createStore();
    const saved = store.transitionIssue('TRK-102', 'In Progress');
    expect(saved.success).toBe(false);

    const changed = store.updateIssue({
      id: 'TRK-101',
      title: 'Review account permissions',
      priority: 'Critical',
      assigneeId: 'member-one',
      storyPoints: 3,
      dueDate: offsetDate(2),
    });
    expect(changed.success).toBe(true);

    mockSeedFetch(baseIssues);
    const restored = TestBed.runInInjectionContext(() => new IssueStore());
    await waitForReady(restored);
    expect(restored.issues().find((issue) => issue.id === 'TRK-101')?.priority).toBe('Critical');
  });

  it('surfaces seed loading errors and allows reset to reload the seed data', async () => {
    localStorage.setItem('trackline.issue-tracker.v1', '{invalid');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => {
          throw new Error('Seed request failed.');
        },
      })),
    );
    const store = TestBed.runInInjectionContext(() => new IssueStore());
    await store.ready;
    await vi.waitFor(() => {
      expect(store.error()).toContain('Seed request failed.');
    });

    mockSeedFetch(baseIssues);
    store.resetData();
    await vi.waitFor(() => {
      expect(store.readyForChanges()).toBe(true);
      expect(store.issues()).toHaveLength(baseIssues.length);
    });
    expect(store.error()).toBeNull();
  });

  it('clears persisted changes and restores seed values on reset', async () => {
    const store = await createStore();
    expect(
      store.updateIssue({
        id: 'TRK-101',
        title: 'Review account permissions',
        priority: 'Critical',
        assigneeId: 'member-one',
        storyPoints: 3,
        dueDate: offsetDate(2),
      }).success,
    ).toBe(true);

    store.resetData();
    await vi.waitFor(() => {
      expect(store.issues()[0].priority).toBe('High');
    });
    expect(localStorage.getItem('trackline.issue-tracker.v1')).toBeNull();
  });
});
