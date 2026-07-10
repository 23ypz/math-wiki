<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { guestLogin, login, setToken } from '../api';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const guestLoading = ref(false);
const error = ref('');
const loginOpen = ref(false);
const showPassword = ref(false);
const emailInput = ref<HTMLInputElement | null>(null);

function openLogin() {
  error.value = '';
  loginOpen.value = true;
  nextTick(() => emailInput.value?.focus());
}

function closeLogin() {
  if (loading.value) return;
  loginOpen.value = false;
  error.value = '';
}

async function submit() {
  if (!email.value.trim() || !password.value) {
    error.value = '请输入邮箱和密码。';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const result = await login(email.value.trim(), password.value);
    setToken(result.token);
    router.push('/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败，请检查账号或网络连接。';
  } finally {
    loading.value = false;
  }
}


async function enterGuestMode() {
  guestLoading.value = true;
  error.value = '';
  try {
    const result = await guestLogin();
    setToken(result.token, 'guest');
    router.push('/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '游客模式进入失败，请稍后重试。';
  } finally {
    guestLoading.value = false;
  }
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && loginOpen.value) closeLogin();
}

let revealObserver: IntersectionObserver | null = null;

function setupRevealAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => element.classList.add('is-visible'));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver?.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );

  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => revealObserver?.observe(element));
}

watch(loginOpen, (open) => {
  document.documentElement.classList.toggle('login-modal-open', open);
  document.body.classList.toggle('login-modal-open', open);
});

onMounted(() => {
  document.documentElement.classList.add('landing-active');
  document.body.classList.add('landing-active');
  window.addEventListener('keydown', onKeydown);
  nextTick(setupRevealAnimations);
});
onBeforeUnmount(() => {
  document.documentElement.classList.remove('landing-active');
  document.body.classList.remove('landing-active');
  window.removeEventListener('keydown', onKeydown);
  revealObserver?.disconnect();
  document.documentElement.classList.remove('login-modal-open');
  document.body.classList.remove('login-modal-open');
});
</script>

