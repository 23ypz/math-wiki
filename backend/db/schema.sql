CREATE TABLE IF NOT EXISTS knowledge_points (
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
);

CREATE TABLE IF NOT EXISTS mistakes (
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
  difficulty TINYINT DEFAULT 3,
  status VARCHAR(50) DEFAULT '待复习',
  next_review_date DATE,
  review_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mistakes_user_due (user_id, next_review_date),
  INDEX idx_mistakes_user_subject (user_id, subject, chapter),
  INDEX idx_mistakes_user_status (user_id, status)
);

CREATE TABLE IF NOT EXISTS study_logs (
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
);

CREATE TABLE IF NOT EXISTS review_records (
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
);

CREATE TABLE IF NOT EXISTS exam_scores (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(64) NOT NULL,
  exam_name VARCHAR(255) NOT NULL,
  exam_date DATE,
  total_score DECIMAL(6,2),
  math_score DECIMAL(6,2),
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_exam_user_date (user_id, exam_date)
);
