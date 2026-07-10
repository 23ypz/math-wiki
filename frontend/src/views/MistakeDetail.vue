<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { request } from '../api';
import { renderMarkdown, typesetMath } from '../markdown';
import type { Mistake, ReviewRecord } from '../types';

const route = useRoute();
const router = useRouter();
const item = ref<Mistake | null>(null);
const items = ref<Mistake[]>([]);
const error = ref('');
const loading = ref(false);
const reviewRecords = ref<ReviewRecord[]>([]);
const showAnswer = ref(false);
const showAnalysis = ref(false);
const focusMode = ref(false);

const currentId = computed(() => Number(route.params.id));
const currentSubject = computed(() => item.value?.subject || '未分类');
const currentChapter = computed(() => item.value?.chapter || '未分章节');

const subjectItems = computed(() => items.value.filter((mistake) => (mistake.subject || '未分类') === currentSubject.value));
const chapters = computed(() => {
  const chapterMap = new Map<string, number>();
  subjectItems.value.forEach((mistake) => {
    const chapter = mistake.chapter || '未分章节';
    chapterMap.set(chapter, (chapterMap.get(chapter) || 0) + 1);
  });
  return Array.from(chapterMap.entries()).map(([chapter, count]) => ({ chapter, count }));
});
const chapterItems = computed(() => subjectItems.value.filter((mistake) => (mistake.chapter || '未分章节') === currentChapter.value));
const currentIndex = computed(() => chapterItems.value.findIndex((mistake) => mistake.id === currentId.value));
const previousItem = computed(() => currentIndex.value > 0 ? chapterItems.value[currentIndex.value - 1] : null);
const nextItem = computed(() => currentIndex.value >= 0 && currentIndex.value < chapterItems.value.length - 1 ? chapterItems.value[currentIndex.value + 1] : null);

const questionHtml = computed(() => renderMarkdown(item.value?.question_text || ''));
const answerHtml = computed(() => renderMarkdown(item.value?.answer_text || ''));
const reasonHtml = computed(() => renderMarkdown(item.value?.wrong_reason || ''));
const summaryHtml = computed(() => renderMarkdown(item.value?.summary || ''));
const tags = computed(() => item.value?.tags || []);

function chapterRoute(chapter: string) {
  return `/mistakes/subject/${encodeURIComponent(currentSubject.value)}/chapter/${encodeURIComponent(chapter)}`;
}

function jumpToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openMistake(id: number) {
  router.push(`/mistakes/${id}`);
}

function openRandom() {
  const candidates = chapterItems.value.filter((mistake) => mistake.id !== currentId.value);
  if (!candidates.length) return;
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  openMistake(target.id);
}

async function loadList() {
  const res = await request<{ items: Mistake[] }>('/mistakes');
  items.value = res.items;
}

async function loadDetail() {
  error.value = '';
  loading.value = true;
  showAnswer.value = false;
  showAnalysis.value = false;
  try {
    const [detail, history] = await Promise.all([
      request<{ item: Mistake }>(`/mistakes/${currentId.value}`),
      request<{ items: ReviewRecord[] }>(`/review-records?mistake_id=${currentId.value}`),
      items.value.length ? Promise.resolve(null) : loadList()
    ]);
    item.value = detail.item;
    reviewRecords.value = history.items;
    await nextTick();
    typesetMath();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载错题失败';
  } finally {
    loading.value = false;
  }
}

function editCurrent() {
  router.push({ path: '/mistakes', query: { edit: String(currentId.value) } });
}

watch(currentId, loadDetail);
watch([questionHtml, answerHtml, reasonHtml, summaryHtml, showAnswer, showAnalysis], async () => {
  await nextTick();
  typesetMath();
}, { flush: 'post' });

onMounted(loadDetail);
</script>

