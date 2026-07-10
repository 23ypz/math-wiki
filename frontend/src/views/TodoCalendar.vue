<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { isGuest, request } from '../api';
import type { TodoItem } from '../types';

const guest = isGuest();
const todos = ref<TodoItem[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const selectedDate = ref(todayKey());
const editingId = ref<number | null>(null);

const taskTypes = ['知识点学习', '刷题', '错题复习', '真题练习', '背诵记忆', '学习总结', '其他'];
const priorities = ['低', '普通', '重要', '紧急'];
const statuses = ['待完成', '进行中', '已完成', '已延期'];
const subjects = ['高等数学', '线性代数', '概率论与数理统计'];

const form = reactive({
  title: '',
  todo_date: selectedDate.value,
  start_time: '',
  task_type: '刷题',
  subject: '高等数学',
  chapter: '',
  priority: '普通',
  status: '待完成',
  note: ''
});

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function todayKey() { return dateKey(new Date()); }
function addDays(key: string, amount: number) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

const monthTitle = computed(() => `${currentMonth.value.getFullYear()} 年 ${currentMonth.value.getMonth() + 1} 月`);
const calendarDays = computed(() => {
  const first = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = dateKey(date);
    return {
      key,
      day: date.getDate(),
      current: date.getMonth() === currentMonth.value.getMonth(),
      today: key === todayKey(),
      selected: key === selectedDate.value,
      items: todos.value.filter((item) => String(item.todo_date).slice(0, 10) === key)
    };
  });
});
const selectedTodos = computed(() => todos.value
  .filter((item) => String(item.todo_date).slice(0, 10) === selectedDate.value)
  .sort((a, b) => {
    if (a.status === '已完成' && b.status !== '已完成') return 1;
    if (a.status !== '已完成' && b.status === '已完成') return -1;
    return String(a.start_time || '99:99').localeCompare(String(b.start_time || '99:99'));
  }));
const selectedCompleted = computed(() => selectedTodos.value.filter((item) => item.status === '已完成').length);
const monthTodoCount = computed(() => {
  const prefix = `${currentMonth.value.getFullYear()}-${String(currentMonth.value.getMonth() + 1).padStart(2, '0')}`;
  return todos.value.filter((item) => String(item.todo_date).startsWith(prefix)).length;
});
const monthCompletedCount = computed(() => {
  const prefix = `${currentMonth.value.getFullYear()}-${String(currentMonth.value.getMonth() + 1).padStart(2, '0')}`;
  return todos.value.filter((item) => String(item.todo_date).startsWith(prefix) && item.status === '已完成').length;
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const from = dateKey(new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1));
    const to = dateKey(new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 2, 0));
    const res = await request<{ items: TodoItem[] }>(`/progress?resource=todos&from=${from}&to=${to}`);
    todos.value = res.items;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Todo 加载失败';
  } finally {
    loading.value = false;
  }
}

