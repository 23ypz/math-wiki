import type { ExamScore, KnowledgePoint, Mistake, ReviewRecord, StudyGoal, StudyLog, TodoItem, UserProfile } from './types';

const isoDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const guestKnowledge: KnowledgePoint[] = [
  {
    id: 91001,
    subject: '高等数学',
    chapter: '函数、极限与连续',
    title: '等价无穷小的使用条件',
    mastery_level: 3,
    content_md: `# 等价无穷小的使用条件

## 核心结论

当 $x\\to 0$ 时，若

$$
\\lim_{x\\to 0}\\frac{f(x)}{g(x)}=1,
$$

则记作 $f(x)\\sim g(x)$。

## 常用等价关系

| 原式 | 等价形式 |
|---|---|
| $\\sin x$ | $x$ |
| $1-\\cos x$ | $\\frac{x^2}{2}$ |
| $\\ln(1+x)$ | $x$ |
| $e^x-1$ | $x$ |

> 等价无穷小通常适用于乘除结构；出现加减抵消时，应优先考虑泰勒展开。

## 典型误区

不能把 $\\sin x-x$ 中的 $\\sin x$ 直接替换为 $x$，否则会丢失高阶信息。`,
    created_at: `${isoDate(-18)} 09:20:00`,
    updated_at: `${isoDate(-3)} 20:10:00`
  },
  {
    id: 91002,
    subject: '高等数学',
    chapter: '一元函数微分学',
    title: '拉格朗日中值定理',
    mastery_level: 4,
    content_md: `# 拉格朗日中值定理

若函数 $f(x)$ 在闭区间 $[a,b]$ 上连续，在开区间 $(a,b)$ 内可导，则至少存在一点 $\\xi\\in(a,b)$，使得

$$
f'(\\xi)=\\frac{f(b)-f(a)}{b-a}.
$$

## 常见用途

1. 证明函数差值不等式；
2. 估计函数增量；
3. 证明方程根的唯一性；
4. 将函数值关系转化为导数关系。`,
    created_at: `${isoDate(-15)} 13:30:00`,
    updated_at: `${isoDate(-5)} 18:45:00`
  },
  {
    id: 91003,
    subject: '高等数学',
    chapter: '一元函数积分学',
    title: '分部积分法的选择原则',
    mastery_level: 2,
    content_md: `# 分部积分法的选择原则

分部积分公式：

$$
\\int u\\,dv=uv-\\int v\\,du.
$$

## 选择 $u$ 的经验顺序

反三角函数 → 对数函数 → 幂函数 → 三角函数 → 指数函数。

## 易错点

- 定积分分部积分时不要遗漏边界项；
- 连续分部积分后要及时整理同类项；
- 含参数积分应检查参数取值范围。`,
    created_at: `${isoDate(-11)} 16:00:00`,
    updated_at: `${isoDate(-2)} 21:30:00`
  },
  {
    id: 92001,
    subject: '线性代数',
    chapter: '矩阵与行列式',
    title: '矩阵秩与初等变换',
    mastery_level: 3,
    content_md: `# 矩阵秩与初等变换

矩阵经过初等行变换后秩不变。阶梯形矩阵中非零行的数量就是矩阵的秩。

## 判断思路

- 直接化为阶梯形；
- 用非零子式判断秩的下界；
- 结合参数取值讨论秩的变化。`,
    created_at: `${isoDate(-9)} 10:10:00`,
    updated_at: `${isoDate(-1)} 19:00:00`
  },
  {
    id: 92002,
    subject: '线性代数',
    chapter: '特征值与二次型',
    title: '实对称矩阵的正交对角化',
    mastery_level: 2,
    content_md: `# 实对称矩阵的正交对角化

实对称矩阵一定可以被正交对角化：存在正交矩阵 $Q$，使得

$$
Q^TAQ=\\Lambda.
$$

不同特征值对应的特征向量相互正交；同一特征值对应的特征子空间需要施密特正交化。`,
    created_at: `${isoDate(-8)} 14:20:00`,
    updated_at: `${isoDate(-1)} 20:25:00`
  },
  {
    id: 93001,
    subject: '概率论与数理统计',
    chapter: '随机变量及其分布',
    title: '分布函数的基本性质',
    mastery_level: 3,
    content_md: `# 分布函数的基本性质

随机变量 $X$ 的分布函数定义为

$$
F(x)=P\\{X\\le x\\}.
$$

## 性质

- 单调不减；
- 右连续；
- $F(-\\infty)=0$；
- $F(+\\infty)=1$。

区间概率可由

$$
P(a<X\\le b)=F(b)-F(a)
$$

计算。`,
    created_at: `${isoDate(-7)} 11:00:00`,
    updated_at: `${isoDate()} 08:15:00`
  }
];

