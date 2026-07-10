# Math Wiki 完整部署指南

> 从下载项目压缩包开始，完成 GitHub 代码托管、TiDB Cloud 数据库、腾讯云 CloudBase 后端和 GitHub Pages 前端的完整上线流程。

---

## 1. 部署完成后的整体架构

Math Wiki 采用前后端分离架构：

```text
浏览器
  │
  ├── GitHub Pages
  │     └── Vue 3 + Vite 前端
  │
  └── 腾讯云 CloudBase 云托管
        └── Node.js + Express 后端 API
                │
                └── TiDB Cloud
                      └── MySQL 兼容数据库
```

各部分职责：

| 模块 | 作用 |
|---|---|
| GitHub 仓库 | 保存完整项目源码 |
| GitHub Actions | 自动构建前端 |
| GitHub Pages | 对外提供前端网页 |
| CloudBase 云托管 | 运行后端 API |
| TiDB Cloud | 保存知识点、错题、Todo、学习日志等数据 |
| CloudBase 环境变量 | 保存数据库连接、登录账号和密钥 |

---

## 2. 项目目录说明

解压项目后，根目录通常如下：

```text
math-wiki/
├── frontend/               # Vue 前端
├── backend/                # 旧版或备用后端
├── cloudbase-backend/      # 腾讯云 CloudBase 正式后端
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml
├── README.md
└── .gitignore
```

正式部署时主要使用：

```text
frontend/               → GitHub Pages
cloudbase-backend/      → 腾讯云 CloudBase
```

不要把 `frontend` 目录部署到 CloudBase，也不要把 `cloudbase-backend` 目录部署到 GitHub Pages。

---

# 第一部分：准备本地环境

## 3. 下载并解压项目

### 3.1 下载项目压缩包

下载 Math Wiki 项目压缩包，例如：

```text
math-wiki.zip
```

### 3.2 解压

建议解压到一个路径简单、没有中文和特殊符号的位置，例如：

```text
D:\projects\math-wiki
```

不推荐：

```text
D:\我的文件\考研项目\最终版本（新）\
```

路径过长或含特殊符号时，部分命令行工具可能出现问题。

---

## 4. 安装必要工具

建议安装：

- Git
- Node.js 20 或更高版本
- VS Code
- 一个现代浏览器，例如 Chrome 或 Edge

安装后打开 PowerShell，检查：

```powershell
git --version
node --version
npm --version
```

如果能看到版本号，说明环境正常。

---

## 5. 本地检查项目

进入项目目录：

```powershell
cd D:\projects\math-wiki
```

### 5.1 检查前端

```powershell
cd frontend
npm install
npm run build
cd ..
```

正常情况下，前端会生成：

```text
frontend/dist/
```

### 5.2 检查 CloudBase 后端

```powershell
cd cloudbase-backend
npm install
npm run build
cd ..
```

如果两个构建都通过，再继续部署。

---

# 第二部分：上传项目到 GitHub

## 6. 创建 GitHub 仓库

登录 GitHub，点击：

```text
New repository
```

仓库名建议：

```text
math-wiki
```

建议设置：

```text
Visibility: Public
```

GitHub Pages 对公开仓库使用最简单。

创建时不要额外生成 README、`.gitignore` 或 License，避免与本地项目冲突。

---

## 7. 初始化 Git 并上传代码

在项目根目录执行：

```powershell
git init
git add -A
git commit -m "initial math wiki project"
```

把下面地址换成自己的仓库地址：

```powershell
git remote add origin https://github.com/你的用户名/math-wiki.git
git branch -M main
git push -u origin main
```

上传成功后，GitHub 仓库中应能看到：

```text
frontend
backend
cloudbase-backend
.github
README.md
```

---

# 第三部分：创建 TiDB Cloud 数据库

## 8. 创建 TiDB Cloud 实例

进入 TiDB Cloud 控制台，创建一个 Starter 实例。

个人项目推荐：

```text
Plan: Starter
Cloud Provider: AWS
Region: Singapore
Spending Limit: 0
```

实例名称可以填写：

```text
kaoyan-math-db
```

创建完成后等待状态变成可用。

---

## 9. 创建项目数据库

打开 TiDB Cloud 的 SQL Editor，执行：

```sql
CREATE DATABASE IF NOT EXISTS kaoyan_math;
```

数据库名建议固定为：

```text
kaoyan_math
```

后续连接字符串也要使用相同名称。

