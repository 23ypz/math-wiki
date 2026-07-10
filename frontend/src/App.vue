<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clearToken, isLoggedIn, request } from './api';
import type { KnowledgePoint, Mistake } from './types';

const router = useRouter();
const route = useRoute();
const sidebarKnowledge = ref<KnowledgePoint[]>([]);
const sidebarMistakes = ref<Mistake[]>([]);
const knowledgeOpen = ref(route.path.startsWith('/knowledge/subject') || /^\/knowledge\/\d+/.test(route.path));
const mistakesOpen = ref(route.path.startsWith('/mistakes/subject') || /^\/mistakes\/\d+/.test(route.path));

const defaultSubjects = ['高等数学', '线性代数', '概率论与数理统计'];

const sidebarSubjects = computed(() => {
  const counts = new Map<string, number>();
  defaultSubjects.forEach((subject) => counts.set(subject, 0));
  sidebarKnowledge.value.forEach((item) => {
    const subject = item.subject || '未分类';
    counts.set(subject, (counts.get(subject) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([subject, count]) => ({ subject, count }));
});

const sidebarMistakeSubjects = computed(() => {
  const counts = new Map<string, number>();
  defaultSubjects.forEach((subject) => counts.set(subject, 0));
  sidebarMistakes.value.forEach((item) => {
    const subject = item.subject || '未分类';
    counts.set(subject, (counts.get(subject) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([subject, count]) => ({ subject, count }));
});

function subjectPath(subject: string) {
  return `/knowledge/subject/${encodeURIComponent(subject)}`;
}

function mistakeSubjectPath(subject: string) {
  return `/mistakes/subject/${encodeURIComponent(subject)}`;
}

async function loadSidebarData() {
  if (!isLoggedIn()) {
    sidebarKnowledge.value = [];
    sidebarMistakes.value = [];
    return;
  }
  try {
    const [knowledgeRes, mistakeRes] = await Promise.all([
      request<{ items: KnowledgePoint[] }>('/knowledge'),
      request<{ items: Mistake[] }>('/mistakes')
    ]);
    sidebarKnowledge.value = knowledgeRes.items;
    sidebarMistakes.value = mistakeRes.items;
  } catch {
    sidebarKnowledge.value = [];
    sidebarMistakes.value = [];
  }
}

function logout() {
  clearToken();
  sidebarKnowledge.value = [];
  sidebarMistakes.value = [];
  router.push('/login');
}

onMounted(loadSidebarData);
watch(() => route.fullPath, () => {
  if (route.path.startsWith('/knowledge/subject') || /^\/knowledge\/\d+/.test(route.path)) knowledgeOpen.value = true;
  if (route.path.startsWith('/mistakes/subject') || /^\/mistakes\/\d+/.test(route.path)) mistakesOpen.value = true;
  loadSidebarData();
});
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" v-if="isLoggedIn()">
      <div class="brand">
        <div class="brand-mark">研</div>
        <div>
          <h1>数学一 Wiki</h1>
          <p>知识点 · 错题 · 复习</p>
        </div>
      </div>
      <nav>
        <RouterLink to="/">总览</RouterLink>
        <RouterLink to="/knowledge">知识点管理</RouterLink>
        <RouterLink to="/mistakes">错题本</RouterLink>
        <RouterLink to="/mistakes/print">错题打印</RouterLink>
        <RouterLink to="/reviews">今日复习</RouterLink>
        <RouterLink to="/study-logs">学习日志</RouterLink>
        <RouterLink to="/progress">学习进度</RouterLink>
        <RouterLink to="/search">全局搜索</RouterLink>
      </nav>

      <div class="sidebar-knowledge">
        <button class="sidebar-toggle" type="button" @click="knowledgeOpen = !knowledgeOpen">
          <span>知识点科目</span>
          <small>{{ knowledgeOpen ? '收起' : '展开' }}</small>
        </button>
        <div class="sidebar-subject-scroll" v-if="knowledgeOpen">
          <RouterLink
            v-for="item in sidebarSubjects"
            :key="item.subject"
            :to="subjectPath(item.subject)"
            class="sidebar-subject-link"
          >
            <span>{{ item.subject }}</span>
            <small>{{ item.count }} 个知识点</small>
          </RouterLink>
        </div>
      </div>

      <div class="sidebar-knowledge">
        <button class="sidebar-toggle" type="button" @click="mistakesOpen = !mistakesOpen">
          <span>错题分类</span>
          <small>{{ mistakesOpen ? '收起' : '展开' }}</small>
        </button>
        <div class="sidebar-subject-scroll" v-if="mistakesOpen">
          <RouterLink
            v-for="item in sidebarMistakeSubjects"
            :key="item.subject"
            :to="mistakeSubjectPath(item.subject)"
            class="sidebar-subject-link"
          >
            <span>{{ item.subject }}</span>
            <small>{{ item.count }} 道错题</small>
          </RouterLink>
        </div>
      </div>

      <button class="ghost logout" @click="logout">退出登录</button>
    </aside>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>
