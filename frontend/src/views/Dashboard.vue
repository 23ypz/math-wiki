<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { request } from '../api';
import type { ExamScore, KnowledgePoint, Mistake, ReviewRecord, StudyGoal, StudyLog, TodoItem } from '../types';

const loading = ref(true);
const exporting = ref(false);
const importing = ref(false);
const importMode = ref<'merge' | 'overwrite'>('merge');
const importSummary = ref('');
const error = ref('');
const todayTodos = ref<TodoItem[]>([]);
const data = ref<any>({
  mistakeCount: 0,
  knowledgeCount: 0,
  dueCount: 0,
  overdueCount: 0,
  weekStudyMinutes: 0,
  reviewedWeekCount: 0,
  statusStats: [],
  weakChapters: [],
  weakKnowledge: [],
  recentStudy: [],
  activity: [],
  lastWeekStudyMinutes: 0,
  newMistakesWeek: 0,
  newKnowledgeWeek: 0,
  activeGoalCount: 0,
  latestExam: null,
  topTagRaw: ''
});

const maxStatus = computed(() => Math.max(1, ...data.value.statusStats.map((item: any) => Number(item.count) || 0)));
const maxWeak = computed(() => Math.max(1, ...data.value.weakChapters.map((item: any) => Number(item.count) || 0)));
const maxStudy = computed(() => Math.max(1, ...data.value.recentStudy.map((item: any) => Number(item.minutes) || 0)));

