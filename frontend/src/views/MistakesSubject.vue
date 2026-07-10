<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { request } from '../api';
import { stripMarkdown } from '../markdown';
import type { Mistake } from '../types';

const route = useRoute();
const router = useRouter();
const items = ref<Mistake[]>([]);
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

function chapterRoute(chapter: string) {
  return `/mistakes/subject/${encodeURIComponent(currentSubject.value)}/chapter/${encodeURIComponent(chapter)}`;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await request<{ items: Mistake[] }>(`/mistakes?subject=${encodeURIComponent(currentSubject.value)}`);
    items.value = res.items;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载错题失败';
  } finally {
    loading.value = false;
  }
}

watch(chapters, (value) => {
  if (!route.params.chapter && value.length) {
    router.replace(chapterRoute(value[0].chapter));
  }
});

watch(currentSubject, load);
onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>{{ currentSubject }}错题</h2>
        <p>错题按“科目 → 章节 → 错题”逐级整理，和知识点框架保持一致。</p>
      </div>
      <div class="actions">
        <RouterLink class="link-button primary-link" to="/mistakes">管理错题</RouterLink>
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
          class="chapter-tab mistake-tab"
          :class="{ active: chapter.chapter === activeChapter }"
        >
          <span>{{ chapter.chapter }}</span>
          <small>{{ chapter.count }} 题</small>
        </RouterLink>
      </div>

      <div class="wiki-layout subject-main-layout">
        <aside class="wiki-left card">
          <h3>本章错题目录</h3>
          <p class="muted small-text">{{ currentSubject }} / {{ activeChapter }}</p>
          <div class="point-list-scroll" v-if="chapterItems.length">
            <RouterLink
              v-for="mistake in chapterItems"
              :key="mistake.id"
              :to="`/mistakes/${mistake.id}`"
              class="point-list-link mistake-list-link"
            >
              <strong>{{ mistake.title }}</strong>
              <small>{{ mistake.status }} · 难度 {{ mistake.difficulty }}/5</small>
            </RouterLink>
          </div>
          <p v-else class="muted">当前章节暂无错题。</p>
        </aside>

        <article class="wiki-content card">
          <div class="empty-reading-tip" v-if="chapterItems.length">
            <h3>请选择左侧错题</h3>
            <p>当前章节共有 {{ chapterItems.length }} 道错题。点击左侧目录后，会进入错题详情页，并完整渲染题目、解法和总结。</p>
            <div class="chapter-point-grid">
              <RouterLink
                v-for="mistake in chapterItems"
                :key="mistake.id"
                :to="`/mistakes/${mistake.id}`"
                class="chapter-point-card mistake-card-link"
              >
                <strong>{{ mistake.title }}</strong>
                <span>{{ mistake.knowledge_title ? `关联知识点：${mistake.knowledge_title}` : '未关联知识点' }}</span>
                <span>{{ stripMarkdown(mistake.wrong_reason || mistake.summary || mistake.question_text, 90) }}</span>
              </RouterLink>
            </div>
          </div>
          <div class="empty-reading-tip" v-else>
            <h3>当前章节还没有错题</h3>
            <p>可以回到错题本，新增属于“{{ currentSubject }} / {{ activeChapter }}”的错题。</p>
            <RouterLink class="link-button primary-link" to="/mistakes">新增错题</RouterLink>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