---

## 10. 获取连接信息

进入 TiDB 实例的：

```text
Connect
```

记录以下信息：

```text
Host
Port
Username
Password
Database
```

端口通常为：

```text
4000
```

连接信息示例：

```text
Host:
gateway01.ap-southeast-1.prod.aws.tidbcloud.com

Port:
4000

Username:
xxxxxxxx.root

Database:
kaoyan_math
```

不要把数据库密码、完整连接字符串或 Token 发到公开仓库、聊天截图或 README 中。

---

## 11. 生成 DATABASE_URL

格式：

```text
mysql://用户名:密码@Host:4000/数据库名
```

示例结构：

```text
mysql://xxxxxxxx.root:YOUR_PASSWORD@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/kaoyan_math
```

### 11.1 密码不能带多余空格

错误：

```text
mysql://user: password@host:4000/db
```

正确：

```text
mysql://user:password@host:4000/db
```

### 11.2 密码含特殊字符时需要 URL 编码

常见转换：

| 原字符 | 编码 |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `/` | `%2F` |
| `:` | `%3A` |
| `?` | `%3F` |
| `&` | `%26` |
| `+` | `%2B` |

只编码密码部分，不要对整条 URL 编码。

### 11.3 TiDB Cloud Starter 必须开启 TLS

后端环境变量中需要设置：

```text
TIDB_SSL=true
```

---

# 第四部分：创建腾讯云 CloudBase 后端

## 12. 创建 CloudBase 环境

进入腾讯云 CloudBase 控制台，点击：

```text
新建环境
```

环境名称建议：

```text
math-wiki
```

个人项目可以选择当前可用的免费体验套餐。

数据库类型保持默认即可，因为本项目使用外部 TiDB Cloud，不使用 CloudBase 自带数据库。

创建完成后，进入该环境。

---

## 13. 进入云托管服务

在左侧菜单选择：

```text
云函数 / 托管
→ 服务管理
```

点击：

```text
创建服务
```

或：

```text
新建 Git 平台部署
```

---

## 14. 授权 GitHub

在 Git 仓库区域选择：

```text
GitHub
```

首次使用时点击授权。

授权完成后选择：

```text
仓库：你的用户名/math-wiki
分支：main
```

---

## 15. 填写 CloudBase 构建配置

推荐配置：

```text
服务名称：
math-wiki-api

访问端口：
80

服务端口：
80

目标目录：
cloudbase-backend

Dockerfile：
有

Dockerfile 名称：
Dockerfile
```

重点确认：

```text
目标目录 = cloudbase-backend
```

不要填：

```text
backend
frontend
/
```

Dockerfile 与构建目录必须对应。

---

## 16. 配置 CloudBase 环境变量

推荐切换到：

```text
JSON 输入
```

填入以下结构：

```json
{
  "DATABASE_URL": "mysql://数据库用户名:数据库密码@数据库Host:4000/kaoyan_math",
  "JWT_SECRET": "请替换成足够长的随机字符串",
  "ADMIN_EMAIL": "你的管理员登录邮箱",
  "ADMIN_PASSWORD": "你的管理员登录密码",
  "ALLOWED_ORIGIN": "https://你的GitHub用户名.github.io",
  "INIT_TOKEN": "请替换成初始化数据库使用的随机口令",
  "TIDB_SSL": "true"
}
```

### 16.1 各变量含义

| 变量 | 作用 |
|---|---|
| `DATABASE_URL` | TiDB Cloud 数据库连接 |
| `JWT_SECRET` | JWT 登录令牌签名密钥 |
| `ADMIN_EMAIL` | 管理员登录邮箱 |
| `ADMIN_PASSWORD` | 管理员登录密码 |
| `ALLOWED_ORIGIN` | 允许访问 API 的前端域名 |
| `INIT_TOKEN` | 初始化数据库表时的验证口令 |
| `TIDB_SSL` | 开启 TiDB TLS 连接 |

### 16.2 ALLOWED_ORIGIN 的正确写法

假设网页地址是：

```text
https://abc.github.io/math-wiki/
```

则填写：

```text
https://abc.github.io
```

不要填写：

```text
https://abc.github.io/math-wiki/
```

`Origin` 只包含协议、域名和端口，不包含路径。

### 16.3 安全要求

建议：

