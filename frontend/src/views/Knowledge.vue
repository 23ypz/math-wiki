<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { request } from '../api';
import type { KnowledgePoint } from '../types';

const items = ref<KnowledgePoint[]>([]);
const error = ref('');
const editingId = ref<number | null>(null);
const filter = reactive({ q: '', subject: '' });
const form = reactive({ subject: '高等数学', chapter: '', title: '', content_md: '', mastery_level: 0 });

function reset() {
  editingId.value = null;
  Object.assign(form, { subject: '高等数学', chapter: '', title: '', content_md: '', mastery_level: 0 });
}

async function load() {
  error.value = '';
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.subject) params.set('subject', filter.subject);
  try {
    const res = await request<{ items: KnowledgePoint[] }>(`/knowledge?${params}`);
    items.value = res.items;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function save() {
  error.value = '';
  try {
    if (editingId.value) {
      await request(`/knowledge/${editingId.value}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await request('/knowledge', { method: 'POST', body: JSON.stringify(form) });
    }
    reset();
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败';
  }
}

function edit(item: KnowledgePoint) {
  editingId.value = item.id;
  Object.assign(form, {
    subject: item.subject,
    chapter: item.chapter,
    title: item.title,
    content_md: item.content_md || '',
    mastery_level: item.mastery_level || 0
  });
}

async function remove(id: number) {
  if (!confirm('确定删除这个知识点吗？')) return;
  await request(`/knowledge/${id}`, { method: 'DELETE' });
  await load();
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>知识点</h2>
        <p>按高数、线代、概率建立自己的数学一知识体系。</p>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="grid grid-2">
      <div class="card">
        <h3>{{ editingId ? '编辑知识点' : '新增知识点' }}</h3>
        <form class="form" @submit.prevent="save">
          <div class="form-row">
            <label>科目
              <select v-model="form.subject">
                <option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option>
              </select>
            </label>
            <label>章节<input v-model="form.chapter" placeholder="如 极限 / 特征值 / 随机变量" /></label>
          </div>
          <label>标题<input v-model="form.title" placeholder="如 等价无穷小" /></label>
          <label>掌握程度 0-5<input v-model.number="form.mastery_level" type="number" min="0" max="5" /></label>
          <label>内容 Markdown<textarea v-model="form.content_md" placeholder="核心概念、公式、典型题型、易错点..." /></label>
          <div class="actions">
            <button class="primary">保存</button>
            <button class="secondary" type="button" @click="reset">清空</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h3>筛选</h3>
        <div class="form-row">
          <input v-model="filter.q" placeholder="搜索标题/内容" @keyup.enter="load" />
          <select v-model="filter.subject" @change="load">
            <option value="">全部科目</option><option>高等数学</option><option>线性代数</option><option>概率论与数理统计</option>
          </select>
        </div>
        <button class="secondary" style="margin-top:12px" @click="load">搜索</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <table class="table">
        <thead><tr><th>知识点</th><th>章节</th><th>掌握</th><th>内容预览</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><strong>{{ item.title }}</strong><br><span class="badge">{{ item.subject }}</span></td>
            <td>{{ item.chapter }}</td>
            <td>{{ item.mastery_level }}/5</td>
            <td class="markdown-preview">{{ (item.content_md || '').slice(0, 120) }}</td>
            <td><div class="actions"><button class="secondary" @click="edit(item)">编辑</button><button class="danger" @click="remove(item.id)">删除</button></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
