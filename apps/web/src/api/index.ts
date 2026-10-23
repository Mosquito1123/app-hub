// 所有接口封装，路径/字段与 docs/API.md 契约严格对应
import client from './client'
import type {
  AppDetail,
  AppItem,
  AppStats,
  AuthConfig,
  Build,
  LoginResponse,
  Platform,
  PublicApp,
  Role,
  UserAdmin,
  UserMe,
} from '@/types'

export async function getAuthConfig(): Promise<AuthConfig> {
  const { data } = await client.get<AuthConfig>('/auth/config')
  return data
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/login', { username, password })
  return data
}

export async function register(username: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/register', { username, password })
  return data
}

export async function fetchMe(): Promise<UserMe> {
  const { data } = await client.get<UserMe>('/auth/me')
  return data
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await client.post('/auth/change-password', { oldPassword, newPassword })
}

export async function listUsers(): Promise<UserAdmin[]> {
  const { data } = await client.get<UserAdmin[]>('/users')
  return data
}

export async function createUser(payload: {
  username: string
  password: string
  role?: Role
}): Promise<UserAdmin> {
  const { data } = await client.post<UserAdmin>('/users', payload)
  return data
}

export async function updateUser(
  id: number,
  payload: { role?: Role; disabled?: boolean; newPassword?: string },
): Promise<UserAdmin> {
  const { data } = await client.patch<UserAdmin>(`/users/${id}`, payload)
  return data
}

export async function deleteUser(id: number): Promise<void> {
  await client.delete(`/users/${id}`)
}

export async function fetchApps(params: { q?: string; platform?: Platform } = {}): Promise<AppItem[]> {
  const { data } = await client.get<AppItem[]>('/apps', {
    params: { q: params.q || undefined, platform: params.platform || undefined },
  })
  return data
}

export async function createApp(payload: {
  name: string
  bundleId: string
  description?: string
}): Promise<AppItem> {
  const { data } = await client.post<AppItem>('/apps', payload)
  return data
}

export async function fetchApp(id: string | number): Promise<AppDetail> {
  const { data } = await client.get<AppDetail>(`/apps/${id}`)
  return data
}

export async function deleteApp(id: string | number): Promise<void> {
  await client.delete(`/apps/${id}`)
}

export async function updateApp(
  id: string | number,
  payload: { name?: string; description?: string; sharePassword?: string },
): Promise<AppItem> {
  const { data } = await client.patch<AppItem>(`/apps/${id}`, payload)
  return data
}

export async function uploadIcon(id: string | number, file: File): Promise<{ iconUrl: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await client.post<{ iconUrl: string }>(`/apps/${id}/icon`, fd)
  return data
}

export async function getAppStats(id: string | number): Promise<AppStats> {
  const { data } = await client.get<AppStats>(`/apps/${id}/stats`)
  return data
}

export async function uploadBuild(
  appId: string | number,
  payload: {
    file: File
    platform: Platform
    version: string
    buildNumber?: string
    channel?: string
    releaseNotes?: string
  },
): Promise<Build> {
  const fd = new FormData()
  fd.append('file', payload.file)
  fd.append('platform', payload.platform)
  fd.append('version', payload.version)
  if (payload.buildNumber) fd.append('buildNumber', payload.buildNumber)
  if (payload.channel) fd.append('channel', payload.channel)
  if (payload.releaseNotes) fd.append('releaseNotes', payload.releaseNotes)
  const { data } = await client.post<Build>(`/apps/${appId}/builds`, fd)
  return data
}

export async function deleteBuild(id: number): Promise<void> {
  await client.delete(`/builds/${id}`)
}

export async function fetchPublicApp(shareId: string, password?: string): Promise<PublicApp> {
  const { data } = await client.get<PublicApp>(`/public/apps/${shareId}`, {
    params: password ? { password } : undefined,
  })
  return data
}
