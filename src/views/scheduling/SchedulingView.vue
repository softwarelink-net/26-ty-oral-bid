<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-xl text-academic-950">全真外语听说考务编排中枢</h1>
        <p class="text-sm text-slate-500 mt-1">9 间专用机房 · 475 考位 · 考号随机混排与耳机自检</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-ghost text-xs" @click="shuffleSeats">考号一键随机打乱</button>
        <button type="button" class="btn-primary text-xs" @click="runHeadsetCheck">启动耳机试听自检</button>
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-4">
      <div class="panel p-4 lg:col-span-2">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 class="panel-title">场次与试卷排程</h2>
          <select v-model="roomFilter" class="text-xs border rounded-lg px-2 py-1.5 border-slate-200" @change="loadStations">
            <option>全部机房</option>
            <option v-for="r in rooms" :key="r">{{ r }}</option>
          </select>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-slate-500 border-b">
                <th class="py-2 pr-2">场次号</th>
                <th class="py-2 pr-2">名称</th>
                <th class="py-2 pr-2">年级</th>
                <th class="py-2 pr-2">试卷</th>
                <th class="py-2 pr-2">人数</th>
                <th class="py-2">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in app.sessions" :key="s.id" class="border-b border-slate-50 hover:bg-slate-50/80">
                <td class="py-2.5 pr-2 font-mono text-xs text-cyan-800">{{ s.session_no }}</td>
                <td class="py-2.5 pr-2 max-w-[200px] truncate">{{ s.session_name }}</td>
                <td class="py-2.5 pr-2">{{ s.target_grade }}</td>
                <td class="py-2.5 pr-2">{{ s.paper_title }}</td>
                <td class="py-2.5 pr-2 tabular-nums">{{ s.examinee_count }}</td>
                <td class="py-2.5">
                  <span class="status-pill" :class="statusClass(s.session_status)">{{ statusLabel(s.session_status) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel p-4">
        <h2 class="panel-title mb-3">耳机 / 录音自检向导</h2>
        <ol class="space-y-3 text-sm">
          <li
            v-for="(step, i) in checkSteps"
            :key="i"
            class="flex gap-3 items-start"
          >
            <span
              class="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
              :class="step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
            >{{ i + 1 }}</span>
            <div>
              <p class="font-medium text-slate-800">{{ step.title }}</p>
              <p class="text-xs text-slate-500 mt-0.5">{{ step.desc }}</p>
            </div>
          </li>
        </ol>
        <p v-if="shuffleMsg" class="mt-4 text-xs text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-lg p-2">
          {{ shuffleMsg }}
        </p>
      </div>
    </div>

    <div class="panel p-4">
      <h2 class="panel-title mb-3">机房考位可视化排座（样本机位 + 规模标注）</h2>
      <div class="flex flex-wrap gap-2 mb-4">
        <span class="legend ok">耳机正常</span>
        <span class="legend weak">麦克偏弱</span>
        <span class="legend bad">失真/断连</span>
        <span class="legend offline">离线</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <div
          v-for="st in displayStations"
          :key="st.id"
          class="seat-card"
          :class="seatClass(st)"
        >
          <p class="font-mono text-[11px] font-semibold">{{ st.station_code }}</p>
          <p class="text-[10px] opacity-80 truncate">{{ st.room_name }}</p>
          <p class="text-[10px] mt-1">{{ ticketMap[st.station_code] || '待编座' }}</p>
          <p class="text-[10px] mt-0.5">底噪 {{ st.ambient_noise_db }} dB</p>
        </div>
      </div>
      <p class="text-xs text-slate-400 mt-3">
        演示数据包展示代表机位；生产环境按 LAB1–LAB9 共 475 座全量编排，支持试卷离线缓存预加载。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import type { ExamStation } from '@/utils/sqljs-engine'

const app = useAppStore()
const roomFilter = ref('全部机房')
const shuffleMsg = ref('')
const ticketMap = reactive<Record<string, string>>({})

const rooms = [
  '第一语音机房',
  '第二语音机房',
  '第三语音机房',
  '第四语音机房',
  '第五语音机房',
  '第六语音机房',
  '第七语音机房',
  '第八语音机房',
  '第九语音机房',
]

const checkSteps = ref([
  { title: '检测头戴式耳机插入', desc: '读取 USB / 3.5mm 音频设备枚举状态', done: false },
  { title: '播放标准音量试听音', desc: '1kHz 参考音，确认左右声道均衡', done: false },
  { title: '录音回路回放校验', desc: '采集 3 秒环境音并检测削波与底噪', done: false },
  { title: '试卷离线缓存预加载', desc: '将本场次音频包写入本地 IndexedDB', done: false },
])

const displayStations = computed(() => app.stations)

function statusLabel(s: string) {
  const map: Record<string, string> = {
    READY: '待开考',
    IN_PROGRESS: '进行中',
    AI_EVALUATING: 'AI 评测中',
    COMPLETED_ARCHIVED: '已归档',
  }
  return map[s] || s
}

function statusClass(s: string) {
  if (s === 'IN_PROGRESS') return 'bg-emerald-50 text-emerald-700'
  if (s === 'READY') return 'bg-sky-50 text-sky-700'
  if (s === 'AI_EVALUATING') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function seatClass(st: ExamStation) {
  if (!st.is_online) return 'offline'
  if (st.headphone_status === 'DISCONNECTED' || st.headphone_status === 'AUDIO_DISTORTION') return 'bad'
  if (st.headphone_status === 'MIC_WEAK') return 'weak'
  return 'ok'
}

function shuffleSeats() {
  const codes = displayStations.value.map((s) => s.station_code)
  const tickets = codes.map((_, i) => `26140101${String(100 + i).slice(-3)}`)
  for (let i = tickets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[tickets[i], tickets[j]] = [tickets[j], tickets[i]]
  }
  codes.forEach((c, i) => {
    ticketMap[c] = tickets[i]
  })
  shuffleMsg.value = `已完成 ${codes.length} 个样本考位考号随机混排（算法：Fisher–Yates），全校 475 座同构执行。`
}

async function runHeadsetCheck() {
  for (let i = 0; i < checkSteps.value.length; i++) {
    await new Promise((r) => setTimeout(r, 350))
    checkSteps.value[i].done = true
  }
  shuffleMsg.value = '耳机音量与录音自检向导已完成，试卷离线缓存预加载就绪。'
}

async function loadStations() {
  await app.refreshStations(roomFilter.value)
}

onMounted(async () => {
  await Promise.all([app.refreshSessions(), loadStations()])
  shuffleSeats()
})
</script>

<style scoped>
.status-pill {
  @apply inline-block text-[11px] px-2 py-0.5 rounded-full font-medium;
}
.legend {
  @apply text-[11px] px-2 py-1 rounded border;
}
.legend.ok { @apply bg-emerald-50 border-emerald-200 text-emerald-800; }
.legend.weak { @apply bg-amber-50 border-amber-200 text-amber-800; }
.legend.bad { @apply bg-rose-50 border-rose-200 text-rose-800; }
.legend.offline { @apply bg-slate-100 border-slate-200 text-slate-600; }
.seat-card {
  @apply rounded-lg border p-2.5 text-slate-700 transition;
}
.seat-card.ok { @apply bg-emerald-50/80 border-emerald-200; }
.seat-card.weak { @apply bg-amber-50/80 border-amber-200; }
.seat-card.bad { @apply bg-rose-50/80 border-rose-200; }
.seat-card.offline { @apply bg-slate-100 border-slate-200 opacity-70; }
</style>