- `JWT_SECRET` 至少 32 位随机字符
- `ADMIN_PASSWORD` 不要与数据库密码相同
- `INIT_TOKEN` 不要使用简单值
- 不要把这些变量写进 GitHub 源码
- 不要截图公开完整 Token 或密码

---

## 17. 开始 CloudBase 部署

确认配置后点击：

```text
部署
```

CloudBase 会执行：

```text
拉取 GitHub 代码
读取 cloudbase-backend/Dockerfile
构建 Docker 镜像
启动 Node.js 服务
分配 HTTPS 域名
```

等待部署状态变成：

```text
正常
```

---

## 18. 测试后端健康接口

CloudBase 会提供类似的地址：

```text
https://math-wiki-api-xxxx.sh.run.tcloudbase.com
```

在浏览器访问：

```text
https://你的CloudBase域名/api/health
```

成功时应返回：

```json
{
  "ok": true,
  "service": "kaoyan-math-api"
}
```

如果能看到该结果，说明容器、端口和路由已正常启动。

---

# 第五部分：初始化数据库表

## 19. 调用初始化接口

确认 CloudBase 后端已部署成功后，再初始化数据库。

打开后端健康页面：

```text
https://你的CloudBase域名/api/health
```

按：

```text
F12
```

进入：

```text
Console
```

执行：

```javascript
fetch("https://你的CloudBase域名/api/admin/init-db", {
  method: "POST",
  headers: {
    "x-init-token": "你的INIT_TOKEN"
  }
})
  .then(async response => {
    console.log("status:", response.status);
    console.log(await response.text());
  })
  .catch(console.error);
```

把：

```text
你的CloudBase域名
你的INIT_TOKEN
```

换成真实内容。

成功时应返回：

```json
{
  "ok": true,
  "message": "Database tables are ready."
}
```

该接口会创建项目所需的数据表。

---

## 20. 测试管理员登录

在浏览器控制台执行：

```javascript
fetch("https://你的CloudBase域名/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    email: "你的ADMIN_EMAIL",
    password: "你的ADMIN_PASSWORD"
  })
})
  .then(response => response.json())
  .then(console.log)
  .catch(console.error);
```

成功后会返回：

```json
{
  "token": "一长串JWT",
  "user": {
    "email": "你的邮箱"
  }
}
```

不要把返回的完整 JWT 发到公开位置。

---

## 21. 测试数据库读取

复制登录返回的 Token：

```javascript
const token = "这里填写登录返回的token";

fetch("https://你的CloudBase域名/api/knowledge", {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(async response => {
    console.log("status:", response.status);
    console.log(await response.json());
  })
  .catch(console.error);
```

成功时应看到：

```text
status: 200
```

以及：

```json
{
  "items": []
}
```

数据库刚初始化时数组为空是正常的。

注意，`Authorization` 必须包含：

```text
Bearer + 空格 + Token
```

错误：

```text
Authorization: "eyJhbGci..."
```

正确：

```text
Authorization: "Bearer eyJhbGci..."
```

---

# 第六部分：部署 GitHub Pages 前端

## 22. 设置 GitHub Pages

打开 GitHub 仓库：

```text
Settings
→ Pages
```

在：

```text
Build and deployment
```

将 Source 设置为：

```text
GitHub Actions
```

项目中的：

```text
.github/workflows/deploy-frontend.yml
```

会负责构建和发布前端。

---

## 23. 配置前端 API 地址

进入：

```text
GitHub 仓库
→ Settings
→ Secrets and variables
→ Actions
→ Variables
```

点击：

```text
New repository variable
```

添加：

```text
Name:
VITE_API_BASE_URL

Value:
https://你的CloudBase域名/api
```

例如：

```text
https://math-wiki-api-xxxx.sh.run.tcloudbase.com/api
```

必须带最后的：

```text
/api
```

不要填成：

```text
https://math-wiki-api-xxxx.sh.run.tcloudbase.com
```

---

## 24. 触发 GitHub Actions

进入：

```text
Actions
→ Deploy Frontend to GitHub Pages
```

点击：

```text
Run workflow
```

选择：

```text
main
```

然后运行。

如果没有手动运行按钮，可以修改一次 README 并提交：

```powershell
git add -A
git commit -m "trigger frontend deployment"
git push
```

等待：

```text
build
deploy
```

都变成绿色。

---

## 25. 打开最终网站

GitHub Pages 地址通常为：

```text
https://你的GitHub用户名.github.io/math-wiki/
```

首次部署后可能需要等待一两分钟。

打开后建议按：

