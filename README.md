# 数学一 Wiki v11

本项目采用：

- GitHub Pages：Vue + Vite 前端
- Vercel Functions：TypeScript 后端 API
- TiDB Cloud：在线数据库

## v11 新增

- Todo 月历视图
- 点击日期添加每日学习任务
- Todo 编辑、删除和完成状态切换
- 延期到明天
- 任务类型、科目、章节、优先级与备注
- 保存并继续添加
- 总览页显示今日 Todo
- JSON / Markdown 备份包含 Todo 数据

## 数据库升级

部署 Vercel 后端后，再次调用 `/api/admin/init-db`，创建 `todo_items` 表。初始化接口使用 `CREATE TABLE IF NOT EXISTS`，不会删除已有数据。

## 部署

1. 将项目推送到 GitHub。
2. Vercel 项目 Root Directory 保持 `backend`。
3. 等 Vercel 部署完成后调用 `/api/admin/init-db`。
4. GitHub Actions 自动部署 `frontend` 到 GitHub Pages。
