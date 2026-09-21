import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import { md5 } from './md5'

export type RoleCode =
  | 'ROLE_SUPER_ADMIN'
  | 'ROLE_ACADEMIC_DIRECTOR'
  | 'ROLE_ENGLISH_TEACHER'
  | 'ROLE_DECISION_MAKER'

export interface TyoralUser {
  id: string
  username: string
  full_name: string
  dept_name: string
  role: RoleCode
  phone: string | null
  staff_code: string
  status: number
}

export interface ExamStation {
  id: string
  station_code: string
  room_name: string
  headphone_sn: string
  headphone_status: string
  partition_status: string
  client_ip: string
  is_screen_locked: number
  ambient_noise_db: number
  is_online: number
}

export interface ExamSession {
  id: string
  session_no: string
  session_name: string
  target_grade: string
  paper_title: string
  total_score: number
  start_time: string
  end_time: string
  examinee_count: number
  session_status: string
}

export interface ExamineeScore {
  id: string
  ticket_no: string
  session_id: string
  student_name_masked: string
  class_name: string
  seat_station_code: string
  question_type: string
  audio_record_url: string
  total_score_obtained: number
  score_pronunciation: number
  score_fluency: number
  score_integrity: number
  phoneme_error_json: string
  teacher_review_flag: number
  evaluated_at?: string
}

export interface ClassDiagnostic {
  id: string
  class_name: string
  grade_name: string
  weak_phoneme_tags: string
  avg_total_score: number
  speaking_speed_wpm: number
  remediation_pack_name: string
  generated_at?: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  username: string | null
  action_name: string
  target_resource: string
  ip_address: string | null
  request_uri: string | null
  status_code: number | null
  created_at: string
}

export interface SystemConfig {
  config_key: string
  config_value: string
  category: string
  description: string | null
}

export interface DashboardStats {
  totalStations: number
  onlineStations: number
  onlineRate: number
  headphoneOkRate: number
  partitionOkRate: number
  activeSessions: number
  anomalyAlerts: number
  avgScore: number
  scoreThroughput: number
  classRankings: { class_name: string; avg_total_score: number }[]
  scoreDistribution: { band: string; count: number }[]
  recentScores: ExamineeScore[]
  configs: SystemConfig[]
}

let db: Database | null = null
let readyPromise: Promise<Database> | null = null

function rowsToObjects<T>(columns: string[], values: SqlValue[][]): T[] {
  return values.map((row) => {
    const obj: Record<string, SqlValue> = {}
    columns.forEach((col, idx) => {
      obj[col] = row[idx]
    })
    return obj as T
  })
}