<template>
  <div class="landing-page">
    <div class="star-layer star-layer-one" aria-hidden="true"></div>
    <div class="star-layer star-layer-two" aria-hidden="true"></div>
    <div class="hero-glow" aria-hidden="true"></div>

    <header class="landing-header">
      <button class="landing-brand" type="button" aria-label="返回首页" @click="scrollToSection('hero')">
        <span class="landing-logo">数</span>
        <span class="landing-brand-text">
          <strong>Math Wiki</strong>
          <small>YOUR STUDY OS</small>
        </span>
      </button>

      <nav class="landing-nav" aria-label="首页导航">
        <button type="button" @click="scrollToSection('features')">学习工具</button>
        <button type="button" @click="scrollToSection('workflow')">学习流程</button>
        <button type="button" @click="scrollToSection('subjects')">数学体系</button>
        <button class="nav-guest" type="button" :disabled="guestLoading" @click="enterGuestMode">{{ guestLoading ? '进入中…' : '游客浏览' }}</button>
        <button class="nav-login" type="button" @click="openLogin">登录系统</button>
      </nav>
    </header>

    <main>
      <section id="hero" class="hero-section">
        <div class="status-pill">
          <span></span>
          个人数学知识库 · 云端同步
        </div>

        <h1>
          用结构化方法掌握
          <em>考研数学一</em>
        </h1>

        <p class="hero-copy">
          将高等数学、线性代数与概率论的知识点、错题、复习计划和学习进度连接起来。
          <br />建立属于自己的考研数学知识库。
        </p>

        <div class="hero-actions">
          <button class="hero-primary" type="button" @click="openLogin">
            登录进入学习系统
            <span>→</span>
          </button>
          <button class="hero-guest" type="button" :disabled="guestLoading" @click="enterGuestMode">{{ guestLoading ? '进入中…' : '游客浏览系统' }} <span>→</span></button>
          <button type="button" @click="scrollToSection('features')">查看知识点体系 <span>→</span></button>
          <button type="button" @click="scrollToSection('workflow')">了解错题复习流程 <span>→</span></button>
          <button type="button" @click="scrollToSection('subjects')">浏览数学一科目 <span>→</span></button>
        </div>

        <div class="hero-metrics" aria-label="系统功能概览">
          <div><strong>3</strong><span>数学一科目体系</span></div>
          <div><strong>1</strong><span>知识点与错题联动</span></div>
          <div><strong>5+</strong><span>学习与复习工具</span></div>
          <div><strong>24h</strong><span>云端数据同步</span></div>
        </div>
      </section>

      <section id="features" class="landing-section light-section">
        <div class="section-heading" data-reveal>
          <span>LEARNING TOOLS</span>
          <h2>从知识整理到错题复习，一站完成</h2>
          <p>不是简单保存笔记，而是把知识、错误和每天的学习行动串联起来。</p>
        </div>

        <div class="feature-grid" data-reveal>
          <article class="feature-card feature-card-wide">
            <div class="feature-icon blue">知</div>
            <div>
              <span class="feature-label">核心模块</span>
              <h3>数学一知识体系</h3>
              <p>按科目、章节和小知识点组织内容，支持 Markdown、公式、目录和关联错题。</p>
            </div>
            <ul>
              <li>高等数学章节目录</li>
              <li>线性代数知识网络</li>
              <li>概率论与数理统计</li>
            </ul>
          </article>

          <article class="feature-card">
            <div class="feature-icon orange">错</div>
            <span class="feature-label">复习闭环</span>
            <h3>错题分类与复习</h3>
            <p>记录题目、解法、错误原因和总结，并按掌握情况自动安排后续复习。</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon green">✓</div>
            <span class="feature-label">每日计划</span>
            <h3>Todo 日历</h3>
            <p>按日期安排刷题、知识点学习、真题练习和错题复习任务。</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon violet">统</div>
            <span class="feature-label">复盘分析</span>
            <h3>学习进度与统计</h3>
            <p>查看学习热力图、成绩趋势、薄弱章节、阶段目标和每周总结。</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon cyan">搜</div>
            <span class="feature-label">快速定位</span>
            <h3>全局搜索与打印</h3>
            <p>搜索知识点和错题，并按科目、章节或状态生成打印版错题本。</p>
          </article>
        </div>
      </section>

      <section id="subjects" class="landing-section subject-section">
        <div class="section-heading dark-heading" data-reveal>
          <span>MATHEMATICS I</span>
          <h2>三大科目，一套清晰的学习框架</h2>
          <p>从章节到小知识点逐级深入，让庞杂内容始终保持结构。</p>
        </div>

        <div class="subject-grid" data-reveal>
          <article>
            <span>01</span>
            <h3>高等数学</h3>
            <p>极限、微分、积分、多元函数、级数、微分方程等核心内容。</p>
          </article>
          <article>
            <span>02</span>
            <h3>线性代数</h3>
            <p>矩阵、向量组、线性方程组、特征值、二次型等知识体系。</p>
          </article>
          <article>
            <span>03</span>
            <h3>概率论与数理统计</h3>
            <p>随机变量、概率分布、数字特征、大数定律与参数估计。</p>
          </article>
        </div>
      </section>

      <section id="workflow" class="landing-section light-section workflow-section">
        <div class="section-heading" data-reveal>
          <span>STUDY WORKFLOW</span>
          <h2>记录、复习、反馈，形成自己的学习闭环</h2>
        </div>

        <div class="workflow-line" data-reveal>
          <article><b>1</b><h3>整理知识</h3><p>建立章节框架，沉淀公式、题型与易错点。</p></article>
          <article><b>2</b><h3>记录错误</h3><p>把错因和总结分开记录，关联对应知识点。</p></article>
          <article><b>3</b><h3>安排复习</h3><p>结合掌握程度、复习日期和 Todo 制订计划。</p></article>
          <article><b>4</b><h3>观察进步</h3><p>通过统计、成绩和复习历史持续调整重点。</p></article>
        </div>

        <div class="bottom-entry-actions" data-reveal>
          <button class="bottom-login" type="button" @click="openLogin">登录并开始整理数学知识库 →</button>
          <button class="bottom-guest" type="button" :disabled="guestLoading" @click="enterGuestMode">{{ guestLoading ? '进入中…' : '先以游客身份浏览' }}</button>
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <div class="landing-brand compact">
        <span class="landing-logo">研</span>
        <span class="landing-brand-text"><strong>数学一 Wiki</strong><small>PERSONAL LEARNING SYSTEM</small></span>
      </div>
      <p>知识点 · 错题 · 复习 · Todo · 学习进度</p>
    </footer>

    <Transition name="modal-fade">
      <div v-if="loginOpen" class="login-modal-mask" role="presentation" @mousedown.self="closeLogin">
        <section class="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
          <button class="modal-close" type="button" aria-label="关闭登录框" :disabled="loading" @click="closeLogin">×</button>

          <div class="modal-brand">
            <span class="landing-logo">研</span>
            <div>
              <span>欢迎回来</span>
              <h2 id="login-title">登录数学一 Wiki</h2>
            </div>
          </div>
          <p class="modal-copy">登录后继续维护你的知识点、错题与每日学习计划。</p>

          <form class="login-form" @submit.prevent="submit">
            <label>
              <span>登录邮箱</span>
              <input ref="emailInput" v-model="email" type="email" autocomplete="username" placeholder="请输入 ADMIN_EMAIL" />
            </label>
            <label>
              <span>登录密码</span>
              <div class="password-field">
                <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="请输入 ADMIN_PASSWORD" />
                <button type="button" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</button>
              </div>
            </label>

            <p v-if="error" class="login-error">{{ error }}</p>

            <button class="modal-submit" type="submit" :disabled="loading">
              {{ loading ? '正在登录…' : '登录进入系统' }}
              <span v-if="!loading">→</span>
            </button>
          </form>

          <p class="modal-tip">该系统为个人学习空间，仅支持预设管理员账号登录。</p>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.landing-page {
  --landing-bg: #061426;
  --landing-bg-soft: #0b1b31;
  --landing-line: rgba(148, 163, 184, 0.18);
  --landing-muted: #91a0b5;
  --landing-white: #f8fafc;
  --landing-orange: #ff8a2b;
  min-height: 100vh;
  color: var(--landing-white);
  background: var(--landing-bg);
  overflow-x: clip;
  overflow-y: visible;
  position: relative;
}

