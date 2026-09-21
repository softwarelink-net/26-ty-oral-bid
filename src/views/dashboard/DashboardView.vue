<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-xl text-academic-950">太原十八中外语听说全景运营大屏</h1>
        <p class="text-sm text-slate-500 mt-1">475 机位 · 九大语音机房 · AI 评测吞吐量实时观测</p>
      </div>
      <button type="button" class="btn-ghost text-xs" @click="refresh">刷新指标</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div v-for="kpi in kpis" :key="kpi.label" class="panel p-4">
        <p class="text-xs text-slate-500">{{ kpi.label }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums" :class="kpi.color">{{ kpi.value }}</p>
        <p class="text-[11px] text-slate-400 mt-1">{{ kpi.hint }}</p>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-4">
      <div class="panel p-4">
        <h2 class="panel-title mb-3">全校模考分数段阶梯分布</h2>
        <div ref="distRef" class="h-64" />
      </div>
      <div class="panel p-4">
        <h2 class="panel-title mb-3">各班级听说平均分排行</h2>
        <div ref="rankRef" class="h-64" />
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-4">
      <div class="panel p-4">
        <h2 class="panel-title mb-3">硬件健康度仪表盘</h2>
        <div ref="gaugeRef" class="h-56" />
      </div>
      <div class="panel p-4">
        <h2 class="panel-title mb-3">AI 评测吞吐量 (题/分钟)</h2>
        <div ref="thruputRef" class="h-56" />
      </div>
      <div class="panel p-4 flex flex-col">
        <h2 class="panel-title mb-3">Feature Flags 业务开关</h2>
        <div class="space-y-3 flex-1">
          <label
            v-for="cfg in flagConfigs"
            :key="cfg.config_key"
            class="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
          >
            <span>
              <span class="block text-xs font-medium text-slate-800">{{ cfg.config_key }}</span>
              <span class="block text-[11px] text-slate-500 mt-0.5">{{ cfg.description }}</span>
            </span>
            <input
              type="checkbox"
              class="mt-1 accent-cyan-600"
              :checked="cfg.config_value === 'true'"
              :disabled="!canToggle"
              @change="onToggle(cfg.config_key, ($event.target as HTMLInputElement).checked)"
            />
          </label>
        </div>
        <p v-if="!canToggle" class="text-[11px] text-amber-600 mt-2">仅系统超管可切换业务开关</p>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-4">
      <div class="panel p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="panel-title">学情诊断 · 班级薄弱项</h2>
          <span class="text-[11px] text-slate-400">教考融合工坊</span>
        </div>
        <DiagnosticPanel />
      </div>
      <div class="panel p-4">
        <h2 class="panel-title mb-3">实时交卷 / 高分突破滚动</h2>
        <ul class="space-y-2 max-h-72 overflow-auto">
          <li
            v-for="(n, i) in notices"
            :key="i"
            class="flex gap-3 text-sm p-2.5 rounded-lg bg-gradient-to-r from-slate-50 to-cyan-50/40 border border-slate-100"
          >
            <span class="text-[11px] text-cyan-700 font-mono shrink-0 mt-0.5">{{ n.time }}</span>
            <span class="text-slate-700">{{ n.text }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import DiagnosticPanel from '@/views/diagnostic/DiagnosticView.vue'

const app = useAppStore()
const auth = useAuthStore()

const distRef = ref<HTMLDivElement | null>(null)
const rankRef = ref<HTMLDivElement | null>(null)
const gaugeRef = ref<HTMLDivElement | null>(null)
const thruputRef = ref<HTMLDivElement | null>(null)

let charts: echarts.ECharts[] = []

const canToggle = computed(() => auth.role === 'ROLE_SUPER_ADMIN')

const flagConfigs = computed(() =>
  (app.configs.length ? app.configs : app.stats?.configs ?? []).filter((c) =>
    c.config_key.startsWith('FEATURE_') || c.config_key === 'EXAM_CLIENT_LOCK_FORCE',
  ),
)

const kpis = computed(() => {
  const s = app.stats
  return [
    { label: '机位在线率', value: `${s?.onlineRate ?? '—'}%`, hint: `在线约 ${s?.onlineStations ?? 0}/475`, color: 'text-emerald-600' },
    { label: '耳机完好率', value: `${s?.headphoneOkRate ?? '—'}%`, hint: '头戴式听力专用耳机', color: 'text-cyan-700' },
    { label: '隔断完好率', value: `${s?.partitionOkRate ?? '—'}%`, hint: '定制隔音隔断 466 块', color: 'text-indigo-700' },
    { label: '全校均分', value: s?.avgScore ?? '—', hint: `评测吞吐 ${s?.scoreThroughput ?? 0} 题/分`, color: 'text-academic-800' },
  ]
})

const notices = computed(() => {
  const scores = app.stats?.recentScores ?? []
  if (!scores.length) {
    return [
      { time: '08:52', text: '高三(1)班 薛*宇 短文朗读 27.5 分，突破班级均分' },
      { time: '08:51', text: 'LAB1-SEAT-003 麦克风灵敏度偏弱，已下发校准指令' },
    ]
  }
  return scores.map((sc, idx) => ({
    time: `08:${52 - idx}`.padStart(5, '0'),
    text: `${sc.class_name} ${sc.student_name_masked} ${questionLabel(sc.question_type)} ${sc.total_score_obtained} 分 · 机位 ${sc.seat_station_code}`,
  }))
})

function questionLabel(t: string) {
  const map: Record<string, string> = {
    PASSAGE_READING: '短文朗读',
    LISTEN_RESPONSE: '听选应答',
    STORY_RETELLING: '故事复述',
    TOPIC_TALK: '话题表达',
  }
  return map[t] || t
}

function disposeCharts() {
  charts.forEach((c) => c.dispose())
  charts = []
}

function renderCharts() {
  disposeCharts()
  const s = app.stats
  if (!s) return

  if (distRef.value) {
    const c = echarts.init(distRef.value)
    c.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['人数', '累计占比'], top: 0, textStyle: { fontSize: 11 } },
      grid: { left: 40, right: 40, top: 36, bottom: 28 },
      xAxis: { type: 'category', data: s.scoreDistribution.map((d) => d.band), axisLabel: { fontSize: 10 } },
      yAxis: [
        { type: 'value', name: '人数', splitLine: { lineStyle: { type: 'dashed' } } },
        { type: 'value', name: '%', max: 100, splitLine: { show: false } },
      ],
      series: [
        {
          name: '人数',
          type: 'bar',
          data: s.scoreDistribution.map((d) => d.count),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#22d3ee' },
              { offset: 1, color: '#4338ca' },
            ]),
          },
          barWidth: 28,
        },
        {
          name: '累计占比',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: (() => {
            const total = s.scoreDistribution.reduce((a, b) => a + b.count, 0) || 1
            let acc = 0
            return s.scoreDistribution.map((d) => {
              acc += d.count
              return Math.round((acc / total) * 100)
            })
          })(),
          itemStyle: { color: '#f59e0b' },
        },
      ],
    })
    charts.push(c)
  }

  if (rankRef.value) {
    const c = echarts.init(rankRef.value)
    const ranks = [...s.classRankings].reverse()
    c.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 72, right: 24, top: 16, bottom: 28 },
      xAxis: { type: 'value', max: 30, splitLine: { lineStyle: { type: 'dashed' } } },
      yAxis: { type: 'category', data: ranks.map((r) => r.class_name) },
      series: [
        {
          type: 'bar',
          data: ranks.map((r) => r.avg_total_score),
          itemStyle: { color: '#0891b2', borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', fontSize: 11 },
        },
      ],
    })
    charts.push(c)
  }

  if (gaugeRef.value) {
    const c = echarts.init(gaugeRef.value)
    c.setOption({
      series: [
        {
          type: 'gauge',
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: 100,
          progress: { show: true, width: 12 },
          axisLine: { lineStyle: { width: 12 } },
          axisTick: { show: false },
          splitLine: { length: 8, lineStyle: { width: 2 } },
          axisLabel: { distance: 16, fontSize: 10 },
          pointer: { length: '55%', width: 4 },
          detail: { valueAnimation: true, formatter: '{value}%', fontSize: 18, offsetCenter: [0, '70%'] },
          data: [{ value: s.headphoneOkRate, name: '耳机完好' }],
          title: { offsetCenter: [0, '90%'], fontSize: 12 },
          itemStyle: { color: '#4338ca' },
        },
      ],
    })
    charts.push(c)
  }

  if (thruputRef.value) {
    const c = echarts.init(thruputRef.value)
    const mins = Array.from({ length: 12 }, (_, i) => `${8}:${30 + i * 2}`)
    const base = s.scoreThroughput
    c.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 16, top: 20, bottom: 28 },
      xAxis: { type: 'category', data: mins, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
      series: [
        {
          type: 'line',
          smooth: true,
          areaStyle: { color: 'rgba(6,182,212,0.15)' },
          itemStyle: { color: '#06b6d4' },
          data: mins.map((_, i) => Math.round(base * (0.7 + Math.sin(i / 2) * 0.15 + i * 0.02))),
        },
      ],
    })
    charts.push(c)
  }
}

async function refresh() {
  await app.refreshDashboard()
  await app.refreshDiagnostics()
  await nextTick()
  renderCharts()
}

async function onToggle(key: string, enabled: boolean) {
  await app.toggleConfig(key, enabled)
}

function onResize() {
  charts.forEach((c) => c.resize())
}

onMounted(async () => {
  await refresh()
  window.addEventListener('resize', onResize)
})

watch(
  () => app.stats,
  async () => {
    await nextTick()
    renderCharts()
  },
)

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  disposeCharts()
})
</script>
