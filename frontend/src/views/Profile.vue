<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { isGuest, request } from '../api';
import { showToast } from '../toast';
import type { ExamScore, KnowledgePoint, Mistake, ReviewRecord, StudyLog, TodoItem, UserProfile } from '../types';
import ImageUploader from '../components/ImageUploader.vue';

const guest = isGuest();
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const stats = ref({ studyMinutes: 0, knowledge: 0, mistakes: 0, reviews: 0, completedTodos: 0, highestScore: 0 });
const form = ref<UserProfile>({
  nickname: 'Math Seeker', avatar_style: 'blue', avatar_url: '', signature: '稳扎稳打，每天进步一点。',
  target_school: '', target_major: '', exam_year: new Date().getFullYear() + 1,
  preparation_start_date: '', exam_date: '', daily_target_minutes: 300, math_target_score: 120
});

const avatarStyles = [
  { value: 'blue', label: '深海蓝' }, { value: 'violet', label: '星空紫' },
  { value: 'green', label: '森林绿' }, { value: 'orange', label: '晨曦橙' }
];
const initials = computed(() => (form.value.nickname || '研').trim().slice(0, 2));
const preparationDays = computed(() => {
  if (!form.value.preparation_start_date) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(form.value.preparation_start_date).getTime()) / 86400000) + 1);
});
const examDays = computed(() => {
  if (!form.value.exam_date) return null;
  return Math.ceil((new Date(form.value.exam_date).getTime() - Date.now()) / 86400000);
});
const studyHours = computed(() => Math.round(stats.value.studyMinutes / 6) / 10);
const scoreProgress = computed(() => Math.min(100, Math.round(stats.value.highestScore / Math.max(1, form.value.math_target_score) * 100)));

async function load() {
  loading.value = true; error.value = '';
  try {
    const [profile, knowledge, mistakes, logs, exams, todos] = await Promise.all([
      request<{ item: UserProfile }>('/progress?resource=profile'),
      request<{ items: KnowledgePoint[] }>('/knowledge'),
      request<{ items: Mistake[] }>('/mistakes'),
      request<{ items: StudyLog[] }>('/study-logs'),
      request<{ items: ExamScore[] }>('/progress?resource=exams'),
      request<{ items: TodoItem[] }>('/progress?resource=todos')
    ]);
    if (profile.item) form.value = { ...form.value, ...profile.item };
    const reviewGroups = await Promise.all(mistakes.items.map((m) => request<{ items: ReviewRecord[] }>(`/review-records?mistake_id=${m.id}`)));
    stats.value = {
      studyMinutes: logs.items.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0),
      knowledge: knowledge.items.length,
      mistakes: mistakes.items.length,
      reviews: reviewGroups.reduce((sum, group) => sum + group.items.length, 0),
      completedTodos: todos.items.filter((item) => item.status === '已完成').length,
      highestScore: Math.max(0, ...exams.items.map((item) => Number(item.total_score || 0)))
    };
  } catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; }
  finally { loading.value = false; }
}


function setAvatar(payload: { url: string }) {
  form.value.avatar_url = payload.url;
  showToast('头像已上传，请点击保存资料');
}

function removeAvatar() {
  form.value.avatar_url = '';
}

