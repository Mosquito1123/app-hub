// 所有接口封装，路径/字段与 docs/API.md 契约严格对应
import client from './client'
import type {
  AppDetail,
  AppItem,
  Build,
  LoginResponse,
  Platform,
  PublicApp,
} from '@/types'

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/login', { username, password })
  return data
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

export async function fetchPublicApp(shareId: string): Promise<PublicApp> {
  const { data } = await client.get<PublicApp>(`/public/apps/${shareId}`)
  return data
}
