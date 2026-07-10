<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { request } from '../api';
import type { KnowledgePoint, Mistake, StudyLog } from '../types';

const loading = ref(true);
const exporting = ref(false);
const error = ref('');
const data = ref<any>({
  mistakeCount: 0,
  knowledgeCount: 0,
  dueCount: 0,
  overdueCount: 0,
  weekStudyMinutes: 0,
  reviewedWeekCount: 0,
  statusStats: [],
  weakChapters: [],
  weakKnowledge: [],
  recentStudy: []
});

const maxStatus = computed(() => Math.max(1, ...data.value.statusStats.map((item: any) => Number(item.count) || 0)));
const maxWeak = computed(() => Math.max(1, ...data.value.weakChapters.map((item: any) => Number(item.count) || 0)));
const maxStudy = computed(() => Math.max(1, ...data.value.recentStudy.map((item: any) => Number(item.minutes) || 0)));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    data.value = await request('/stats/overview');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function download(filename: string, content: string, type = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchBackupData() {
  const [knowledge, mistakes, studyLogs] = await Promise.all([
    request<{ items: KnowledgePoint[] }>('/knowledge'),
    request<{ items: Mistake[] }>('/mistakes'),
    request<{ items: StudyLog[] }>('/study-logs')
  ]);
  return {
    exported_at: new Date().toISOString(),
    knowledge_points: knowledge.items,
    mistakes: mistakes.items,
    study_logs: studyLogs.items
  };
}

async function exportJson() {
  exporting.value = true;
  error.value = '';
  try {
    const backup = await fetchBackupData();
    download(`math-wiki-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2));
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导出失败';
  } finally {
    exporting.value = false;
  }
}

async function exportMarkdown() {
  exporting.value = true;
  error.value = '';
  try {
    const backup = await fetchBackupData();
    const lines: string[] = [];
    lines.push('# 数学一 Wiki 导出');
    lines.push('');
    lines.push(`导出时间：${backup.exported_at}`);
    lines.push('');
    lines.push('## 一、知识点');
    for (const item of backup.knowledge_points) {
      lines.push('');
      lines.push(`### ${item.subject} / ${item.chapter} / ${item.title}`);
      lines.push(`掌握程度：${item.mastery_level}/5`);
      lines.push('');
      lines.push(item.content_md || '暂无内容');
    }
    lines.push('');
    lines.push('## 二、错题本');
    for (const item of backup.mistakes) {
      lines.push('');
      lines.push(`### ${item.title}`);
      lines.push(`- 科目：${item.subject}`);
      lines.push(`- 章节：${item.chapter || '未分类'}`);
      lines.push(`- 关联知识点：${item.knowledge_title || '未关联'}`);
      lines.push(`- 来源：${item.source || '未填写'}`);
      lines.push(`- 状态：${item.status}`);
      lines.push(`- 难度：${item.difficulty}/5`);
      lines.push(`- 下次复习：${item.next_review_date || '未设置'}`);
      lines.push('');
      lines.push('#### 题目');
      lines.push(item.question_text || '未填写');
      lines.push('');
      lines.push('#### 正确解法');
      lines.push(item.answer_text || '未填写');
      lines.push('');
      lines.push('#### 错因');
      lines.push(item.wrong_reason || '未填写');
      lines.push('');
      lines.push('#### 总结');
      lines.push(item.summary || '未填写');
    }
    lines.push('');
    lines.push('## 三、学习日志');
    for (const item of backup.study_logs) {
      lines.push('');
      lines.push(`### ${item.study_date} ${item.subject}`);
      lines.push(`- 学习时长：${item.duration_minutes} 分钟`);
      lines.push(`- 新增错题：${item.new_mistakes_count}`);
      lines.push(`- 复习错题：${item.reviewed_mistakes_count}`);
      lines.push('');
      lines.push(item.content || '未填写学习内容');
      lines.push('');
      lines.push(item.summary || '');
    }
    download(`math-wiki-export-${new Date().toISOString().slice(0, 10)}.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导出失败';
  } finally {
    exporting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>学习总览</h2>
        <p>用数据看清数学一复习进度和薄弱环节。</p>
      </div>
      <div class="actions">
        <button class="secondary" @click="load">刷新</button>
        <button class="secondary" :disabled="exporting" @click="exportJson">导出 JSON</button>
        <button class="secondary" :disabled="exporting" @click="exportMarkdown">导出 Markdown</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading">加载中...</p>

    <div class="grid grid-4" v-else>
      <div class="card stat"><span>知识点数量</span><strong>{{ data.knowledgeCount }}</strong></div>
      <div class="card stat"><span>错题数量</span><strong>{{ data.mistakeCount }}</strong></div>
      <div class="card stat"><span>今日待复习</span><strong>{{ data.dueCount }}</strong></div>
      <div class="card stat"><span>已经逾期</span><strong>{{ data.overdueCount }}</strong></div>
      <div class="card stat"><span>近 7 天学习</span><strong>{{ Math.round(data.weekStudyMinutes / 60 * 10) / 10 }}h</strong></div>
      <div class="card stat"><span>近 7 天复习</span><strong>{{ data.reviewedWeekCount }}</strong></div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card">
        <h3>错题状态分布</h3>
        <div v-if="data.statusStats.length === 0" class="muted">暂无错题数据</div>
        <div v-for="item in data.statusStats" :key="item.status" class="bar-row">
          <div class="bar-label"><span class="badge">{{ item.status || '未设置' }}</span><strong>{{ item.count }} 道</strong></div>
          <div class="bar"><span :style="{ width: `${Math.max(8, item.count / maxStatus * 100)}%` }"></span></div>
        </div>
      </div>
      <div class="card">
        <h3>薄弱章节 Top 8</h3>
        <div v-if="data.weakChapters.length === 0" class="muted">暂无章节统计</div>
        <div v-for="item in data.weakChapters" :key="item.subject + item.chapter" class="bar-row">
          <div class="bar-label"><span>{{ item.subject }} / {{ item.chapter || '未分类' }}</span><strong>{{ item.count }} 道</strong></div>
          <div class="bar"><span :style="{ width: `${Math.max(8, item.count / maxWeak * 100)}%` }"></span></div>
        </div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card">
        <h3>薄弱知识点 Top 8</h3>
        <div v-if="data.weakKnowledge.length === 0" class="muted">暂无薄弱知识点数据</div>
        <RouterLink
          v-for="item in data.weakKnowledge"
          :key="item.id"
          :to="`/knowledge/${item.id}`"
          class="weak-knowledge-row"
        >
          <div>
            <strong>{{ item.title }}</strong>
            <span>{{ item.subject }} / {{ item.chapter || '未分章节' }}</span>
          </div>
          <small>{{ item.mistake_count }} 道未掌握错题 · 掌握 {{ item.mastery_level }}/5</small>
        </RouterLink>
      </div>

      <div class="card">
        <h3>最近 7 天学习时长</h3>
        <div v-if="data.recentStudy.length === 0" class="muted">最近 7 天暂无学习日志</div>
        <div v-for="item in data.recentStudy" :key="item.study_date" class="bar-row">
          <div class="bar-label"><span>{{ item.study_date }}</span><strong>{{ item.minutes }} 分钟</strong></div>
          <div class="bar study-bar"><span :style="{ width: `${Math.max(6, item.minutes / maxStudy * 100)}%` }"></span></div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3>下一步复习建议</h3>
      <p v-if="data.overdueCount > 0">你有 {{ data.overdueCount }} 道错题已经逾期，建议先进入“今日复习”清理逾期内容。</p>
      <p v-else-if="data.dueCount > 0">今天有 {{ data.dueCount }} 道错题待复习，完成后再复盘薄弱知识点。</p>
      <p v-else-if="data.weakKnowledge.length">今天没有到期错题，可以优先复盘“{{ data.weakKnowledge[0].title }}”。</p>
      <p v-else>今天没有到期错题，建议继续整理新知识点或完成一组章节练习。</p>
    </div>
  </section>
</template>
