# 考研数学一在线知识点与错题系统 v2

这是一个可运行的第二版工程，采用：

- 前端：Vite + Vue 3，部署到 GitHub Pages
- 后端：Vercel Serverless Functions
- 数据库：TiDB Cloud（MySQL 协议兼容）
- 认证：单用户登录，JWT Token

## 本版新增

相较第一版，本版主要增加：

1. 知识点 Markdown 实时预览。
2. 错题 Markdown 预览。
3. 错题可关联知识点。
4. 总览页增加条形统计视图。
5. 总览页支持导出 JSON 备份。
6. 总览页支持导出 Markdown 错题本。
7. 今日复习加入更明确的复习间隔建议。
8. 修复 Vercel Hobby 免费版最多 12 个 Serverless Functions 的部署限制，删除了未使用的 `auth/me` 接口。
9. 修复 Vercel runtime 配置问题。
10. 修复 `mysql2` 参数类型导致的 TypeScript 构建问题。
11. 补充 `frontend/src/vite-env.d.ts`，修复 GitHub Actions 构建时报 `import.meta.env` 类型错误的问题。

## 目录结构

```text
math-wiki-v2/
├── frontend/                 # GitHub Pages 前端
├── backend/                  # Vercel 后端 API
└── .github/workflows/         # GitHub Pages 自动部署工作流
```

## 一、已有项目如何更新

如果你已经按第一版部署成功，按下面步骤更新即可。

### 1. 备份现有仓库

建议先在 GitHub 当前仓库里确认代码都已提交。你的数据保存在 TiDB Cloud 里，不会因为更新前端/后端代码而丢失。

### 2. 用本压缩包覆盖代码

把本压缩包解压后，将里面的这些目录复制到你本地原项目根目录，选择覆盖：

```text
frontend/
backend/
.github/
README.md
.gitignore
```

也可以只覆盖发生变化的文件，但对新手建议直接覆盖上述目录。

### 3. 提交到 GitHub

在项目根目录执行：

```bash
git add .
git commit -m "upgrade math wiki v2"
git push
```

推送后会触发两个动作：

- GitHub Actions 自动重新部署前端。
- Vercel 自动重新部署后端。

### 4. 检查 Vercel 设置

Vercel 项目里继续保持：

```text
Root Directory = backend
```

环境变量保持原来的即可：

```bash
DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/DATABASE_NAME
JWT_SECRET=请换成一个很长的随机字符串
ADMIN_EMAIL=你的登录邮箱
ADMIN_PASSWORD=你的登录密码
ALLOWED_ORIGIN=https://你的github用户名.github.io
INIT_TOKEN=初始化数据库用的一次性口令
TIDB_SSL=true
```

注意：`ALLOWED_ORIGIN` 只写 origin，例如：

```text
https://23ypz.github.io
```

不要写成：

```text
https://23ypz.github.io/math-wiki/
```

### 5. 检查 GitHub Pages 变量

GitHub 仓库里确认：

```text
Settings
→ Secrets and variables
→ Actions
→ Variables
```

有这个变量：

```bash
VITE_API_BASE_URL=https://你的-vercel-domain.vercel.app/api
```

例如：

```bash
VITE_API_BASE_URL=https://math-wiki-three.vercel.app/api
```

### 6. 本版不需要重新初始化数据库

第一版数据库表中已经包含 `mistakes.knowledge_point_id` 字段，所以本版的“错题关联知识点”可以直接使用。

如果你之前没有初始化过数据库，才需要执行：

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "https://你的-vercel-domain.vercel.app/api/admin/init-db" `
  -Headers @{"x-init-token"="你的INIT_TOKEN"}
```

## 二、从零部署

### 1. 准备 TiDB Cloud 数据库

创建 TiDB Cloud Starter 实例，建议新建数据库：

```sql
CREATE DATABASE IF NOT EXISTS kaoyan_math;
```

连接字符串格式：

```bash
mysql://USER:PASSWORD@HOST:4000/kaoyan_math
```

### 2. 部署后端到 Vercel

导入 GitHub 仓库后设置：

```text
Root Directory = backend
Application Preset = Other
```

配置环境变量：

```bash
DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/kaoyan_math
JWT_SECRET=请换成一个很长的随机字符串
ADMIN_EMAIL=你的登录邮箱
ADMIN_PASSWORD=你的登录密码
ALLOWED_ORIGIN=https://你的github用户名.github.io
INIT_TOKEN=初始化数据库用的一次性口令
TIDB_SSL=true
```

部署成功后测试：

```text
https://你的-vercel-domain.vercel.app/api/health
```

应该返回：

```json
{"ok":true,"service":"kaoyan-math-api"}
```

初始化数据库：

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "https://你的-vercel-domain.vercel.app/api/admin/init-db" `
  -Headers @{"x-init-token"="你的INIT_TOKEN"}
```

### 3. 部署前端到 GitHub Pages

GitHub 仓库设置：

```text
Settings
→ Pages
→ Source = GitHub Actions
```

GitHub Actions 变量：

```text
VITE_API_BASE_URL=https://你的-vercel-domain.vercel.app/api
```

推送代码后，Actions 会自动构建并部署前端。

## 三、已实现功能

- 单用户登录。
- Dashboard 统计。
- 知识点新增、查看、编辑、删除。
- 知识点 Markdown 实时预览。
- 错题新增、查看、编辑、删除。
- 错题关联知识点。
- 错题 Markdown 预览。
- 今日待复习错题。
- 复习打卡记录。
- 学习日志新增、查看、编辑、删除。
- 错题按科目、状态、关键词筛选。
- JSON 数据备份导出。
- Markdown 错题本导出。

## 四、注意事项

- Vercel Hobby 免费版最多 12 个 Serverless Functions，本项目当前正好控制在 12 个以内，不要随意新增 `backend/api` 文件，否则可能再次部署失败。
- 如果新增后端接口，建议把多个功能合并到同一个 API 文件里，避免超过 Vercel Hobby 限制。
- 数据保存在 TiDB Cloud。更新 GitHub 前端和 Vercel 后端不会删除已有数据。
- 如果修改了 Vercel 环境变量，需要重新 Redeploy 后端。


## v3 更新说明

- 修复 Markdown 预览中 `$$...$$` 多行公式无法渲染的问题。
- 通过 MathJax 支持行内公式 `$...$` 与块级公式 `$$...$$`。
- 增强表格、代码块、引用、有序列表、任务清单、分割线、链接等 Markdown 语法预览。
- 知识点和错题预览区域改为固定高度，可用鼠标滚轮上下滚动，避免页面被长预览撑得过长。
