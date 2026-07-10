<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { isGuest, request } from '../api';
import { renderMarkdown, typesetMath } from '../markdown';
import type { KnowledgePoint, Mistake } from '../types';

const guest = isGuest();
const route = useRoute();
const items = ref<Mistake[]>([]);
const knowledgeItems = ref<KnowledgePoint[]>([]);
const error = ref('');
const draftMessage = ref('');
const editingId = ref<number | null>(null);
const customTag = ref('');
const quickMode = ref(false);
const saving = ref(false);
const tagOptions = ['概念不清', '公式记错', '计算失误', '方法不会', '分类讨论遗漏', '条件看漏', '题意理解错误', '时间不足'];
const filter = reactive({ q: '', subject: '', chapter: '', knowledge_point_id: '', status: '', difficulty: '', tag: '', overdue: false, sort: 'review_date' });
const DRAFT_KEY = 'math-wiki-mistake-draft-v2';
const form = reactive({
  title: '',
  subject: '高等数学',
  chapter: '',
  knowledge_point_id: '' as number | '',
  source: '',
  question_text: '',
  answer_text: '',
  wrong_reason: '',
  summary: '',
  tags: [] as string[],
  difficulty: 3,
  status: '待复习',
  next_review_date: ''
});

const filteredKnowledge = computed(() => knowledgeItems.value.filter((item) => item.subject === form.subject));
const filterKnowledge = computed(() => knowledgeItems.value.filter((item) => !filter.subject || item.subject === filter.subject));
const chapters = computed(() => Array.from(new Set(items.value.map((item) => item.chapter || '').filter(Boolean))).sort());
const selectedKnowledge = computed(() => knowledgeItems.value.find((item) => item.id === Number(form.knowledge_point_id)) || null);
const questionPreview = computed(() => renderMarkdown(form.question_text));
const answerPreview = computed(() => renderMarkdown(form.answer_text));
const wrongReasonPreview = computed(() => renderMarkdown(form.wrong_reason));
const summaryPreview = computed(() => renderMarkdown(form.summary));

watch(() => form.subject, () => {
  if (form.knowledge_point_id && !filteredKnowledge.value.some((item) => item.id === Number(form.knowledge_point_id))) {
    form.knowledge_point_id = '';
  }
});

watch(() => filter.subject, () => {
  filter.knowledge_point_id = '';
  load();
});

watch([questionPreview, answerPreview, wrongReasonPreview, summaryPreview], () => {
  nextTick(typesetMath);
}, { flush: 'post' });

watch(form, () => {
  const hasContent = [form.title, form.chapter, form.source, form.question_text, form.answer_text, form.wrong_reason, form.summary, ...form.tags]
    .some((value) => String(value ?? '').trim() !== '');
  if (!hasContent) {
    clearDraft();
    return;
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ editingId: editingId.value, form: { ...form, tags: [...form.tags] } }));
  draftMessage.value = '草稿已自动保存';
}, { deep: true });

function restoreDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  try {
    const draft = JSON.parse(raw) as { editingId?: number | null; form?: Record<string, unknown> };
    if (!draft.form || !confirm('检测到未提交的错题草稿，是否恢复？')) return;
    editingId.value = draft.editingId || null;
    Object.assign(form, draft.form, { tags: Array.isArray(draft.form.tags) ? draft.form.tags : [] });
    draftMessage.value = '已恢复上次草稿';
  } catch {
    localStorage.removeItem(DRAFT_KEY);
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
  draftMessage.value = '';
}

function reset() {
  editingId.value = null;
  Object.assign(form, {
    title: '', subject: '高等数学', chapter: '', knowledge_point_id: '', source: '', question_text: '', answer_text: '',
    wrong_reason: '', summary: '', tags: [], difficulty: 3, status: '待复习', next_review_date: ''
  });
  customTag.value = '';
  clearDraft();
}

function toggleTag(tag: string) {
  form.tags = form.tags.includes(tag) ? form.tags.filter((item) => item !== tag) : [...form.tags, tag];
}

function addCustomTag() {
  const tag = customTag.value.trim();
  if (!tag) return;
  if (!form.tags.includes(tag)) form.tags = [...form.tags, tag];
  customTag.value = '';
}

async function loadKnowledge() {
  const res = await request<{ items: KnowledgePoint[] }>('/knowledge');
  knowledgeItems.value = res.items;
}

