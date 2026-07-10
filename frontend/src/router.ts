import { createRouter, createWebHashHistory } from 'vue-router';
import Dashboard from './views/Dashboard.vue';
import Login from './views/Login.vue';
import Knowledge from './views/Knowledge.vue';
import KnowledgeSubject from './views/KnowledgeSubject.vue';
import KnowledgeDetail from './views/KnowledgeDetail.vue';
import Mistakes from './views/Mistakes.vue';
import MistakesSubject from './views/MistakesSubject.vue';
import MistakeDetail from './views/MistakeDetail.vue';
import MistakePrint from './views/MistakePrint.vue';
import StudyLogs from './views/StudyLogs.vue';
import Reviews from './views/Reviews.vue';
import Search from './views/Search.vue';
import Progress from './views/Progress.vue';
import TodoCalendar from './views/TodoCalendar.vue';
import { isLoggedIn } from './api';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Dashboard, meta: { auth: true } },
    { path: '/login', component: Login },
    { path: '/knowledge', component: Knowledge, meta: { auth: true } },
    { path: '/knowledge/subject/:subject', component: KnowledgeSubject, meta: { auth: true } },
    { path: '/knowledge/subject/:subject/chapter/:chapter', component: KnowledgeSubject, meta: { auth: true } },
    { path: '/knowledge/:id', component: KnowledgeDetail, meta: { auth: true } },
    { path: '/mistakes', component: Mistakes, meta: { auth: true } },
    { path: '/mistakes/subject/:subject', component: MistakesSubject, meta: { auth: true } },
    { path: '/mistakes/subject/:subject/chapter/:chapter', component: MistakesSubject, meta: { auth: true } },
    { path: '/mistakes/print', component: MistakePrint, meta: { auth: true } },
    { path: '/mistakes/:id', component: MistakeDetail, meta: { auth: true } },
    { path: '/study-logs', component: StudyLogs, meta: { auth: true } },
    { path: '/reviews', component: Reviews, meta: { auth: true } },
    { path: '/search', component: Search, meta: { auth: true } },
    { path: '/progress', component: Progress, meta: { auth: true } },
    { path: '/todos', component: TodoCalendar, meta: { auth: true } }
  ]
});

router.beforeEach((to) => {
  if (to.meta.auth && !isLoggedIn()) return '/login';
  if (to.path === '/login' && isLoggedIn()) return '/';
});

export default router;
