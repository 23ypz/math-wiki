<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { request } from '../api';

const loading = ref(true);
const error = ref('');
const data = ref<any>({
  mistakeCount: 0,
  knowledgeCount: 0,
  dueCount: 0,
  weekStudyMinutes: 0,
  statusStats: [],
  weakChapters: []
});

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

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div>
        <h2>学习总览</h2>
        <p>用数据看清数学一复习进度和薄弱环节。</p>
      </div>
      <button class="secondary" @click="load">刷新</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading">加载中...</p>

    <div class="grid grid-4" v-else>
      <div class="card stat"><span>知识点数量</span><strong>{{ data.knowledgeCount }}</strong></div>
      <div class="card stat"><span>错题数量</span><strong>{{ data.mistakeCount }}</strong></div>
      <div class="card stat"><span>今日待复习</span><strong>{{ data.dueCount }}</strong></div>
      <div class="card stat"><span>近 7 天学习</span><strong>{{ Math.round(data.weekStudyMinutes / 60 * 10) / 10 }}h</strong></div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card">
        <h3>错题状态分布</h3>
        <table class="table">
          <tbody>
            <tr v-for="item in data.statusStats" :key="item.status">
              <td><span class="badge">{{ item.status || '未设置' }}</span></td>
              <td>{{ item.count }} 道</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>薄弱章节 Top 8</h3>
        <table class="table">
          <tbody>
            <tr v-for="item in data.weakChapters" :key="item.subject + item.chapter">
              <td>{{ item.subject }} / {{ item.chapter || '未分类' }}</td>
              <td>{{ item.count }} 道</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
