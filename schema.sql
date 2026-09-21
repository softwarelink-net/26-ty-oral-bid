-- 太原市第十八中学校外语听说模考系统 (1401992026AGK00696)
-- 表名前缀: tyoral_ | 隔离命名空间，杜绝跨站污染

-- 1. 用户与教师监考系统账户表 (Users)
CREATE TABLE IF NOT EXISTS tyoral_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    dept_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ROLE_SUPER_ADMIN', 'ROLE_ACADEMIC_DIRECTOR', 'ROLE_ENGLISH_TEACHER', 'ROLE_DECISION_MAKER')),
    phone TEXT,
    staff_code TEXT NOT NULL UNIQUE,
    status INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 系统全局配置与 Feature Flags (System Configs)
CREATE TABLE IF NOT EXISTS tyoral_system_configs (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 475机位考场机房与硬件设施台账表 (Exam Rooms & Hardware Stations)
CREATE TABLE IF NOT EXISTS tyoral_exam_stations (
    id TEXT PRIMARY KEY,
    station_code TEXT NOT NULL UNIQUE,
    room_name TEXT NOT NULL,
    headphone_sn TEXT NOT NULL,
    headphone_status TEXT DEFAULT 'OK' CHECK(headphone_status IN ('OK', 'MIC_WEAK', 'AUDIO_DISTORTION', 'DISCONNECTED')),
    partition_status TEXT DEFAULT 'NORMAL' CHECK(partition_status IN ('NORMAL', 'DAMAGED_NEEDS_REPAIR')),
    client_ip TEXT NOT NULL,
    is_screen_locked INTEGER DEFAULT 1,
    ambient_noise_db REAL DEFAULT 32.5,
    is_online INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 听说模拟考试场次与考务排程表 (Exam Sessions & Batches)
CREATE TABLE IF NOT EXISTS tyoral_exam_sessions (
    id TEXT PRIMARY KEY,
    session_no TEXT NOT NULL UNIQUE,
    session_name TEXT NOT NULL,
    target_grade TEXT NOT NULL,
    paper_title TEXT NOT NULL,
    total_score REAL DEFAULT 30.0,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    examinee_count INTEGER NOT NULL,
    session_status TEXT DEFAULT 'IN_PROGRESS' CHECK(session_status IN ('READY', 'IN_PROGRESS', 'AI_EVALUATING', 'COMPLETED_ARCHIVED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 考生答卷与 AI 语音多维评测流水表 (Examinee Answers & AI Speech Scoring)
CREATE TABLE IF NOT EXISTS tyoral_examinee_scores (
    id TEXT PRIMARY KEY,
    ticket_no TEXT NOT NULL UNIQUE,
    session_id TEXT NOT NULL,
    student_name_masked TEXT NOT NULL,
    class_name TEXT NOT NULL,
    seat_station_code TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK(question_type IN ('PASSAGE_READING', 'LISTEN_RESPONSE', 'STORY_RETELLING', 'TOPIC_TALK')),
    audio_record_url TEXT NOT NULL,
    total_score_obtained REAL NOT NULL,
    score_pronunciation REAL NOT NULL,
    score_fluency REAL NOT NULL,
    score_integrity REAL NOT NULL,
    phoneme_error_json TEXT NOT NULL,
    teacher_review_flag INTEGER DEFAULT 0,
    evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES tyoral_exam_sessions(id),
    FOREIGN KEY(seat_station_code) REFERENCES tyoral_exam_stations(station_code)
);

-- 6. 班级听说薄弱点与学情诊断工坊表 (Diagnostic Learning & Remediation)
CREATE TABLE IF NOT EXISTS tyoral_class_diagnostics (
    id TEXT PRIMARY KEY,
    class_name TEXT NOT NULL,
    grade_name TEXT NOT NULL,
    weak_phoneme_tags TEXT NOT NULL,
    avg_total_score REAL NOT NULL,
    speaking_speed_wpm INTEGER NOT NULL,
    remediation_pack_name TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. 考务与系统安全日志审计表 (Security Audit Trail)
CREATE TABLE IF NOT EXISTS tyoral_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT,
    action_name TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    ip_address TEXT,
    request_uri TEXT,
    status_code INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 种子数据初始化 (Seed Data)
-- password_hash 为演示账号明文密码的 MD5：Admin@2026 / Lead@2026 / Teacher@2026 / Leader@2026
-- ==============================================================================

INSERT OR REPLACE INTO tyoral_users (id, username, password_hash, full_name, dept_name, role, phone, staff_code) VALUES
('u-01', 'admin', 'ce5dec5f7d5cda41bd625bd6a23bb9aa', '系统管理员', '现代教育技术中心', 'ROLE_SUPER_ADMIN', '13453434886', 'TY18-TECH-001'),
('u-02', 'academic_lead', '519ef9dd66f6cb6a8c79a1c983ae898c', '王主任', '英语教研组', 'ROLE_ACADEMIC_DIRECTOR', '0351-2377183', 'TY18-ENG-008'),
('u-03', 'teacher', 'e8c6ada79036586716f2e9f07a1baea5', '李老师', '高三英语备课组', 'ROLE_ENGLISH_TEACHER', '13834567890', 'TY18-ENG-088'),
('u-04', 'leader', '5fa3c1e40a221e46fbabb44790283fc9', '教学副校长', '校长室', 'ROLE_DECISION_MAKER', '0351-2377100', 'TY18-LEAD-001');

INSERT OR REPLACE INTO tyoral_system_configs (config_key, config_value, category, description) VALUES
('FEATURE_AUTO_NOISE_REDUCTION', 'true', 'AUDIO_ENGINE', '作答录音上传时是否启用 WebAssembly 边缘端底噪消除与邻座串音抵消'),
('FEATURE_SM4_STUDENT_DATA_MASKING', 'true', 'SECURITY', '对全校考生成绩单、准考证号及姓名启用国密 SM4 动态列级脱敏'),
('EXAM_CLIENT_LOCK_FORCE', 'true', 'PROCTORING', '考试客户端全屏置顶并阻断 Alt+Tab、任务管理器及快捷截屏按键');

INSERT OR REPLACE INTO tyoral_exam_stations (id, station_code, room_name, headphone_sn, headphone_status, partition_status, client_ip, is_screen_locked, ambient_noise_db, is_online) VALUES
('st-01', 'LAB1-SEAT-001', '第一语音机房', 'HP-TY18-2026-001', 'OK', 'NORMAL', '192.168.1.101', 1, 31.2, 1),
('st-02', 'LAB1-SEAT-002', '第一语音机房', 'HP-TY18-2026-002', 'OK', 'NORMAL', '192.168.1.102', 1, 32.0, 1),
('st-03', 'LAB1-SEAT-003', '第一语音机房', 'HP-TY18-2026-003', 'MIC_WEAK', 'NORMAL', '192.168.1.103', 1, 34.5, 1),
('st-04', 'LAB2-SEAT-001', '第二语音机房', 'HP-TY18-2026-056', 'OK', 'NORMAL', '192.168.2.101', 1, 30.8, 1),
('st-05', 'LAB2-SEAT-002', '第二语音机房', 'HP-TY18-2026-057', 'OK', 'NORMAL', '192.168.2.102', 1, 31.5, 1),
('st-06', 'LAB3-SEAT-001', '第三语音机房', 'HP-TY18-2026-111', 'AUDIO_DISTORTION', 'DAMAGED_NEEDS_REPAIR', '192.168.3.101', 1, 38.2, 1),
('st-07', 'LAB4-SEAT-001', '第四语音机房', 'HP-TY18-2026-166', 'OK', 'NORMAL', '192.168.4.101', 1, 29.8, 1),
('st-08', 'LAB5-SEAT-001', '第五语音机房', 'HP-TY18-2026-221', 'OK', 'NORMAL', '192.168.5.101', 0, 33.1, 1),
('st-09', 'LAB6-SEAT-001', '第六语音机房', 'HP-TY18-2026-276', 'DISCONNECTED', 'NORMAL', '192.168.6.101', 1, 45.0, 0),
('st-10', 'LAB7-SEAT-001', '第七语音机房', 'HP-TY18-2026-331', 'OK', 'NORMAL', '192.168.7.101', 1, 30.2, 1),
('st-11', 'LAB8-SEAT-001', '第八语音机房', 'HP-TY18-2026-386', 'OK', 'NORMAL', '192.168.8.101', 1, 31.0, 1),
('st-12', 'LAB9-SEAT-001', '第九语音机房', 'HP-TY18-2026-441', 'MIC_WEAK', 'NORMAL', '192.168.9.101', 1, 35.6, 1);

INSERT OR REPLACE INTO tyoral_exam_sessions (id, session_no, session_name, target_grade, paper_title, total_score, start_time, end_time, examinee_count, session_status) VALUES
('sess-01', 'EXAM-TY-202610-01', '2026届高三年级新高考外语听说第一轮全真模拟', '高三年级', '2026高考英语听说冲刺卷A', 30.0, '2026-09-18 08:30:00', '2026-09-18 09:15:00', 475, 'IN_PROGRESS'),
('sess-02', 'EXAM-TY-202609-02', '高二年级英语期初听说摸底测评', '高二年级', '高二听说基线诊断卷', 30.0, '2026-09-10 14:00:00', '2026-09-10 14:40:00', 460, 'COMPLETED_ARCHIVED'),
('sess-03', 'EXAM-TY-202610-02', '高三年级第二轮听说强化模拟', '高三年级', '2026高考英语听说冲刺卷B', 30.0, '2026-10-08 08:30:00', '2026-10-08 09:15:00', 475, 'READY');

INSERT OR REPLACE INTO tyoral_examinee_scores (id, ticket_no, session_id, student_name_masked, class_name, seat_station_code, question_type, audio_record_url, total_score_obtained, score_pronunciation, score_fluency, score_integrity, phoneme_error_json, teacher_review_flag) VALUES
('sc-01', '26140101001', 'sess-01', '薛*宇', '高三(1)班', 'LAB1-SEAT-001', 'PASSAGE_READING', 'https://26-ty-oral-bid-assets.softwarelink.net/audio/rec_001.mp3', 27.5, 9.2, 9.1, 9.2, '[{"word":"think","expected":"/θɪŋk/","pronounced":"/sɪŋk/","error":"齿擦音不清晰"}]', 0),
('sc-02', '26140101002', 'sess-01', '张*涵', '高三(1)班', 'LAB1-SEAT-002', 'TOPIC_TALK', 'https://26-ty-oral-bid-assets.softwarelink.net/audio/rec_002.mp3', 24.0, 8.0, 7.5, 8.5, '[{"word":"world","expected":"/wɜːld/","pronounced":"/wɜːd/","error":"舌侧音漏读"}]', 0),
('sc-03', '26140101003', 'sess-01', '李*轩', '高三(2)班', 'LAB1-SEAT-003', 'STORY_RETELLING', 'https://26-ty-oral-bid-assets.softwarelink.net/audio/rec_003.mp3', 22.5, 7.2, 7.0, 8.3, '[{"word":"ship","expected":"/ʃɪp/","pronounced":"/siːp/","error":"长短元音混淆"}]', 1),
('sc-04', '26140101004', 'sess-01', '王*悦', '高三(2)班', 'LAB2-SEAT-001', 'LISTEN_RESPONSE', 'https://26-ty-oral-bid-assets.softwarelink.net/audio/rec_004.mp3', 26.0, 8.8, 8.5, 8.7, '[{"word":"asked","expected":"/ɑːskt/","pronounced":"/ɑːskɪd/","error":"失去爆破误读"}]', 0),
('sc-05', '26140101005', 'sess-01', '赵*彤', '高三(3)班', 'LAB2-SEAT-002', 'PASSAGE_READING', 'https://26-ty-oral-bid-assets.softwarelink.net/audio/rec_005.mp3', 28.5, 9.5, 9.4, 9.6, '[]', 0),
('sc-06', '26140101006', 'sess-01', '陈*阳', '高三(3)班', 'LAB3-SEAT-001', 'TOPIC_TALK', 'https://26-ty-oral-bid-assets.softwarelink.net/audio/rec_006.mp3', 21.0, 6.8, 6.5, 7.7, '[{"word":"three","expected":"/θriː/","pronounced":"/sriː/","error":"齿擦音/θ/含糊"},{"word":"little","expected":"/ˈlɪtl/","pronounced":"/ˈliːtl/","error":"长短元音混淆"}]', 0);

INSERT OR REPLACE INTO tyoral_class_diagnostics (id, class_name, grade_name, weak_phoneme_tags, avg_total_score, speaking_speed_wpm, remediation_pack_name) VALUES
('diag-01', '高三(1)班', '高三年级', '清浊齿擦音(/θ/,/ð/),辅音连缀失误', 26.2, 128, '新高考咬字与意群断句专项强化包01'),
('diag-02', '高三(2)班', '高三年级', '长短元音辨析(/iː/ vs /ɪ/),不完全爆破', 24.8, 116, '考前连读与朗读韵律突破微课'),
('diag-03', '高三(3)班', '高三年级', '语调起伏不足,意群停顿混乱', 25.5, 132, '话题表达逻辑与韵律训练包'),
('diag-04', '高二(1)班', '高二年级', '单词重音偏移,弱读漏读', 22.1, 108, '基础朗读节奏与弱读专项'),
('diag-05', '高二(2)班', '高二年级', '连读失误,辅音浊化不足', 23.4, 112, '听说衔接与听选应答强化课');

INSERT OR REPLACE INTO tyoral_audit_logs (id, user_id, username, action_name, target_resource, ip_address, request_uri, status_code) VALUES
('log-01', 'u-02', 'academic_lead', 'PAPER_DEPLOY', 'sess-01', '192.168.0.15', '/api/exam/deploy', 200),
('log-02', 'u-01', 'admin', 'MIC_CALIBRATE', 'LAB1-SEAT-003', '192.168.0.2', '/api/stations/calibrate', 200),
('log-03', 'u-03', 'teacher', 'SCORE_OVERRIDE', 'sc-03', '192.168.1.88', '/api/scores/review', 200),
('log-04', 'u-01', 'admin', 'SCREEN_UNLOCK', 'LAB5-SEAT-001', '192.168.0.2', '/api/stations/unlock', 200);
