<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { isGuest, request } from '../api';
import type { StudyLog } from '../types';

const guest = isGuest();
const items = ref<StudyLog[]>([]);
const error = ref('');
const editingId = ref<number | null>(null);
const today = new Date().toISOString().slice(0, 10);
const form = reactive({ study_date: today, subject: '高等数学', content: '', duration_minutes: 120, new_mistakes_count: 0, reviewed_mistakes_count: 0, summary: '' });

function reset() {
  editingId.value = null;
  Object.assign(form, { study_date: today, subject: '高等数学', content: '', duration_minutes: 120, new_mistakes_count: 0, reviewed_mistakes_count: 0, summary: '' });
}

async function load() {
  error.value = '';
  try {
    const res = await request<{ items: StudyLog[] }>('/study-logs');
    items.value = res.items;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function save() {
  error.value = '';
  try {
    if (editingId.value) {
      await request(`/study-logs/${editingId.value}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await request('/study-logs', { method: 'POST', body: JSON.stringify(form) });
    }
    reset();
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败';
  }
}

function edit(item: StudyLog) {
  editingId.value = item.id;
  Object.assign(form, {
    study_date: item.study_date,
    subject: item.subject || '高等数学',
    content: item.content || '',
    duration_minutes: item.duration_minutes || 0,
    new_mistakes_count: item.new_mistakes_count || 0,
    reviewed_mistakes_count: item.reviewed_mistakes_count || 0,
    summary: item.summary || ''
  });
}

async function remove(id: number) {
  if (!confirm('确定删除这条学习日志吗？')) return;
  await request(`/study-logs/${id}`, { method: 'DELETE' });
  await load();
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>学习日志</h2>
        <p>记录每天学了什么、学了多久、错题增加和复习情况。</p>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="card">
      <h3>{{ editingId ? '编辑日志' : '新增日志' }}</h3>
      <form class="form" @submit.prevent="save">
        <div class="form-row">
          <label>日期<input v-model="form.study_date" type="date" /></label>
          <label>科目<select v-model="form.subject"><option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option><option>综合复习</option></select></label>
        </div>
        <div class="form-row">
          <label>学习时长/分钟<input v-model.number="form.duration_minutes" type="number" min="0" /></label>
          <label>新增错题<input v-model.number="form.new_mistakes_count" type="number" min="0" /></label>
        </div>
        <label>复习错题数量<input v-model.number="form.reviewed_mistakes_count" type="number" min="0" /></label>
        <label>学习内容<textarea v-model="form.content" /></label>
        <label>今日总结<textarea v-model="form.summary" /></label>
        <div class="actions"><button class="primary">保存</button><button class="secondary" type="button" @click="reset">清空</button></div>
      </form>
    </div>

    <div class="card" style="margin-top:16px">
      <table class="table">
        <thead><tr><th>日期</th><th>科目</th><th>时长</th><th>错题</th><th>内容</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.study_date }}</td>
            <td><span class="badge">{{ item.subject }}</span></td>
            <td>{{ Math.round(item.duration_minutes / 60 * 10) / 10 }}h</td>
            <td>新增 {{ item.new_mistakes_count }} / 复习 {{ item.reviewed_mistakes_count }}</td>
            <td>{{ (item.content || item.summary || '').slice(0, 100) }}</td>
            <td><div v-if="!guest" class="actions"><button class="secondary" @click="edit(item)">编辑</button><button class="danger" @click="remove(item.id)">删除</button></div><span v-else class="muted">只读</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
