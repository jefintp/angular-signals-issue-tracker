export const ISSUE_STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'] as const;
export const ISSUE_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export const ISSUE_TYPES = ['Bug', 'Task', 'Story'] as const;
export const STORY_POINT_VALUES = [1, 2, 3, 5, 8] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];
export type IssueType = (typeof ISSUE_TYPES)[number];
export type StoryPoints = (typeof STORY_POINT_VALUES)[number];

export interface Issue {
  id: string;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  assigneeId: string | null;
  storyPoints: StoryPoints;
  dueDate: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
}

export interface IssueEdit {
  id: string;
  title: string;
  priority: IssuePriority;
  assigneeId: string | null;
  storyPoints: number;
  dueDate: string | null;
}

export type CreateIssueInput = Omit<Issue, 'id' | 'status'>;

export type OperationResult =
  | { success: true; message: string }
  | { success: false; message: string };

export function isIssueStatus(value: unknown): value is IssueStatus {
  return typeof value === 'string' && ISSUE_STATUSES.includes(value as IssueStatus);
}

export function isIssuePriority(value: unknown): value is IssuePriority {
  return typeof value === 'string' && ISSUE_PRIORITIES.includes(value as IssuePriority);
}

export function isIssueType(value: unknown): value is IssueType {
  return typeof value === 'string' && ISSUE_TYPES.includes(value as IssueType);
}

export function isStoryPoints(value: number): value is StoryPoints {
  return STORY_POINT_VALUES.includes(value as StoryPoints);
}

export function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
