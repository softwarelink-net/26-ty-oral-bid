<template>
  <div class="main-layout flex min-h-[calc(100vh-40px)] bg-slate-50">
    <aside
      class="w-60 shrink-0 bg-gradient-to-b from-academic-950 via-academic-900 to-slate-900 text-slate-100 flex flex-col border-r border-white/10"
    >
      <div class="px-4 py-5 border-b border-white/10">
        <p class="font-display text-base tracking-wide">太原十八中</p>
        <p class="text-[11px] text-cyan-300/90 mt-0.5">外语听说模考运营中枢</p>
      </div>
      <nav class="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in visibleNav"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-dot" />
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="p-3 border-t border-white/10 text-[11px] text-slate-400">
        机位规模 475 · 机房 9 间
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <p class="text-sm text-slate-500 truncate">
            <span class="text-slate-400">首页</span>
            <span class="mx-1.5">/</span>
            <span class="text-academic-800 font-medium">{{ currentTitle }}</span>
          </p>
        </div>
        <div class="flex items-center gap-4 text-xs shrink-0">
          <div class="hidden md:flex items-center gap-3">
            <span class="stat-chip">
              在线率
              <strong class="text-emerald-600">{{ onlineRate }}%</strong>
            </span>
            <span class="stat-chip">
              进行中场次
              <strong class="text-cyan-700">{{ activeSessions }}</strong>
            </span>
            <span class="stat-chip">
              串音告警
              <strong class="text-amber-600">{{ anomalyAlerts }}</strong>
            </span>
          </div>
          <div class="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div class="text-right leading-tight">
              <p class="text-sm font-medium text-slate-800">{{ auth.user?.full_name }}</p>
              <p class="text-[11px] text-slate-400">{{ roleLabel }}</p>
            </div>
            <button
              type="button"
              class="ml-1 px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
              @click="onLogout"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-auto p-5">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import type { RoleCode } from '@/utils/sqljs-engine'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const app = useAppStore()

const navItems: { path: string; label: string; roles: RoleCode[] }[] = [
  {
    path: '/',
    label: '指挥驾驶舱',
    roles: ['ROLE_SUPER_ADMIN', 'ROLE_ACADEMIC_DIRECTOR', 'ROLE_ENGLISH_TEACHER', 'ROLE_DECISION_MAKER'],
  },
  {
    path: '/scheduling',
    label: '考务排程中枢',
    roles: ['ROLE_SUPER_ADMIN', 'ROLE_ACADEMIC_DIRECTOR', 'ROLE_ENGLISH_TEACHER'],
  },
  {
    path: '/assessment',
    label: 'AI 评测工坊',
    roles: ['ROLE_SUPER_ADMIN', 'ROLE_ACADEMIC_DIRECTOR', 'ROLE_ENGLISH_TEACHER'],
  },
  {
    path: '/proctoring',
    label: '数字监考大厅',
    roles: ['ROLE_SUPER_ADMIN', 'ROLE_ACADEMIC_DIRECTOR', 'ROLE_ENGLISH_TEACHER'],
  },
  {
    path: '/system',
    label: '系统总控审计',
    roles: ['ROLE_SUPER_ADMIN'],
  },
]

const roleMap: Record<string, string> = {
  ROLE_SUPER_ADMIN: '技术中心主管',
  ROLE_ACADEMIC_DIRECTOR: '英语教研组长',
  ROLE_ENGLISH_TEACHER: '英语教师 / 监考员',
  ROLE_DECISION_MAKER: '校领导决策层',
}

const visibleNav = computed(() =>
  navItems.filter((n) => auth.hasRole(n.roles)),
)

const currentTitle = computed(() => (route.meta.title as string) || '控制台')
const roleLabel = computed(() => (auth.role ? roleMap[auth.role] : ''))
const onlineRate = computed(() => app.stats?.onlineRate ?? 98.5)
const activeSessions = computed(() => app.stats?.activeSessions ?? 1)
const anomalyAlerts = computed(() => app.stats?.anomalyAlerts ?? 0)

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function onLogout() {
  auth.logout()
  router.push({ name: 'login' })
}

onMounted(() => {
  if (!app.stats) void app.refreshDashboard()
})
</script>

<style scoped>
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #cbd5e1;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.nav-item.active {
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.25), rgba(99, 102, 241, 0.2));
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.25);
}
.nav-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #64748b;
}
.nav-item.active .nav-dot {
  background: #22d3ee;
  box-shadow: 0 0 8px #22d3ee;
}
.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
}
</style>
