<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { request } from '../api';
import type { Mistake } from '../types';

const items = ref<Mistake[]>([]);
const error = ref('');
const savingId = ref<number | null>(null);
const form = reactive<Record<number, { result: string; note: string; next_review_date: string; status: string }>>({});

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function intervalDays(item: Mistake, result: string) {
  if (result === '还是不会') return 1;
  if (result === '还有点卡') {
    const schedule = [3, 7, 15, 30];
    return schedule[Math.min(item.review_count || 0, schedule.length - 1)];
  }
  return 0;
}

function applyInterval(item: Mistake) {
  const data = form[item.id];
  if (!data) return;
  const days = intervalDays(item, data.result);
  if (data.result === '完全会了') {
    data.status = '已掌握';
    data.next_review_date = '';
  } else if (data.result === '还有点卡') {
    data.status = '复习中';
    data.next_review_date = addDays(days);
  } else {
    data.status = '待复习';
    data.next_review_date = addDays(days);
  }
}

function suggestion(item: Mistake) {
  const data = form[item.id];
  if (!data) return '';
  if (data.result === '完全会了') return '标记为已掌握，不再进入今日待复习。';
  return `建议 ${intervalDays(item, data.result)} 天后再次复习。`;
}

const overdueCount = computed(() => items.value.filter((item) => item.next_review_date && item.next_review_date < new Date().toISOString().slice(0, 10)).length);

async function load() {
  error.value = '';
  try {
    const res = await request<{ items: Mistake[] }>('/review-records?mode=today');
    items.value = res.items;
    for (const item of items.value) {
      if (!form[item.id]) {
        form[item.id] = { result: '还有点卡', note: '', next_review_date: '', status: '复习中' };
        applyInterval(item);
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function complete(item: Mistake) {
  const data = form[item.id];
  savingId.value = item.id;
  error.value = '';
  try {
    applyInterval(item);
    await request('/review-records', {
      method: 'POST',
      body: JSON.stringify({ mistake_id: item.id, ...data })
    });
    delete form[item.id];
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '提交复习记录失败';
  } finally {
    savingId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>今日复习</h2>
        <p>根据复习结果自动安排下一次复习，复习次数越多，巩固间隔会逐步延长。</p>
      </div>
      <button class="secondary" @click="load">刷新</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="grid grid-2 review-summary-grid">
      <div class="card stat"><span>今日到期</span><strong>{{ items.length }}</strong></div>
      <div class="card stat"><span>其中已逾期</span><strong>{{ overdueCount }}</strong></div>
    </div>

    <div v-if="items.length === 0" class="card" style="margin-top:16px">今天没有到期错题，可以复盘薄弱章节或新增错题。</div>

    <div class="grid" v-else style="margin-top:16px">
      <div class="card review-card" v-for="item in items" :key="item.id">
        <div class="card-head">
          <div>
            <h3>{{ item.title }}</h3>
            <p class="muted"><span class="badge">{{ item.subject }}</span> {{ item.chapter || '未分章节' }} · 已复习 {{ item.review_count }} 次</p>
          </div>
          <RouterLink class="link-button secondary-link" :to="`/mistakes/${item.id}`">查看详情</RouterLink>
        </div>

        <p><strong>错因：</strong>{{ item.wrong_reason || '未填写' }}</p>
        <p><strong>总结：</strong>{{ item.summary || '未填写' }}</p>
        <p class="tip">原定复习日期：{{ item.next_review_date || '未设置' }}。{{ suggestion(item) }}</p>

        <div class="review-result-buttons">
          <button type="button" :class="{ active: form[item.id].result === '还是不会' }" @click="form[item.id].result = '还是不会'; applyInterval(item)">还是不会</button>
          <button type="button" :class="{ active: form[item.id].result === '还有点卡' }" @click="form[item.id].result = '还有点卡'; applyInterval(item)">还有点卡</button>
          <button type="button" :class="{ active: form[item.id].result === '完全会了' }" @click="form[item.id].result = '完全会了'; applyInterval(item)">完全会了</button>
        </div>

        <div class="form-row">
          <label>下次复习日期<input v-model="form[item.id].next_review_date" type="date" :disabled="form[item.id].result === '完全会了'" /></label>
          <label>当前状态<input :value="form[item.id].status" disabled /></label>
        </div>
        <label style="margin-top:12px">复习备注<textarea v-model="form[item.id].note" placeholder="记录这次仍然卡住的步骤或新的理解" /></label>
        <button class="primary" style="margin-top:12px" :disabled="savingId === item.id" @click="complete(item)">
          {{ savingId === item.id ? '正在保存...' : '完成复习' }}
        </button>
      </div>
    </div>
  </section>
</template>