export const guestMistakes: Mistake[] = [
  {
    id: 81001,
    title: '等价无穷小在加减结构中的误用',
    subject: '高等数学',
    chapter: '函数、极限与连续',
    knowledge_point_id: 91001,
    knowledge_title: '等价无穷小的使用条件',
    source: '示例题 · 极限专题',
    question_text: `计算极限

$$
\\lim_{x\\to0}\\frac{\\sin x-x}{x^3}.
$$`,
    answer_text: `利用泰勒展开

$$
\\sin x=x-\\frac{x^3}{6}+o(x^3),
$$

所以原极限为 $-\\frac16$。`,
    wrong_reason: '把 $\\sin x$ 直接用 $x$ 替换，导致分子错误地化为 0。',
    summary: '加减抵消结构不能直接使用等价无穷小，应使用泰勒展开或洛必达法则。',
    difficulty: 3,
    status: '待复习',
    next_review_date: isoDate(),
    review_count: 2,
    tags: ['概念不清', '方法误用'],
    created_at: `${isoDate(-12)} 19:30:00`,
    updated_at: `${isoDate(-2)} 20:00:00`
  },
  {
    id: 81002,
    title: '分部积分遗漏定积分边界项',
    subject: '高等数学',
    chapter: '一元函数积分学',
    knowledge_point_id: 91003,
    knowledge_title: '分部积分法的选择原则',
    source: '示例题 · 积分专题',
    question_text: `计算

$$
\\int_0^1 x e^x\\,dx.
$$`,
    answer_text: `令 $u=x,\\,dv=e^x dx$，则

$$
\\int_0^1xe^x dx=\\left.xe^x\\right|_0^1-\\int_0^1e^x dx=1.
$$`,
    wrong_reason: '只计算了不定积分形式，代入上下限时漏掉了 $uv$ 的边界项。',
    summary: '定积分分部积分要先保留完整边界项，再代入上下限。',
    difficulty: 2,
    status: '学习中',
    next_review_date: isoDate(2),
    review_count: 1,
    tags: ['步骤遗漏', '计算失误'],
    created_at: `${isoDate(-8)} 15:00:00`,
    updated_at: `${isoDate(-1)} 17:40:00`
  },
  {
    id: 82001,
    title: '含参数矩阵秩讨论不完整',
    subject: '线性代数',
    chapter: '矩阵与行列式',
    knowledge_point_id: 92001,
    knowledge_title: '矩阵秩与初等变换',
    source: '示例题 · 矩阵秩',
    question_text: `讨论参数 $a$ 取不同值时矩阵

$$
A=\\begin{pmatrix}1&1&1\\\\1&a&1\\\\1&1&a\\end{pmatrix}
$$

的秩。`,
    answer_text: `先计算行列式并找出使其为零的参数，再分别代回矩阵化阶梯形，判断秩为 2 还是更低。`,
    wrong_reason: '只根据行列式为零判断秩小于 3，没有继续判断是否为 2。',
    summary: '参数矩阵秩问题必须分层判断：先判满秩，再检查更低阶非零子式。',
    difficulty: 4,
    status: '待复习',
    next_review_date: isoDate(-1),
    review_count: 3,
    tags: ['分类讨论遗漏'],
    created_at: `${isoDate(-10)} 18:20:00`,
    updated_at: `${isoDate(-3)} 22:00:00`
  },
  {
    id: 83001,
    title: '连续型随机变量区间概率端点混淆',
    subject: '概率论与数理统计',
    chapter: '随机变量及其分布',
    knowledge_point_id: 93001,
    knowledge_title: '分布函数的基本性质',
    source: '示例题 · 分布函数',
    question_text: '已知分布函数 $F(x)$，求 $P(a<X\\le b)$。',
    answer_text: '$P(a<X\\le b)=F(b)-F(a)$。对于连续型随机变量，单点概率为 0。',
    wrong_reason: '把左端点写成 $F(a^-)$，没有先判断随机变量类型。',
    summary: '区间概率公式要结合端点开闭和分布函数跳跃情况使用。',
    difficulty: 3,
    status: '已掌握',
    next_review_date: null,
    review_count: 4,
    tags: ['条件看漏'],
    created_at: `${isoDate(-6)} 09:45:00`,
    updated_at: `${isoDate()} 08:30:00`
  }
];

