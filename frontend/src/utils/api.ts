const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const TOKEN_KEY = 'math_visual_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** URL dan ?token= va ?workspace= ni o'qib qaytaradi. token localStorage ga saqlanadi. */
export function captureTokenFromURL(): { token: string | null; workspace: string | null } {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const workspace = params.get('workspace');
  if (token) {
    setToken(token);
  }
  // URL dan token va workspace ni olib tashlash (toza URL qolsin)
  if (token || workspace) {
    params.delete('token');
    params.delete('workspace');
    const remaining = params.toString();
    const clean = window.location.pathname + (remaining ? `?${remaining}` : '');
    window.history.replaceState({}, '', clean);
  }
  return { token: token || getToken(), workspace };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- User ----
export interface User {
  id: number;
  telegram_id: number;
  fullname: string;
  token: string;
  created_at: string;
}

export async function getMe(): Promise<User> {
  return request<User>('/users/me');
}

// ---- Workspace ----
export interface Workspace {
  id: number;
  user_id: number;
  name: string;
  description: string;
  workspace_type: string;
  shapes_count: number;
  created_at: string;
}

export async function listWorkspaces(): Promise<Workspace[]> {
  return request<Workspace[]>('/workspaces/');
}

export async function getWorkspace(id: number): Promise<Workspace> {
  return request<Workspace>(`/workspaces/${id}`);
}

export async function createWorkspace(name: string, description = '', workspace_type = '3D'): Promise<Workspace> {
  return request<Workspace>('/workspaces/', {
    method: 'POST',
    body: JSON.stringify({ name, description, workspace_type }),
  });
}

export async function deleteWorkspaceAPI(id: number): Promise<void> {
  return request<void>(`/workspaces/${id}`, { method: 'DELETE' });
}

// ---- AI ----
export interface GenerateResponse {
  workspace: Workspace;
  shapes_count: number;
}

export async function generateAI(prompt: string): Promise<GenerateResponse> {
  return request<GenerateResponse>('/ai/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

// ---- Shape ----
export interface Shape {
  id: number;
  workspace_id: number;
  name: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
}

export async function listShapes(workspaceId: number): Promise<Shape[]> {
  return request<Shape[]>(`/workspaces/${workspaceId}/shapes/`);
}

export async function createShapeAPI(workspaceId: number, name: string, type: string, data: Record<string, unknown>): Promise<Shape> {
  return request<Shape>(`/workspaces/${workspaceId}/shapes/`, {
    method: 'POST',
    body: JSON.stringify({ name, type, data }),
  });
}

export async function deleteShapeAPI(workspaceId: number, shapeId: number): Promise<void> {
  return request<void>(`/workspaces/${workspaceId}/shapes/${shapeId}`, { method: 'DELETE' });
}
