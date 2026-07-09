<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { request } from '../api';
import { stripMarkdown } from '../markdown';
import type { KnowledgePoint } from '../types';

const route = useRoute();
const router = useRouter();
const items = ref<KnowledgePoint[]>([]);
const loading = ref(false);
const error = ref('');

const currentSubject = computed(() => String(route.params.subject || '高等数学'));
const subjectItems = computed(() => items.value.filter((item) => (item.subject || '未分类') === currentSubject.value));

const chapters = computed(() => {
  const chapterMap = new Map<string, number>();
  subjectItems.value.forEach((item) => {
    const chapter = item.chapter || '未分章节';
    chapterMap.set(chapter, (chapterMap.get(chapter) || 0) + 1);
  });
  return Array.from(chapterMap.entries()).map(([chapter, count]) => ({ chapter, count }));
});

const activeChapter = computed(() => {
  const paramChapter = route.params.chapter ? String(route.params.chapter) : '';
  if (paramChapter) return paramChapter;
  return chapters.value[0]?.chapter || '未分章节';
});

const chapterItems = computed(() => subjectItems.value.filter((item) => (item.chapter || '未分章节') === activeChapter.value));

function subjectRoute(subject: string) {
  return `/knowledge/subject/${encodeURIComponent(subject)}`;
}

function chapterRoute(chapter: string) {
  return `/knowledge/subject/${encodeURIComponent(currentSubject.value)}/chapter/${encodeURIComponent(chapter)}`;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await request<{ items: KnowledgePoint[] }>('/knowledge');
    items.value = res.items;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载知识点失败';
  } finally {
    loading.value = false;
  }
}

watch(chapters, (value) => {
  if (!route.params.chapter && value.length) {
    router.replace(chapterRoute(value[0].chapter));
  }
});

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>{{ currentSubject }}</h2>
        <p>先按章节切换，再在左侧选择小知识点，阅读页会完整渲染 Markdown、公式和表格。</p>
      </div>
      <div class="actions">
        <RouterLink class="link-button primary-link" to="/knowledge">管理知识点</RouterLink>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">正在加载...</p>

    <div class="subject-layout" v-else>
      <div class="chapter-tabs card" v-if="chapters.length">
        <RouterLink
          v-for="chapter in chapters"
          :key="chapter.chapter"
          :to="chapterRoute(chapter.chapter)"
          class="chapter-tab"
          :class="{ active: chapter.chapter === activeChapter }"
        >
          <span>{{ chapter.chapter }}</span>
          <small>{{ chapter.count }}</small>
        </RouterLink>
      </div>

      <div class="wiki-layout subject-main-layout">
        <aside class="wiki-left card">
          <h3>小知识点目录</h3>
          <p class="muted small-text">{{ currentSubject }} / {{ activeChapter }}</p>
          <div class="point-list-scroll" v-if="chapterItems.length">
            <RouterLink
              v-for="point in chapterItems"
              :key="point.id"
              :to="`/knowledge/${point.id}`"
              class="point-list-link"
            >
              <strong>{{ point.title }}</strong>
              <small>掌握程度 {{ point.mastery_level }}/5</small>
            </RouterLink>
          </div>
          <p v-else class="muted">当前章节暂无知识点。</p>
        </aside>

        <article class="wiki-content card">
          <div class="empty-reading-tip" v-if="chapterItems.length">
            <h3>请选择左侧小知识点</h3>
            <p>当前章节共有 {{ chapterItems.length }} 个知识点。点击左侧目录后，会进入 OI Wiki 风格的正文阅读页面。</p>
            <div class="chapter-point-grid">
              <RouterLink
                v-for="point in chapterItems"
                :key="point.id"
                :to="`/knowledge/${point.id}`"
                class="chapter-point-card"
              >
                <strong>{{ point.title }}</strong>
                <span>{{ stripMarkdown(point.content_md, 80) }}</span>
              </RouterLink>
            </div>
          </div>
          <div class="empty-reading-tip" v-else>
            <h3>当前章节还没有知识点</h3>
            <p>可以回到知识点管理页，新增属于“{{ currentSubject }} / {{ activeChapter }}”的知识点。</p>
            <RouterLink class="link-button primary-link" to="/knowledge">新增知识点</RouterLink>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
