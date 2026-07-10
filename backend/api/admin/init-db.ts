import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, methodNotAllowed, serverError, unauthorized, ok } from '../../src/http.js';
import { exec } from '../../src/db.js';

const statements = [
  `CREATE TABLE IF NOT EXISTS knowledge_points (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    chapter VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_md TEXT,
    mastery_level TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_knowledge_user_subject (user_id, subject, chapter)
  )`,
  `CREATE TABLE IF NOT EXISTS mistakes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    chapter VARCHAR(100),
    knowledge_point_id BIGINT,
    source VARCHAR(255),
    question_text TEXT,
    answer_text TEXT,
    wrong_reason TEXT,
    summary TEXT,
    tags_json TEXT,
    difficulty TINYINT DEFAULT 3,
    status VARCHAR(50) DEFAULT '待复习',
    next_review_date DATE,
    review_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mistakes_user_due (user_id, next_review_date),
    INDEX idx_mistakes_user_subject (user_id, subject, chapter),
    INDEX idx_mistakes_user_status (user_id, status)
  )`,
  `ALTER TABLE mistakes ADD COLUMN IF NOT EXISTS tags_json TEXT`,
  `CREATE TABLE IF NOT EXISTS study_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL,
    study_date DATE NOT NULL,
    subject VARCHAR(50),
    content TEXT,
    duration_minutes INT DEFAULT 0,
    new_mistakes_count INT DEFAULT 0,
    reviewed_mistakes_count INT DEFAULT 0,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_study_logs_user_date (user_id, study_date)
  )`,
  `CREATE TABLE IF NOT EXISTS review_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL,
    mistake_id BIGINT NOT NULL,
    review_date DATE NOT NULL,
    result VARCHAR(50) NOT NULL,
    note TEXT,
    next_review_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_review_user_mistake (user_id, mistake_id),
    INDEX idx_review_user_date (user_id, review_date)
  )`,
  `CREATE TABLE IF NOT EXISTS exam_scores (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL,
    exam_name VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) DEFAULT '历年真题',
    exam_date DATE,
    total_score DECIMAL(6,2) DEFAULT 0,
    math_score DECIMAL(6,2) DEFAULT 0,
    calculus_score DECIMAL(6,2) DEFAULT 0,
    linear_algebra_score DECIMAL(6,2) DEFAULT 0,
    probability_score DECIMAL(6,2) DEFAULT 0,
    duration_minutes INT DEFAULT 0,
    mistake_count INT DEFAULT 0,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_exam_user_date (user_id, exam_date)
  )`,
  `ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS exam_type VARCHAR(50) DEFAULT '历年真题'`,
  `ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS calculus_score DECIMAL(6,2) DEFAULT 0`,
  `ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS linear_algebra_score DECIMAL(6,2) DEFAULT 0`,
  `ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS probability_score DECIMAL(6,2) DEFAULT 0`,
  `ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 0`,
  `ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS mistake_count INT DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS study_goals (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    goal_type VARCHAR(50) DEFAULT '学习任务',
    start_date DATE,
    deadline DATE,
    current_value DECIMAL(10,2) DEFAULT 0,
    target_value DECIMAL(10,2) DEFAULT 1,
    status VARCHAR(50) DEFAULT '进行中',
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_goal_user_status (user_id, status),
    INDEX idx_goal_user_deadline (user_id, deadline)
  )`,
  `CREATE TABLE IF NOT EXISTS todo_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    todo_date DATE NOT NULL,
    start_time TIME NULL,
    task_type VARCHAR(50) DEFAULT '其他',
    subject VARCHAR(50),
    chapter VARCHAR(100),
    priority VARCHAR(20) DEFAULT '普通',
    status VARCHAR(20) DEFAULT '待完成',
    note TEXT,
    completed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_todo_user_date (user_id, todo_date),
    INDEX idx_todo_user_status (user_id, status)
  )`,
  `CREATE TABLE IF NOT EXISTS user_profile (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    nickname VARCHAR(100) DEFAULT 'Math Seeker',
    avatar_style VARCHAR(50) DEFAULT 'blue',
    signature VARCHAR(255),
    target_school VARCHAR(255),
    target_major VARCHAR(255),
    exam_year INT,
    preparation_start_date DATE,
    exam_date DATE,
    daily_target_minutes INT DEFAULT 300,
    math_target_score DECIMAL(6,2) DEFAULT 120,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  const token = req.headers['x-init-token'];
  if (!process.env.INIT_TOKEN || token !== process.env.INIT_TOKEN) {
    return unauthorized(res, 'Invalid init token.');
  }

  try {
    for (const statement of statements) {
      await exec(statement);
    }
    return ok(res, { ok: true, message: 'Database tables are ready.' });
  } catch (error) {
    return serverError(res, error);
  }
}
