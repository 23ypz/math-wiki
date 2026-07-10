<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { request } from '../api';
import type { KnowledgePoint, Mistake, ReviewRecord, StudyLog } from '../types';

const loading = ref(true);
const exporting = ref(false);
const importing = ref(false);
const importMode = ref<'merge' | 'overwrite'>('merge');
const importSummary = ref('');
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
    request<{ items: Mistake[] }>('/mistakes?sort=created_asc'),
    request<{ items: StudyLog[] }>('/study-logs')
  ]);
  const reviewGroups = await Promise.all(mistakes.items.map(async (item) => {
    const res = await request<{ items: ReviewRecord[] }>(`/review-records?mistake_id=${item.id}`);
    return res.items;
  }));
  return {
    version: 8,
    exported_at: new Date().toISOString(),
    knowledge_points: knowledge.items,
    mistakes: mistakes.items,
    study_logs: studyLogs.items,
    review_records: reviewGroups.flat()
  };
}

async function exportJson() {
  exporting.value = true;
  error.value = '';
  try {
    const backup = await fetchBackupData();
    download(`math-wiki-v8-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2));
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
    const lines: string[] = ['# 数学一 Wiki 导出', '', `导出时间：${backup.exported_at}`, '', '## 一、知识点'];
    for (const item of backup.knowledge_points) {
      lines.push('', `### ${item.subject} / ${item.chapter} / ${item.title}`, `掌握程度：${item.mastery_level}/5`, '', item.content_md || '暂无内容');
    }
    lines.push('', '## 二、错题本');
    for (const item of backup.mistakes) {
      lines.push('', `### ${item.title}`, `- 科目：${item.subject}`, `- 章节：${item.chapter || '未分类'}`, `- 关联知识点：${item.knowledge_title || '未关联'}`, `- 标签：${item.tags?.join('、') || '无'}`, `- 来源：${item.source || '未填写'}`, `- 状态：${item.status}`, `- 难度：${item.difficulty}/5`, `- 下次复习：${item.next_review_date || '未设置'}`, '', '#### 题目', item.question_text || '未填写', '', '#### 正确解法', item.answer_text || '未填写', '', '#### 错因', item.wrong_reason || '未填写', '', '#### 总结', item.summary || '未填写');
    }
    lines.push('', '## 三、学习日志');
    for (const item of backup.study_logs) {
      lines.push('', `### ${item.study_date} ${item.subject}`, `- 学习时长：${item.duration_minutes} 分钟`, `- 新增错题：${item.new_mistakes_count}`, `- 复习错题：${item.reviewed_mistakes_count}`, '', item.content || '未填写学习内容', '', item.summary || '');
    }
    download(`math-wiki-v8-export-${new Date().toISOString().slice(0, 10)}.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导出失败';
  } finally {
    exporting.value = false;
  }
}

async function deleteCurrentData() {
  const [knowledge, mistakes, studyLogs] = await Promise.all([
    request<{ items: KnowledgePoint[] }>('/knowledge'),
    request<{ items: Mistake[] }>('/mistakes'),
    request<{ items: StudyLog[] }>('/study-logs')
  ]);
  for (const item of mistakes.items) await request(`/mistakes/${item.id}`, { method: 'DELETE' });
  for (const item of knowledge.items) await request(`/knowledge/${item.id}`, { method: 'DELETE' });
  for (const item of studyLogs.items) await request(`/study-logs/${item.id}`, { method: 'DELETE' });
}

async function importBackup(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  importing.value = true;
  importSummary.value = '';
  error.value = '';
  try {
    const backup = JSON.parse(await file.text()) as any;
    const knowledge = Array.isArray(backup.knowledge_points) ? backup.knowledge_points : [];
    const mistakes = Array.isArray(backup.mistakes) ? backup.mistakes : [];
    const studyLogs = Array.isArray(backup.study_logs) ? backup.study_logs : [];
    const reviewRecords = Array.isArray(backup.review_records) ? backup.review_records : [];
    if (!knowledge.length && !mistakes.length && !studyLogs.length) throw new Error('备份文件中没有可导入的数据。');
    if (importMode.value === 'overwrite') {
      if (!confirm('覆盖模式会先删除当前知识点、错题和学习日志，确定继续吗？')) return;
      await deleteCurrentData();
    }

    const knowledgeMap = new Map<number, number>();
    for (const item of knowledge) {
      const created = await request<{ id: number }>('/knowledge', { method: 'POST', body: JSON.stringify({ subject: item.subject, chapter: item.chapter, title: item.title, content_md: item.content_md, mastery_level: item.mastery_level }) });
      knowledgeMap.set(Number(item.id), created.id);
    }

    const mistakeMap = new Map<number, number>();
    for (const item of mistakes) {
      const created = await request<{ id: number }>('/mistakes', { method: 'POST', body: JSON.stringify({ ...item, knowledge_point_id: item.knowledge_point_id ? knowledgeMap.get(Number(item.knowledge_point_id)) || null : null }) });
      mistakeMap.set(Number(item.id), created.id);
    }

    for (const item of studyLogs) {
      await request('/study-logs', { method: 'POST', body: JSON.stringify(item) });
    }

    for (const record of reviewRecords) {
      const newMistakeId = mistakeMap.get(Number(record.mistake_id));
      if (!newMistakeId) continue;
      await request('/review-records', { method: 'POST', body: JSON.stringify({ ...record, mistake_id: newMistakeId, preserve_state: true }) });
    }

    importSummary.value = `导入完成：知识点 ${knowledge.length} 个，错题 ${mistakes.length} 道，学习日志 ${studyLogs.length} 条，复习记录 ${reviewRecords.length} 条。`;
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导入失败';
  } finally {
    importing.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div><h2>学习总览</h2><p>用数据看清数学一复习进度和薄弱环节。</p></div>
      <div class="actions"><button class="secondary" @click="load">刷新</button><button class="secondary" :disabled="exporting" @click="exportJson">导出 JSON</button><button class="secondary" :disabled="exporting" @click="exportMarkdown">导出 Markdown</button></div>
    </div>
    <p v-if="error" class="error">{{ error }}</p><p v-if="loading">加载中...</p>

    <div class="grid grid-4" v-else>
      <div class="card stat"><span>知识点数量</span><strong>{{ data.knowledgeCount }}</strong></div><div class="card stat"><span>错题数量</span><strong>{{ data.mistakeCount }}</strong></div><div class="card stat"><span>今日待复习</span><strong>{{ data.dueCount }}</strong></div><div class="card stat"><span>已经逾期</span><strong>{{ data.overdueCount }}</strong></div><div class="card stat"><span>近 7 天学习</span><strong>{{ Math.round(data.weekStudyMinutes / 60 * 10) / 10 }}h</strong></div><div class="card stat"><span>近 7 天复习</span><strong>{{ data.reviewedWeekCount }}</strong></div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card"><h3>错题状态分布</h3><div v-if="data.statusStats.length === 0" class="muted">暂无错题数据</div><div v-for="item in data.statusStats" :key="item.status" class="bar-row"><div class="bar-label"><span class="badge">{{ item.status || '未设置' }}</span><strong>{{ item.count }} 道</strong></div><div class="bar"><span :style="{ width: `${Math.max(8, item.count / maxStatus * 100)}%` }"></span></div></div></div>
      <div class="card"><h3>薄弱章节 Top 8</h3><div v-if="data.weakChapters.length === 0" class="muted">暂无章节统计</div><div v-for="item in data.weakChapters" :key="item.subject + item.chapter" class="bar-row"><div class="bar-label"><span>{{ item.subject }} / {{ item.chapter || '未分类' }}</span><strong>{{ item.count }} 道</strong></div><div class="bar"><span :style="{ width: `${Math.max(8, item.count / maxWeak * 100)}%` }"></span></div></div></div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card"><h3>薄弱知识点 Top 8</h3><div v-if="data.weakKnowledge.length === 0" class="muted">暂无薄弱知识点数据</div><RouterLink v-for="item in data.weakKnowledge" :key="item.id" :to="`/knowledge/${item.id}`" class="weak-knowledge-row"><div><strong>{{ item.title }}</strong><span>{{ item.subject }} / {{ item.chapter || '未分章节' }}</span></div><small>{{ item.mistake_count }} 道未掌握错题 · 掌握 {{ item.mastery_level }}/5</small></RouterLink></div>
      <div class="card"><h3>最近 7 天学习时长</h3><div v-if="data.recentStudy.length === 0" class="muted">最近 7 天暂无学习日志</div><div v-for="item in data.recentStudy" :key="item.study_date" class="bar-row"><div class="bar-label"><span>{{ item.study_date }}</span><strong>{{ item.minutes }} 分钟</strong></div><div class="bar study-bar"><span :style="{ width: `${Math.max(6, item.minutes / maxStudy * 100)}%` }"></span></div></div></div>
    </div>

    <div class="card" style="margin-top:16px"><h3>下一步复习建议</h3><p v-if="data.overdueCount > 0">你有 {{ data.overdueCount }} 道错题已经逾期，建议先进入“今日复习”清理逾期内容。</p><p v-else-if="data.dueCount > 0">今天有 {{ data.dueCount }} 道错题待复习，完成后再复盘薄弱知识点。</p><p v-else-if="data.weakKnowledge.length">今天没有到期错题，可以优先复盘“{{ data.weakKnowledge[0].title }}”。</p><p v-else>今天没有到期错题，建议继续整理新知识点或完成一组章节练习。</p></div>

    <div class="card" style="margin-top:16px">
      <h3>JSON 备份恢复</h3><p class="muted">合并模式保留现有数据；覆盖模式会先删除现有知识点、错题和学习日志。</p>
      <div class="import-row"><select v-model="importMode"><option value="merge">合并导入</option><option value="overwrite">覆盖导入</option></select><label class="link-button secondary-link file-button">{{ importing ? '正在导入...' : '选择 JSON 备份' }}<input type="file" accept="application/json,.json" :disabled="importing" @change="importBackup" /></label></div>
      <p v-if="importSummary" class="success-message">{{ importSummary }}</p>
    </div>
  </section>
</template>
