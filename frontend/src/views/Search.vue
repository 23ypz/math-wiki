<script setup lang="ts">
import { computed, ref } from 'vue';
import { request } from '../api';
import type { KnowledgePoint, Mistake, StudyLog } from '../types';

const q = ref('');
const loading = ref(false);
const error = ref('');
const knowledge = ref<KnowledgePoint[]>([]);
const mistakes = ref<Mistake[]>([]);
const logs = ref<StudyLog[]>([]);
const total = computed(() => knowledge.value.length + mistakes.value.length + logs.value.length);

async function search() {
  const keyword = q.value.trim();
  if (!keyword) return;
  loading.value = true;
  error.value = '';
  try {
    const [k, m, l] = await Promise.all([
      request<{ items: KnowledgePoint[] }>(`/knowledge?q=${encodeURIComponent(keyword)}`),
      request<{ items: Mistake[] }>(`/mistakes?q=${encodeURIComponent(keyword)}`),
      request<{ items: StudyLog[] }>('/study-logs')
    ]);
    knowledge.value = k.items;
    mistakes.value = m.items;
    const lower = keyword.toLowerCase();
    logs.value = l.items.filter((item) => [item.subject, item.content, item.summary, item.study_date].some((value) => String(value || '').toLowerCase().includes(lower)));
  } catch (e) {
    error.value = e instanceof Error ? e.message : '搜索失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section>
    <div class="page-title"><div><h2>全局搜索</h2><p>搜索知识点、错题和学习日志。</p></div></div>
    <div class="card search-box"><input v-model="q" placeholder="输入标题、章节、题目、错因、总结或日志内容" @keyup.enter="search" /><button class="primary" @click="search">搜索</button></div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">正在搜索...</p>
    <p v-else-if="q && total === 0" class="card muted" style="margin-top:16px">没有找到匹配内容。</p>

    <div v-if="knowledge.length" class="card" style="margin-top:16px">
      <h3>知识点（{{ knowledge.length }}）</h3>
      <RouterLink v-for="item in knowledge" :key="item.id" :to="`/knowledge/${item.id}`" class="search-result-row"><div><strong>{{ item.title }}</strong><span>{{ item.subject }} / {{ item.chapter }}</span></div><small>{{ (item.content_md || '').slice(0, 120) }}</small></RouterLink>
    </div>
    <div v-if="mistakes.length" class="card" style="margin-top:16px">
      <h3>错题（{{ mistakes.length }}）</h3>
      <RouterLink v-for="item in mistakes" :key="item.id" :to="`/mistakes/${item.id}`" class="search-result-row"><div><strong>{{ item.title }}</strong><span>{{ item.subject }} / {{ item.chapter || '未分章节' }}</span></div><small>{{ (item.wrong_reason || item.summary || item.question_text || '').slice(0, 120) }}</small></RouterLink>
    </div>
    <div v-if="logs.length" class="card" style="margin-top:16px">
      <h3>学习日志（{{ logs.length }}）</h3>
      <div v-for="item in logs" :key="item.id" class="search-result-row static"><div><strong>{{ item.study_date }} · {{ item.subject }}</strong><span>{{ item.duration_minutes }} 分钟</span></div><small>{{ (item.content || item.summary || '').slice(0, 160) }}</small></div>
    </div>
  </section>
</template>
