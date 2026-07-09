import { createRouter, createWebHashHistory } from 'vue-router';
import Dashboard from './views/Dashboard.vue';
import Login from './views/Login.vue';
import Knowledge from './views/Knowledge.vue';
import KnowledgeDetail from './views/KnowledgeDetail.vue';
import Mistakes from './views/Mistakes.vue';
import StudyLogs from './views/StudyLogs.vue';
import Reviews from './views/Reviews.vue';
import { isLoggedIn } from './api';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Dashboard, meta: { auth: true } },
    { path: '/login', component: Login },
    { path: '/knowledge', component: Knowledge, meta: { auth: true } },
    { path: '/knowledge/:id', component: KnowledgeDetail, meta: { auth: true } },
    { path: '/mistakes', component: Mistakes, meta: { auth: true } },
    { path: '/study-logs', component: StudyLogs, meta: { auth: true } },
    { path: '/reviews', component: Reviews, meta: { auth: true } }
  ]
});

router.beforeEach((to) => {
  if (to.meta.auth && !isLoggedIn()) return '/login';
  if (to.path === '/login' && isLoggedIn()) return '/';
});

export default router;
