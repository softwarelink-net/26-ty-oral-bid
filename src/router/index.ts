import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RoleCode } from '@/utils/sqljs-engine'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: RoleCode[]
    title?: string
    layout?: 'auth' | 'main'
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false, title: '登录鉴权', layout: 'auth' },
  },
  {
    path: '/tender',
    name: 'tender',
    component: () => import('@/views/auth/TenderView.vue'),
    meta: { requiresAuth: false, title: '公开招标公告', layout: 'auth' },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/dashboard/DashboardView.vue'),
    meta: {
      requiresAuth: true,
      title: '机考指挥驾驶舱',
      layout: 'main',
      roles: [
        'ROLE_SUPER_ADMIN',
        'ROLE_ACADEMIC_DIRECTOR',
        'ROLE_ENGLISH_TEACHER',
        'ROLE_DECISION_MAKER',
      ],
    },
  },
  {
    path: '/scheduling',
    name: 'scheduling',
    component: () => import('@/views/scheduling/SchedulingView.vue'),
    meta: {
      requiresAuth: true,
      title: '考务排程中枢',
      layout: 'main',
      roles: ['ROLE_SUPER_ADMIN', 'ROLE_ACADEMIC_DIRECTOR', 'ROLE_ENGLISH_TEACHER'],
    },
  },
  {
    path: '/assessment',
    name: 'assessment',
    component: () => import('@/views/assessment/AssessmentView.vue'),
    meta: {
      requiresAuth: true,
      title: 'AI 语音评测工坊',
      layout: 'main',
      roles: ['ROLE_SUPER_ADMIN', 'ROLE_ACADEMIC_DIRECTOR', 'ROLE_ENGLISH_TEACHER'],
    },
  },
  {
    path: '/proctoring',
    name: 'proctoring',
    component: () => import('@/views/proctoring/ProctoringView.vue'),
    meta: {
      requiresAuth: true,
      title: '数字监考大厅',
      layout: 'main',
      roles: ['ROLE_SUPER_ADMIN', 'ROLE_ACADEMIC_DIRECTOR', 'ROLE_ENGLISH_TEACHER'],
    },
  },
  {
    path: '/system',
    name: 'system',
    component: () => import('@/views/system/SystemView.vue'),
    meta: {
      requiresAuth: true,
      title: '系统总控与审计',
      layout: 'main',
      roles: ['ROLE_SUPER_ADMIN'],
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.engineReady && !auth.bootError) {
    await auth.bootstrap()
  }

  document.title = to.meta.title
    ? `${to.meta.title} · 太原十八中外语听说模考`
    : '太原市第十八中学校外语听说模考系统招标公告'

  const requiresAuth = to.meta.requiresAuth !== false

  if (!requiresAuth) {
    if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' }
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const roles = to.meta.roles
  if (roles && roles.length && !auth.hasRole(roles)) {
    window.alert('当前角色无权访问该模块，请联系现代教育技术中心开通权限。')
    return { name: 'dashboard' }
  }

  return true
})

export default router
