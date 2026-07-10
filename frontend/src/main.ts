import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styles.css';
import { applyTheme } from './theme';

applyTheme();

createApp(App).use(router).mount('#app');
