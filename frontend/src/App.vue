<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clearToken, isLoggedIn, request } from './api';
import { cycleTheme, themeMode } from './theme';
import { toasts } from './toast';
import type { KnowledgePoint, Mistake, UserProfile } from './types';

const router = useRouter();
const route = useRoute();
const sidebarKnowledge = ref<KnowledgePoint[]>([]);
const sidebarMistakes = ref<Mistake[]>([]);
const profile = ref<UserProfile | null>(null);
const knowledgeOpen = ref(route.path.startsWith('/knowledge/subject') || /^\/knowledge\/\d+/.test(route.path));
const mistakesOpen = ref(route.path.startsWith('/mistakes/subject') || /^\/mistakes\/\d+/.test(route.path));
const sidebarCollapsed = ref(localStorage.getItem('sidebar-collapsed') === '1');
const mobileOpen = ref(false);
const defaultSubjects = ['高等数学', '线性代数', '概率论与数理统计'];

const sidebarSubjects = computed(() => {
  const counts = new Map<string, number>(); defaultSubjects.forEach((s) => counts.set(s, 0));
  sidebarKnowledge.value.forEach((item) => counts.set(item.subject || '未分类', (counts.get(item.subject || '未分类') || 0) + 1));
  return Array.from(counts.entries()).map(([subject, count]) => ({ subject, count }));
});
const sidebarMistakeSubjects = computed(() => {
  const counts = new Map<string, number>(); defaultSubjects.forEach((s) => counts.set(s, 0));
  sidebarMistakes.value.forEach((item) => counts.set(item.subject || '未分类', (counts.get(item.subject || '未分类') || 0) + 1));
  return Array.from(counts.entries()).map(([subject, count]) => ({ subject, count }));
});
const initials = computed(() => (profile.value?.nickname || '研').slice(0, 2));
const examDays = computed(() => {
  if (!profile.value?.exam_date) return null;
  return Math.ceil((new Date(profile.value.exam_date).getTime() - Date.now()) / 86400000);
});
const navItems = [
  ['/', '⌂', '总览'], ['/knowledge', '▤', '知识点管理'], ['/mistakes', '✦', '错题本'],
  ['/mistakes/print', '▣', '错题打印'], ['/reviews', '↻', '今日复习'], ['/study-logs', '✎', '学习日志'],
  ['/progress', '↗', '学习进度'], ['/todos', '✓', 'Todo 日历'], ['/search', '⌕', '全局搜索']
];

function subjectPath(subject: string) { return `/knowledge/subject/${encodeURIComponent(subject)}`; }
function mistakeSubjectPath(subject: string) { return `/mistakes/subject/${encodeURIComponent(subject)}`; }
function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value; localStorage.setItem('sidebar-collapsed', sidebarCollapsed.value ? '1' : '0'); }
async function loadSidebarData() {
  if (!isLoggedIn()) return;
  try {
    const [knowledgeRes, mistakeRes, profileRes] = await Promise.all([
      request<{ items: KnowledgePoint[] }>('/knowledge'), request<{ items: Mistake[] }>('/mistakes'), request<{ item: UserProfile }>('/progress?resource=profile')
    ]);
    sidebarKnowledge.value = knowledgeRes.items; sidebarMistakes.value = mistakeRes.items; profile.value = profileRes.item;
  } catch { sidebarKnowledge.value = []; sidebarMistakes.value = []; }
}
function logout() { clearToken(); router.push('/login'); }
onMounted(loadSidebarData);
watch(() => route.fullPath, () => { mobileOpen.value = false; loadSidebarData(); });
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <button v-if="isLoggedIn()" class="mobile-menu-button" @click="mobileOpen = !mobileOpen">☰</button>
    <div v-if="mobileOpen" class="mobile-overlay" @click="mobileOpen = false"></div>
    <aside v-if="isLoggedIn()" class="sidebar" :class="{ 'mobile-open': mobileOpen }">
      <div class="brand"><div class="brand-mark">研</div><div class="brand-copy"><h1>数学一 Wiki</h1><p>YOUR STUDY OS</p></div><button class="collapse-button" @click="toggleSidebar">{{ sidebarCollapsed ? '›' : '‹' }}</button></div>
      <RouterLink to="/profile" class="sidebar-profile">
        <div class="mini-avatar" :class="`avatar-${profile?.avatar_style || 'blue'}`">{{ initials }}</div>
        <div class="profile-copy"><strong>{{ profile?.nickname || 'Math Seeker' }}</strong><small>{{ examDays === null ? '完善个人资料' : examDays >= 0 ? `距离考试 ${examDays} 天` : '新的阶段，继续前进' }}</small></div>
      </RouterLink>
      <nav class="main-nav">
        <RouterLink v-for="item in navItems" :key="item[0]" :to="item[0]"><span class="nav-icon">{{ item[1] }}</span><span class="nav-label">{{ item[2] }}</span></RouterLink>
      </nav>
      <div class="sidebar-knowledge">
        <button class="sidebar-toggle" @click="knowledgeOpen = !knowledgeOpen"><span><b>▦</b><em>知识点科目</em></span><small>{{ knowledgeOpen ? '−' : '+' }}</small></button>
        <div v-if="knowledgeOpen && !sidebarCollapsed" class="sidebar-subject-scroll"><RouterLink v-for="item in sidebarSubjects" :key="item.subject" :to="subjectPath(item.subject)" class="sidebar-subject-link"><span>{{ item.subject }}</span><small>{{ item.count }}</small></RouterLink></div>
      </div>
      <div class="sidebar-knowledge">
        <button class="sidebar-toggle" @click="mistakesOpen = !mistakesOpen"><span><b>◇</b><em>错题分类</em></span><small>{{ mistakesOpen ? '−' : '+' }}</small></button>
        <div v-if="mistakesOpen && !sidebarCollapsed" class="sidebar-subject-scroll"><RouterLink v-for="item in sidebarMistakeSubjects" :key="item.subject" :to="mistakeSubjectPath(item.subject)" class="sidebar-subject-link"><span>{{ item.subject }}</span><small>{{ item.count }}</small></RouterLink></div>
      </div>
      <div class="sidebar-bottom">
        <button class="sidebar-action" @click="cycleTheme"><span>◐</span><em>{{ themeMode === 'light' ? '浅色模式' : themeMode === 'dark' ? '深色模式' : '跟随系统' }}</em></button>
        <RouterLink to="/profile" class="sidebar-action"><span>◎</span><em>个人中心</em></RouterLink>
        <button class="sidebar-action danger-text" @click="logout"><span>↪</span><em>退出登录</em></button>
      </div>
    </aside>
    <main class="main"><RouterView /></main>
    <div class="toast-stack"><div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.kind">{{ toast.message }}</div></div>
  </div>
</template>
