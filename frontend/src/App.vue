<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clearToken, isLoggedIn, request } from './api';
import type { KnowledgePoint } from './types';

const router = useRouter();
const route = useRoute();
const sidebarKnowledge = ref<KnowledgePoint[]>([]);

const groupedSidebarKnowledge = computed(() => {
  const groups = new Map<string, KnowledgePoint[]>();
  sidebarKnowledge.value.slice(0, 60).forEach((item) => {
    const subject = item.subject || '未分类';
    if (!groups.has(subject)) groups.set(subject, []);
    groups.get(subject)!.push(item);
  });
  return Array.from(groups.entries()).map(([subject, points]) => ({ subject, points }));
});

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
        <RouterLink to="/knowledge">知识点</RouterLink>
        <RouterLink to="/mistakes">错题本</RouterLink>
        <RouterLink to="/reviews">今日复习</RouterLink>
        <RouterLink to="/study-logs">学习日志</RouterLink>
      </nav>

      <div class="sidebar-knowledge" v-if="groupedSidebarKnowledge.length">
        <div class="sidebar-section-title">知识点导航</div>
        <div class="sidebar-knowledge-scroll">
          <div v-for="group in groupedSidebarKnowledge" :key="group.subject" class="sidebar-subject-group">
            <div class="sidebar-subject">{{ group.subject }}</div>
            <RouterLink
              v-for="point in group.points"
              :key="point.id"
              :to="`/knowledge/${point.id}`"
              class="sidebar-knowledge-link"
            >
              <span>{{ point.title }}</span>
              <small>{{ point.chapter || '未分章节' }}</small>
            </RouterLink>
          </div>
        </div>
      </div>

      <button class="ghost logout" @click="logout">退出登录</button>
    </aside>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>
