<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isGuest, request } from '../api';
import { renderMarkdown, stripMarkdown, typesetMath } from '../markdown';
import type { KnowledgePoint } from '../types';
import ImageUploader from '../components/ImageUploader.vue';

const guest = isGuest();
const router = useRouter();
const route = useRoute();
const items = ref<KnowledgePoint[]>([]);
const error = ref('');
const draftMessage = ref('');
const editingId = ref<number | null>(null);
const showPreview = ref(true);
const filter = reactive({ q: '', subject: '' });
const DRAFT_KEY = 'math-wiki-knowledge-draft-v1';
const form = reactive({ subject: '高等数学', chapter: '', title: '', content_md: '', mastery_level: 0 });
const previewHtml = computed(() => renderMarkdown(form.content_md));

watch(form, () => {
  if (guest) return;
  const hasContent = [form.chapter, form.title, form.content_md].some((value) => String(value ?? '').trim() !== '');
  if (!hasContent) {
    clearDraft();
    return;
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ editingId: editingId.value, form: { ...form } }));
  draftMessage.value = '草稿已自动保存';
}, { deep: true });

function restoreDraft() {
  if (guest) return;
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  try {
    const draft = JSON.parse(raw) as { editingId?: number | null; form?: Record<string, unknown> };
    if (!draft.form) return;
    const hasContent = ['chapter', 'title', 'content_md'].some((key) => String(draft.form?.[key] ?? '').trim() !== '');
    if (!hasContent || !confirm('检测到未提交的知识点草稿，是否恢复？')) return;
    editingId.value = draft.editingId || null;
    Object.assign(form, draft.form);
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
  Object.assign(form, { subject: '高等数学', chapter: '', title: '', content_md: '', mastery_level: 0 });
  clearDraft();
  if (route.query.edit) router.replace('/knowledge');
}

async function load() {
  error.value = '';
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.subject) params.set('subject', filter.subject);
  try {
    const res = await request<{ items: KnowledgePoint[] }>(`/knowledge?${params}`);
    items.value = res.items;
    if (guest && !route.query.edit && res.items.length) {
      const demo = res.items[0];
      Object.assign(form, {
        subject: demo.subject,
        chapter: demo.chapter,
        title: demo.title,
        content_md: demo.content_md || '',
        mastery_level: demo.mastery_level || 0
      });
      showPreview.value = true;
    }
    const editId = Number(route.query.edit);
    if (Number.isFinite(editId) && editId > 0) {
      const target = res.items.find((item) => item.id === editId);
      if (target) edit(target, false);
      else await loadOneForEdit(editId);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function loadOneForEdit(id: number) {
  try {
    const res = await request<{ item: KnowledgePoint }>(`/knowledge/${id}`);
    edit(res.item, false);
  } catch {
    // 忽略，保持列表页可用。
  }
}


function insertKnowledgeImage(payload: { markdown: string }) {
  const block = `\n\n${payload.markdown}\n`;
  form.content_md = `${form.content_md || ''}${block}`;
  showPreview.value = true;
}

async function save() {
  if (guest) {
    error.value = '游客模式仅展示录入框架，不能保存或修改内容。';
    return;
  }
  error.value = '';
  try {
    if (editingId.value) {
      await request(`/knowledge/${editingId.value}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await request('/knowledge', { method: 'POST', body: JSON.stringify(form) });
    }
    clearDraft();
    reset();
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败';
  }
}

function edit(item: KnowledgePoint, shouldScroll = true) {
  editingId.value = item.id;
  Object.assign(form, {
    subject: item.subject,
    chapter: item.chapter,
    title: item.title,
    content_md: item.content_md || '',
    mastery_level: item.mastery_level || 0
  });
  showPreview.value = true;
  if (shouldScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function remove(id: number) {
  if (!confirm('确定删除这个知识点吗？已经关联到错题的记录不会被删除，但关联会保留为历史 ID。')) return;
  try {
    await request(`/knowledge/${id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败';
  }
}

watch([previewHtml, showPreview], () => {
  nextTick(typesetMath);
}, { flush: 'post' });

watch(() => route.query.edit, async () => {
  await load();
});

onMounted(async () => {
  await load();
  if (!route.query.edit) restoreDraft();
  await nextTick();
  typesetMath();
});
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>知识点</h2>
        <p>按高数、线代、概率建立自己的数学一知识体系，列表只保留一行摘要，完整内容进入知识点页面查看。</p>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="grid grid-2 guest-framework-grid" :class="{ 'is-readonly': guest }">
      <div class="card">
        <div class="card-head">
          <div>
            <h3>{{ guest ? '知识点录入示例' : (editingId ? '编辑知识点' : '新增知识点') }}</h3>
            <span v-if="guest" class="readonly-hint">游客模式：可查看输入框与实时预览，但不能编辑或保存。</span>
            <span v-if="draftMessage" class="muted small-text">{{ draftMessage }}</span>
          </div>
          <button class="secondary" type="button" @click="showPreview = !showPreview">{{ showPreview ? '隐藏预览' : '显示预览' }}</button>
        </div>
        <form class="form" @submit.prevent="save">
          <div class="form-row">
            <label>科目
              <select v-model="form.subject" :disabled="guest">
                <option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option>
              </select>
            </label>
            <label>章节<input v-model="form.chapter" :disabled="guest" placeholder="如 极限 / 特征值 / 随机变量" /></label>
          </div>
          <label>标题<input v-model="form.title" :disabled="guest" placeholder="如 等价无穷小" /></label>
          <label>掌握程度 0-5<input v-model.number="form.mastery_level" :disabled="guest" type="number" min="0" max="5" /></label>
          <label>内容 Markdown<textarea v-model="form.content_md" :readonly="guest" class="large-textarea" placeholder="# 核心概念
- 常用公式
- 典型题型
- 易错点" /></label>
          <ImageUploader category="knowledge" label="上传知识点图片" :disabled="guest" @uploaded="insertKnowledgeImage" />
          <div class="actions">
            <button class="primary" :disabled="guest">{{ guest ? '游客模式不可保存' : '保存' }}</button>
            <button class="secondary" type="button" :disabled="guest" @click="reset">清空</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h3>{{ showPreview ? '实时预览' : '筛选' }}</h3>
        <div v-if="showPreview" class="markdown-body preview-scroll" v-html="previewHtml"></div>
        <template v-else>
          <div class="form-row">
            <input v-model="filter.q" placeholder="搜索标题/章节/内容" @keyup.enter="load" />
            <select v-model="filter.subject" @change="load">
              <option value="">全部科目</option><option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option>
            </select>
          </div>
          <button class="secondary" style="margin-top:12px" @click="load">搜索</button>
        </template>
      </div>
    </div>

    <div class="card knowledge-list-card" style="margin-top:16px">
      <div class="card-head">
        <h3>知识点列表</h3>
        <div class="form-row compact-filter">
          <input v-model="filter.q" placeholder="搜索标题/章节/内容" @keyup.enter="load" />
          <select v-model="filter.subject" @change="load">
            <option value="">全部科目</option><option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option>
          </select>
          <button class="secondary" @click="load">搜索</button>
        </div>
      </div>
      <div class="records-scroll records-scroll--five" aria-label="知识点列表，可上下滚动查看更多">
        <table class="table compact-table knowledge-list-table">
          <thead><tr><th>知识点</th><th>章节</th><th>掌握</th><th>内容摘要</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td class="one-line-cell"><strong>{{ item.title }}</strong><span class="badge small-badge">{{ item.subject }}</span></td>
              <td class="one-line-cell">{{ item.chapter || '未分章节' }}</td>
              <td class="mastery-cell"><div class="mini-progress"><span :style="{ width: `${Math.min(100, Math.max(0, item.mastery_level * 20))}%` }"></span></div>{{ item.mastery_level }}/5</td>
              <td><div class="one-line-preview">{{ stripMarkdown(item.content_md, 90) }}</div></td>
              <td>
                <div class="actions nowrap-actions">
                  <RouterLink class="link-button primary-link" :to="`/knowledge/${item.id}`">预览</RouterLink>
                  <template v-if="!guest"><button class="secondary" @click="edit(item)">编辑</button>
                  <button class="danger" @click="remove(item.id)">删除</button></template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
