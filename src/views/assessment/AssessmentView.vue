<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-xl text-academic-950">AI 智能多维度语音评测工坊</h1>
        <p class="text-sm text-slate-500 mt-1">短文朗读 · 听选应答 · 故事复述 · 话题表达 · 音素级纠错</p>
      </div>
      <select
        v-model="sessionId"
        class="text-xs border rounded-lg px-2 py-1.5 border-slate-200"
        @change="load"
      >
        <option value="">全部场次成绩</option>
        <option v-for="s in app.sessions" :key="s.id" :value="s.id">{{ s.session_no }}</option>
      </select>
    </div>

    <div class="grid lg:grid-cols-5 gap-4">
      <div class="panel p-4 lg:col-span-2">
        <h2 class="panel-title mb-3">答卷列表</h2>
        <ul class="space-y-2 max-h-[420px] overflow-auto">
          <li
            v-for="sc in app.scores"
            :key="sc.id"
            class="p-3 rounded-lg border cursor-pointer transition"
            :class="selected?.id === sc.id ? 'border-cyan-400 bg-cyan-50/50' : 'border-slate-100 hover:bg-slate-50'"
            @click="selected = sc"
          >
            <div class="flex justify-between gap-2">
              <span class="text-sm font-medium">{{ sc.student_name_masked }}</span>
              <span class="text-sm tabular-nums text-academic-800 font-semibold">{{ sc.total_score_obtained }}</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">
              {{ sc.class_name }} · {{ typeLabel(sc.question_type) }} · {{ sc.ticket_no }}
            </p>
          </li>
        </ul>
      </div>

      <div class="panel p-4 lg:col-span-3 space-y-4" v-if="selected">
        <div class="flex flex-wrap justify-between gap-2">
          <div>
            <h2 class="panel-title">{{ selected.student_name_masked }} · {{ typeLabel(selected.question_type) }}</h2>
            <p class="text-xs text-slate-500 mt-1">机位 {{ selected.seat_station_code }} · 录音存证哈希就绪</p>
          </div>
          <span
            class="text-[11px] px-2 py-1 rounded-full h-fit"
            :class="selected.teacher_review_flag ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
          >
            {{ selected.teacher_review_flag ? '教师已复核' : '待教师复核' }}
          </span>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div ref="radarRef" class="h-56" />
          <div class="rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs leading-relaxed relative overflow-hidden">
            <div class="wave-anim absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-400 to-cyan-400 opacity-60" />
            <p class="text-cyan-300 mb-2">答题卡仿真视口 · {{ typeLabel(selected.question_type) }}</p>
            <p class="text-slate-300 whitespace-pre-wrap">{{ promptText }}</p>
            <p class="mt-3 text-slate-500">录音：{{ selected.audio_record_url.split('/').pop() }}</p>
          </div>
        </div>

        <div>
          <h3 class="text-xs font-semibold text-slate-600 mb-2">音素级标红纠错面板</h3>
          <div v-if="phonemes.length" class="space-y-2">
            <div
              v-for="(p, i) in phonemes"
              :key="i"
              class="flex flex-wrap items-center gap-2 text-sm p-2.5 rounded-lg bg-rose-50 border border-rose-100"
            >
              <span class="font-semibold text-rose-700">{{ p.word }}</span>
              <span class="text-xs text-slate-500">期望 <code class="bg-white px-1 rounded">{{ p.expected }}</code></span>
              <span class="text-xs text-rose-600">实读 <code class="bg-white px-1 rounded">{{ p.pronounced }}</code></span>
              <span class="text-xs text-slate-600">— {{ p.error }}</span>
            </div>
          </div>
          <p v-else class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
            未检出显著音素失误，四维评测均达标。
          </p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div class="p-3 rounded-lg bg-slate-50 border">
            <p class="text-[11px] text-slate-500">发音准确度</p>
            <p class="text-lg font-semibold text-indigo-700">{{ selected.score_pronunciation }}</p>
          </div>
          <div class="p-3 rounded-lg bg-slate-50 border">
            <p class="text-[11px] text-slate-500">流利度</p>
            <p class="text-lg font-semibold text-cyan-700">{{ selected.score_fluency }}</p>
          </div>
          <div class="p-3 rounded-lg bg-slate-50 border">
            <p class="text-[11px] text-slate-500">完整度</p>
            <p class="text-lg font-semibold text-emerald-700">{{ selected.score_integrity }}</p>
          </div>
          <div class="p-3 rounded-lg bg-slate-50 border">
            <p class="text-[11px] text-slate-500">韵律（推演）</p>
            <p class="text-lg font-semibold text-amber-700">{{ rhythmScore }}</p>
          </div>
        </div>
      </div>

      <div v-else class="panel p-8 lg:col-span-3 flex items-center justify-center text-slate-400 text-sm">
        请选择左侧答卷查看四维雷达与音素纠错
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { useAppStore } from '@/stores/app'
import type { ExamineeScore } from '@/utils/sqljs-engine'