.star-layer,
.hero-glow {
  pointer-events: none;
  position: absolute;
  inset: 0;
}
.star-layer-one {
  opacity: .5;
  background-image:
    radial-gradient(circle at 8% 20%, rgba(255,255,255,.7) 0 1px, transparent 1.5px),
    radial-gradient(circle at 27% 34%, rgba(96,165,250,.8) 0 1px, transparent 1.5px),
    radial-gradient(circle at 62% 14%, rgba(255,255,255,.6) 0 1px, transparent 1.5px),
    radial-gradient(circle at 77% 38%, rgba(96,165,250,.6) 0 1px, transparent 1.5px),
    radial-gradient(circle at 91% 24%, rgba(255,255,255,.5) 0 1px, transparent 1.5px);
}
.star-layer-two {
  opacity: .22;
  background-image: radial-gradient(rgba(147,197,253,.8) .7px, transparent .7px);
  background-size: 92px 92px;
  background-position: 17px 23px;
}
.hero-glow {
  height: 900px;
  background:
    radial-gradient(circle at 50% 45%, rgba(37,99,235,.11), transparent 34%),
    linear-gradient(180deg, transparent 72%, rgba(148,163,184,.18) 99%, transparent 100%);
}

.landing-header {
  height: 76px;
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 5;
}
.landing-brand {
  border: 0;
  padding: 0;
  background: transparent;
  color: white;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}
