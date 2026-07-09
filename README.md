# 数学一 Wiki v4

这是考研数学一在线知识库项目的 v4 版本，架构仍然是：

- GitHub Pages 部署前端
- Vercel 部署后端 API
- TiDB Cloud 存储数据库

## v4 更新内容

1. 知识点列表改为紧凑一行展示。
2. 列表中的内容摘要不再展开完整 Markdown，多余内容自动省略。
3. 知识点列表新增“预览”按钮。
4. 点击“预览”进入独立知识点内容页。
5. 新增 OI Wiki 风格知识点阅读页。
6. 阅读页左侧显示知识点导航，按科目与章节分块。
7. 阅读页左侧显示本文目录，可点击跳转到当前知识点内部标题。
8. 阅读页正文使用 Markdown + MathJax 渲染，支持公式、表格、代码块、引用、任务清单等。
9. 全局左侧栏增加“知识点导航”，方便快速进入知识点页面。
10. Markdown 渲染器兼容复制示例时出现的字面量 `\n`。
11. 后端 `/api/knowledge/[id]` 增加 GET 读取接口。

## 更新方式

把本压缩包解压后，用新版文件覆盖你本地原项目中的以下内容：

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
git commit -m "upgrade knowledge detail page v4"
git push
```

推送后会自动触发：

- GitHub Actions 前端部署
- Vercel 后端部署

## 注意事项

本版本不需要重新初始化数据库。

如果更新后页面看起来没有变化，请在浏览器里按：

```text
Ctrl + F5
```

强制刷新缓存。

如果后端部署完成后想测试 API，可访问：

```text
https://math-wiki-three.vercel.app/api/health
```

应返回：

```json
{"ok":true,"service":"kaoyan-math-api"}
```

## Markdown 测试示例

````markdown
# 极限与等价无穷小

## 一、核心概念

当 $x \to 0$ 时，如果：

$$
\lim_{x \to 0}\frac{f(x)}{g(x)}=1
$$

则称 $f(x) \sim g(x)$。

---

## 二、常用等价无穷小

| 表达式 | 等价形式 | 条件 |
|---|---|---|
| $\sin x$ | $x$ | $x \to 0$ |
| $\tan x$ | $x$ | $x \to 0$ |
| $1-\cos x$ | $\frac{x^2}{2}$ | $x \to 0$ |

---

## 三、易错点

> 等价无穷小不能在加减结构中随意局部替换。

正确做法通常需要泰勒展开：

$$
\sin x = x-\frac{x^3}{6}+o(x^3)
$$

```python
from math import sin
x = 1e-6
print(sin(x) / x)
```

- [x] 掌握基本等价无穷小
- [ ] 熟练处理加减结构
````
