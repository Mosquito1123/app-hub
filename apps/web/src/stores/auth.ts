import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchMe, login as apiLogin, register as apiRegister } from '@/api'
import { clearToken, getToken, setToken } from '@/api/client'
import type { LoginResponse, UserMe } from '@/types'

const USER_KEY = 'apphub_user'

function loadUser(): UserMe | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as UserMe) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const user = ref<UserMe | null>(loadUser())
  /** 本次页面生命周期内是否已用 /auth/me 对齐过角色 */
  const roleSynced = ref(false)

  const role = computed(() => user.value?.role ?? null)
  const isAdmin = computed(() => role.value === 'admin')

  function applySession(data: LoginResponse) {
    token.value = data.token
    user.value = data.user
    roleSynced.value = true
    setToken(data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  }

  async function login(username: string, password: string) {
    applySession(await apiLogin(username, password))
  }

  async function register(username: string, password: string) {
    applySession(await apiRegister(username, password))
  }

  /** 刷新角色（老 token 没有 role，或管理员刚调整过角色） */
  async function ensureRole() {
    if (!token.value || roleSynced.value) return
    try {
      const me = await fetchMe()
      user.value = me
      roleSynced.value = true
      localStorage.setItem(USER_KEY, JSON.stringify(me))
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 401) logout()
      throw e
    }
  }

  function logout() {
    token.value = null
    user.value = null
    roleSynced.value = false
    clearToken()
    localStorage.removeItem(USER_KEY)
  }

  return { token, user, role, isAdmin, login, register, ensureRole, logout }
})