.landing-logo {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 19px;
  color: white;
  background: linear-gradient(145deg, #2563eb 0%, #7c3aed 52%, #ec4899 100%);
  box-shadow: 0 10px 28px rgba(99,102,241,.3);
}
.landing-brand-text { display: grid; gap: 1px; }
.landing-brand-text strong { font-size: 18px; letter-spacing: .01em; }
.landing-brand-text small { color: #718198; letter-spacing: .2em; font-size: 9px; }
.landing-nav { display: flex; align-items: center; gap: 26px; }
.landing-nav button {
  border: 0;
  background: transparent;
  color: #a7b2c3;
  font-weight: 600;
  padding: 9px 0;
}
.landing-nav button:hover { color: white; }
.landing-nav .nav-login {
  border: 1px solid rgba(148,163,184,.35);
  color: white;
  border-radius: 999px;
  padding: 10px 18px;
}
.landing-nav .nav-login:hover { border-color: #60a5fa; background: rgba(37,99,235,.12); }

.hero-section {
  min-height: 840px;
  padding: 185px 20px 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 2;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 15px;
  border-radius: 999px;
  color: #9daabd;
  border: 1px solid rgba(148,163,184,.2);
  background: rgba(15,35,60,.7);
  font-size: 13px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
}
.status-pill span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 12px #34d399;
}
.hero-section h1 {
  margin: 42px 0 26px;
  font-size: clamp(50px, 7vw, 82px);
  line-height: 1.03;
  letter-spacing: -.055em;
  max-width: 1020px;
  font-weight: 900;
}
.hero-section h1 em { display: block; color: var(--landing-orange); font-style: normal; }
.hero-copy {
  margin: 0;
  max-width: 860px;
  color: #8e9bae;
  font-size: clamp(16px, 1.8vw, 20px);
  line-height: 1.85;
}
.hero-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 48px;
}
.hero-actions button {
  min-height: 54px;
  border-radius: 12px;
  border: 1px solid rgba(148,163,184,.22);
  background: rgba(7,22,40,.72);
  color: #aeb8c7;
  padding: 0 22px;
  font-weight: 700;
  transition: .2s ease;
}
.hero-actions button:hover { color: white; border-color: rgba(96,165,250,.65); transform: translateY(-2px); }
.hero-actions .hero-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  border-color: transparent;
  box-shadow: 0 15px 35px rgba(37,99,235,.3);
}
.hero-actions span { margin-left: 8px; }
.hero-metrics {
  margin-top: 72px;
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  width: min(900px, 100%);
  border-top: 1px solid rgba(148,163,184,.16);
  padding-top: 28px;
}
.hero-metrics div { display: grid; gap: 5px; border-right: 1px solid rgba(148,163,184,.14); }
.hero-metrics div:last-child { border-right: 0; }
.hero-metrics strong { font-size: 24px; color: #e5edf8; }
.hero-metrics span { color: #73839a; font-size: 12px; }

.landing-section { padding: 105px 20px; position: relative; z-index: 3; }
.light-section { background: #f5f7fb; color: #0f172a; }
.section-heading { text-align: center; max-width: 780px; margin: 0 auto 52px; }
.section-heading > span { color: #2563eb; letter-spacing: .22em; font-weight: 800; font-size: 11px; }
.section-heading h2 { margin: 15px 0 13px; font-size: clamp(30px, 4vw, 46px); letter-spacing: -.035em; }
.section-heading p { margin: 0; color: #64748b; line-height: 1.8; }
.feature-grid {
  width: min(1120px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.feature-card {
  background: white;
  border: 1px solid #e8edf5;
  border-radius: 18px;
  padding: 25px;
  min-height: 220px;
  box-shadow: 0 16px 48px rgba(15,23,42,.045);
  transition: transform .2s ease, box-shadow .2s ease;
}
.feature-card:hover { transform: translateY(-4px); box-shadow: 0 22px 55px rgba(15,23,42,.08); }
.feature-card-wide { grid-column: span 2; display: grid; grid-template-columns: auto 1fr; align-content: start; column-gap: 17px; }
.feature-card-wide ul { grid-column: 1 / -1; margin: 25px 0 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.feature-card-wide li { background: #f6f8fc; border-radius: 10px; padding: 12px; font-size: 13px; color: #475569; }
.feature-icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; font-weight: 900; margin-bottom: 18px; }
.feature-card-wide .feature-icon { margin-bottom: 0; }
.feature-icon.blue { background: #e8f0ff; color: #2563eb; }
.feature-icon.orange { background: #fff1e8; color: #ea580c; }
.feature-icon.green { background: #e8fbf3; color: #059669; }
.feature-icon.violet { background: #f2eaff; color: #7c3aed; }
.feature-icon.cyan { background: #e5f9fb; color: #0891b2; }
.feature-label { color: #16a34a; font-size: 11px; font-weight: 800; }
.feature-card h3 { margin: 8px 0 11px; font-size: 21px; }
.feature-card p { margin: 0; color: #667085; line-height: 1.75; font-size: 14px; }

.subject-section { background: #07172b; }
.dark-heading h2 { color: white; }
.dark-heading p { color: #8290a3; }
.subject-grid {
  width: min(1080px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
.subject-grid article {
  min-height: 240px;
  padding: 30px;
  border: 1px solid rgba(148,163,184,.18);
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(20,42,71,.75), rgba(8,25,46,.7));
  position: relative;
  overflow: hidden;
}
.subject-grid article::after {
  content: '';
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  right: -60px;
  bottom: -65px;
  background: rgba(37,99,235,.12);
}
.subject-grid span { color: var(--landing-orange); font-weight: 900; font-size: 13px; }
.subject-grid h3 { margin: 42px 0 14px; font-size: 27px; }
.subject-grid p { margin: 0; color: #93a1b5; line-height: 1.75; }

.workflow-section { padding-bottom: 120px; }
.workflow-line {
  width: min(1050px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  position: relative;
}
.workflow-line::before { content: ''; position: absolute; top: 24px; left: 12%; right: 12%; height: 1px; background: #bfdbfe; }
.workflow-line article { text-align: center; padding: 0 22px; position: relative; }
.workflow-line b { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 22px; color: #2563eb; background: white; border: 1px solid #60a5fa; position: relative; z-index: 1; }
.workflow-line h3 { margin: 0 0 10px; }
.workflow-line p { margin: 0; color: #64748b; line-height: 1.7; font-size: 13px; }
.bottom-login { display: block; margin: 52px auto 0; border: 0; border-radius: 12px; padding: 16px 24px; color: white; background: #2563eb; font-weight: 800; box-shadow: 0 14px 30px rgba(37,99,235,.22); }

.landing-footer {
  min-height: 110px;
  padding: 30px max(24px, calc((100% - 1120px) / 2));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  color: #7f8da0;
  background: #04101f;
  border-top: 1px solid rgba(148,163,184,.12);
}
.landing-brand.compact { cursor: default; }
.landing-brand.compact .landing-logo { width: 34px; height: 34px; font-size: 16px; }
.landing-footer p { margin: 0; font-size: 13px; }

.login-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(2, 9, 19, .78);
  backdrop-filter: blur(12px);
}
.login-modal {
  width: min(460px, 100%);
  border: 1px solid rgba(148,163,184,.24);
  border-radius: 24px;
  background: linear-gradient(155deg, rgba(15,35,61,.98), rgba(5,18,34,.99));
  color: white;
  padding: 32px;
  position: relative;
  box-shadow: 0 35px 90px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05);
}
.modal-close {
  position: absolute;
  right: 18px;
  top: 17px;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid rgba(148,163,184,.2);
  background: rgba(255,255,255,.055);
  color: #cbd5e1;
  font-size: 25px;
  line-height: 1;
}
.modal-close:hover { color: white; background: rgba(255,255,255,.1); }
.modal-brand { display: flex; gap: 14px; align-items: center; padding-right: 45px; }
.modal-brand span:not(.landing-logo) { color: #8fa0b5; font-size: 12px; }
.modal-brand h2 { margin: 4px 0 0; font-size: 25px; }
.modal-copy { margin: 23px 0 25px; color: #8d9baf; line-height: 1.7; font-size: 14px; }
.login-form { display: grid; gap: 17px; }
.login-form label { display: grid; gap: 8px; color: #cbd5e1; font-size: 13px; }
.login-form input {
  width: 100%;
  border: 1px solid rgba(148,163,184,.23);
  border-radius: 12px;
  padding: 13px 14px;
  outline: 0;
  background: rgba(3,13,27,.7);
  color: white;
}
.login-form input::placeholder { color: #59687d; }
.login-form input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(37,99,235,.14); }
.password-field { position: relative; }
.password-field input { padding-right: 62px; }
.password-field button { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); border: 0; background: transparent; color: #7ea5da; font-size: 12px; padding: 6px; }
.login-error { margin: 0; color: #fecaca; background: rgba(127,29,29,.35); border: 1px solid rgba(248,113,113,.25); border-radius: 11px; padding: 10px 12px; font-size: 13px; }
.modal-submit { border: 0; border-radius: 12px; min-height: 49px; color: white; background: linear-gradient(135deg, #2563eb, #1d4ed8); font-weight: 800; box-shadow: 0 13px 30px rgba(37,99,235,.25); }
.modal-submit span { margin-left: 7px; }
.modal-submit:disabled { opacity: .65; }
.modal-tip { margin: 19px 0 0; color: #617188; font-size: 11px; text-align: center; }
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity .2s ease; }
.modal-fade-enter-active .login-modal,
.modal-fade-leave-active .login-modal { transition: transform .2s ease, opacity .2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .login-modal,
.modal-fade-leave-to .login-modal { transform: translateY(12px) scale(.98); opacity: 0; }


/* Full-screen landing presentation and scroll reveal motion. */
.landing-page {
  width: 100%;
  max-width: none;
  isolation: isolate;
  scroll-behavior: smooth;
}
.landing-header {
  position: fixed;
  inset: 0 0 auto 0;
  width: 100%;
  margin: 0;
  padding-inline: max(24px, calc((100vw - 1180px) / 2));
  background: linear-gradient(180deg, rgba(4, 16, 31, .92), rgba(4, 16, 31, .62) 72%, transparent);
  backdrop-filter: blur(9px);
  animation: landingHeaderIn .75s cubic-bezier(.2,.75,.2,1) both;
}
.hero-section {
  min-height: 100svh;
  width: 100%;
  padding-top: clamp(150px, 19vh, 205px);
  padding-bottom: clamp(82px, 10vh, 120px);
}
.light-section,
.subject-section,
.landing-footer {
  width: 100%;
}
.hero-glow {
  animation: heroGlowBreath 7s ease-in-out infinite alternate;
}
.star-layer-one { animation: starDrift 22s linear infinite alternate; }
.star-layer-two { animation: starDriftReverse 30s linear infinite alternate; }
.status-pill { animation: heroRise .72s .15s cubic-bezier(.2,.75,.2,1) both; }
.hero-section h1 { animation: heroRise .9s .27s cubic-bezier(.16,.8,.22,1) both; }
.hero-copy { animation: heroRise .9s .4s cubic-bezier(.16,.8,.22,1) both; }
.hero-actions { animation: heroRise .9s .54s cubic-bezier(.16,.8,.22,1) both; }
.hero-metrics { animation: heroRise .9s .68s cubic-bezier(.16,.8,.22,1) both; }

[data-reveal] {
  opacity: 0;
  transform: translate3d(0, 46px, 0);
  transition:
    opacity .9s cubic-bezier(.16,.8,.22,1),
    transform .9s cubic-bezier(.16,.8,.22,1);
  will-change: opacity, transform;
}
[data-reveal].is-visible { will-change: auto; }
[data-reveal].is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

/* Cards reveal one after another instead of appearing as a static block. */
.feature-grid[data-reveal],
.subject-grid[data-reveal],
.workflow-line[data-reveal] {
  opacity: 1;
  transform: none;
}
.feature-grid[data-reveal] .feature-card,
.subject-grid[data-reveal] article,
.workflow-line[data-reveal] article {
  opacity: 0;
  transform: translate3d(0, 38px, 0) scale(.985);
}
.feature-grid.is-visible .feature-card,
.subject-grid.is-visible article,
.workflow-line.is-visible article {
  animation: revealCard .82s cubic-bezier(.16,.8,.22,1) both;
}
.feature-grid.is-visible .feature-card:nth-child(2),
.subject-grid.is-visible article:nth-child(2),
.workflow-line.is-visible article:nth-child(2) { animation-delay: .11s; }
.feature-grid.is-visible .feature-card:nth-child(3),
.subject-grid.is-visible article:nth-child(3),
.workflow-line.is-visible article:nth-child(3) { animation-delay: .22s; }
.feature-grid.is-visible .feature-card:nth-child(4),
.workflow-line.is-visible article:nth-child(4) { animation-delay: .33s; }
.feature-grid.is-visible .feature-card:nth-child(5) { animation-delay: .44s; }

.hero-actions button,
.landing-nav button,
.bottom-login {
  position: relative;
  overflow: hidden;
}
.hero-actions button::after,
.landing-nav .nav-login::after,
.bottom-login::after {
  content: '';
  position: absolute;
  inset: -2px auto -2px -45%;
  width: 34%;
  transform: skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent);
  transition: left .65s ease;
}
.hero-actions button:hover::after,
.landing-nav .nav-login:hover::after,
.bottom-login:hover::after { left: 118%; }
.hero-primary span,
.bottom-login {
  transition: transform .22s ease, box-shadow .22s ease;
}
.hero-primary:hover span { display: inline-block; transform: translateX(4px); }
.bottom-login:hover { transform: translateY(-3px); box-shadow: 0 18px 38px rgba(37,99,235,.3); }

@keyframes landingHeaderIn {
  from { opacity: 0; transform: translateY(-18px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes heroRise {
  from { opacity: 0; transform: translate3d(0, 34px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes revealCard {
  from { opacity: 0; transform: translate3d(0, 38px, 0) scale(.985); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes heroGlowBreath {
  from { opacity: .72; transform: scale(1); }
  to { opacity: 1; transform: scale(1.045); }
}
@keyframes starDrift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(18px, 12px, 0); }
}
@keyframes starDriftReverse {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-20px, 16px, 0); }
}

@media (max-width: 900px) {
  .landing-header { height: 68px; }
  .landing-nav button:not(.nav-login) { display: none; }
  .hero-section { min-height: 760px; padding-top: 140px; }
  .hero-actions { max-width: 600px; }
  .hero-actions button { flex: 1 1 240px; }
  .hero-metrics { grid-template-columns: repeat(2, 1fr); gap: 18px 0; }
  .hero-metrics div:nth-child(2) { border-right: 0; }
  .feature-grid { grid-template-columns: repeat(2, 1fr); }
  .feature-card-wide { grid-column: 1 / -1; }
  .subject-grid { grid-template-columns: 1fr; }
  .workflow-line { grid-template-columns: repeat(2, 1fr); row-gap: 42px; }
  .workflow-line::before { display: none; }
}

@media (max-width: 600px) {
  .landing-header { width: 100%; padding-inline: 14px; }
  .landing-brand-text small { display: none; }
  .landing-brand-text strong { font-size: 16px; }
  .landing-nav { gap: 0; }
  .landing-nav .nav-login { padding: 9px 14px; }
  .hero-section { min-height: 700px; padding: 120px 16px 72px; }
  .hero-section h1 { font-size: clamp(42px, 14vw, 60px); margin-top: 34px; }
  .hero-copy br { display: none; }
  .hero-copy { font-size: 15px; }
  .hero-actions { width: 100%; margin-top: 36px; }
  .hero-actions button { width: 100%; flex-basis: 100%; }
  .hero-metrics { margin-top: 48px; }
  .hero-metrics div { padding: 0 8px; }
  .landing-section { padding: 78px 16px; }
  .feature-grid { grid-template-columns: 1fr; }
  .feature-card-wide { display: block; }
  .feature-card-wide .feature-icon { margin-bottom: 18px; }
  .feature-card-wide ul { grid-template-columns: 1fr; }
  .workflow-line { grid-template-columns: 1fr; }
  .landing-footer { flex-direction: column; align-items: flex-start; }
  .login-modal { padding: 27px 20px 24px; border-radius: 20px; }
}


@media (max-width: 900px), (hover: none) and (pointer: coarse) {
  .landing-header {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: rgba(4, 16, 31, .96);
  }
  /* Keep scroll-reveal motion on tablets, but stop only the expensive endless background motion. */
  .star-layer-one,
  .star-layer-two,
  .hero-glow { animation: none !important; }
  [data-reveal] {
    transition-duration: .78s;
    transform: translate3d(0, 30px, 0);
  }
  .feature-grid.is-visible .feature-card,
  .subject-grid.is-visible article,
  .workflow-line.is-visible article {
    animation-duration: .72s;
  }
}

@media (prefers-reduced-motion: reduce) {
  * { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
  [data-reveal],
  .feature-grid[data-reveal] .feature-card,
  .subject-grid[data-reveal] article,
  .workflow-line[data-reveal] article { opacity: 1 !important; transform: none !important; }
}
</style>
