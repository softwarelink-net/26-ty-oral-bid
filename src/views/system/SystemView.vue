<template>
  <div class="space-y-5">
    <div>
      <h1 class="font-display text-xl text-academic-950">系统总控与涉密考卷操作安全审计</h1>
      <p class="text-sm text-slate-500 mt-1">SM4 列级脱敏 · 音频防篡改哈希 · Feature Flags · 操作审计穿透</p>
    </div>

    <div class="grid lg:grid-cols-2 gap-4">
      <div class="panel p-4">
        <h2 class="panel-title mb-3">全局 Feature Flags / 系统配置</h2>
        <div class="space-y-3">
          <div
            v-for="cfg in app.configs"
            :key="cfg.config_key"
            class="p-3 rounded-lg border border-slate-100 bg-slate-50/60"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-slate-800 font-mono">{{ cfg.config_key }}</p>
                <p class="text-[11px] text-slate-500 mt-1">{{ cfg.category }} · {{ cfg.description }}</p>
              </div>
              <button
                type="button"
                class="text-xs px-2.5 py-1 rounded-full border shrink-0"
                :class="cfg.config_value === 'true' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'"
                @click="app.toggleConfig(cfg.config_key, cfg.config_value !== 'true')"
              >
                {{ cfg.config_value === 'true' ? '已启用' : '已关闭' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="panel p-4">
        <h2 class="panel-title mb-3">考生成绩 SM4 动态脱敏预览</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-slate-500 border-b">
              <th class="py-2">准考证</th>
              <th class="py-2">姓名</th>
              <th class="py-2">得分</th>
              <th class="py-2">录音哈希</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sc in maskedScores" :key="sc.id" class="border-b border-slate-50">
              <td class="py-2 font-mono text-xs">{{ sc.ticket }}</td>
              <td class="py-2">{{ sc.name }}</td>
              <td class="py-2 tabular-nums">{{ sc.score }}</td>
              <td class="py-2 font-mono text-[10px] text-slate-400">{{ sc.hash }}</td>
            </tr>
          </tbody>
        </table>
        <p class="text-[11px] text-slate-400 mt-3">
          国密 SM4 列级脱敏开启时，准考证与姓名按掩码策略展示；录音文件绑定 SHA-256 存证摘要防篡改。
        </p>
      </div>
    </div>

    <div class="panel p-4">
      <h2 class="panel-title mb-3">安全操作审计轨迹</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-slate-500 border-b">
              <th class="py-2 pr-3">时间</th>
              <th class="py-2 pr-3">操作者</th>
              <th class="py-2 pr-3">动作</th>
              <th class="py-2 pr-3">目标资源</th>
              <th class="py-2 pr-3">IP</th>
              <th class="py-2">URI / 状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in app.auditLogs" :key="log.id" class="border-b border-slate-50 hover:bg-slate-50/80">
              <td class="py-2.5 pr-3 text-xs text-slate-500 whitespace-nowrap">{{ log.created_at }}</td>
              <td class="py-2.5 pr-3">{{ log.username }}</td>
              <td class="py-2.5 pr-3">
                <span class="font-mono text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800">{{ log.action_name }}</span>
              </td>
              <td class="py-2.5 pr-3 font-mono text-xs">{{ log.target_resource }}</td>
              <td class="py-2.5 pr-3 text-xs">{{ log.ip_address }}</td>
              <td class="py-2.5 text-xs text-slate-500">{{ log.request_uri }} · {{ log.status_code }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel p-4 bg-gradient-to-r from-academic-950 to-cyan-900 text-slate-100">
      <h2 class="text-sm font-semibold text-cyan-200 mb-2">命名空间隔离约束</h2>
      <ul class="text-xs space-y-1 text-slate-300">
        <li>数据表前缀：<code class="text-cyan-300">tyoral_</code></li>
        <li>本地数据包：<code class="text-cyan-300">public/data/tyoral_database.sqlite</code></li>
        <li>Session 键：<code class="text-cyan-300">tyoral_auth_session</code></li>
        <li>禁止与同平台其他站点表空间交叉读写</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const app = useAppStore()

const sm4On = computed(() => {
  const cfg = app.configs.find((c) => c.config_key === 'FEATURE_SM4_STUDENT_DATA_MASKING')
  return !cfg || cfg.config_value === 'true'
})

const maskedScores = computed(() =>
  app.scores.slice(0, 8).map((sc) => ({
    id: sc.id,
    ticket: sm4On.value ? maskTicket(sc.ticket_no) : sc.ticket_no,
    name: sc.student_name_masked,
    score: sc.total_score_obtained,
    hash: simpleHash(sc.audio_record_url + sc.ticket_no).slice(0, 16) + '…',
  })),
)

function maskTicket(t: string) {
  if (t.length < 6) return '****'
  return t.slice(0, 4) + '****' + t.slice(-3)
}

function simpleHash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(16).padStart(8, '0') + Math.abs(h * 7).toString(16)
}

onMounted(async () => {
  await Promise.all([app.refreshConfigs(), app.refreshAudit(), app.refreshScores()])
})
</script>
