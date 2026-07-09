<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { request } from '../api';
import type { Mistake } from '../types';

const items = ref<Mistake[]>([]);
const error = ref('');
const editingId = ref<number | null>(null);
const filter = reactive({ q: '', subject: '', status: '' });
const form = reactive({
  title: '', subject: '高等数学', chapter: '', source: '', question_text: '', answer_text: '', wrong_reason: '', summary: '',
  difficulty: 3, status: '待复习', next_review_date: ''
});

function reset() {
  editingId.value = null;
  Object.assign(form, { title: '', subject: '高等数学', chapter: '', source: '', question_text: '', answer_text: '', wrong_reason: '', summary: '', difficulty: 3, status: '待复习', next_review_date: '' });
}

async function load() {
  error.value = '';
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.subject) params.set('subject', filter.subject);
  if (filter.status) params.set('status', filter.status);
  try {
    const res = await request<{ items: Mistake[] }>(`/mistakes?${params}`);
    items.value = res.items;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function save() {
  error.value = '';
  try {
    if (editingId.value) {
      await request(`/mistakes/${editingId.value}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await request('/mistakes', { method: 'POST', body: JSON.stringify(form) });
    }
    reset();
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败';
  }
}

function edit(item: Mistake) {
  editingId.value = item.id;
  Object.assign(form, {
    title: item.title,
    subject: item.subject,
    chapter: item.chapter || '',
    source: item.source || '',
    question_text: item.question_text || '',
    answer_text: item.answer_text || '',
    wrong_reason: item.wrong_reason || '',
    summary: item.summary || '',
    difficulty: item.difficulty || 3,
    status: item.status || '待复习',
    next_review_date: item.next_review_date || ''
  });
}

async function remove(id: number) {
  if (!confirm('确定删除这道错题吗？')) return;
  await request(`/mistakes/${id}`, { method: 'DELETE' });
  await load();
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>错题本</h2>
        <p>重点记录“为什么错”，而不是只保存题目和答案。</p>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="card">
      <h3>{{ editingId ? '编辑错题' : '新增错题' }}</h3>
      <form class="form" @submit.prevent="save">
        <div class="form-row">
          <label>标题<input v-model="form.title" placeholder="如 极限等价替换错误" /></label>
          <label>科目<select v-model="form.subject"><option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option></select></label>
        </div>
        <div class="form-row">
          <label>章节<input v-model="form.chapter" placeholder="如 极限" /></label>
          <label>来源<input v-model="form.source" placeholder="如 660 / 880 / 真题" /></label>
        </div>
        <div class="form-row">
          <label>难度 1-5<input v-model.number="form.difficulty" type="number" min="1" max="5" /></label>
          <label>下次复习日期<input v-model="form.next_review_date" type="date" /></label>
        </div>
        <label>状态<select v-model="form.status"><option>待复习</option><option>复习中</option><option>已掌握</option></select></label>
        <label>题目<textarea v-model="form.question_text" /></label>
        <label>正确解法<textarea v-model="form.answer_text" /></label>
        <label>错误原因<textarea v-model="form.wrong_reason" placeholder="概念不清 / 公式记错 / 计算失误 / 方法不会..." /></label>
        <label>总结<textarea v-model="form.summary" /></label>
        <div class="actions"><button class="primary">保存</button><button class="secondary" type="button" @click="reset">清空</button></div>
      </form>
    </div>

    <div class="card" style="margin-top:16px">
      <h3>筛选</h3>
      <div class="form-row">
        <input v-model="filter.q" placeholder="关键词" @keyup.enter="load" />
        <select v-model="filter.subject" @change="load"><option value="">全部科目</option><option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option></select>
      </div>
      <div class="form-row" style="margin-top:12px">
        <select v-model="filter.status" @change="load"><option value="">全部状态</option><option>待复习</option><option>复习中</option><option>已掌握</option></select>
        <button class="secondary" @click="load">搜索</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <table class="table">
        <thead><tr><th>错题</th><th>章节</th><th>状态</th><th>复习</th><th>错因</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><strong>{{ item.title }}</strong><br><span class="badge">{{ item.subject }}</span> 难度 {{ item.difficulty }}/5</td>
            <td>{{ item.chapter }}</td>
            <td>{{ item.status }}</td>
            <td>下次：{{ item.next_review_date || '未设置' }}<br>次数：{{ item.review_count }}</td>
            <td>{{ (item.wrong_reason || item.summary || '').slice(0, 80) }}</td>
            <td><div class="actions"><button class="secondary" @click="edit(item)">编辑</button><button class="danger" @click="remove(item.id)">删除</button></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