```text
Ctrl + F5
```

或：

```text
Ctrl + Shift + R
```

强制刷新。

---

# 第七部分：上线验收

## 26. 检查前端请求地址

打开网页，按：

```text
F12
→ Network
→ Fetch/XHR
```

刷新页面。

请求地址应该指向：

```text
https://你的CloudBase域名/api/...
```

不应该再指向旧的 Vercel 地址或 localhost。

---

## 27. 管理员功能测试

建议依次测试：

```text
1. 管理员登录
2. 新增知识点
3. 打开知识点详情
4. 编辑知识点
5. 新增错题
6. 打开错题详情
7. 编辑错题
8. 完成一次复习
9. 添加 Todo
10. 添加学习日志
11. 添加成绩记录
12. 修改个人资料
13. 导出 JSON 备份
14. 刷新页面确认数据仍然存在
```

---

## 28. 游客模式测试

退出管理员账号，点击：

```text
游客浏览
```

确认：

```text
游客看到的是前端预设演示数据
游客看不到管理员 TiDB 中的真实数据
知识点和错题录入框架可见
输入框只读
保存、编辑、删除操作不可用
```

游客演示数据与管理员真实数据完全隔离。

---

# 第八部分：后续更新项目

## 29. 只修改前端时

例如修改：

```text
页面样式
首页动画
游客演示数据
平板适配
按钮和文字
```

执行：

```powershell
git add -A
git commit -m "update frontend"
git push
```

只需要等待 GitHub Pages 部署。

通常不需要重新部署 CloudBase。

---

## 30. 修改后端时

例如修改：

```text
API
鉴权
动态路由
数据库查询
CORS
```

执行：

```powershell
git add -A
git commit -m "update cloudbase backend"
git push
```

然后进入 CloudBase：

```text
服务管理
→ math-wiki-api
→ 新建版本或重新部署
```

前端是否需要重新部署，取决于 API 地址或前端代码是否变化。

---

## 31. 修改数据库结构时

如果新版增加表或字段：

```text
先部署 CloudBase 新后端
再调用 /api/admin/init-db
最后测试新功能
```

初始化接口必须设计为增量创建或迁移，不能删除旧数据。

执行前建议先导出 JSON 备份。

---

# 第九部分：备份与回滚

## 32. 数据备份

管理员登录后，定期使用系统中的 JSON 导出功能。

建议文件名：

```text
math-wiki-backup-2026-07-10.json
```

至少保留：

```text
最近一次备份
最近一周备份
最近一个月备份
```

不要只依赖数据库在线存储。

---

## 33. 代码回滚

如果新版本出现问题：

```powershell
git log --oneline
```

找到稳定版本 Commit，然后可执行：

```powershell
git revert <commit-id>
git push
```

GitHub Pages 会自动重新部署前端。

CloudBase 后端可以在版本管理中切回上一个正常版本，或基于回滚后的 Git 提交重新部署。

---

# 第十部分：常见问题排查

## 34. `/api/health` 返回 404

检查：

```text
CloudBase 目标目录是否为 cloudbase-backend
Dockerfile 名称是否为 Dockerfile
服务端口是否为 80
服务是否显示“正常”
```

---

## 35. 登录成功，但读取数据返回 401

通常是 Token 格式错误。

错误：

```javascript
Authorization: token
```

正确：

```javascript
Authorization: `Bearer ${token}`
```

---

## 36. 读取数据返回 500 Access denied

错误示例：

```text
Access denied for user ...
```

检查：

```text
DATABASE_URL 用户名
DATABASE_URL 密码
密码前后是否有空格
密码特殊字符是否编码
数据库 Host
数据库名
CloudBase 是否重新部署
```

最常见原因是数据库密码错误或连接字符串带空格。

---

## 37. 页面提示 `Invalid id.`

如果知识点或错题详情返回：

```text
400 Bad Request
Invalid id.
```

说明 CloudBase 后端可能还是旧版本。

需要确认已经部署包含动态路由修复的最新版：

```text
/api/knowledge/:id
/api/mistakes/:id
/api/study-logs/:id
```

重新部署 CloudBase 后再测试。

---

## 38. 前端仍请求旧后端

检查 GitHub 变量：

```text
VITE_API_BASE_URL
```

修改后必须重新运行 GitHub Actions。

然后在浏览器：

```text
Ctrl + Shift + R
```

检查 Network 中的请求 URL。

---