async function save() {
  saving.value = true; error.value = '';
  try {
    await request('/progress?resource=profile', { method: 'PUT', body: JSON.stringify(form.value) });
    showToast('个人信息已保存');
  } catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; showToast(error.value, 'error'); }
  finally { saving.value = false; }
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title profile-title">
      <div><span class="eyebrow">PERSONAL SPACE</span><h2>个人中心</h2><p>记录你的目标，让每一次学习都更有方向。</p></div>
      <button v-if="!guest" class="primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存资料' }}</button>
    </div>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="card skeleton-card">正在加载个人资料…</div>
    <template v-else>
      <div class="profile-hero card">
        <div class="profile-avatar" :class="`avatar-${form.avatar_style}`"><img v-if="form.avatar_url" :src="form.avatar_url" alt="个人头像"><span v-else>{{ initials }}</span></div>
        <div class="profile-hero-copy">
          <span class="badge">{{ form.exam_year || '目标' }} 考研</span>
          <h3>{{ form.nickname || 'Math Seeker' }}</h3>
          <p>{{ form.signature || '写下一句陪你走完整个备考季的话。' }}</p>
          <div class="profile-meta"><span>🎓 {{ form.target_school || '目标院校待填写' }}</span><span>📚 {{ form.target_major || '目标专业待填写' }}</span><span>⏳ {{ examDays === null ? '考试日期待设置' : examDays >= 0 ? `距离考试 ${examDays} 天` : '考试日期已过' }}</span></div>
        </div>
      </div>

      <div class="grid grid-4 profile-stat-grid">
        <div class="card stat accent-blue"><span>备考天数</span><strong>{{ preparationDays }}</strong><small>坚持本身就是答案</small></div>
        <div class="card stat accent-violet"><span>累计学习</span><strong>{{ studyHours }}h</strong><small>{{ stats.knowledge }} 个知识点</small></div>
        <div class="card stat accent-orange"><span>错题与复习</span><strong>{{ stats.mistakes }}</strong><small>累计复习 {{ stats.reviews }} 次</small></div>
        <div class="card stat accent-green"><span>最高成绩</span><strong>{{ stats.highestScore }}</strong><small>完成 Todo {{ stats.completedTodos }} 项</small></div>
      </div>

      <div class="profile-layout">
        <form v-if="!guest" class="card form profile-form" @submit.prevent="save">
          <div class="card-head"><div><span class="eyebrow">PROFILE</span><h3>基本信息</h3></div></div>
          <div class="form-row"><label>昵称<input v-model="form.nickname" maxlength="100" /></label><label>头像风格<select v-model="form.avatar_style"><option v-for="item in avatarStyles" :key="item.value" :value="item.value">{{ item.label }}</option></select></label></div>
          <div class="avatar-upload-row"><ImageUploader category="avatar" label="上传个人头像" avatar @uploaded="setAvatar" /><button v-if="form.avatar_url" type="button" class="secondary" @click="removeAvatar">恢复文字头像</button></div>
          <label>个性签名<input v-model="form.signature" maxlength="255" placeholder="稳扎稳打，每天进步一点。" /></label>
          <div class="form-row"><label>目标院校<input v-model="form.target_school" /></label><label>目标专业<input v-model="form.target_major" /></label></div>
          <div class="form-row"><label>考试年份<input v-model.number="form.exam_year" type="number" min="2026" max="2100" /></label><label>数学目标分数<input v-model.number="form.math_target_score" type="number" min="0" max="150" step="0.5" /></label></div>
          <div class="form-row"><label>备考开始日期<input v-model="form.preparation_start_date" type="date" /></label><label>考试日期<input v-model="form.exam_date" type="date" /></label></div>
          <label>每日目标时长（分钟）<input v-model.number="form.daily_target_minutes" type="number" min="0" step="30" /></label>
          <button class="primary" type="submit" :disabled="saving">{{ saving ? '保存中…' : '保存个人信息' }}</button>
        </form>

        <div class="grid profile-side-grid">
          <div class="card goal-card"><span class="eyebrow">SCORE TARGET</span><h3>数学目标</h3><div class="score-ring" :style="{ '--progress': scoreProgress + '%' }"><div><strong>{{ scoreProgress }}%</strong><small>目标进度</small></div></div><div class="goal-row"><span>当前最高</span><strong>{{ stats.highestScore }} 分</strong></div><div class="goal-row"><span>目标分数</span><strong>{{ form.math_target_score }} 分</strong></div></div>
          <div class="card daily-goal"><span class="eyebrow">DAILY RHYTHM</span><h3>每日节奏</h3><p>每天计划学习 <strong>{{ Math.round(form.daily_target_minutes / 6) / 10 }}</strong> 小时。</p><div class="mini-progress"><span :style="{ width: Math.min(100, form.daily_target_minutes / 6) + '%' }"></span></div><small>建议根据实际状态每周微调一次，不追求一次设得完美。</small></div>
        </div>
      </div>
    </template>
  </section>
</template>