export const guestStudyLogs: StudyLog[] = [
  { id: 71001, study_date: isoDate(-2), subject: '高等数学', content: '复习极限与连续，完成 20 道极限题。', duration_minutes: 150, new_mistakes_count: 2, reviewed_mistakes_count: 4, summary: '加减抵消型极限仍需加强泰勒展开。' },
  { id: 71002, study_date: isoDate(-1), subject: '线性代数', content: '整理矩阵秩与线性方程组知识框架。', duration_minutes: 110, new_mistakes_count: 1, reviewed_mistakes_count: 3, summary: '含参数秩问题要完整分类讨论。' },
  { id: 71003, study_date: isoDate(), subject: '概率论与数理统计', content: '学习分布函数与常见离散分布。', duration_minutes: 90, new_mistakes_count: 1, reviewed_mistakes_count: 2, summary: '区间概率端点处理需要结合跳跃点。' }
];

export const guestExamScores: ExamScore[] = [
  { id: 61001, exam_name: '数学一阶段测试 A', exam_type: '阶段测试', exam_date: isoDate(-35), total_score: 92, calculus_score: 58, linear_algebra_score: 18, probability_score: 16, duration_minutes: 170, mistake_count: 12, note: '基础题稳定，积分与概率综合题失分较多。' },
  { id: 61002, exam_name: '数学一阶段测试 B', exam_type: '阶段测试', exam_date: isoDate(-20), total_score: 104, calculus_score: 65, linear_algebra_score: 21, probability_score: 18, duration_minutes: 168, mistake_count: 9, note: '线代稳定性提升，计算速度仍需加强。' },
  { id: 61003, exam_name: '数学一模拟卷 01', exam_type: '模拟卷', exam_date: isoDate(-5), total_score: 116, calculus_score: 72, linear_algebra_score: 23, probability_score: 21, duration_minutes: 165, mistake_count: 7, note: '总体进步，下一阶段重点压缩基础题用时。' }
];

export const guestGoals: StudyGoal[] = [
  { id: 51001, title: '完成高等数学基础章节二轮复习', goal_type: '章节复习', start_date: isoDate(-10), deadline: isoDate(18), current_value: 7, target_value: 12, status: '进行中', note: '每天至少整理 1 个知识点并复习关联错题。' },
  { id: 51002, title: '本月完成 80 道错题复习', goal_type: '错题复习', start_date: isoDate(-12), deadline: isoDate(15), current_value: 46, target_value: 80, status: '进行中', note: '优先处理逾期与重复错误题。' }
];

export const guestTodos: TodoItem[] = [
  { id: 41001, title: '复习极限错题 5 道', todo_date: isoDate(), start_time: '09:00:00', task_type: '错题复习', subject: '高等数学', chapter: '函数、极限与连续', priority: '重要', status: '已完成', note: '重点复盘等价无穷小误用。', completed_at: `${isoDate()} 10:10:00` },
  { id: 41002, title: '整理矩阵秩知识框架', todo_date: isoDate(), start_time: '14:00:00', task_type: '知识点学习', subject: '线性代数', chapter: '矩阵与行列式', priority: '普通', status: '进行中', note: '补充含参数讨论示例。', completed_at: null },
  { id: 41003, title: '完成概率论选择题 15 道', todo_date: isoDate(), start_time: '19:30:00', task_type: '刷题', subject: '概率论与数理统计', chapter: '随机变量及其分布', priority: '普通', status: '待完成', note: '记录所有端点判断错误。', completed_at: null },
  { id: 41004, title: '模拟卷复盘', todo_date: isoDate(1), start_time: '20:00:00', task_type: '学习总结', subject: '数学一', chapter: '综合', priority: '重要', status: '待完成', note: '按照知识点、计算和时间分配三类总结。', completed_at: null }
];

