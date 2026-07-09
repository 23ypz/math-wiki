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

const groupedItems = computed(() => {
  const groups = new Map<string, Map<string, KnowledgePoint[]>>();
  items.value.forEach((point) => {
    const subject = point.subject || '未分类科目';
    const chapter = point.chapter || '未分章节';
    if (!groups.has(subject)) groups.set(subject, new Map());
    const chapterMap = groups.get(subject)!;
    if (!chapterMap.has(chapter)) chapterMap.set(chapter, []);
    chapterMap.get(chapter)!.push(point);
  });
  return Array.from(groups.entries()).map(([subject, chapterMap]) => ({
    subject,
    chapters: Array.from(chapterMap.entries()).map(([chapter, points]) => ({
      chapter,
      points
    }))
  }));
});

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
        <p v-else>按知识点查看完整 Markdown 内容、公式和表格。</p>
      </div>
      <div class="actions" v-if="item">
        <button class="secondary" type="button" @click="router.push('/knowledge')">返回列表</button>
        <button class="primary" type="button" @click="editCurrent">编辑</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">正在加载...</p>

    <div class="wiki-layout" v-if="item">
      <aside class="wiki-left card">
        <h3>知识点导航</h3>
        <div class="wiki-nav-scroll">
          <div v-for="group in groupedItems" :key="group.subject" class="wiki-nav-group">
            <div class="wiki-nav-subject">{{ group.subject }}</div>
            <div v-for="chapter in group.chapters" :key="`${group.subject}-${chapter.chapter}`" class="wiki-nav-chapter">
              <div class="wiki-nav-chapter-title">{{ chapter.chapter }}</div>
              <RouterLink
                v-for="point in chapter.points"
                :key="point.id"
                :to="`/knowledge/${point.id}`"
                class="wiki-nav-link"
                :class="{ active: point.id === item.id }"
              >
                {{ point.title }}
              </RouterLink>
            </div>
          </div>
        </div>

        <div v-if="headings.length" class="page-toc">
          <h3>本文目录</h3>
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
  </section>
</template>
