# math-wiki-v5

考研数学一知识库在线系统 v5。

## v5 更新重点

- 左侧主导航不再堆叠全部知识点，只显示科目入口，例如高等数学、线性代数、概率论与数理统计。
- 点击科目后进入科目页，页面顶部按章节分组，章节切换采用类似 OI Wiki 的横向章节导航。
- 进入某个章节后，页面内部左侧只显示当前章节的小知识点目录。
- 点击小知识点后进入知识点正文页，正文完整渲染 Markdown、公式、表格、代码块、引用、任务清单。
- 知识点正文页左侧同时包含当前章节小知识点目录和本文目录。
- 章节导航、小知识点目录、本文目录均加入滚动区域，避免知识点数量多时页面过长。

## 更新方法

用本压缩包覆盖原项目中的以下内容：

```text
frontend
backend
.github
README.md
.gitignore
```

然后在项目根目录执行：

```powershell
git add .
git commit -m "upgrade subject chapter navigation v5"
git push
```

推送后会自动触发 GitHub Pages 前端部署和 Vercel 后端部署。

## 数据库

本版本不需要重新初始化数据库。

## 检查

本地已检查：

```text
frontend npm run build 通过
backend npm run typecheck 通过
```
