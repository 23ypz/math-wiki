# 数学一 Wiki v9

个人考研数学一知识点、错题、复习和学习进度管理系统。

## v9 新增

- 最近 90 天学习热力图
- 自动生成最近 7 天学习报告
- 真题、模拟卷、阶段测试成绩记录
- 总分与高数、线代、概率论分项成绩
- 最近 12 次成绩趋势图
- 阶段目标管理与进度条
- JSON/Markdown 备份包含成绩和目标
- 保持 Vercel Hobby 最多 12 个函数：今日复习已合并进复习记录接口

## 部署结构

- 前端：Vue 3 + Vite，GitHub Pages
- 后端：Vercel Functions
- 数据库：TiDB Cloud

## 升级说明

部署前后端后，需要再次调用 `/api/admin/init-db`。初始化接口只新增或补充 `exam_scores` 字段和 `study_goals` 表，不会删除已有数据。
