<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { request } from '../api';
import { renderMarkdown } from '../markdown';
import type { KnowledgePoint, Mistake } from '../types';

const items = ref<Mistake[]>([]);
const knowledgeItems = ref<KnowledgePoint[]>([]);
const error = ref('');
const editingId = ref<number | null>(null);
const filter = reactive({ q: '', subject: '', status: '' });
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
  difficulty: 3,
  status: '待复习',
  next_review_date: ''
});

const filteredKnowledge = computed(() => knowledgeItems.value.filter((item) => item.subject === form.subject));
const selectedKnowledge = computed(() => knowledgeItems.value.find((item) => item.id === Number(form.knowledge_point_id)) || null);
const questionPreview = computed(() => renderMarkdown(form.question_text));
const answerPreview = computed(() => renderMarkdown(form.answer_text));
const summaryPreview = computed(() => renderMarkdown(form.summary || form.wrong_reason));

watch(() => form.subject, () => {
  if (form.knowledge_point_id && !filteredKnowledge.value.some((item) => item.id === Number(form.knowledge_point_id))) {
    form.knowledge_point_id = '';
  }
});

function reset() {
  editingId.value = null;
  Object.assign(form, {
    title: '', subject: '高等数学', chapter: '', knowledge_point_id: '', source: '', question_text: '', answer_text: '',
    wrong_reason: '', summary: '', difficulty: 3, status: '待复习', next_review_date: ''
  });
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
  if (filter.status) params.set('status', filter.status);
  try {
    const res = await request<{ items: Mistake[] }>(`/mistakes?${params}`);
    items.value = res.items;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function save() {
  error.value = '';
  const payload = {
    ...form,
    knowledge_point_id: form.knowledge_point_id ? Number(form.knowledge_point_id) : null
  };
  try {
    if (editingId.value) {
      await request(`/mistakes/${editingId.value}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await request('/mistakes', { method: 'POST', body: JSON.stringify(payload) });
    }
    reset();
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败';
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
});
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>错题本</h2>
        <p>新增“关联知识点”和 Markdown 预览，重点记录错因。</p>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="grid grid-2">
      <div class="card">
        <h3>{{ editingId ? '编辑错题' : '新增错题' }}</h3>
        <form class="form" @submit.prevent="save">
          <div class="form-row">
            <label>标题<input v-model="form.title" placeholder="如 极限等价替换错误" /></label>
            <label>科目<select v-model="form.subject"><option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option></select></label>
          </div>
          <div class="form-row">
            <label>章节<input v-model="form.chapter" placeholder="如 极限" /></label>
            <label>关联知识点
              <select v-model="form.knowledge_point_id">
                <option value="">不关联</option>
                <option v-for="kp in filteredKnowledge" :key="kp.id" :value="kp.id">{{ kp.chapter }} / {{ kp.title }}</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label>来源<input v-model="form.source" placeholder="如 660 / 880 / 真题" /></label>
            <label>状态<select v-model="form.status"><option>待复习</option><option>复习中</option><option>已掌握</option></select></label>
          </div>
          <div class="form-row">
            <label>难度 1-5<input v-model.number="form.difficulty" type="number" min="1" max="5" /></label>
            <label>下次复习日期<input v-model="form.next_review_date" type="date" /></label>
          </div>
          <label>题目 Markdown<textarea v-model="form.question_text" class="large-textarea" /></label>
          <label>正确解法 Markdown<textarea v-model="form.answer_text" class="large-textarea" /></label>
          <label>错误原因<textarea v-model="form.wrong_reason" placeholder="概念不清 / 公式记错 / 计算失误 / 方法不会..." /></label>
          <label>总结 Markdown<textarea v-model="form.summary" /></label>
          <div class="actions"><button class="primary">保存</button><button class="secondary" type="button" @click="reset">清空</button></div>
        </form>
      </div>

      <div class="card">
        <h3>错题预览</h3>
        <p v-if="selectedKnowledge" class="tip">已关联：{{ selectedKnowledge.subject }} / {{ selectedKnowledge.chapter }} / {{ selectedKnowledge.title }}</p>
        <h4>题目</h4>
        <div class="markdown-body" v-html="questionPreview"></div>
        <h4>正确解法</h4>
        <div class="markdown-body" v-html="answerPreview"></div>
        <h4>错因与总结</h4>
        <div class="markdown-body" v-html="summaryPreview"></div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3>筛选</h3>
      <div class="form-row">
        <input v-model="filter.q" placeholder="关键词，可搜索知识点标题" @keyup.enter="load" />
        <select v-model="filter.subject" @change="load"><option value="">全部科目</option><option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option></select>
      </div>
      <div class="form-row" style="margin-top:12px">
        <select v-model="filter.status" @change="load"><option value="">全部状态</option><option>待复习</option><option>复习中</option><option>已掌握</option></select>
        <button class="secondary" @click="load">搜索</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <table class="table">
        <thead><tr><th>错题</th><th>关联知识点</th><th>状态</th><th>复习</th><th>错因</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><strong>{{ item.title }}</strong><br><span class="badge">{{ item.subject }}</span> {{ item.chapter }} · 难度 {{ item.difficulty }}/5</td>
            <td>{{ item.knowledge_title || '未关联' }}</td>
            <td>{{ item.status }}</td>
            <td>下次：{{ item.next_review_date || '未设置' }}<br>次数：{{ item.review_count }}</td>
            <td>{{ (item.wrong_reason || item.summary || '').slice(0, 80) }}</td>
            <td><div class="actions"><button class="secondary" @click="edit(item)">编辑</button><button class="danger" @click="remove(item.id)">删除</button></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
