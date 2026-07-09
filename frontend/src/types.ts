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
  source: string;
  question_text: string;
  answer_text: string;
  wrong_reason: string;
  summary: string;
  difficulty: number;
  status: string;
  next_review_date: string | null;
  review_count: number;
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
