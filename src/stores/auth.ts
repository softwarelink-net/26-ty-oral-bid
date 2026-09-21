import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  initSqlEngine,
  login as sqlLogin,
  type RoleCode,
  type TyoralUser,
} from '@/utils/sqljs-engine'

const SESSION_KEY = 'tyoral_auth_session'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<TyoralUser | null>(null)
  const engineReady = ref(false)
  const bootError = ref('')

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => user.value?.role ?? null)

  function persist() {
    if (user.value) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user.value))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }

  function restoreSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) user.value = JSON.parse(raw) as TyoralUser
    } catch {
      user.value = null
    }
  }

  async function bootstrap() {
    try {
      await initSqlEngine()
      engineReady.value = true
      restoreSession()
    } catch (e) {
      bootError.value = e instanceof Error ? e.message : '数据库初始化失败'
      engineReady.value = false
    }
  }

  async function login(username: string, password: string) {
    const result = await sqlLogin(username, password)
    if (!result.ok) return result
    user.value = result.user
    persist()
    return result
  }

  function logout() {
    user.value = null
    persist()
  }

  function hasRole(roles?: RoleCode[] | string[]) {
    if (!roles || roles.length === 0) return true
    if (!user.value) return false
    return roles.includes(user.value.role)
  }

  return {
    user,
    engineReady,
    bootError,
    isAuthenticated,
    role,
    bootstrap,
    login,
    logout,
    hasRole,
    restoreSession,
  }
})
