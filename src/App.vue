<template>
  <GlobalStickyBanner />
  <div class="app-shell">
    <div v-if="!auth.engineReady && !auth.bootError" class="boot-screen">
      <div class="boot-card">
        <div class="spinner" />
        <p class="mt-4 text-sm text-slate-600">正在加载本地 SQLite 机考数据包…</p>
      </div>
    </div>
    <div v-else-if="auth.bootError" class="boot-screen">
      <div class="boot-card text-center">
        <p class="text-rose-600 font-medium">数据库初始化失败</p>
        <p class="mt-2 text-sm text-slate-500">{{ auth.bootError }}</p>
      </div>
    </div>
    <AuthLayout v-else-if="useAuthLayout">
      <RouterView />
    </AuthLayout>
    <MainLayout v-else>
      <RouterView />
    </MainLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import GlobalStickyBanner from '@/components/common/GlobalStickyBanner.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const useAuthLayout = computed(() => route.meta.layout === 'auth' || !auth.isAuthenticated)

onMounted(() => {
  void auth.bootstrap()
})
</script>

<style scoped>
.boot-screen {
  min-height: calc(100vh - 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #f8fafc, #e0e7ff);
}
.boot-card {
  background: white;
  border-radius: 12px;
  padding: 32px 40px;
  box-shadow: 0 10px 40px rgba(30, 27, 75, 0.08);
}
.spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto;
  border: 3px solid #e2e8f0;
  border-top-color: #0891b2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
