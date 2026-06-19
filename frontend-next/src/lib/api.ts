const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export type LoginResponse = {
  accessToken: string;
  user: { id: string; name: string; email: string; role: string };
};

export type ScoreSummary = {
  total: number;
  events: Array<{ id: string; action: string; points: number; createdAt: string }>;
};

export type WorkItemType = 'feature' | 'bug' | 'improvement' | 'maintenance';
export type WorkItemStatus = 'backlog' | 'planned' | 'in_progress' | 'qa' | 'ready_for_release' | 'released';
export type WorkItemPriority = 'low' | 'medium' | 'high' | 'urgent';
export type QaStatus = 'pending' | 'passed' | 'failed';
export type DeploymentStatus = 'draft' | 'scheduled' | 'deployed' | 'rolled_back';

export type WorkItem = {
  id: string;
  title: string;
  description: string;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  assignee: string;
  dueDate: string;
  createdBy: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  qaChecks?: QaCheck[];
};

export type QaCheck = {
  id: string;
  workItemId: string;
  testTitle: string;
  expectedResult: string;
  actualResult: string;
  status: QaStatus;
  tester: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Release = {
  id: string;
  version: string;
  releaseDate: string;
  summary: string;
  deploymentStatus: DeploymentStatus;
  workItems: WorkItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('spoton_challenge_token');
}

export function saveToken(token: string) {
  window.localStorage.setItem('spoton_challenge_token', token);
}

export function clearToken() {
  window.localStorage.removeItem('spoton_challenge_token');
}

// ── Project helpers (localStorage) ──────────────────────────────────────────

export type Project = { id: string; name: string; color: string; description: string; createdAt: string };
export type TeamMember = { id: string; name: string; email: string; role: string };

export function getProjects(userId: string): Project[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(`spoton_projects_${userId}`) ?? '[]'); } catch { return []; }
}
export function saveProjects(userId: string, projects: Project[]) {
  localStorage.setItem(`spoton_projects_${userId}`, JSON.stringify(projects));
}

export function getTeam(userId: string, projectId: string): TeamMember[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(`spoton_team_${userId}_${projectId}`) ?? '[]'); } catch { return []; }
}
export function saveTeam(userId: string, projectId: string, members: TeamMember[]) {
  localStorage.setItem(`spoton_team_${userId}_${projectId}`, JSON.stringify(members));
}

export function getActiveProject(userId: string): Project | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(`spoton_active_project_${userId}`) ?? 'null'); } catch { return null; }
}
export function setActiveProject(userId: string, project: Project | null) {
  if (project) {
    localStorage.setItem(`spoton_active_project_${userId}`, JSON.stringify(project));
    localStorage.setItem('spoton_active_pid', project.id);
  } else {
    localStorage.removeItem(`spoton_active_project_${userId}`);
    localStorage.removeItem('spoton_active_pid');
  }
}
export function getActiveProjectId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('spoton_active_pid') ?? '';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message ?? 'Request failed');
  }

  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (name: string, email: string, password: string) =>
    request<LoginResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  me: () => request<LoginResponse['user']>('/auth/me'),

  updateProfile: (name: string, role?: string) =>
    request<LoginResponse>('/auth/profile', { method: 'PATCH', body: JSON.stringify({ name, role }) }),

  score: () => request<ScoreSummary>('/score/me'),

  workItems: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<WorkItem[]>(`/work-items${qs}`);
    },
    assignedToMe: () => request<WorkItem[]>('/work-items/assigned-to-me'),
    get: (id: string) => request<WorkItem>(`/work-items/${id}`),
    create: (body: Partial<WorkItem>) =>
      request<WorkItem>('/work-items', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<WorkItem>) =>
      request<WorkItem>(`/work-items/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) =>
      request<{ message: string }>(`/work-items/${id}`, { method: 'DELETE' }),
    activities: (id: string) =>
      request<Array<{ id: string; workItemId: string; changedById: string; changedByName: string; fromStatus: string; toStatus: string; createdAt: string }>>(`/work-items/${id}/activities`),
  },

  qaChecks: {
    listByWorkItem: (workItemId: string) => request<QaCheck[]>(`/qa-checks/work-item/${workItemId}`),
    create: (body: Partial<QaCheck>) =>
      request<QaCheck>('/qa-checks', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<QaCheck>) =>
      request<QaCheck>(`/qa-checks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) =>
      request<{ message: string }>(`/qa-checks/${id}`, { method: 'DELETE' }),
  },

  messages: {
    threads: () => request<Array<{ partnerId: string; partnerName: string; lastMessage: { content: string; fromId: string; createdAt: string }; unread: number }>>('/messages/threads'),
    conversation: (otherId: string) => request<Array<{ id: string; fromId: string; fromName: string; toId: string; toName: string; content: string; read: boolean; createdAt: string }>>(`/messages/conversation/${otherId}`),
    send: (toId: string, toName: string, content: string) => request<{ id: string }>('/messages', { method: 'POST', body: JSON.stringify({ toId, toName, content }) }),
    unread: () => request<number>('/messages/unread'),
  },

  members: {
    list: () => request<Array<{ id: string; name: string; email: string; role: string; createdAt: string }>>('/auth/members'),
    create: (body: { name: string; email: string; password: string; role?: string }) =>
      request<{ id: string; name: string; email: string; role: string; createdAt: string }>('/auth/members', { method: 'POST', body: JSON.stringify(body) }),
    resetPassword: (id: string, password: string) =>
      request<{ message: string }>(`/auth/members/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) }),
  },

  auth: {
    forgotPassword: (email: string) =>
      request<{ message: string; code: string | null; expiresIn?: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (code: string, password: string) =>
      request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ code, password }) }),
  },

  releases: {
    list: () => request<Release[]>('/releases'),
    get: (id: string) => request<Release>(`/releases/${id}`),
    create: (body: Partial<Release> & { workItemIds?: string[] }) =>
      request<Release>('/releases', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Release> & { workItemIds?: string[] }) =>
      request<Release>(`/releases/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) =>
      request<{ message: string }>(`/releases/${id}`, { method: 'DELETE' }),
  },
};
