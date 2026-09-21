<template>
  <div class="w-full max-w-md">
    <div class="panel p-8 backdrop-blur bg-white/95">
      <h1 class="font-display text-2xl text-academic-950">登录机考管控控制台</h1>
      <p class="mt-2 text-sm text-slate-500">太原市第十八中学校 · 外语听说模考系统</p>

      <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1.5">登录账号</label>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-600"
            placeholder="admin / academic_lead / teacher / leader"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1.5">登录密码</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-600"
            placeholder="请输入演示密码"
          />
        </div>
        <p v-if="error" class="text-sm text-rose-600">{{ error }}</p>
        <button type="submit" class="btn-primary w-full py-2.5" :disabled="submitting">
          {{ submitting ? '校验中…' : '进入控制台' }}
        </button>
      </form>

      <div class="mt-6 pt-5 border-t border-slate-100">
        <p class="text-xs text-slate-400 mb-2">快速填入演示账号</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="d in demos"
            :key="d.username"
            type="button"
            class="btn-ghost text-xs justify-start"
            @click="fill(d)"
          >
            {{ d.label }}
          </button>
        </div>
      </div>

      <p class="mt-5 text-center text-xs text-slate-400">
        <RouterLink to="/tender" class="text-cyan-700 hover:underline">查看公开招标公告全文</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref('admin')
const password = ref('Admin@2026')
const error = ref('')
const submitting = ref(false)

const demos = [
  { label: '系统超管', username: 'admin', password: 'Admin@2026' },
  { label: '教研主管', username: 'academic_lead', password: 'Lead@2026' },
  { label: '英语教师', username: 'teacher', password: 'Teacher@2026' },
  { label: '校领导层', username: 'leader', password: 'Leader@2026' },
]

function fill(d: { username: string; password: string }) {
  username.value = d.username
  password.value = d.password
  error.value = ''
}

async function onSubmit() {
  error.value = ''
  submitting.value = true
  try {
    const result = await auth.login(username.value, password.value)
    if (!result.ok) {
      error.value = result.message
      return
    }
    const redirect = (route.query.redirect as string) || '/'
    await router.replace(redirect)
  } finally {
    submitting.value = false
  }
}
</script>
