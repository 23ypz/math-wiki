<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { isGuest, request } from '../api';
import type { ExamScore, StudyGoal } from '../types';

const guest = isGuest();
const tab = ref<'exams' | 'goals'>('exams');
const exams = ref<ExamScore[]>([]);
const goals = ref<StudyGoal[]>([]);
const error = ref('');
const saving = ref(false);
const editingExamId = ref<number | null>(null);
const editingGoalId = ref<number | null>(null);

const examForm = reactive({ exam_name: '', exam_type: '历年真题', exam_date: new Date().toISOString().slice(0, 10), total_score: 0, calculus_score: 0, linear_algebra_score: 0, probability_score: 0, duration_minutes: 180, mistake_count: 0, note: '' });
const goalForm = reactive({ title: '', goal_type: '学习任务', start_date: new Date().toISOString().slice(0, 10), deadline: '', current_value: 0, target_value: 1, status: '进行中', note: '' });

const sortedExams = computed(() => [...exams.value].sort((a, b) => String(a.exam_date || '').localeCompare(String(b.exam_date || ''))));
const chartPoints = computed(() => {
  const items = sortedExams.value.slice(-12);
  if (!items.length) return '';
  const width = 620;
  const height = 180;
  const max = Math.max(150, ...items.map((x) => Number(x.total_score) || 0));
  return items.map((item, index) => {
    const x = items.length === 1 ? width / 2 : index * width / (items.length - 1);
    const y = height - (Number(item.total_score) || 0) / max * (height - 20);
    return `${x},${y}`;
  }).join(' ');
});
const averageScore = computed(() => exams.value.length ? Math.round(exams.value.reduce((sum, x) => sum + Number(x.total_score || 0), 0) / exams.value.length * 10) / 10 : 0);
const bestScore = computed(() => Math.max(0, ...exams.value.map((x) => Number(x.total_score) || 0)));
const activeGoals = computed(() => goals.value.filter((x) => x.status === '进行中'));
const overdueGoals = computed(() => goals.value.filter((x) => x.status !== '已完成' && x.deadline && x.deadline < new Date().toISOString().slice(0, 10)));

async function load() {
  error.value = '';
  try {
    const [examRes, goalRes] = await Promise.all([
      request<{ items: ExamScore[] }>('/progress?resource=exams'),
      request<{ items: StudyGoal[] }>('/progress?resource=goals')
    ]);
    exams.value = examRes.items;
    goals.value = goalRes.items;
  } catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; }
}

function resetExam() {
  editingExamId.value = null;
  Object.assign(examForm, { exam_name: '', exam_type: '历年真题', exam_date: new Date().toISOString().slice(0, 10), total_score: 0, calculus_score: 0, linear_algebra_score: 0, probability_score: 0, duration_minutes: 180, mistake_count: 0, note: '' });
}
function editExam(item: ExamScore) { editingExamId.value = item.id; Object.assign(examForm, item); window.scrollTo({ top: 0, behavior: 'smooth' }); }
async function saveExam() {
  if (!examForm.exam_name.trim()) return;
  saving.value = true; error.value = '';
  try {
    await request('/progress?resource=exams', { method: editingExamId.value ? 'PUT' : 'POST', body: JSON.stringify({ ...examForm, id: editingExamId.value }) });
    resetExam(); await load();
  } catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; } finally { saving.value = false; }
}
async function deleteExam(id: number) { if (!confirm('确定删除这条成绩记录吗？')) return; await request(`/progress?resource=exams&id=${id}`, { method: 'DELETE' }); await load(); }

