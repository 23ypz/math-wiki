# 考研数学一在线知识点与错题系统 MVP

这是一个可运行的第一版工程，采用：

- 前端：Vite + Vue 3，部署到 GitHub Pages
- 后端：Vercel Serverless Functions
- 数据库：TiDB Cloud（MySQL 协议兼容）
- 认证：单用户登录，JWT Token

## 目录结构

```text
kaoyan-math-online-mvp/
├── frontend/                 # GitHub Pages 前端
├── backend/                  # Vercel 后端 API
└── .github/workflows/         # GitHub Pages 自动部署工作流
```

## 一、准备 TiDB Cloud 数据库

1. 在 TiDB Cloud 创建 Serverless / Dedicated 集群。
2. 获取连接字符串，整理成类似下面的 `DATABASE_URL`：

```bash
mysql://USER:PASSWORD@HOST:4000/DATABASE_NAME
```

如果 TiDB Cloud 控制台给的是分字段信息，也可以手动拼接。

## 二、部署后端到 Vercel

进入 `backend` 目录部署为 Vercel 项目，并配置环境变量：

```bash
DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/DATABASE_NAME
JWT_SECRET=请换成一个很长的随机字符串
ADMIN_EMAIL=你的登录邮箱
ADMIN_PASSWORD=你的登录密码
ALLOWED_ORIGIN=https://你的github用户名.github.io
INIT_TOKEN=初始化数据库用的一次性口令
TIDB_SSL=true
```

本地开发：

```bash
cd backend
npm install
npm run dev
```

部署后，初始化数据库表：

```bash
curl -X POST https://你的-vercel-domain.vercel.app/api/admin/init-db \
  -H "x-init-token: 你的INIT_TOKEN"
```

## 三、部署前端到 GitHub Pages

进入 `frontend` 目录本地运行：

```bash
cd frontend
npm install
cp .env.example .env.local
# 修改 .env.local 中的 VITE_API_BASE_URL
npm run dev
```

`.env.local` 示例：

```bash
VITE_API_BASE_URL=https://你的-vercel-domain.vercel.app/api
```

提交到 GitHub 后，仓库中的 `.github/workflows/deploy-frontend.yml` 会自动构建并发布 GitHub Pages。

## 四、第一版已实现功能

- 登录
- Dashboard 统计
- 知识点新增、查看、编辑、删除
- 错题新增、查看、编辑、删除
- 今日待复习错题
- 复习打卡记录
- 学习日志新增、查看、编辑、删除
- 错题按科目、状态、关键词筛选

## 五、建议后续扩展

- 图片上传和 OCR
- 错题标签多选
- 真题成绩趋势图
- Markdown/LaTeX 预览
- GitHub OAuth 登录
- 多用户注册
- AI 错因分析

 
 