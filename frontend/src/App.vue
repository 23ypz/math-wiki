<script setup lang="ts">
import { useRouter } from 'vue-router';
import { clearToken, isLoggedIn } from './api';

const router = useRouter();
function logout() {
  clearToken();
  router.push('/login');
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" v-if="isLoggedIn()">
      <div class="brand">
        <div class="brand-mark">研</div>
        <div>
          <h1>数学一 Wiki</h1>
          <p>知识点 · 错题 · 复习</p>
        </div>
      </div>
      <nav>
        <RouterLink to="/">总览</RouterLink>
        <RouterLink to="/knowledge">知识点</RouterLink>
        <RouterLink to="/mistakes">错题本</RouterLink>
        <RouterLink to="/reviews">今日复习</RouterLink>
        <RouterLink to="/study-logs">学习日志</RouterLink>
      </nav>
      <button class="ghost logout" @click="logout">退出登录</button>
    </aside>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>
