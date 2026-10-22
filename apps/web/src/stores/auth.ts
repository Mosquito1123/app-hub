import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as apiLogin } from '@/api'
import { clearToken, getToken, setToken } from '@/api/client'
import type { User } from '@/types'

const USER_KEY = 'apphub_user'

function loadUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const user = ref<User | null>(loadUser())

  async function login(username: string, password: string) {
    const data = await apiLogin(username, password)
    token.value = data.token
    user.value = data.user
    setToken(data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  }

  function logout() {
    token.value = null
    user.value = null
    clearToken()
    localStorage.removeItem(USER_KEY)
  }

  return { token, user, login, logout }
})