interface PhonemeError {
  word: string
  expected: string
  pronounced: string
  error: string
}

const app = useAppStore()
const sessionId = ref('')
const selected = ref<ExamineeScore | null>(null)
const radarRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const phonemes = computed<PhonemeError[]>(() => {
  if (!selected.value) return []
  try {
    return JSON.parse(selected.value.phoneme_error_json) as PhonemeError[]
  } catch {
    return []
  }
})

const rhythmScore = computed(() => {
  if (!selected.value) return 0
  const s = selected.value
  return Math.round(((s.score_fluency + s.score_integrity) / 2) * 10) / 10
})

const promptText = computed(() => {
  const t = selected.value?.question_type
  if (t === 'PASSAGE_READING') {
    return 'Read the following passage aloud:\n"Technology has changed the way we learn English..."'
  }
  if (t === 'LISTEN_RESPONSE') return 'Listen and choose the best response.\n(A) Yes, I will.  (B) Never mind.  (C) Good idea.'
  if (t === 'STORY_RETELLING') return 'Retell the story in your own words.\n提示：人物 · 冲突 · 结局 · 时态一致'
  return 'Talk about the topic for 1 minute:\n"What makes a good friend in senior high school?"'
})

function typeLabel(t: string) {
  const map: Record<string, string> = {
    PASSAGE_READING: '短文朗读',
    LISTEN_RESPONSE: '听选应答',
    STORY_RETELLING: '故事复述',
    TOPIC_TALK: '话题表达',
  }
  return map[t] || t
}

function renderRadar() {
  if (!radarRef.value || !selected.value) return
  if (!chart) chart = echarts.init(radarRef.value)
  const s = selected.value
  chart.setOption({
    radar: {
      indicator: [
        { name: 'Pronunciation', max: 10 },
        { name: 'Fluency', max: 10 },
        { name: 'Integrity', max: 10 },
        { name: 'Rhythm', max: 10 },
      ],
      radius: '65%',
      axisName: { color: '#475569', fontSize: 11 },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [s.score_pronunciation, s.score_fluency, s.score_integrity, rhythmScore.value],
            name: '四维得分',
            areaStyle: { color: 'rgba(6,182,212,0.25)' },
            lineStyle: { color: '#4338ca' },
            itemStyle: { color: '#0891b2' },
          },
        ],
      },
    ],
  })
}

async function load() {
  await app.refreshScores(sessionId.value || undefined)
  selected.value = app.scores[0] ?? null
  await nextTick()
  renderRadar()
}

watch(selected, async () => {
  await nextTick()
  renderRadar()
})

onMounted(async () => {
  await app.refreshSessions()
  await load()
  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.wave-anim {
  animation: slide 2s linear infinite;
  background-size: 200% 100%;
}
@keyframes slide {
  from { background-position: 0 0; }
  to { background-position: 200% 0; }
}
</style>
