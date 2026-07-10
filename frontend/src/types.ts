export type Subject = '高等数学' | '线性代数' | '概率论与数理统计' | string;

export type KnowledgePoint = {
  id: number;
  subject: string;
  chapter: string;
  title: string;
  content_md: string;
  mastery_level: number;
  created_at?: string;
  updated_at?: string;
};

export type Mistake = {
  id: number;
  title: string;
  subject: string;
  chapter: string;
  knowledge_point_id?: number | null;
  knowledge_title?: string | null;
  source: string;
  question_text: string;
  answer_text: string;
  wrong_reason: string;
  summary: string;
  difficulty: number;
  status: string;
  next_review_date: string | null;
  review_count: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
};

export type StudyLog = {
  id: number;
  study_date: string;
  subject: string;
  content: string;
  duration_minutes: number;
  new_mistakes_count: number;
  reviewed_mistakes_count: number;
  summary: string;
};

export type ReviewRecord = {
  id: number;
  mistake_id: number;
  review_date: string;
  result: string;
  note: string;
  next_review_date: string | null;
  created_at?: string;
};

export type ExamScore = {
  id: number;
  exam_name: string;
  exam_type: string;
  exam_date: string | null;
  total_score: number;
  calculus_score: number;
  linear_algebra_score: number;
  probability_score: number;
  duration_minutes: number;
  mistake_count: number;
  note: string;
  created_at?: string;
  updated_at?: string;
};

export type StudyGoal = {
  id: number;
  title: string;
  goal_type: string;
  start_date: string | null;
  deadline: string | null;
  current_value: number;
  target_value: number;
  status: string;
  note: string;
  created_at?: string;
  updated_at?: string;
};


export type TodoItem = {
  id: number;
  title: string;
  todo_date: string;
  start_time: string | null;
  task_type: string;
  subject: string;
  chapter: string;
  priority: string;
  status: string;
  note: string;
  completed_at: string | null;
  created_at?: string;
  updated_at?: string;
};