function resetGoal() {
  editingGoalId.value = null;
  Object.assign(goalForm, { title: '', goal_type: '学习任务', start_date: new Date().toISOString().slice(0, 10), deadline: '', current_value: 0, target_value: 1, status: '进行中', note: '' });
}
function editGoal(item: StudyGoal) { editingGoalId.value = item.id; Object.assign(goalForm, item); window.scrollTo({ top: 0, behavior: 'smooth' }); }
async function saveGoal() {
  if (!goalForm.title.trim()) return;
  saving.value = true; error.value = '';
  try {
    await request('/progress?resource=goals', { method: editingGoalId.value ? 'PUT' : 'POST', body: JSON.stringify({ ...goalForm, id: editingGoalId.value }) });
    resetGoal(); await load();
  } catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; } finally { saving.value = false; }
}
async function deleteGoal(id: number) { if (!confirm('确定删除这个目标吗？')) return; await request(`/progress?resource=goals&id=${id}`, { method: 'DELETE' }); await load(); }
function percent(goal: StudyGoal) { return Math.min(100, Math.max(0, Math.round(Number(goal.current_value || 0) / Math.max(1, Number(goal.target_value || 1)) * 100))); }

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title"><div><h2>学习进度</h2><p>记录真题与模拟卷成绩，管理阶段目标并观察提升趋势。</p></div><button class="secondary" @click="load">刷新</button></div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="tab-row"><button :class="{ active: tab === 'exams' }" @click="tab = 'exams'">成绩记录</button><button :class="{ active: tab === 'goals' }" @click="tab = 'goals'">阶段目标</button></div>

    <template v-if="tab === 'exams'">
      <div v-if="!guest" class="card">
        <h3>{{ editingExamId ? '编辑成绩' : '新增成绩' }}</h3>
        <div class="form-row"><label>试卷名称<input v-model="examForm.exam_name" placeholder="例如：2025 年数学一真题" /></label><label>试卷类型<select v-model="examForm.exam_type"><option>历年真题</option><option>模拟卷</option><option>阶段测试</option><option>章节测试</option></select></label><label>考试日期<input v-model="examForm.exam_date" type="date" /></label></div>
        <div class="score-grid"><label>总分<input v-model.number="examForm.total_score" type="number" min="0" max="150" /></label><label>高数得分<input v-model.number="examForm.calculus_score" type="number" min="0" /></label><label>线代得分<input v-model.number="examForm.linear_algebra_score" type="number" min="0" /></label><label>概率得分<input v-model.number="examForm.probability_score" type="number" min="0" /></label><label>用时（分钟）<input v-model.number="examForm.duration_minutes" type="number" min="0" /></label><label>错题数量<input v-model.number="examForm.mistake_count" type="number" min="0" /></label></div>
        <label>备注<textarea v-model="examForm.note" placeholder="记录本次考试状态、失分原因和复盘重点" /></label>
        <div class="actions"><button class="primary" :disabled="saving" @click="saveExam">{{ saving ? '保存中...' : '保存成绩' }}</button><button v-if="editingExamId" class="secondary" @click="resetExam">取消编辑</button></div>
      </div>

      <div class="grid grid-3" style="margin-top:16px"><div class="card stat"><span>记录次数</span><strong>{{ exams.length }}</strong></div><div class="card stat"><span>平均分</span><strong>{{ averageScore }}</strong></div><div class="card stat"><span>最高分</span><strong>{{ bestScore }}</strong></div></div>
      <div class="card" style="margin-top:16px"><h3>最近成绩趋势</h3><div v-if="!exams.length" class="muted">暂无成绩记录</div><div v-else class="score-chart"><svg viewBox="0 0 620 200" preserveAspectRatio="none"><line x1="0" y1="180" x2="620" y2="180" class="axis"/><polyline :points="chartPoints" class="score-line" /></svg><div class="chart-labels"><span v-for="item in sortedExams.slice(-12)" :key="item.id">{{ item.exam_date?.slice(5) || '-' }}<b>{{ item.total_score }}</b></span></div></div></div>
      <div class="card table-wrap" style="margin-top:16px"><table><thead><tr><th>日期</th><th>试卷</th><th>类型</th><th>总分</th><th>高数 / 线代 / 概率</th><th>用时</th><th>错题</th><th>操作</th></tr></thead><tbody><tr v-for="item in exams" :key="item.id"><td>{{ item.exam_date || '-' }}</td><td><strong>{{ item.exam_name }}</strong><small class="table-note">{{ item.note }}</small></td><td>{{ item.exam_type }}</td><td><strong>{{ item.total_score }}</strong></td><td>{{ item.calculus_score }} / {{ item.linear_algebra_score }} / {{ item.probability_score }}</td><td>{{ item.duration_minutes }} 分</td><td>{{ item.mistake_count }}</td><td><template v-if="!guest"><button class="link-button" @click="editExam(item)">编辑</button><button class="danger-link" @click="deleteExam(item.id)">删除</button></template><span v-else class="muted">只读</span></td></tr></tbody></table></div>
    </template>

    <template v-else>
      <div v-if="!guest" class="card"><h3>{{ editingGoalId ? '编辑目标' : '新增阶段目标' }}</h3><div class="form-row"><label>目标名称<input v-model="goalForm.title" placeholder="例如：完成高数积分章节一轮复习" /></label><label>目标类型<select v-model="goalForm.goal_type"><option>学习任务</option><option>学习时长</option><option>错题数量</option><option>复习数量</option><option>目标分数</option><option>连续学习</option></select></label><label>状态<select v-model="goalForm.status"><option>进行中</option><option>已完成</option><option>已暂停</option><option>已逾期</option></select></label></div><div class="form-row"><label>开始日期<input v-model="goalForm.start_date" type="date" /></label><label>截止日期<input v-model="goalForm.deadline" type="date" /></label><label>当前进度<input v-model.number="goalForm.current_value" type="number" min="0" /></label><label>目标值<input v-model.number="goalForm.target_value" type="number" min="1" /></label></div><label>备注<textarea v-model="goalForm.note" placeholder="说明完成标准或下一步行动" /></label><div class="actions"><button class="primary" :disabled="saving" @click="saveGoal">{{ saving ? '保存中...' : '保存目标' }}</button><button v-if="editingGoalId" class="secondary" @click="resetGoal">取消编辑</button></div></div>
      <div class="grid grid-3" style="margin-top:16px"><div class="card stat"><span>进行中</span><strong>{{ activeGoals.length }}</strong></div><div class="card stat"><span>已逾期</span><strong>{{ overdueGoals.length }}</strong></div><div class="card stat"><span>全部目标</span><strong>{{ goals.length }}</strong></div></div>
      <div class="goal-list" style="margin-top:16px"><div class="card goal-card" v-for="item in goals" :key="item.id"><div class="card-head"><div><h3>{{ item.title }}</h3><p class="muted"><span class="badge">{{ item.goal_type }}</span> {{ item.start_date || '-' }} 至 {{ item.deadline || '未设截止日期' }}</p></div><span class="badge" :class="{ dangerBadge: item.status === '已逾期' }">{{ item.status }}</span></div><div class="goal-progress"><div><span :style="{ width: `${percent(item)}%` }"></span></div><strong>{{ item.current_value }} / {{ item.target_value }}（{{ percent(item) }}%）</strong></div><p v-if="item.note">{{ item.note }}</p><div v-if="!guest" class="actions"><button class="link-button" @click="editGoal(item)">编辑</button><button class="danger-link" @click="deleteGoal(item.id)">删除</button></div></div><div v-if="!goals.length" class="card muted">暂无阶段目标。</div></div>
    </template>
  </section>
</template>
