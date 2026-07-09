<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { request } from '../api';
import { extractHeadings, renderMarkdown, typesetMath } from '../markdown';
import type { KnowledgePoint } from '../types';

const route = useRoute();
const router = useRouter();
const item = ref<KnowledgePoint | null>(null);
const items = ref<KnowledgePoint[]>([]);
const error = ref('');
const loading = ref(false);

const currentId = computed(() => Number(route.params.id));
const contentHtml = computed(() => renderMarkdown(item.value?.content_md || ''));
const headings = computed(() => extractHeadings(item.value?.content_md || '').filter((h) => h.level <= 3));
const currentSubject = computed(() => item.value?.subject || '未分类');
const currentChapter = computed(() => item.value?.chapter || '未分章节');

const subjectItems = computed(() => items.value.filter((point) => (point.subject || '未分类') === currentSubject.value));
const chapters = computed(() => {
  const chapterMap = new Map<string, number>();
  subjectItems.value.forEach((point) => {
    const chapter = point.chapter || '未分章节';
    chapterMap.set(chapter, (chapterMap.get(chapter) || 0) + 1);
  });
  return Array.from(chapterMap.entries()).map(([chapter, count]) => ({ chapter, count }));
});
const chapterItems = computed(() => subjectItems.value.filter((point) => (point.chapter || '未分章节') === currentChapter.value));

function chapterRoute(chapter: string) {
  return `/knowledge/subject/${encodeURIComponent(currentSubject.value)}/chapter/${encodeURIComponent(chapter)}`;
}

async function loadList() {
  const res = await request<{ items: KnowledgePoint[] }>('/knowledge');
  items.value = res.items;
}

async function loadDetail() {
  error.value = '';
  loading.value = true;
  try {
    const [detail] = await Promise.all([
      request<{ item: KnowledgePoint }>(`/knowledge/${currentId.value}`),
      items.value.length ? Promise.resolve(null) : loadList()
    ]);
    item.value = detail.item;
    await nextTick();
    typesetMath();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载知识点失败';
  } finally {
    loading.value = false;
  }
}

function jumpToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function editCurrent() {
  router.push({ path: '/knowledge', query: { edit: String(currentId.value) } });
}

watch(currentId, async () => {
  await loadDetail();
});

watch(contentHtml, async () => {
  await nextTick();
  typesetMath();
}, { flush: 'post' });

onMounted(loadDetail);
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>{{ item?.title || '知识点内容' }}</h2>
        <p v-if="item">{{ item.subject }} / {{ item.chapter || '未分章节' }}</p>
        <p v-else>按科目、章节、小知识点逐级阅读。</p>
      </div>
      <div class="actions" v-if="item">
        <RouterLink class="link-button secondary-link" :to="chapterRoute(currentChapter)">返回本章</RouterLink>
        <button class="primary" type="button" @click="editCurrent">编辑</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">正在加载...</p>

    <div v-if="item" class="subject-layout">
      <div class="chapter-tabs card" v-if="chapters.length">
        <RouterLink
          v-for="chapter in chapters"
          :key="chapter.chapter"
          :to="chapterRoute(chapter.chapter)"
          class="chapter-tab"
          :class="{ active: chapter.chapter === currentChapter }"
        >
          <span>{{ chapter.chapter }}</span>
          <small>{{ chapter.count }}</small>
        </RouterLink>
      </div>

      <div class="wiki-layout subject-main-layout">
        <aside class="wiki-left card">
          <h3>小知识点目录</h3>
          <p class="muted small-text">{{ currentSubject }} / {{ currentChapter }}</p>
          <div class="point-list-scroll" v-if="chapterItems.length">
            <RouterLink
              v-for="point in chapterItems"
              :key="point.id"
              :to="`/knowledge/${point.id}`"
              class="point-list-link"
              :class="{ active: point.id === item.id }"
            >
              <strong>{{ point.title }}</strong>
              <small>掌握程度 {{ point.mastery_level }}/5</small>
            </RouterLink>
          </div>

          <div v-if="headings.length" class="page-toc">
            <h3>本文目录</h3>
            <div class="toc-scroll">
              <button
                v-for="heading in headings"
                :key="heading.id"
                class="toc-link"
                :class="`toc-level-${heading.level}`"
                type="button"
                @click="jumpToHeading(heading.id)"
              >
                {{ heading.text }}
              </button>
            </div>
          </div>
        </aside>

        <article class="wiki-content card">
          <div class="knowledge-meta">
            <span class="badge">{{ item.subject }}</span>
            <span class="badge soft">{{ item.chapter || '未分章节' }}</span>
            <span class="muted">掌握程度 {{ item.mastery_level }}/5</span>
          </div>
          <div class="markdown-body wiki-markdown" v-html="contentHtml"></div>
        </article>
      </div>
    </div>
  </section>
</template>