function queryAll<T>(sql: string, params: SqlValue[] = []): T[] {
  if (!db) throw new Error('SQLite 引擎尚未初始化')
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

function queryOne<T>(sql: string, params: SqlValue[] = []): T | null {
  const rows = queryAll<T>(sql, params)
  return rows[0] ?? null
}

export async function initSqlEngine(): Promise<Database> {
  if (db) return db
  if (readyPromise) return readyPromise

  readyPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    })
    const response = await fetch('/data/tyoral_database.sqlite')
    if (!response.ok) {
      throw new Error(`无法加载本地 SQLite 数据包: ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    db = new SQL.Database(new Uint8Array(buffer))
    return db
  })()

  return readyPromise
}

export function isEngineReady(): boolean {
  return db !== null
}

export async function login(
  username: string,
  password: string,
): Promise<{ ok: true; user: TyoralUser } | { ok: false; message: string }> {
  await initSqlEngine()
  const hash = md5(password)
  const user = queryOne<TyoralUser & { password_hash: string }>(
    `SELECT id, username, password_hash, full_name, dept_name, role, phone, staff_code, status
     FROM tyoral_users WHERE username = ? AND status = 1 LIMIT 1`,
    [username.trim()],
  )
  if (!user) return { ok: false, message: '账号不存在或已停用' }
  if (user.password_hash !== hash) return { ok: false, message: '密码错误，请核对演示账号' }
  const { password_hash: _, ...safe } = user
  void _
  return { ok: true, user: safe }
}

export async function getExamStations(roomFilter?: string): Promise<ExamStation[]> {
  await initSqlEngine()
  if (roomFilter && roomFilter !== '全部机房') {
    return queryAll<ExamStation>(
      `SELECT * FROM tyoral_exam_stations WHERE room_name = ? ORDER BY station_code`,
      [roomFilter],
    )
  }
  return queryAll<ExamStation>(`SELECT * FROM tyoral_exam_stations ORDER BY station_code`)
}

export async function getExamSessions(): Promise<ExamSession[]> {
  await initSqlEngine()
  return queryAll<ExamSession>(
    `SELECT * FROM tyoral_exam_sessions ORDER BY start_time DESC`,
  )
}

export async function getExamineeScores(sessionId?: string): Promise<ExamineeScore[]> {
  await initSqlEngine()
  if (sessionId) {
    return queryAll<ExamineeScore>(
      `SELECT * FROM tyoral_examinee_scores WHERE session_id = ? ORDER BY total_score_obtained DESC`,
      [sessionId],
    )
  }
  return queryAll<ExamineeScore>(
    `SELECT * FROM tyoral_examinee_scores ORDER BY total_score_obtained DESC`,
  )
}

export async function getClassDiagnostics(): Promise<ClassDiagnostic[]> {
  await initSqlEngine()
  return queryAll<ClassDiagnostic>(
    `SELECT * FROM tyoral_class_diagnostics ORDER BY avg_total_score DESC`,
  )
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  await initSqlEngine()
  return queryAll<AuditLog>(
    `SELECT * FROM tyoral_audit_logs ORDER BY created_at DESC`,
  )
}

export async function getSystemConfigs(): Promise<SystemConfig[]> {
  await initSqlEngine()
  return queryAll<SystemConfig>(`SELECT * FROM tyoral_system_configs ORDER BY category`)
}

export async function updateSystemConfig(key: string, value: string): Promise<void> {
  await initSqlEngine()
  if (!db) return
  db.run(
    `UPDATE tyoral_system_configs SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?`,
    [value, key],
  )
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await initSqlEngine()

  const stationAgg = queryOne<{
    total: number
    online: number
    headphone_ok: number
    partition_ok: number
    anomaly: number
  }>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) AS online,
      SUM(CASE WHEN headphone_status = 'OK' THEN 1 ELSE 0 END) AS headphone_ok,
      SUM(CASE WHEN partition_status = 'NORMAL' THEN 1 ELSE 0 END) AS partition_ok,
      SUM(CASE WHEN headphone_status != 'OK' OR partition_status != 'NORMAL' OR is_online = 0 THEN 1 ELSE 0 END) AS anomaly
    FROM tyoral_exam_stations
  `)

  const activeSessions =
    queryOne<{ c: number }>(
      `SELECT COUNT(*) AS c FROM tyoral_exam_sessions WHERE session_status IN ('IN_PROGRESS','AI_EVALUATING','READY')`,
    )?.c ?? 0

  const avgScore =
    queryOne<{ a: number }>(`SELECT ROUND(AVG(total_score_obtained), 2) AS a FROM tyoral_examinee_scores`)
      ?.a ?? 0

  const classRankings = queryAll<{ class_name: string; avg_total_score: number }>(`
    SELECT class_name, ROUND(AVG(total_score_obtained), 2) AS avg_total_score
    FROM tyoral_examinee_scores
    GROUP BY class_name
    ORDER BY avg_total_score DESC
  `)

  const scores = await getExamineeScores()
  const bands = [
    { band: '27-30 优秀', min: 27, max: 30 },
    { band: '24-27 良好', min: 24, max: 27 },
    { band: '21-24 合格', min: 21, max: 24 },
    { band: '0-21 待提升', min: 0, max: 21 },
  ]
  const scoreDistribution = bands.map((b) => ({
    band: b.band,
    count: scores.filter((s) => s.total_score_obtained >= b.min && s.total_score_obtained < (b.max === 30 ? 31 : b.max)).length,
  }))

  const total = stationAgg?.total ?? 475
  const online = stationAgg?.online ?? 0
  // 演示态：样本机位按 475 机位规模外推在线率展示
  const scaleFactor = 475 / Math.max(total, 1)

  return {
    totalStations: 475,
    onlineStations: Math.round(online * scaleFactor),
    onlineRate: total ? Math.round((online / total) * 1000) / 10 : 0,
    headphoneOkRate: total ? Math.round(((stationAgg?.headphone_ok ?? 0) / total) * 1000) / 10 : 0,
    partitionOkRate: total ? Math.round(((stationAgg?.partition_ok ?? 0) / total) * 1000) / 10 : 0,
    activeSessions,
    anomalyAlerts: Math.round((stationAgg?.anomaly ?? 0) * scaleFactor),
    avgScore,
    scoreThroughput: 186,
    classRankings,
    scoreDistribution,
    recentScores: scores.slice(0, 8),
    configs: await getSystemConfigs(),
  }
}

export function execRaw(sql: string): { columns: string[]; values: SqlValue[][] }[] {
  if (!db) throw new Error('SQLite 引擎尚未初始化')
  return db.exec(sql).map((r) => ({ columns: r.columns, values: r.values }))
}
