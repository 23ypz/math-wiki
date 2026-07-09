<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clearToken, isLoggedIn, request } from './api';
import type { KnowledgePoint } from './types';

const router = useRouter();
const route = useRoute();
const sidebarKnowledge = ref<KnowledgePoint[]>([]);

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

function subjectPath(subject: string) {
  return `/knowledge/subject/${encodeURIComponent(subject)}`;
}

async function loadSidebarKnowledge() {
  if (!isLoggedIn()) {
    sidebarKnowledge.value = [];
    return;
  }
  try {
    const res = await request<{ items: KnowledgePoint[] }>('/knowledge');
    sidebarKnowledge.value = res.items;
  } catch {
    sidebarKnowledge.value = [];
  }
}

function logout() {
  clearToken();
  sidebarKnowledge.value = [];
  router.push('/login');
}

onMounted(loadSidebarKnowledge);
watch(() => route.fullPath, loadSidebarKnowledge);
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
        <RouterLink to="/reviews">今日复习</RouterLink>
        <RouterLink to="/study-logs">学习日志</RouterLink>
      </nav>

      <div class="sidebar-knowledge" v-if="sidebarSubjects.length">
        <div class="sidebar-section-title">知识点科目</div>
        <div class="sidebar-subject-scroll">
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

      <button class="ghost logout" @click="logout">退出登录</button>
    </aside>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>