export const guestProfile: UserProfile = {
  id: 1,
  nickname: '数学一示例空间',
  avatar_style: 'violet',
  signature: '这是游客演示数据，与管理员的私人学习记录完全隔离。',
  target_school: '示例目标院校',
  target_major: '计算机相关专业',
  exam_year: new Date().getFullYear() + 1,
  preparation_start_date: isoDate(-60),
  exam_date: `${new Date().getFullYear()}-12-20`,
  daily_target_minutes: 240,
  math_target_score: 125
};

export const guestReviews: ReviewRecord[] = [
  { id: 31001, mistake_id: 81001, review_date: isoDate(-5), result: '还是不会', note: '没有意识到加减抵消需要保留高阶项。', next_review_date: isoDate(-2), created_at: `${isoDate(-5)} 20:00:00` },
  { id: 31002, mistake_id: 81001, review_date: isoDate(-2), result: '还有点卡', note: '已经会用泰勒展开，但展开阶数判断较慢。', next_review_date: isoDate(), created_at: `${isoDate(-2)} 20:20:00` },
  { id: 31003, mistake_id: 82001, review_date: isoDate(-3), result: '还有点卡', note: '能够先判满秩，但低秩情况还需检查子式。', next_review_date: isoDate(-1), created_at: `${isoDate(-3)} 21:00:00` },
  { id: 31004, mistake_id: 83001, review_date: isoDate(), result: '完全会了', note: '可以根据离散或连续类型正确处理端点。', next_review_date: null, created_at: `${isoDate()} 08:35:00` }
];