## 39. GitHub Actions 构建失败

先展开：

```text
Actions
→ 失败任务
→ build
```

查看最后的红色错误。

项目中应保留已经验证稳定的工作流配置，不要随意切换 Node、npm 安装方式或增加短超时。

常见检查：

```text
frontend/package.json 是否存在
frontend/package-lock.json 是否与 package.json 同步
npm install 是否成功
npm run build 是否能在本地通过
VITE_API_BASE_URL 是否存在
```

---

## 40. CloudBase Docker 构建提示 `tsc: not found`

说明构建阶段没有安装 TypeScript 开发依赖。

检查：

```text
cloudbase-backend/package.json
cloudbase-backend/Dockerfile
```

构建阶段必须安装包含 `typescript` 的依赖，再执行：

```text
npm run build
```

正式运行阶段可以只保留生产依赖。

使用当前项目压缩包中已经验证通过的 Dockerfile，不要随意删除 builder 阶段。

---

## 41. CORS 跨域错误

确认 CloudBase 环境变量：

```text
ALLOWED_ORIGIN=https://你的用户名.github.io
```

不要加仓库路径，不要在末尾多写 `/`。

修改后必须重新部署 CloudBase。

---

## 42. 页面更新后仍显示旧内容

尝试：

```text
Ctrl + F5
Ctrl + Shift + R
```

移动端或平板：

```text
关闭旧标签页
清除该网站缓存
重新打开
```

---

# 第十一部分：安全建议

## 43. 必须保密的内容

不要公开：

```text
DATABASE_URL
数据库密码
JWT_SECRET
ADMIN_PASSWORD
INIT_TOKEN
完整 JWT
CloudBase 私密凭据
```

如果不小心通过截图、聊天或 GitHub 暴露：

```text
立即修改对应密码或密钥
更新 CloudBase 环境变量
重新部署后端
重新登录生成新 Token
```

---

## 44. 推荐的密钥管理方式

所有敏感配置只放在：

```text
CloudBase 环境变量
```

前端只保留公开 API 地址：

```text
VITE_API_BASE_URL
```

前端代码和 GitHub Pages 内容对所有访问者可见，不能存放数据库密码或管理员密码。

---

# 第十二部分：部署完成检查表

## GitHub

- [ ] 项目代码已上传到 GitHub
- [ ] 主分支为 `main`
- [ ] GitHub Pages Source 为 GitHub Actions
- [ ] `VITE_API_BASE_URL` 已填写
- [ ] Actions 的 build 和 deploy 均成功

## TiDB Cloud

- [ ] Starter 实例可用
- [ ] 已创建 `kaoyan_math`
- [ ] 已保存正确的 Host、Port、Username、Password
- [ ] 连接启用了 TLS
- [ ] Spending Limit 符合预期

## CloudBase

- [ ] CloudBase 环境可用
- [ ] 服务名为 `math-wiki-api`
- [ ] 目标目录为 `cloudbase-backend`
- [ ] Dockerfile 名称正确
- [ ] 服务端口为 80
- [ ] 7 个环境变量均已填写
- [ ] `/api/health` 返回 200
- [ ] `/api/admin/init-db` 执行成功
- [ ] 管理员登录成功
- [ ] 数据库读取返回 200

## 最终网站

- [ ] 首页正常显示
- [ ] 管理员登录正常
- [ ] 知识点增删改查正常
- [ ] 错题增删改查正常
- [ ] Todo、日志、成绩和个人资料正常
- [ ] 游客只能查看演示数据
- [ ] 平板和手机导航正常
- [ ] 数据导出成功
- [ ] 刷新页面后数据仍存在

---

# 官方参考资料

- GitHub Pages 自定义 Actions 工作流  
  https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

- GitHub Pages 发布源设置  
  https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

- TiDB Cloud Starter / Essential 连接说明  
  https://docs.pingcap.com/tidbcloud/connect-to-tidb-cluster-serverless/

- TiDB 使用 Node.js mysql2  
  https://docs.pingcap.com/developer/dev-guide-sample-application-nodejs-mysql2/

- CloudBase Node.js 容器化快速入门  
  https://docs.cloudbase.net/en/run/quick-start/dockerize-node

- CloudBase Run 部署说明  
  https://docs.cloudbase.net/en/ai/agent-development/deployment/cloud-run

---

<p align="center">
  <strong>Math Wiki — Build your own mathematics learning system.</strong>
</p>
