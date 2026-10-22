import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Platform } from '@/types'

export const platformMeta: Record<Platform, { label: string; badgeClass: string }> = {
  android: { label: 'Android', badgeClass: 'bg-green-100 text-green-700' },
  ios: { label: 'iOS', badgeClass: 'bg-blue-100 text-blue-700' },
  harmony: { label: '鸿蒙', badgeClass: 'bg-orange-100 text-orange-700' },
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 把接口返回的相对路径转为绝对地址（分享/二维码/itms-services 需要） */
export function absoluteUrl(path: string): string {
  return new URL(path, window.location.origin).href
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  const el = document.createElement('textarea')
  el.value = text
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  el.remove()
}
