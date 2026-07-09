<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login, setToken } from '../api';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    const result = await login(email.value, password.value);
    setToken(result.token);
    router.push('/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="card login-card">
      <div class="brand" style="color:#111827;margin-bottom:18px">
        <div class="brand-mark">研</div>
        <div>
          <h1>考研数学一知识库</h1>
          <p style="color:#6b7280">登录后开始维护知识点和错题</p>
        </div>
      </div>
      <form class="form" @submit.prevent="submit">
        <label>邮箱<input v-model="email" type="email" placeholder="ADMIN_EMAIL" /></label>
        <label>密码<input v-model="password" type="password" placeholder="ADMIN_PASSWORD" /></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
      </form>
    </div>
  </div>
</template>