<template>
  <section :class="{ 'focus-reading-mode': focusMode }">
    <div class="page-title detail-page-title">
      <div>
        <h2>{{ item?.title || '错题详情' }}</h2>
        <p v-if="item">{{ item.subject }} / {{ item.chapter || '未分章节' }}</p>
        <p v-else>按科目、章节、错题逐级阅读。</p>
      </div>
      <div class="actions" v-if="item">
        <button class="secondary" type="button" :disabled="!previousItem" @click="previousItem && openMistake(previousItem.id)">上一题</button>
        <button class="secondary" type="button" :disabled="chapterItems.length < 2" @click="openRandom">随机一题</button>
        <button class="secondary" type="button" :disabled="!nextItem" @click="nextItem && openMistake(nextItem.id)">下一题</button>
        <button class="secondary" type="button" @click="focusMode = !focusMode">{{ focusMode ? '退出沉浸' : '沉浸阅读' }}</button>
        <RouterLink class="link-button secondary-link" :to="chapterRoute(currentChapter)">返回本章错题</RouterLink>
        <button class="primary" type="button" @click="editCurrent">编辑</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">正在加载...</p>

    <div v-if="item" class="subject-layout">
      <div class="chapter-tabs card detail-chapter-tabs" v-if="chapters.length && !focusMode">
        <RouterLink
          v-for="chapter in chapters"
          :key="chapter.chapter"
          :to="chapterRoute(chapter.chapter)"
          class="chapter-tab mistake-tab"
          :class="{ active: chapter.chapter === currentChapter }"
        >
          <span>{{ chapter.chapter }}</span>
          <small>{{ chapter.count }} 题</small>
        </RouterLink>
      </div>

      <div class="wiki-layout subject-main-layout" :class="{ 'focus-layout': focusMode }">
        <aside v-if="!focusMode" class="wiki-left card">
          <h3>本章错题目录</h3>
          <p class="muted small-text">{{ currentSubject }} / {{ currentChapter }}</p>
          <div class="point-list-scroll" v-if="chapterItems.length">
            <RouterLink
              v-for="mistake in chapterItems"
              :key="mistake.id"
              :to="`/mistakes/${mistake.id}`"
              class="point-list-link mistake-list-link"
              :class="{ active: mistake.id === item.id }"
            >
              <strong>{{ mistake.title }}</strong>
              <small>{{ mistake.status }} · 难度 {{ mistake.difficulty }}/5</small>
            </RouterLink>
          </div>

          <div class="page-toc mistake-toc">
            <h3>本文目录</h3>
            <div class="toc-scroll">
              <button class="toc-link" type="button" @click="jumpToSection('mistake-question')">题目</button>
              <button class="toc-link" type="button" @click="jumpToSection('mistake-answer')">正确解法</button>
              <button class="toc-link" type="button" @click="jumpToSection('mistake-reason')">错因</button>
              <button class="toc-link" type="button" @click="jumpToSection('mistake-summary')">总结</button>
              <button class="toc-link" type="button" @click="jumpToSection('mistake-review')">复习信息</button>
              <button class="toc-link" type="button" @click="jumpToSection('mistake-history')">复习历史</button>
            </div>
          </div>
        </aside>

        <article class="wiki-content card mistake-reading-card">
          <div class="knowledge-meta">
            <span class="badge">{{ item.subject }}</span>
            <span class="badge soft">{{ item.chapter || '未分章节' }}</span>
            <span class="badge soft">{{ item.status }}</span>
            <span class="muted">难度 {{ item.difficulty }}/5</span>
          </div>

          <div v-if="tags.length" class="tag-list detail-tags"><span v-for="tag in tags" :key="tag" class="tag-chip readonly">{{ tag }}</span></div>

          <div v-if="item.knowledge_title" class="tip detail-tip">
            关联知识点：{{ item.knowledge_title }}
          </div>

          <h2 id="mistake-question" class="detail-section-title">题目</h2>
          <div class="markdown-body wiki-markdown section-markdown" v-html="questionHtml"></div>

          <div class="reveal-actions">
            <button class="primary" type="button" @click="showAnswer = !showAnswer">{{ showAnswer ? '隐藏正确解法' : '显示正确解法' }}</button>
            <button class="secondary" type="button" @click="showAnalysis = !showAnalysis">{{ showAnalysis ? '隐藏错因与总结' : '显示错因与总结' }}</button>
          </div>

          <template v-if="showAnswer">
            <h2 id="mistake-answer" class="detail-section-title">正确解法</h2>
            <div class="markdown-body wiki-markdown section-markdown reveal-panel" v-html="answerHtml"></div>
          </template>

          <template v-if="showAnalysis">
            <h2 id="mistake-reason" class="detail-section-title">错因</h2>
            <div class="markdown-body wiki-markdown section-markdown reveal-panel" v-html="reasonHtml"></div>

            <h2 id="mistake-summary" class="detail-section-title">总结</h2>
            <div class="markdown-body wiki-markdown section-markdown reveal-panel" v-html="summaryHtml"></div>
          </template>

          <h2 id="mistake-review" class="detail-section-title">复习信息</h2>
          <div class="review-info-grid">
            <div><span>来源</span><strong>{{ item.source || '未填写' }}</strong></div>
            <div><span>下次复习</span><strong>{{ item.next_review_date || '未设置' }}</strong></div>
            <div><span>复习次数</span><strong>{{ item.review_count }}</strong></div>
            <div><span>状态</span><strong>{{ item.status }}</strong></div>
          </div>

          <h2 id="mistake-history" class="detail-section-title">复习历史</h2>
          <div v-if="reviewRecords.length === 0" class="muted">暂无复习记录。</div>
          <div v-else class="review-history">
            <div v-for="record in reviewRecords" :key="record.id" class="review-history-item">
              <div><strong>{{ record.review_date }}</strong><span class="badge">{{ record.result }}</span></div>
              <p>{{ record.note || '本次未填写备注' }}</p>
              <small>下次复习：{{ record.next_review_date || '不再安排' }}</small>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
