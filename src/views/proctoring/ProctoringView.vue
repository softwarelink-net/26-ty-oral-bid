<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-xl text-academic-950">475 机位数字监考大厅</h1>
        <p class="text-sm text-slate-500 mt-1">网格化机位状态 · 防切屏锁定 · 异常串音声波预警</p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-ghost text-xs" @click="showAlert = true">模拟串音告警</button>
        <button type="button" class="btn-primary text-xs" @click="broadcastRerecord">一键补考重录</button>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="panel p-3">
        <p class="text-xs text-slate-500">在线机位</p>
        <p class="text-xl font-semibold text-emerald-600">{{ onlineCount }} <span class="text-xs text-slate-400">/ {{ gridSeats.length }}</span></p>
      </div>
      <div class="panel p-3">
        <p class="text-xs text-slate-500">防切屏锁定</p>
        <p class="text-xl font-semibold text-indigo-700">{{ lockedCount }}</p>
      </div>
      <div class="panel p-3">
        <p class="text-xs text-slate-500">异常机位</p>
        <p class="text-xl font-semibold text-amber-600">{{ anomalyCount }}</p>
      </div>
      <div class="panel p-3">
        <p class="text-xs text-slate-500">串音过滤阈值</p>
        <p class="text-xl font-semibold text-cyan-700">开启</p>
      </div>
    </div>

    <div class="panel p-4">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 class="panel-title">机位网格（演示采样扩展至可视矩阵）</h2>
        <div class="flex gap-2 text-[11px]">
          <span class="flex items-center gap-1"><i class="dot bg-emerald-400" />正常作答</span>
          <span class="flex items-center gap-1"><i class="dot bg-amber-400" />异常/串音</span>
          <span class="flex items-center gap-1"><i class="dot bg-slate-400" />离线</span>
          <span class="flex items-center gap-1"><i class="dot bg-indigo-500" />已锁屏</span>
        </div>
      </div>
      <div class="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
        <button
          v-for="seat in gridSeats"
          :key="seat.code"
          type="button"
          class="seat-cell"
          :class="cellClass(seat)"
          :title="seat.code"
          @click="focusSeat = seat"
        >
          <span class="wave" :style="{ animationDuration: seat.wave + 's' }" />
          <span class="text-[9px] font-mono relative z-10">{{ seat.short }}</span>
        </button>
      </div>
      <p class="text-xs text-slate-400 mt-3">
        当前可视 {{ gridSeats.length }} 格映射全校 475 考位实时态；点击机位查看防切屏与声波详情。
      </p>
    </div>

    <div v-if="focusSeat" class="panel p-4 grid sm:grid-cols-3 gap-4">
      <div>
        <h3 class="panel-title">机位 {{ focusSeat.code }}</h3>
        <p class="text-xs text-slate-500 mt-2">网络：{{ focusSeat.online ? '连通' : '断开' }}</p>
        <p class="text-xs text-slate-500">耳机：{{ focusSeat.headphone }}</p>
        <p class="text-xs text-slate-500">作答进度：{{ focusSeat.progress }}%</p>
      </div>
      <div>
        <p class="text-xs text-slate-500 mb-1">录音音量波形</p>
        <div class="flex items-end gap-0.5 h-12">
          <span
            v-for="(h, i) in focusSeat.bars"
            :key="i"
            class="flex-1 rounded-t bg-cyan-500/80"
            :style="{ height: h + '%' }"
          />
        </div>
      </div>
      <div class="flex flex-col gap-2 justify-center">
        <div class="lock-card" :class="focusSeat.locked ? 'on' : 'off'">
          {{ focusSeat.locked ? '防切屏强制锁屏中' : '锁屏已解除' }}
        </div>
        <button type="button" class="btn-ghost text-xs" @click="focusSeat.locked = !focusSeat.locked">
          切换锁屏状态
        </button>
      </div>
    </div>

    <div v-if="toast" class="fixed bottom-6 right-6 z-[100] bg-academic-950 text-white text-sm px-4 py-3 rounded-lg shadow-xl">
      {{ toast }}
    </div>

    <div
      v-if="showAlert"
      class="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4"
      @click.self="showAlert = false"
    >
      <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border-l-4 border-amber-500">
        <h3 class="font-display text-lg text-academic-950">异常串音声波过滤预警</h3>
        <p class="text-sm text-slate-600 mt-2">
          检测到 LAB1-SEAT-003 与邻座 LAB1-SEAT-002 声波互相关峰值超阈（ρ=0.82），已启用边缘端串音抵消并标记补录候选。
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="btn-ghost text-xs" @click="showAlert = false">忽略</button>
          <button type="button" class="btn-primary text-xs" @click="ackAlert">下发重录指令</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'