function contains(value: unknown, keyword: string) {
  return String(value ?? '').toLowerCase().includes(keyword.toLowerCase());
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function filterKnowledge(url: URL) {
  let items = [...guestKnowledge];
  const subject = url.searchParams.get('subject');
  const chapter = url.searchParams.get('chapter');
  const q = url.searchParams.get('q')?.trim();
  if (subject) items = items.filter((x) => x.subject === subject);
  if (chapter) items = items.filter((x) => x.chapter === chapter);
  if (q) items = items.filter((x) => [x.title, x.subject, x.chapter, x.content_md].some((v) => contains(v, q)));
  return items;
}

function filterMistakes(url: URL) {
  let items = [...guestMistakes];
  const subject = url.searchParams.get('subject');
  const chapter = url.searchParams.get('chapter');
  const status = url.searchParams.get('status');
  const difficulty = url.searchParams.get('difficulty');
  const tag = url.searchParams.get('tag');
  const knowledgeId = url.searchParams.get('knowledge_point_id');
  const q = url.searchParams.get('q')?.trim();
  if (subject) items = items.filter((x) => x.subject === subject);
  if (chapter) items = items.filter((x) => x.chapter === chapter);
  if (status) items = items.filter((x) => x.status === status);
  if (difficulty) items = items.filter((x) => x.difficulty === Number(difficulty));
  if (tag) items = items.filter((x) => x.tags?.includes(tag));
  if (knowledgeId) items = items.filter((x) => x.knowledge_point_id === Number(knowledgeId));
  if (url.searchParams.get('overdue') === '1') items = items.filter((x) => x.next_review_date && x.next_review_date < isoDate() && x.status !== '已掌握');
  if (q) items = items.filter((x) => [x.title, x.subject, x.chapter, x.source, x.question_text, x.answer_text, x.wrong_reason, x.summary, ...(x.tags || [])].some((v) => contains(v, q)));
  const sort = url.searchParams.get('sort');
  if (sort === 'created_asc') items.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  else if (sort === 'difficulty_desc') items.sort((a, b) => b.difficulty - a.difficulty);
  else if (sort === 'review_count_desc') items.sort((a, b) => b.review_count - a.review_count);
  else if (sort === 'next_review') items.sort((a, b) => String(a.next_review_date || '9999').localeCompare(String(b.next_review_date || '9999')));
  else items.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return items;
}

function guestOverview() {
  const weakChapters = [
    { subject: '高等数学', chapter: '一元函数积分学', count: 3 },
    { subject: '线性代数', chapter: '矩阵与行列式', count: 2 },
    { subject: '概率论与数理统计', chapter: '随机变量及其分布', count: 1 }
  ];
  const activity = Array.from({ length: 18 }, (_, index) => ({
    activity_date: isoDate(index - 17),
    study_minutes: [0, 45, 80, 120, 60, 0, 150][index % 7],
    new_mistakes: index % 4 === 0 ? 2 : index % 3 === 0 ? 1 : 0,
    reviewed: index % 2 === 0 ? 3 : 1,
    new_knowledge: index % 5 === 0 ? 1 : 0
  }));
  return {
    mistakeCount: guestMistakes.length,
    knowledgeCount: guestKnowledge.length,
    dueCount: guestMistakes.filter((x) => x.next_review_date && x.next_review_date <= isoDate() && x.status !== '已掌握').length,
    overdueCount: guestMistakes.filter((x) => x.next_review_date && x.next_review_date < isoDate() && x.status !== '已掌握').length,
    weekStudyMinutes: 350,
    lastWeekStudyMinutes: 285,
    reviewedWeekCount: 9,
    newMistakesWeek: 4,
    newKnowledgeWeek: 3,
    activeGoalCount: guestGoals.filter((x) => x.status === '进行中').length,
    latestExam: guestExamScores[guestExamScores.length - 1],
    topTagRaw: '概念不清',
    statusStats: [
      { status: '待复习', count: 2 },
      { status: '学习中', count: 1 },
      { status: '已掌握', count: 1 }
    ],
    weakChapters,
    weakKnowledge: [
      { id: 91003, title: '分部积分法的选择原则', subject: '高等数学', chapter: '一元函数积分学', mistake_count: 3, mastery_level: 2 },
      { id: 92002, title: '实对称矩阵的正交对角化', subject: '线性代数', chapter: '特征值与二次型', mistake_count: 2, mastery_level: 2 }
    ],
    recentStudy: guestStudyLogs.map((x) => ({ study_date: x.study_date, minutes: x.duration_minutes })).reverse(),
    activity
  };
}

export function getGuestResponse(path: string): unknown {
  const url = new URL(path, 'https://guest.math-wiki.local');
  const pathname = url.pathname;

  if (pathname === '/knowledge') return clone({ items: filterKnowledge(url) });
  const knowledgeMatch = pathname.match(/^\/knowledge\/(\d+)$/);
  if (knowledgeMatch) return clone({ item: guestKnowledge.find((x) => x.id === Number(knowledgeMatch[1])) || null });

  if (pathname === '/mistakes') return clone({ items: filterMistakes(url) });
  const mistakeMatch = pathname.match(/^\/mistakes\/(\d+)$/);
  if (mistakeMatch) return clone({ item: guestMistakes.find((x) => x.id === Number(mistakeMatch[1])) || null });

  if (pathname === '/study-logs') return clone({ items: guestStudyLogs });
  const logMatch = pathname.match(/^\/study-logs\/(\d+)$/);
  if (logMatch) return clone({ item: guestStudyLogs.find((x) => x.id === Number(logMatch[1])) || null });

  if (pathname === '/review-records') {
    if (url.searchParams.get('mode') === 'today') {
      return clone({ items: guestMistakes.filter((x) => x.next_review_date && x.next_review_date <= isoDate() && x.status !== '已掌握') });
    }
    const mistakeId = Number(url.searchParams.get('mistake_id'));
    return clone({ items: Number.isFinite(mistakeId) ? guestReviews.filter((x) => x.mistake_id === mistakeId) : guestReviews });
  }

  if (pathname === '/stats/overview') return clone(guestOverview());

  if (pathname === '/progress') {
    const resource = url.searchParams.get('resource');
    if (resource === 'profile') return clone({ item: guestProfile });
    if (resource === 'exams') return clone({ items: guestExamScores });
    if (resource === 'goals') return clone({ items: guestGoals });
    if (resource === 'todos') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      let items = [...guestTodos];
      if (from) items = items.filter((x) => x.todo_date >= from);
      if (to) items = items.filter((x) => x.todo_date <= to);
      return clone({ items });
    }
  }

  throw new Error('游客演示数据暂不支持此页面。');
}
