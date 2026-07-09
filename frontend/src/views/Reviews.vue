<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { request } from '../api';
import type { Mistake } from '../types';

const items = ref<Mistake[]>([]);
const error = ref('');
const form = reactive<Record<number, { result: string; note: string; next_review_date: string; status: string }>>({});

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function load() {
  error.value = '';
  try {
    const res = await request<{ items: Mistake[] }>('/reviews/today');
    items.value = res.items;
    for (const item of items.value) {
      form[item.id] = form[item.id] || { result: '还有点卡', note: '', next_review_date: addDays(3), status: '复习中' };
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function complete(item: Mistake) {
  const data = form[item.id];
  if (data.result === '完全会了') {
    data.status = '已掌握';
    data.next_review_date = '';
  }
  await request('/review-records', {
    method: 'POST',
    body: JSON.stringify({ mistake_id: item.id, ...data })
  });
  await load();
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>今日复习</h2>
        <p>这里展示所有到期但尚未掌握的错题。</p>
      </div>
      <button class="secondary" @click="load">刷新</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="items.length === 0" class="card">今天没有到期错题，可以新增错题或复习薄弱章节。</div>

    <div class="grid" v-else>
      <div class="card" v-for="item in items" :key="item.id">
        <h3>{{ item.title }}</h3>
        <p><span class="badge">{{ item.subject }}</span> {{ item.chapter }} · 下次复习原定 {{ item.next_review_date }}</p>
        <p><strong>错因：</strong>{{ item.wrong_reason || '未填写' }}</p>
        <p><strong>总结：</strong>{{ item.summary || '未填写' }}</p>
        <div class="form-row">
          <label>复习结果
            <select v-model="form[item.id].result">
              <option>完全会了</option><option>还有点卡</option><option>还是不会</option>
            </select>
          </label>
          <label>下次复习日期<input v-model="form[item.id].next_review_date" type="date" /></label>
        </div>
        <label style="margin-top:12px">复习备注<textarea v-model="form[item.id].note" /></label>
        <button class="primary" style="margin-top:12px" @click="complete(item)">完成复习</button>
      </div>
    </div>
  </section>
</template>