const activityMap = computed(() => {
  const map = new Map<string, any>();
  for (const item of data.value.activity || []) map.set(String(item.activity_date).slice(0, 10), item);
  return map;
});
const heatmapDays = computed(() => {
  const result: any[] = [];
  const today = new Date();
  for (let offset = 89; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const item = activityMap.value.get(key) || {};
    const score = Number(item.study_minutes || 0) / 30 + Number(item.new_mistakes || 0) + Number(item.reviewed || 0) + Number(item.new_knowledge || 0);
    result.push({ date: key, score, level: score <= 0 ? 0 : score < 2 ? 1 : score < 4 ? 2 : score < 7 ? 3 : 4, ...item });
  }
  return result;
});
const activeDays = computed(() => heatmapDays.value.filter((x) => x.level > 0).length);
const studyChange = computed(() => Number(data.value.weekStudyMinutes || 0) - Number(data.value.lastWeekStudyMinutes || 0));
const weeklySummary = computed(() => {
  const hours = Math.round(Number(data.value.weekStudyMinutes || 0) / 60 * 10) / 10;
  const change = Math.round(Math.abs(studyChange.value) / 60 * 10) / 10;
  const trend = studyChange.value >= 0 ? `较上周增加 ${change} 小时` : `较上周减少 ${change} 小时`;
  const weak = data.value.weakChapters?.[0];
  return `本周学习 ${hours} 小时，${trend}；新增知识点 ${data.value.newKnowledgeWeek || 0} 个，新增错题 ${data.value.newMistakesWeek || 0} 道，完成复习 ${data.value.reviewedWeekCount || 0} 次。${weak ? `当前最需要关注的是 ${weak.subject} / ${weak.chapter || '未分类'}。` : ''}`;
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [overview, todoRes] = await Promise.all([
      request<any>('/stats/overview'),
      request<{ items: TodoItem[] }>(`/progress?resource=todos&from=${today}&to=${today}`)
    ]);
    data.value = overview;
    todayTodos.value = todoRes.items;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function download(filename: string, content: string, type = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchBackupData() {
  const [knowledge, mistakes, studyLogs, exams, goals, todos] = await Promise.all([
    request<{ items: KnowledgePoint[] }>('/knowledge'),
    request<{ items: Mistake[] }>('/mistakes?sort=created_asc'),
    request<{ items: StudyLog[] }>('/study-logs'),
    request<{ items: ExamScore[] }>('/progress?resource=exams'),
    request<{ items: StudyGoal[] }>('/progress?resource=goals'),
    request<{ items: TodoItem[] }>('/progress?resource=todos')
  ]);
  const reviewGroups = await Promise.all(mistakes.items.map(async (item) => {
    const res = await request<{ items: ReviewRecord[] }>(`/review-records?mistake_id=${item.id}`);
    return res.items;
  }));
  return {
    version: 11,
    exported_at: new Date().toISOString(),
    knowledge_points: knowledge.items,
    mistakes: mistakes.items,
    study_logs: studyLogs.items,
    exam_scores: exams.items,
    study_goals: goals.items,
    todo_items: todos.items,
    review_records: reviewGroups.flat()
  };
}

async function exportJson() {
  exporting.value = true;
  error.value = '';
  try {
    const backup = await fetchBackupData();
    download(`math-wiki-v11-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2));
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导出失败';
  } finally {
    exporting.value = false;
  }
}

async function exportMarkdown() {
  exporting.value = true;
  error.value = '';
  try {
    const backup = await fetchBackupData();
    const lines: string[] = ['# 数学一 Wiki 导出', '', `导出时间：${backup.exported_at}`, '', '## 一、知识点'];
    for (const item of backup.knowledge_points) {
      lines.push('', `### ${item.subject} / ${item.chapter} / ${item.title}`, `掌握程度：${item.mastery_level}/5`, '', item.content_md || '暂无内容');
    }
    lines.push('', '## 二、错题本');
    for (const item of backup.mistakes) {
      lines.push('', `### ${item.title}`, `- 科目：${item.subject}`, `- 章节：${item.chapter || '未分类'}`, `- 关联知识点：${item.knowledge_title || '未关联'}`, `- 标签：${item.tags?.join('、') || '无'}`, `- 来源：${item.source || '未填写'}`, `- 状态：${item.status}`, `- 难度：${item.difficulty}/5`, `- 下次复习：${item.next_review_date || '未设置'}`, '', '#### 题目', item.question_text || '未填写', '', '#### 正确解法', item.answer_text || '未填写', '', '#### 错因', item.wrong_reason || '未填写', '', '#### 总结', item.summary || '未填写');
    }
    lines.push('', '## 三、学习日志');
    for (const item of backup.study_logs) {
      lines.push('', `### ${item.study_date} ${item.subject}`, `- 学习时长：${item.duration_minutes} 分钟`, `- 新增错题：${item.new_mistakes_count}`, `- 复习错题：${item.reviewed_mistakes_count}`, '', item.content || '未填写学习内容', '', item.summary || '');
    }
    lines.push('', '## 四、成绩记录');
    for (const item of backup.exam_scores) lines.push('', `### ${item.exam_date || ''} ${item.exam_name}`, `- 类型：${item.exam_type}`, `- 总分：${item.total_score}`, `- 高数 / 线代 / 概率：${item.calculus_score} / ${item.linear_algebra_score} / ${item.probability_score}`, `- 用时：${item.duration_minutes} 分钟`, '', item.note || '');
    lines.push('', '## 五、阶段目标');
    for (const item of backup.study_goals) lines.push('', `### ${item.title}`, `- 类型：${item.goal_type}`, `- 状态：${item.status}`, `- 进度：${item.current_value}/${item.target_value}`, `- 截止日期：${item.deadline || '未设置'}`, '', item.note || '');
    lines.push('', '## 六、Todo 计划');
    for (const item of backup.todo_items) lines.push('', `### ${item.todo_date} ${item.title}`, `- 时间：${item.start_time || '未设置'}`, `- 类型：${item.task_type}`, `- 科目：${item.subject || '未分类'}`, `- 章节：${item.chapter || '未填写'}`, `- 优先级：${item.priority}`, `- 状态：${item.status}`, '', item.note || '');
    download(`math-wiki-v11-export-${new Date().toISOString().slice(0, 10)}.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导出失败';
  } finally {
    exporting.value = false;
  }
}

async function deleteCurrentData() {
  const [knowledge, mistakes, studyLogs, exams, goals, todos] = await Promise.all([
    request<{ items: KnowledgePoint[] }>('/knowledge'),
    request<{ items: Mistake[] }>('/mistakes'),
    request<{ items: StudyLog[] }>('/study-logs'),
    request<{ items: ExamScore[] }>('/progress?resource=exams'),
    request<{ items: StudyGoal[] }>('/progress?resource=goals'),
    request<{ items: TodoItem[] }>('/progress?resource=todos')
  ]);
  for (const item of mistakes.items) await request(`/mistakes/${item.id}`, { method: 'DELETE' });
  for (const item of knowledge.items) await request(`/knowledge/${item.id}`, { method: 'DELETE' });
  for (const item of studyLogs.items) await request(`/study-logs/${item.id}`, { method: 'DELETE' });
  for (const item of exams.items) await request(`/progress?resource=exams&id=${item.id}`, { method: 'DELETE' });
  for (const item of goals.items) await request(`/progress?resource=goals&id=${item.id}`, { method: 'DELETE' });
  for (const item of todos.items) await request(`/progress?resource=todos&id=${item.id}`, { method: 'DELETE' });
}

async function importBackup(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  importing.value = true;
  importSummary.value = '';
  error.value = '';
  try {
    const backup = JSON.parse(await file.text()) as any;
    const knowledge = Array.isArray(backup.knowledge_points) ? backup.knowledge_points : [];
    const mistakes = Array.isArray(backup.mistakes) ? backup.mistakes : [];
    const studyLogs = Array.isArray(backup.study_logs) ? backup.study_logs : [];
    const reviewRecords = Array.isArray(backup.review_records) ? backup.review_records : [];
    const examScores = Array.isArray(backup.exam_scores) ? backup.exam_scores : [];
    const studyGoals = Array.isArray(backup.study_goals) ? backup.study_goals : [];
    const todoItems = Array.isArray(backup.todo_items) ? backup.todo_items : [];
    if (!knowledge.length && !mistakes.length && !studyLogs.length && !examScores.length && !studyGoals.length && !todoItems.length) throw new Error('备份文件中没有可导入的数据。');
    if (importMode.value === 'overwrite') {
      if (!confirm('覆盖模式会先删除当前知识点、错题、学习日志、成绩、目标和 Todo，确定继续吗？')) return;
      await deleteCurrentData();
    }

    const knowledgeMap = new Map<number, number>();
    for (const item of knowledge) {
      const created = await request<{ id: number }>('/knowledge', { method: 'POST', body: JSON.stringify({ subject: item.subject, chapter: item.chapter, title: item.title, content_md: item.content_md, mastery_level: item.mastery_level }) });
      knowledgeMap.set(Number(item.id), created.id);
    }

    const mistakeMap = new Map<number, number>();
    for (const item of mistakes) {
      const created = await request<{ id: number }>('/mistakes', { method: 'POST', body: JSON.stringify({ ...item, knowledge_point_id: item.knowledge_point_id ? knowledgeMap.get(Number(item.knowledge_point_id)) || null : null }) });
      mistakeMap.set(Number(item.id), created.id);
    }

    for (const item of studyLogs) {
      await request('/study-logs', { method: 'POST', body: JSON.stringify(item) });
    }

    for (const item of examScores) await request('/progress?resource=exams', { method: 'POST', body: JSON.stringify(item) });
    for (const item of studyGoals) await request('/progress?resource=goals', { method: 'POST', body: JSON.stringify(item) });
    for (const item of todoItems) await request('/progress?resource=todos', { method: 'POST', body: JSON.stringify(item) });

    for (const record of reviewRecords) {
      const newMistakeId = mistakeMap.get(Number(record.mistake_id));
      if (!newMistakeId) continue;
      await request('/review-records', { method: 'POST', body: JSON.stringify({ ...record, mistake_id: newMistakeId, preserve_state: true }) });
    }

    importSummary.value = `导入完成：知识点 ${knowledge.length} 个，错题 ${mistakes.length} 道，学习日志 ${studyLogs.length} 条，复习记录 ${reviewRecords.length} 条，成绩 ${examScores.length} 条，目标 ${studyGoals.length} 个，Todo ${todoItems.length} 项。`;
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导入失败';
  } finally {
    importing.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div><h2>学习总览</h2><p>用数据看清数学一复习进度和薄弱环节。</p></div>
      <div class="actions"><button class="secondary" @click="load">刷新</button><button class="secondary" :disabled="exporting" @click="exportJson">导出 JSON</button><button class="secondary" :disabled="exporting" @click="exportMarkdown">导出 Markdown</button></div>
    </div>
    <p v-if="error" class="error">{{ error }}</p><p v-if="loading">加载中...</p>

    <div class="grid grid-4" v-else>
      <div class="card stat"><span>知识点数量</span><strong>{{ data.knowledgeCount }}</strong></div><div class="card stat"><span>错题数量</span><strong>{{ data.mistakeCount }}</strong></div><div class="card stat"><span>今日待复习</span><strong>{{ data.dueCount }}</strong></div><div class="card stat"><span>已经逾期</span><strong>{{ data.overdueCount }}</strong></div><div class="card stat"><span>近 7 天学习</span><strong>{{ Math.round(data.weekStudyMinutes / 60 * 10) / 10 }}h</strong></div><div class="card stat"><span>近 7 天复习</span><strong>{{ data.reviewedWeekCount }}</strong></div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card"><h3>错题状态分布</h3><div v-if="data.statusStats.length === 0" class="muted">暂无错题数据</div><div v-for="item in data.statusStats" :key="item.status" class="bar-row"><div class="bar-label"><span class="badge">{{ item.status || '未设置' }}</span><strong>{{ item.count }} 道</strong></div><div class="bar"><span :style="{ width: `${Math.max(8, item.count / maxStatus * 100)}%` }"></span></div></div></div>
      <div class="card"><h3>薄弱章节 Top 8</h3><div v-if="data.weakChapters.length === 0" class="muted">暂无章节统计</div><div v-for="item in data.weakChapters" :key="item.subject + item.chapter" class="bar-row"><div class="bar-label"><span>{{ item.subject }} / {{ item.chapter || '未分类' }}</span><strong>{{ item.count }} 道</strong></div><div class="bar"><span :style="{ width: `${Math.max(8, item.count / maxWeak * 100)}%` }"></span></div></div></div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card"><h3>薄弱知识点 Top 8</h3><div v-if="data.weakKnowledge.length === 0" class="muted">暂无薄弱知识点数据</div><RouterLink v-for="item in data.weakKnowledge" :key="item.id" :to="`/knowledge/${item.id}`" class="weak-knowledge-row"><div><strong>{{ item.title }}</strong><span>{{ item.subject }} / {{ item.chapter || '未分章节' }}</span></div><small>{{ item.mistake_count }} 道未掌握错题 · 掌握 {{ item.mastery_level }}/5</small></RouterLink></div>
      <div class="card"><h3>最近 7 天学习时长</h3><div v-if="data.recentStudy.length === 0" class="muted">最近 7 天暂无学习日志</div><div v-for="item in data.recentStudy" :key="item.study_date" class="bar-row"><div class="bar-label"><span>{{ item.study_date }}</span><strong>{{ item.minutes }} 分钟</strong></div><div class="bar study-bar"><span :style="{ width: `${Math.max(6, item.minutes / maxStudy * 100)}%` }"></span></div></div></div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card"><div class="card-head"><div><h3>最近 90 天学习热力图</h3><p class="muted">学习日志、错题、复习和知识点都会计入活跃度。</p></div><strong>{{ activeDays }} 天活跃</strong></div><div class="heatmap"><span v-for="day in heatmapDays" :key="day.date" :class="`heat-level-${day.level}`" :title="`${day.date}：学习 ${day.study_minutes || 0} 分钟，新增错题 ${day.new_mistakes || 0}，复习 ${day.reviewed || 0}`"></span></div><div class="heat-legend"><small>较少</small><i class="heat-level-0"></i><i class="heat-level-1"></i><i class="heat-level-2"></i><i class="heat-level-3"></i><i class="heat-level-4"></i><small>较多</small></div></div>
      <div class="card"><h3>本周学习报告</h3><p>{{ weeklySummary }}</p><div class="mini-stats"><span>进行中目标 <strong>{{ data.activeGoalCount }}</strong></span><span>最新成绩 <strong>{{ data.latestExam?.total_score ?? '-' }}</strong></span></div><RouterLink class="link-button secondary-link" to="/progress">查看成绩与阶段目标</RouterLink></div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-head"><div><h3>今日 Todo</h3><p class="muted">{{ todayTodos.filter(item => item.status === '已完成').length }} / {{ todayTodos.length }} 已完成</p></div><RouterLink class="link-button secondary-link" to="/todos">打开 Todo 日历</RouterLink></div>
      <div v-if="todayTodos.length" class="dashboard-todo-list">
        <div v-for="item in todayTodos.slice(0, 6)" :key="item.id" class="dashboard-todo-item" :class="{ completed: item.status === '已完成' }">
          <span>{{ item.status === '已完成' ? '✓' : '○' }}</span><div><strong>{{ item.title }}</strong><small>{{ item.start_time ? String(item.start_time).slice(0, 5) : '未设时间' }} · {{ item.task_type }} · {{ item.priority }}</small></div>
        </div>
        <p v-if="todayTodos.length > 6" class="muted">还有 {{ todayTodos.length - 6 }} 项，请进入 Todo 日历查看。</p>
      </div>
      <p v-else class="muted">今天还没有 Todo，点击右上角进入日历添加计划。</p>
    </div>

    <div class="card" style="margin-top:16px"><h3>下一步复习建议</h3><p v-if="data.overdueCount > 0">你有 {{ data.overdueCount }} 道错题已经逾期，建议先进入“今日复习”清理逾期内容。</p><p v-else-if="data.dueCount > 0">今天有 {{ data.dueCount }} 道错题待复习，完成后再复盘薄弱知识点。</p><p v-else-if="data.weakKnowledge.length">今天没有到期错题，可以优先复盘“{{ data.weakKnowledge[0].title }}”。</p><p v-else>今天没有到期错题，建议继续整理新知识点或完成一组章节练习。</p></div>

    <div class="card" style="margin-top:16px">
      <h3>JSON 备份恢复</h3><p class="muted">合并模式保留现有数据；覆盖模式会先删除现有知识点、错题、学习日志、成绩、目标和 Todo。</p>
      <div class="import-row"><select v-model="importMode"><option value="merge">合并导入</option><option value="overwrite">覆盖导入</option></select><label class="link-button secondary-link file-button">{{ importing ? '正在导入...' : '选择 JSON 备份' }}<input type="file" accept="application/json,.json" :disabled="importing" @change="importBackup" /></label></div>
      <p v-if="importSummary" class="success-message">{{ importSummary }}</p>
    </div>
  </section>
</template>
