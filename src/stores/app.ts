import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getDashboardStats,
  getExamStations,
  getExamSessions,
  getExamineeScores,
  getClassDiagnostics,
  getAuditLogs,
  getSystemConfigs,
  updateSystemConfig,
  type DashboardStats,
  type ExamStation,
  type ExamSession,
  type ExamineeScore,
  type ClassDiagnostic,
  type AuditLog,
  type SystemConfig,
} from '@/utils/sqljs-engine'

export const useAppStore = defineStore('app', () => {
  const stats = ref<DashboardStats | null>(null)
  const stations = ref<ExamStation[]>([])
  const sessions = ref<ExamSession[]>([])
  const scores = ref<ExamineeScore[]>([])
  const diagnostics = ref<ClassDiagnostic[]>([])
  const auditLogs = ref<AuditLog[]>([])
  const configs = ref<SystemConfig[]>([])
  const loading = ref(false)

  async function refreshDashboard() {
    loading.value = true
    try {
      stats.value = await getDashboardStats()
      configs.value = stats.value.configs
    } finally {
      loading.value = false
    }
  }

  async function refreshStations(room?: string) {
    stations.value = await getExamStations(room)
  }

  async function refreshSessions() {
    sessions.value = await getExamSessions()
  }

  async function refreshScores(sessionId?: string) {
    scores.value = await getExamineeScores(sessionId)
  }

  async function refreshDiagnostics() {
    diagnostics.value = await getClassDiagnostics()
  }

  async function refreshAudit() {
    auditLogs.value = await getAuditLogs()
  }

  async function refreshConfigs() {
    configs.value = await getSystemConfigs()
  }

  async function toggleConfig(key: string, enabled: boolean) {
    await updateSystemConfig(key, enabled ? 'true' : 'false')
    await refreshConfigs()
    if (stats.value) await refreshDashboard()
  }

  return {
    stats,
    stations,
    sessions,
    scores,
    diagnostics,
    auditLogs,
    configs,
    loading,
    refreshDashboard,
    refreshStations,
    refreshSessions,
    refreshScores,
    refreshDiagnostics,
    refreshAudit,
    refreshConfigs,
    toggleConfig,
  }
})
