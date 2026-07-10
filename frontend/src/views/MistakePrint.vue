<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { request } from '../api';
import { renderMarkdown, typesetMath } from '../markdown';
import type { KnowledgePoint, Mistake } from '../types';

const items = ref<Mistake[]>([]);
const knowledgeItems = ref<KnowledgePoint[]>([]);
const loading = ref(false);
const error = ref('');
const printMode = ref<'question' | 'answer' | 'full'>('full');
const filters = reactive({ subject: '', chapter: '', knowledgeId: '', status: '', difficulty: '', tag: '' });

const subjects = ['高等数学', '线性代数', '概率论与数理统计'];
const chapters = computed(() => Array.from(new Set(items.value.filter((item) => !filters.subject || item.subject === filters.subject).map((item) => item.chapter || '未分章节'))).sort());
const tags = computed(() => Array.from(new Set(items.value.flatMap((item) => item.tags || []))).sort());
const filteredKnowledge = computed(() => knowledgeItems.value.filter((item) => !filters.subject || item.subject === filters.subject));
const filteredItems = computed(() => items.value.filter((item) => {
  if (filters.subject && item.subject !== filters.subject) return false;
  if (filters.chapter && (item.chapter || '未分章节') !== filters.chapter) return false;
  if (filters.knowledgeId && item.knowledge_point_id !== Number(filters.knowledgeId)) return false;
  if (filters.status && item.status !== filters.status) return false;
  if (filters.difficulty && item.difficulty !== Number(filters.difficulty)) return false;
  if (filters.tag && !(item.tags || []).includes(filters.tag)) return false;
  return true;
}));

function html(value: string | null | undefined) {
  return renderMarkdown(value || '');
}

function clearFilters() {
  Object.assign(filters, { subject: '', chapter: '', knowledgeId: '', status: '', difficulty: '', tag: '' });
}

async function printPage() {
  await nextTick();
  typesetMath();
  setTimeout(() => window.print(), 150);
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [mistakes, knowledge] = await Promise.all([
      request<{ items: Mistake[] }>('/mistakes?sort=created_asc'),
      request<{ items: KnowledgePoint[] }>('/knowledge')
    ]);
    items.value = mistakes.items;
    knowledgeItems.value = knowledge.items;
    await nextTick();
    typesetMath();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载打印数据失败';
  } finally {
    loading.value = false;
  }
}

watch(filters, async () => {
  await nextTick();
  typesetMath();
}, { deep: true });
watch(printMode, async () => {
  await nextTick();
  typesetMath();
});
onMounted(load);
</script>

<template>
  <section class="print-page">
    <div class="page-title no-print">
      <div>
        <h2>打印错题本</h2>
        <p>筛选错题并生成适合 A4 打印或保存为 PDF 的版本。</p>
      </div>
      <div class="actions">
        <RouterLink class="link-button secondary-link" to="/mistakes">返回错题本</RouterLink>
        <button class="primary" type="button" :disabled="!filteredItems.length" @click="printPage">打印 / 保存 PDF</button>
      </div>
    </div>

    <p v-if="error" class="error no-print">{{ error }}</p>
    <p v-if="loading" class="muted no-print">正在加载...</p>

    <div class="card print-controls no-print" v-if="!loading">
      <div class="filter-grid">
        <select v-model="filters.subject"><option value="">全部科目</option><option v-for="subject in subjects" :key="subject">{{ subject }}</option></select>
        <select v-model="filters.chapter"><option value="">全部章节</option><option v-for="chapter in chapters" :key="chapter">{{ chapter }}</option></select>
        <select v-model="filters.knowledgeId"><option value="">全部知识点</option><option v-for="kp in filteredKnowledge" :key="kp.id" :value="String(kp.id)">{{ kp.chapter }} / {{ kp.title }}</option></select>
        <select v-model="filters.status"><option value="">全部状态</option><option>待复习</option><option>复习中</option><option>已掌握</option></select>
        <select v-model="filters.difficulty"><option value="">全部难度</option><option v-for="n in 5" :key="n" :value="String(n)">{{ n }} 星</option></select>
        <select v-model="filters.tag"><option value="">全部标签</option><option v-for="tag in tags" :key="tag">{{ tag }}</option></select>
      </div>
      <div class="print-mode-row">
        <strong>打印内容</strong>
        <label><input v-model="printMode" type="radio" value="question" /> 只打印题目</label>
        <label><input v-model="printMode" type="radio" value="answer" /> 题目 + 正确解法</label>
        <label><input v-model="printMode" type="radio" value="full" /> 完整错题</label>
        <button class="secondary" type="button" @click="clearFilters">清空筛选</button>
        <span class="muted">共 {{ filteredItems.length }} 道</span>
      </div>
    </div>

    <div class="print-document" v-if="!loading">
      <header class="print-document-header">
        <h1>数学一错题本</h1>
        <p>生成日期：{{ new Date().toLocaleDateString('zh-CN') }} · 共 {{ filteredItems.length }} 道</p>
      </header>

      <p v-if="!filteredItems.length" class="muted">没有符合当前筛选条件的错题。</p>

      <article v-for="(item, index) in filteredItems" :key="item.id" class="print-mistake">
        <div class="print-mistake-title">
          <h2>{{ index + 1 }}. {{ item.title }}</h2>
          <p>{{ item.subject }} / {{ item.chapter || '未分章节' }} · 难度 {{ item.difficulty }}/5 · {{ item.status }}</p>
        </div>
        <section>
          <h3>题目</h3>
          <div class="markdown-body" v-html="html(item.question_text)"></div>
        </section>
        <section v-if="printMode !== 'question'">
          <h3>正确解法</h3>
          <div class="markdown-body" v-html="html(item.answer_text)"></div>
        </section>
        <template v-if="printMode === 'full'">
          <section>
            <h3>错误原因</h3>
            <div class="markdown-body" v-html="html(item.wrong_reason)"></div>
          </section>
          <section>
            <h3>总结</h3>
            <div class="markdown-body" v-html="html(item.summary)"></div>
          </section>
          <div class="print-meta">
            <span>来源：{{ item.source || '未填写' }}</span>
            <span>复习次数：{{ item.review_count }}</span>
            <span>下次复习：{{ item.next_review_date || '未设置' }}</span>
          </div>
        </template>
      </article>
    </div>
  </section>
</template>