async function load() {
  error.value = '';
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.subject) params.set('subject', filter.subject);
  if (filter.chapter) params.set('chapter', filter.chapter);
  if (filter.knowledge_point_id) params.set('knowledge_point_id', filter.knowledge_point_id);
  if (filter.status) params.set('status', filter.status);
  if (filter.difficulty) params.set('difficulty', filter.difficulty);
  if (filter.tag) params.set('tag', filter.tag);
  if (filter.overdue) params.set('overdue', '1');
  if (filter.sort) params.set('sort', filter.sort);
  try {
    const res = await request<{ items: Mistake[] }>(`/mistakes?${params}`);
    items.value = res.items;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function editByIdFromQuery() {
  const editId = Number(route.query.edit || 0);
  if (!editId) return;
  let target = items.value.find((item) => item.id === editId);
  if (!target) {
    try {
      const res = await request<{ item: Mistake }>(`/mistakes/${editId}`);
      target = res.item;
    } catch {
      return;
    }
  }
  edit(target);
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function save(continueAdding = false) {
  error.value = '';
  if (!form.title.trim()) {
    error.value = '请填写错题标题。';
    return;
  }
  saving.value = true;
  const payload = {
    ...form,
    tags: [...form.tags],
    knowledge_point_id: form.knowledge_point_id ? Number(form.knowledge_point_id) : null,
    difficulty: quickMode.value && !editingId.value ? 3 : form.difficulty,
    status: quickMode.value && !editingId.value ? '待复习' : form.status,
    next_review_date: quickMode.value && !editingId.value && !form.next_review_date ? tomorrowDate() : form.next_review_date
  };
  try {
    if (editingId.value) {
      await request(`/mistakes/${editingId.value}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await request('/mistakes', { method: 'POST', body: JSON.stringify(payload) });
    }
    clearDraft();
    const keepSubject = form.subject;
    const keepChapter = form.chapter;
    reset();
    if (continueAdding) {
      form.subject = keepSubject;
      form.chapter = keepChapter;
      quickMode.value = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败';
  } finally {
    saving.value = false;
  }
}

function edit(item: Mistake) {
  editingId.value = item.id;
  Object.assign(form, {
    title: item.title,
    subject: item.subject,
    chapter: item.chapter || '',
    knowledge_point_id: item.knowledge_point_id || '',
    source: item.source || '',
    question_text: item.question_text || '',
    answer_text: item.answer_text || '',
    wrong_reason: item.wrong_reason || '',
    summary: item.summary || '',
    tags: [...(item.tags || [])],
    difficulty: item.difficulty || 3,
    status: item.status || '待复习',
    next_review_date: item.next_review_date || ''
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function remove(id: number) {
  if (!confirm('确定删除这道错题吗？')) return;
  try {
    await request(`/mistakes/${id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败';
  }
}

onMounted(async () => {
  await Promise.all([loadKnowledge(), load()]);
  await editByIdFromQuery();
  if (!route.query.edit) restoreDraft();
  await nextTick();
  typesetMath();
});
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>错题本</h2>
        <p>支持完整录入、快速录题、组合筛选和复习排序。</p>
      </div>
      <div class="actions">
        <RouterLink class="link-button secondary-link" to="/mistakes/print">打印错题本</RouterLink>
        <button v-if="!guest" type="button" :class="quickMode ? 'primary' : 'secondary'" @click="quickMode = !quickMode">{{ quickMode ? '退出快速模式' : '快速录题' }}</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="!guest" class="grid grid-2">
      <div class="card">
        <div class="card-head"><div><h3>{{ editingId ? '编辑错题' : (quickMode ? '快速录题' : '新增错题') }}</h3><p v-if="quickMode && !editingId" class="muted small-text">只填写核心内容，其他字段以后再补充。</p></div><span v-if="draftMessage" class="muted small-text">{{ draftMessage }}</span></div>
        <form class="form" @submit.prevent="save()">
          <div class="form-row"><label>标题<input v-model="form.title" placeholder="如 极限等价替换错误" /></label><label>科目<select v-model="form.subject"><option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option></select></label></div>
          <div class="form-row"><label>章节<input v-model="form.chapter" placeholder="如 极限" /></label><label v-if="!quickMode || editingId">关联知识点<select v-model="form.knowledge_point_id"><option value="">不关联</option><option v-for="kp in filteredKnowledge" :key="kp.id" :value="kp.id">{{ kp.chapter }} / {{ kp.title }}</option></select></label></div>
          <template v-if="!quickMode || editingId">
            <div class="form-row"><label>来源<input v-model="form.source" placeholder="如 660 / 880 / 真题" /></label><label>状态<select v-model="form.status"><option>待复习</option><option>复习中</option><option>已掌握</option></select></label></div>
            <div class="form-row"><label>难度 1-5<input v-model.number="form.difficulty" type="number" min="1" max="5" /></label><label>下次复习日期<input v-model="form.next_review_date" type="date" /></label></div>
          </template>
          <template v-if="!quickMode || editingId">
          <label>错误类型标签</label>
          <div class="tag-picker"><button v-for="tag in tagOptions" :key="tag" type="button" :class="{ active: form.tags.includes(tag) }" @click="toggleTag(tag)">{{ tag }}</button></div>
          <div class="tag-custom"><input v-model="customTag" placeholder="自定义标签" @keyup.enter.prevent="addCustomTag" /><button type="button" class="secondary" @click="addCustomTag">添加</button></div>
          <div v-if="form.tags.length" class="tag-list"><span v-for="tag in form.tags" :key="tag" class="tag-chip">{{ tag }} <button type="button" @click="toggleTag(tag)">×</button></span></div>
          </template>
          <label>题目 Markdown<textarea v-model="form.question_text" class="large-textarea" /></label>
          <label v-if="!quickMode || editingId">正确解法 Markdown<textarea v-model="form.answer_text" class="large-textarea" /></label>
          <label>错误原因<textarea v-model="form.wrong_reason" placeholder="具体写清楚为什么错" /></label>
          <label v-if="!quickMode || editingId">总结 Markdown<textarea v-model="form.summary" /></label>
          <div class="actions"><button class="primary" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button><button v-if="quickMode && !editingId" class="secondary" type="button" :disabled="saving" @click="save(true)">保存并继续</button><button class="secondary" type="button" @click="reset">清空</button></div>
        </form>
      </div>

      <div class="card">
        <h3>错题预览</h3>
        <div class="preview-scroll">
          <p v-if="selectedKnowledge" class="tip">已关联：{{ selectedKnowledge.subject }} / {{ selectedKnowledge.chapter }} / {{ selectedKnowledge.title }}</p>
          <div v-if="form.tags.length" class="tag-list"><span v-for="tag in form.tags" :key="tag" class="tag-chip readonly">{{ tag }}</span></div>
          <h4>题目</h4><div class="markdown-body" v-html="questionPreview"></div>
          <template v-if="!quickMode || editingId"><h4>正确解法</h4><div class="markdown-body" v-html="answerPreview"></div></template>
          <h4>错误原因</h4><div class="markdown-body" v-html="wrongReasonPreview"></div>
          <template v-if="!quickMode || editingId"><h4>总结</h4><div class="markdown-body" v-html="summaryPreview"></div></template>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-head"><h3>组合筛选</h3><button class="secondary" @click="load">应用筛选</button></div>
      <div class="filter-grid">
        <input v-model="filter.q" placeholder="标题、题目、错因、总结、来源" @keyup.enter="load" />
        <select v-model="filter.subject"><option value="">全部科目</option><option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option></select>
        <input v-model="filter.chapter" list="mistake-chapters" placeholder="全部章节" /><datalist id="mistake-chapters"><option v-for="chapter in chapters" :key="chapter" :value="chapter" /></datalist>
        <select v-model="filter.knowledge_point_id"><option value="">全部知识点</option><option v-for="kp in filterKnowledge" :key="kp.id" :value="String(kp.id)">{{ kp.chapter }} / {{ kp.title }}</option></select>
        <select v-model="filter.status"><option value="">全部状态</option><option>待复习</option><option>复习中</option><option>已掌握</option></select>
        <select v-model="filter.difficulty"><option value="">全部难度</option><option v-for="n in 5" :key="n" :value="String(n)">{{ n }} 星</option></select>
        <select v-model="filter.tag"><option value="">全部标签</option><option v-for="tag in tagOptions" :key="tag">{{ tag }}</option></select>
        <select v-model="filter.sort"><option value="review_date">按复习日期</option><option value="created_desc">最新创建</option><option value="created_asc">最早创建</option><option value="difficulty_desc">难度从高到低</option><option value="review_count_desc">复习次数从高到低</option></select>
      </div>
      <label class="check-line"><input v-model="filter.overdue" type="checkbox" /> 只看已逾期且未掌握的错题</label>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-head"><h3>错题列表</h3><p class="muted">共 {{ items.length }} 道</p></div>
      <table class="table compact-table">
        <thead><tr><th>错题</th><th>章节</th><th>标签</th><th>状态</th><th>复习</th><th>错因</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><strong>{{ item.title }}</strong><br><span class="badge">{{ item.subject }}</span> · 难度 {{ item.difficulty }}/5</td>
            <td>{{ item.chapter || '未分章节' }}<br><small class="muted">{{ item.knowledge_title || '未关联知识点' }}</small></td>
            <td><div class="tag-list compact"><span v-for="tag in item.tags || []" :key="tag" class="tag-chip readonly">{{ tag }}</span><span v-if="!item.tags?.length" class="muted">无</span></div></td>
            <td>{{ item.status }}</td>
            <td>下次：{{ item.next_review_date || '未设置' }}<br>次数：{{ item.review_count }}</td>
            <td>{{ (item.wrong_reason || '').slice(0, 80) }}</td>
            <td><div class="actions nowrap-actions"><RouterLink class="link-button primary-link" :to="`/mistakes/${item.id}`">预览</RouterLink><template v-if="!guest"><button class="secondary" @click="edit(item)">编辑</button><button class="danger" @click="remove(item.id)">删除</button></template></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