function selectDay(key: string) {
  selectedDate.value = key;
  form.todo_date = key;
  if (editingId.value) resetForm(false);
}
function changeMonth(offset: number) {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + offset, 1);
  selectedDate.value = dateKey(new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1));
  form.todo_date = selectedDate.value;
  resetForm(false);
  load();
}
function backToday() {
  const today = new Date();
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedDate.value = todayKey();
  form.todo_date = selectedDate.value;
  resetForm(false);
  load();
}
function resetForm(keepDate = true) {
  editingId.value = null;
  Object.assign(form, {
    title: '',
    todo_date: keepDate ? selectedDate.value : form.todo_date,
    start_time: '',
    task_type: '刷题',
    subject: '高等数学',
    chapter: '',
    priority: '普通',
    status: '待完成',
    note: ''
  });
}
function editTodo(item: TodoItem) {
  editingId.value = item.id;
  selectedDate.value = String(item.todo_date).slice(0, 10);
  Object.assign(form, {
    title: item.title,
    todo_date: String(item.todo_date).slice(0, 10),
    start_time: item.start_time ? String(item.start_time).slice(0, 5) : '',
    task_type: item.task_type || '其他',
    subject: item.subject || '高等数学',
    chapter: item.chapter || '',
    priority: item.priority || '普通',
    status: item.status || '待完成',
    note: item.note || ''
  });
}
async function saveTodo(continueAdding = false) {
  if (!form.title.trim()) { error.value = '请填写任务标题。'; return; }
  saving.value = true;
  error.value = '';
  try {
    await request('/progress?resource=todos', {
      method: editingId.value ? 'PUT' : 'POST',
      body: JSON.stringify({ ...form, id: editingId.value })
    });
    await load();
    const date = form.todo_date;
    resetForm();
    form.todo_date = date;
    if (continueAdding) selectedDate.value = date;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Todo 保存失败';
  } finally {
    saving.value = false;
  }
}
async function updateTodo(item: TodoItem, patch: Partial<TodoItem>) {
  error.value = '';
  try {
    await request('/progress?resource=todos', {
      method: 'PUT',
      body: JSON.stringify({ ...item, ...patch, id: item.id, todo_date: String(patch.todo_date || item.todo_date).slice(0, 10), start_time: patch.start_time ?? item.start_time ?? '' })
    });
    await load();
  } catch (e) { error.value = e instanceof Error ? e.message : '操作失败'; }
}
async function toggleDone(item: TodoItem) {
  await updateTodo(item, { status: item.status === '已完成' ? '待完成' : '已完成' });
}
async function postpone(item: TodoItem) {
  await updateTodo(item, { todo_date: addDays(String(item.todo_date).slice(0, 10), 1), status: '已延期' });
}
async function removeTodo(id: number) {
  if (!confirm('确定删除这项 Todo 吗？')) return;
  try {
    await request(`/progress?resource=todos&id=${id}`, { method: 'DELETE' });
    if (editingId.value === id) resetForm();
    await load();
  } catch (e) { error.value = e instanceof Error ? e.message : '删除失败'; }
}
function priorityClass(priority: string) {
  return `priority-${priority}`;
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-title">
      <div><h2>Todo 日历</h2><p>按日期安排每天的数学一学习任务，并记录完成情况。</p></div>
      <div class="actions"><button class="secondary" @click="backToday">回到今天</button><button class="secondary" @click="load">刷新</button></div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="grid grid-3 todo-summary-grid">
      <div class="card stat"><span>本月任务</span><strong>{{ monthTodoCount }}</strong></div>
      <div class="card stat"><span>本月已完成</span><strong>{{ monthCompletedCount }}</strong></div>
      <div class="card stat"><span>选中日期完成率</span><strong>{{ selectedTodos.length ? Math.round(selectedCompleted / selectedTodos.length * 100) : 0 }}%</strong></div>
    </div>

    <div class="todo-layout" style="margin-top:16px">
      <div class="card todo-calendar-card">
        <div class="calendar-toolbar">
          <button class="secondary" @click="changeMonth(-1)">← 上个月</button>
          <h3>{{ monthTitle }}</h3>
          <button class="secondary" @click="changeMonth(1)">下个月 →</button>
        </div>
        <div class="calendar-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>
        <div class="todo-calendar" :class="{ loading }">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            type="button"
            class="calendar-day"
            :class="{ mutedDay: !day.current, today: day.today, selected: day.selected }"
            @click="selectDay(day.key)"
          >
            <span class="day-number">{{ day.day }}</span>
            <span v-for="item in day.items.slice(0, 3)" :key="item.id" class="calendar-task" :class="[{ done: item.status === '已完成' }, priorityClass(item.priority)]">
              {{ item.title }}
            </span>
            <small v-if="day.items.length > 3">还有 {{ day.items.length - 3 }} 项</small>
          </button>
        </div>
      </div>

      <aside class="todo-day-panel">
        <div class="card">
          <div class="card-head"><div><h3>{{ selectedDate }} 的计划</h3><p class="muted">{{ selectedCompleted }} / {{ selectedTodos.length }} 已完成</p></div></div>
          <div class="todo-list">
            <div v-for="item in selectedTodos" :key="item.id" class="todo-item" :class="{ completed: item.status === '已完成' }">
              <button class="todo-check" type="button" :disabled="guest" @click="toggleDone(item)">{{ item.status === '已完成' ? '✓' : '' }}</button>
              <div class="todo-item-body">
                <div class="todo-item-title"><strong>{{ item.title }}</strong><span class="badge" :class="priorityClass(item.priority)">{{ item.priority }}</span></div>
                <p>{{ item.start_time ? String(item.start_time).slice(0, 5) : '未设时间' }} · {{ item.task_type }}<template v-if="item.subject"> · {{ item.subject }}</template><template v-if="item.chapter"> / {{ item.chapter }}</template></p>
                <small v-if="item.note">{{ item.note }}</small>
                <div v-if="!guest" class="todo-item-actions"><button class="link-button" @click="editTodo(item)">编辑</button><button class="link-button" @click="postpone(item)">延期到明天</button><button class="danger-link" @click="removeTodo(item.id)">删除</button></div>
              </div>
            </div>
            <p v-if="!selectedTodos.length" class="muted">这一天还没有计划，使用下方表单添加。</p>
          </div>
        </div>

        <div v-if="!guest" class="card todo-form-card">
          <h3>{{ editingId ? '编辑 Todo' : '添加 Todo' }}</h3>
          <label>任务标题<input v-model="form.title" placeholder="例如：完成极限章节练习 30 题" /></label>
          <div class="form-row"><label>日期<input v-model="form.todo_date" type="date" /></label><label>开始时间（可选）<input v-model="form.start_time" type="time" /></label></div>
          <div class="form-row"><label>任务类型<select v-model="form.task_type"><option v-for="item in taskTypes" :key="item">{{ item }}</option></select></label><label>优先级<select v-model="form.priority"><option v-for="item in priorities" :key="item">{{ item }}</option></select></label></div>
          <div class="form-row"><label>科目<select v-model="form.subject"><option v-for="item in subjects" :key="item">{{ item }}</option><option>其他</option></select></label><label>章节<input v-model="form.chapter" placeholder="例如：极限与连续" /></label></div>
          <label>状态<select v-model="form.status"><option v-for="item in statuses" :key="item">{{ item }}</option></select></label>
          <label>备注<textarea v-model="form.note" placeholder="完成标准、题目范围或注意事项" /></label>
          <div class="actions"><button class="primary" :disabled="saving" @click="saveTodo(false)">{{ saving ? '保存中...' : '保存' }}</button><button v-if="!editingId" class="secondary" :disabled="saving" @click="saveTodo(true)">保存并继续添加</button><button v-if="editingId" class="secondary" @click="resetForm()">取消编辑</button></div>
        </div>
      </aside>
    </div>
  </section>
</template>
