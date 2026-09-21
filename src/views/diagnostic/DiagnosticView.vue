<template>
  <div class="space-y-3">
    <div
      v-for="d in items"
      :key="d.id"
      class="p-3 rounded-lg border border-slate-100 bg-slate-50/80"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-medium text-academic-900">{{ d.class_name }}</p>
        <span class="text-sm tabular-nums text-cyan-700 font-semibold">{{ d.avg_total_score }} 分</span>
      </div>
      <p class="text-[11px] text-slate-500 mt-1">语速 {{ d.speaking_speed_wpm }} WPM · {{ d.grade_name }}</p>
      <p class="text-xs text-amber-800 mt-2 bg-amber-50 rounded px-2 py-1 border border-amber-100">
        薄弱音素：{{ d.weak_phoneme_tags }}
      </p>
      <p class="text-xs text-indigo-700 mt-2">训练包：{{ d.remediation_pack_name }}</p>
    </div>
    <p v-if="!items.length" class="text-sm text-slate-400 text-center py-6">暂无学情诊断数据</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const items = computed(() => app.diagnostics)

onMounted(() => {
  if (!app.diagnostics.length) void app.refreshDiagnostics()
})
</script>