interface GridSeat {
  code: string
  short: string
  online: boolean
  locked: boolean
  anomaly: boolean
  headphone: string
  progress: number
  wave: number
  bars: number[]
}

const app = useAppStore()
const showAlert = ref(false)
const toast = ref('')
const focusSeat = ref<GridSeat | null>(null)

const gridSeats = ref<GridSeat[]>([])

const onlineCount = computed(() => gridSeats.value.filter((s) => s.online).length)
const lockedCount = computed(() => gridSeats.value.filter((s) => s.locked).length)
const anomalyCount = computed(() => gridSeats.value.filter((s) => s.anomaly || !s.online).length)

function buildGrid() {
  const real = app.stations
  const seats: GridSeat[] = []
  for (let lab = 1; lab <= 9; lab++) {
    const perLab = lab <= 7 ? 55 : 45
    for (let n = 1; n <= Math.min(perLab, 8); n++) {
      const code = `LAB${lab}-SEAT-${String(n).padStart(3, '0')}`
      const match = real.find((r) => r.station_code === code)
      const anomaly =
        match
          ? match.headphone_status !== 'OK' || match.partition_status !== 'NORMAL' || !match.is_online
          : n === 3 && lab === 1
      seats.push({
        code,
        short: `${lab}-${n}`,
        online: match ? !!match.is_online : Math.random() > 0.03,
        locked: match ? !!match.is_screen_locked : true,
        anomaly,
        headphone: match?.headphone_status || 'OK',
        progress: 40 + Math.floor(Math.random() * 55),
        wave: 0.6 + Math.random() * 1.2,
        bars: Array.from({ length: 16 }, () => 20 + Math.floor(Math.random() * 80)),
      })
    }
  }
  gridSeats.value = seats
  focusSeat.value = seats.find((s) => s.anomaly) || seats[0]
}

function cellClass(seat: GridSeat) {
  if (!seat.online) return 'is-offline'
  if (seat.anomaly) return 'is-anomaly'
  if (seat.locked) return 'is-locked'
  return 'is-ok'
}

function broadcastRerecord() {
  toast.value = '已向异常机位广播「补考重录」指令，考生客户端将进入指定题重录流程。'
  setTimeout(() => { toast.value = '' }, 3200)
}

function ackAlert() {
  showAlert.value = false
  broadcastRerecord()
}

onMounted(async () => {
  await app.refreshStations()
  buildGrid()
})
</script>

<style scoped>
.dot {
  @apply inline-block w-2 h-2 rounded-full;
}
.seat-cell {
  @apply relative h-9 rounded border overflow-hidden flex items-center justify-center transition hover:scale-[1.03];
}
.seat-cell.is-ok {
  @apply bg-emerald-50 border-emerald-200 text-emerald-800;
}
.seat-cell.is-locked {
  @apply bg-indigo-50 border-indigo-200 text-indigo-800;
}
.seat-cell.is-anomaly {
  @apply bg-amber-50 border-amber-300 text-amber-900 animate-pulse;
}
.seat-cell.is-offline {
  @apply bg-slate-100 border-slate-200 text-slate-400;
}
.wave {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 35%;
  background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.35), transparent);
  animation: pulseWave 1s ease-in-out infinite;
}
@keyframes pulseWave {
  0%, 100% { opacity: 0.35; transform: scaleY(0.7); }
  50% { opacity: 1; transform: scaleY(1.1); }
}
.lock-card {
  @apply text-xs font-medium px-3 py-2 rounded-lg border text-center;
}
.lock-card.on {
  @apply bg-indigo-50 border-indigo-200 text-indigo-800;
}
.lock-card.off {
  @apply bg-slate-50 border-slate-200 text-slate-500;
}
</style>
