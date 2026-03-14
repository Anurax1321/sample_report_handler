import api from './api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthUser {
  username: string;
  is_admin: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  username: string;
  is_admin: boolean;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', { username, password });
  const data = response.data;
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify({ username: data.username, is_admin: data.is_admin }));
  return data;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// --- User management API ---

export interface UserInfo {
  id: number;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export async function fetchUsers(): Promise<UserInfo[]> {
  const response = await api.get<UserInfo[]>('/auth/users');
  return response.data;
}

export async function registerUser(username: string, password: string): Promise<UserInfo> {
  const response = await api.post<UserInfo>('/auth/register', { username, password });
  return response.data;
}

export async function toggleUserActive(userId: number): Promise<UserInfo> {
  const response = await api.patch<UserInfo>(`/auth/users/${userId}/toggle-active`);
  return response.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

// --- Profile API ---

export interface ProfileUpdateResponse {
  user: UserInfo;
  access_token: string | null;
}

export async function updateProfile(username: string): Promise<ProfileUpdateResponse> {
  const response = await api.patch<ProfileUpdateResponse>('/auth/profile', { username });
  const data = response.data;
  // Update stored token and user if username changed
  if (data.access_token) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
  }
  localStorage.setItem(USER_KEY, JSON.stringify({
    username: data.user.username,
    is_admin: data.user.is_admin,
  }));
  return data;
}
