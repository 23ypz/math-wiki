# Math Wiki v6

考研数学一在线知识库与错题系统。

## v6 更新内容

- 左侧主导航的“知识点科目”改为点击后下拉展开，默认不再占用大量空间。
- 新增“错题分类”下拉导航，错题也按“科目 → 章节 → 错题”组织。
- 新增错题科目页 `/mistakes/subject/:subject`，支持章节横向切换。
- 新增错题详情页 `/mistakes/:id`，完整渲染题目、正确解法、错因、总结中的 Markdown 与公式。
- 错题管理列表增加“预览”按钮，可跳转到错题详情页。
- 后端 `GET /api/mistakes/:id` 已补齐，用于错题详情页读取单条错题。
- GitHub Pages workflow 已恢复为稳定的简单版本：`npm install` + `npm run build`，不启用 npm 缓存。

## 更新方式

1. 解压 `math-wiki-v6.zip`。
2. 用压缩包中的 `frontend`、`backend`、`.github`、`README.md`、`.gitignore` 覆盖原项目对应文件。
3. 在项目根目录执行：

```bash
git add .
git commit -m "upgrade collapsible sidebar and mistake navigation v6"
git push
```

4. 等 GitHub Actions 和 Vercel 自动部署完成。
5. 不需要重新初始化数据库。

## 检查项

- 打开左侧“知识点科目”，能下拉显示高等数学、线性代数、概率论与数理统计。
- 打开左侧“错题分类”，能下拉显示错题科目。
- 点击错题科目后，能进入按章节组织的错题页面。
- 点击错题后，能进入详情页，并渲染 Markdown 和公式。
