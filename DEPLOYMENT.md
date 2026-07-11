# Math Wiki 完整部署指南（含图片上传功能）

> 本文适用于当前最新版 Math Wiki。  
> 从下载项目压缩包开始，依次完成 GitHub 代码托管、TiDB Cloud 数据库、腾讯云 CloudBase 后端、CloudBase 云存储、GitHub Pages 前端以及图片上传功能配置。

---

## 0. 部署前先了解最终架构

Math Wiki 采用前后端分离架构，当前版本还增加了图片上传能力。

```text
浏览器
  │
  ├── GitHub Pages
  │     └── Vue 3 + Vite 前端
  │
  └── 腾讯云 CloudBase 云托管
        └── Node.js + Express 后端 API
                │
                ├── TiDB Cloud
                │     └── 保存知识点、错题、Todo、学习日志、个人资料等
                │
                └── CloudBase 云存储
                      └── 保存知识点图片、错题图片和个人头像
```

各部分职责如下：

| 模块 | 作用 |
|---|---|
| GitHub 仓库 | 保存完整项目源码 |
| GitHub Actions | 自动构建并发布前端 |
| GitHub Pages | 对外提供网页 |
| CloudBase 云托管 | 运行后端 API |
| TiDB Cloud | 保存结构化数据 |
| CloudBase 云存储 | 保存知识点图片、错题图片和头像 |
| CloudBase 环境变量 | 保存数据库连接、密钥和云存储配置 |

> 图片文件本身不会存进 TiDB。  
> TiDB 只保存图片访问地址，因此不会因为上传图片而明显增加数据库压力。

---

# 第一部分：准备项目文件

## 1. 下载并解压项目

### 1.1 下载项目压缩包

下载最新版 Math Wiki 项目压缩包，例如：

```text
math-wiki.zip
```

### 1.2 解压到简单路径

建议解压到：

```text
D:\projects\math-wiki
```

不建议使用：

```text
D:\我的文件\考研项目\最终版本（最新版）\
```

原因：

- 中文路径有时会影响脚本；
- 路径过长可能导致依赖安装失败；
- 特殊符号可能影响 Docker 构建。

### 1.3 检查目录结构

解压后，项目根目录应大致如下：

```text
math-wiki/
├── frontend/               # 前端
├── backend/                # 旧版或备用后端
├── cloudbase-backend/      # CloudBase 正式后端
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml
├── README.md
├── DEPLOYMENT.md
└── .gitignore
```

正式部署时主要使用：

```text
frontend/               → GitHub Pages
cloudbase-backend/      → 腾讯云 CloudBase
```

不要混淆：

```text
frontend 不能部署到 CloudBase
cloudbase-backend 不能部署到 GitHub Pages
```

---

## 2. 安装本地工具

推荐安装：

- Git
- Node.js 20 或更高版本
- VS Code
- Chrome 或 Edge

安装完成后打开 PowerShell，执行：

```powershell
git --version
node --version
npm --version
```

如果都能显示版本号，说明本地环境正常。

---

## 3. 在本地构建一次项目

虽然最终会在云端部署，但本地构建一次可以提前发现依赖或代码问题。

### 3.1 检查前端

```powershell
cd D:\projects\math-wiki\frontend
npm install
npm run build
```

成功后应生成：

```text
frontend/dist/
```

### 3.2 检查 CloudBase 后端

```powershell
cd D:\projects\math-wiki\cloudbase-backend
npm install
npm run build
```

如果两个构建都通过，再继续。

### 3.3 返回项目根目录

```powershell
cd D:\projects\math-wiki
```

---

# 第二部分：上传项目到 GitHub

## 4. 创建 GitHub 仓库

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

创建仓库时不要勾选自动生成：

```text
README
.gitignore
License
```

否则可能与本地文件发生冲突。

---

## 5. 初始化 Git 并推送代码

在项目根目录打开 PowerShell：

```powershell
git init
git add -A
git commit -m "initial math wiki project"
```

绑定远程仓库：

```powershell
git remote add origin https://github.com/你的用户名/math-wiki.git
git branch -M main
git push -u origin main
```

上传完成后，GitHub 仓库中应能看到：

```text
frontend
backend
cloudbase-backend
.github
README.md
DEPLOYMENT.md
```

### 5.1 检查是否误传敏感信息

在 GitHub 中搜索以下关键词：

```text
DATABASE_URL
JWT_SECRET
ADMIN_PASSWORD
INIT_TOKEN
SECRETKEY
SECRETID
```

源码中可以出现变量名，但不能出现真实密码和真实密钥。

---

# 第三部分：创建 TiDB Cloud 数据库

## 6. 创建 TiDB Cloud 实例

进入 TiDB Cloud 控制台，创建 Starter 实例。

个人项目建议：

```text
Plan: Starter
Cloud Provider: AWS
Region: Singapore
Spending Limit: 0
```

实例名称可填写：

```text
kaoyan-math-db
```

等待状态变为可用。

---

## 7. 创建数据库

进入 SQL Editor，执行：

```sql
CREATE DATABASE IF NOT EXISTS kaoyan_math;
```

数据库名建议固定为：

```text
kaoyan_math
```

后续连接字符串必须使用相同名称。

---

## 8. 获取连接信息

进入实例的：

```text
Connect
```

记录：

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

示例：

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

---

## 9. 生成 DATABASE_URL

格式：

```text
mysql://用户名:密码@Host:4000/数据库名
```

示例：

```text
mysql://xxxxxxxx.root:YOUR_PASSWORD@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/kaoyan_math
```

### 9.1 密码不能带空格

错误：

```text
mysql://user: password@host:4000/db
```

正确：

```text
mysql://user:password@host:4000/db
```

### 9.2 密码含特殊字符时需要编码

常见编码：

| 原字符 | URL 编码 |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `/` | `%2F` |
| `:` | `%3A` |
| `?` | `%3F` |
| `&` | `%26` |
| `+` | `%2B` |

只编码密码部分，不要对整条连接字符串编码。

### 9.3 开启 TLS

后端环境变量中必须设置：

```text
TIDB_SSL=true
```

---

# 第四部分：创建 CloudBase 环境

## 10. 创建 CloudBase 环境

进入腾讯云 CloudBase 控制台，点击：

```text
新建环境
```

环境名称建议：

```text
math-wiki
```

选择当前可用的免费体验套餐。

数据库类型保持默认即可，因为本项目使用外部 TiDB Cloud。

创建完成后，进入该环境。

---

## 11. 记录 CloudBase 环境 ID

进入：

```text
环境概览
```

找到环境 ID，格式类似：

```text
math-wiki-d2gbka00nfabcec7f
```

后续要配置：

```text
CLOUDBASE_ENV_ID
```

---

# 第五部分：配置 CloudBase 云存储

## 12. 开通云存储

进入：

```text
CloudBase
→ 云存储
→ 文件管理
```

首次使用时根据提示开通云存储。

开通后会看到：

```text
存储桶名称
默认域名
文件列表
```

---

## 13. 修改云存储权限

进入：

```text
云存储
→ 权限管理
```

建议设置为：

```text
所有用户可读，仅创建者及管理员可写
```

这样可以保证：

```text
知识点图片、错题图片和头像可以在网页中显示；
普通游客不能直接向云存储写入文件；
上传操作仍由后端完成。
```

不要设置为：

```text
所有用户可读写
```

否则任何人都可能向你的存储空间上传文件。

---

## 14. 记录云存储默认域名

进入：

```text
云存储
→ 文件管理
```

找到“域名信息”中的默认域名，类似：

```text
https://6d61-math-wiki-xxxxxxxx-1328640342.tcb.qcloud.la
```

后续要配置：

```text
CLOUDBASE_STORAGE_DOMAIN
```

注意：

- 必须带 `https://`
- 末尾不要加 `/`
- 不要填写某个具体图片路径

正确：

```text
https://6d61-math-wiki-xxxxxxxx-1328640342.tcb.qcloud.la
```

错误：

```text
https://6d61-math-wiki-xxxxxxxx-1328640342.tcb.qcloud.la/
```

---

## 15. 手动上传一张图片测试

在：

```text
云存储
→ 文件管理
```

点击：

```text
上传文件
```

选择一张 JPG 或 PNG。

上传后点击：

```text
预览图片
```

或者使用默认域名拼接路径：

```text
https://默认域名/文件名.jpg
```

若浏览器能显示或下载该文件，说明云存储本身可用。

> 手动上传成功只代表云存储正常，  
> 还不代表网页中的“上传图片”按钮已经打通。

---

# 第六部分：创建 CloudBase 后端服务

## 16. 进入云托管

在左侧菜单进入：

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

## 17. 授权 GitHub

在 Git 仓库区域选择：

```text
GitHub
```

首次使用时点击授权。

授权后选择：

```text
仓库：你的用户名/math-wiki
分支：main
```

---

## 18. 填写构建配置

建议填写：

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

最关键的是：

```text
目标目录 = cloudbase-backend
```

不要填：

```text
backend
frontend
/
```

---

# 第七部分：配置 CloudBase 环境变量

## 19. 准备管理员和安全变量

你需要准备：

```text
管理员邮箱
管理员密码
JWT_SECRET
INIT_TOKEN
TiDB DATABASE_URL
```

建议：

```text
JWT_SECRET 至少 32 位
INIT_TOKEN 至少 24 位
管理员密码不要与数据库密码相同
```

---

## 20. 获取腾讯云 API 密钥

当前图片上传代码需要 CloudBase Node SDK 调用云存储，因此需要腾讯云 API 密钥。

进入腾讯云：

```text
访问管理 CAM
→ API 密钥管理
```

创建或查看：

```text
SecretId
SecretKey
```

注意：

- SecretKey 只应保存在 CloudBase 环境变量中；
- 不要写进 GitHub；
- 不要放进 README；
- 不要截图公开；
- 如果泄露，应立即删除旧密钥并重新创建。

---

## 21. 填写完整环境变量

进入：

```text
CloudBase
→ 云函数 / 托管
→ 服务管理
→ math-wiki-api
→ 环境变量
```

建议使用 JSON 输入，填写：

```json
{
  "DATABASE_URL": "mysql://数据库用户名:数据库密码@数据库Host:4000/kaoyan_math",
  "JWT_SECRET": "请替换成足够长的随机字符串",
  "ADMIN_EMAIL": "你的管理员登录邮箱",
  "ADMIN_PASSWORD": "你的管理员登录密码",
  "ALLOWED_ORIGIN": "https://你的GitHub用户名.github.io",
  "INIT_TOKEN": "请替换成初始化数据库使用的随机口令",
  "TIDB_SSL": "true",
  "CLOUDBASE_ENV_ID": "你的CloudBase环境ID",
  "CLOUDBASE_STORAGE_DOMAIN": "https://你的云存储默认域名",
  "TENCENTCLOUD_SECRETID": "你的腾讯云SecretId",
  "TENCENTCLOUD_SECRETKEY": "你的腾讯云SecretKey"
}
```

### 21.1 当前版本需要的 11 个变量

| 变量 | 作用 |
|---|---|
| `DATABASE_URL` | TiDB 数据库连接 |
| `JWT_SECRET` | 登录令牌签名 |
| `ADMIN_EMAIL` | 管理员邮箱 |
| `ADMIN_PASSWORD` | 管理员密码 |
| `ALLOWED_ORIGIN` | 允许访问 API 的前端域名 |
| `INIT_TOKEN` | 初始化数据库表的口令 |
| `TIDB_SSL` | 开启 TiDB TLS |
| `CLOUDBASE_ENV_ID` | CloudBase 环境 ID |
| `CLOUDBASE_STORAGE_DOMAIN` | 图片公开访问域名 |
| `TENCENTCLOUD_SECRETID` | 云存储 SDK 身份凭据 |
| `TENCENTCLOUD_SECRETKEY` | 云存储 SDK 身份凭据 |

### 21.2 密钥变量名必须完全一致

当前代码使用的是：

```text
TENCENTCLOUD_SECRETID
TENCENTCLOUD_SECRETKEY
```

不要写成：

```text
TENCENT_SECRET_ID
TENCENT_SECRET_KEY
SECRET_ID
SECRET_KEY
```

否则会出现：

```text
missing secretId or secretKey
```

### 21.3 ALLOWED_ORIGIN 正确写法

假设前端地址：

```text
https://abc.github.io/math-wiki/
```

则填写：

```text
https://abc.github.io
```

不要填写路径：

```text
https://abc.github.io/math-wiki/
```

---

## 22. 部署 CloudBase 后端

确认配置后点击：

```text
部署
```

CloudBase 会执行：

```text
拉取 GitHub 代码
读取 cloudbase-backend/Dockerfile
构建镜像
启动 Node.js 服务
分配 HTTPS 域名
```

等待状态变成：

```text
正常
```

---

## 23. 记录后端域名

CloudBase 会分配类似：

```text
https://math-wiki-api-xxxx.sh.run.tcloudbase.com
```

这就是后端域名。

后端 API 基础地址为：

```text
https://math-wiki-api-xxxx.sh.run.tcloudbase.com/api
```

---

## 24. 测试健康接口

浏览器访问：

```text
https://你的后端域名/api/health
```

成功时应返回：

```json
{
  "ok": true,
  "service": "kaoyan-math-api"
}
```

若返回 404，优先检查：

```text
目标目录是否为 cloudbase-backend
Dockerfile 是否存在
服务端口是否为 80
服务是否为正常状态
```

---

# 第八部分：初始化数据库

## 25. 调用 init-db

打开：

```text
https://你的后端域名/api/health
```

按：

```text
F12
```

进入 Console，执行：

```javascript
fetch("https://你的后端域名/api/admin/init-db", {
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

成功时应返回：

```json
{
  "ok": true,
  "message": "Database tables are ready."
}
```

当前版本中，初始化过程还会确保个人资料表包含头像字段。

### 25.1 更新版本后是否需要再执行

如果升级后的版本增加了字段或表，应按以下顺序：

```text
1. 先部署新版后端
2. 再执行 init-db
3. 最后测试新功能
```

---

# 第九部分：测试管理员登录和数据库

## 26. 测试登录

在 Console 中执行：

```javascript
fetch("https://你的后端域名/api/auth/login", {
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

成功会返回：

```json
{
  "token": "一长串JWT",
  "user": {
    "email": "你的邮箱"
  }
}
```

---

## 27. 测试数据库读取

复制登录返回的 Token：

```javascript
const token = "这里填写登录返回的token";

fetch("https://你的后端域名/api/knowledge", {
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

成功应显示：

```text
status: 200
```

---

# 第十部分：测试图片上传接口

## 28. 先确认图片上传依赖已部署

如果后端环境变量新增了：

```text
CLOUDBASE_ENV_ID
CLOUDBASE_STORAGE_DOMAIN
TENCENTCLOUD_SECRETID
TENCENTCLOUD_SECRETKEY
```

必须重新部署 CloudBase。

只保存环境变量但不重新部署，旧容器不会读取新值。

---

## 29. 在网页中测试知识点图片

完成前端部署后，管理员登录并进入：

```text
知识点管理
→ 上传知识点图片
```

选择 JPG、PNG 或 WebP。

正常流程：

```text
选择图片
→ 前端压缩
→ 请求后端上传接口
→ 后端上传到 CloudBase 云存储
→ 返回 HTTPS 地址
→ 自动插入 Markdown
→ 右侧实时预览图片
```

Markdown 中应出现：

```md
![图片说明](https://你的云存储域名/上传路径/图片.webp)
```

---

## 30. 测试错题图片

进入错题录入页，依次测试：

```text
题目图片
题解图片
错误原因图片
总结图片
```

分别确认：

```text
图片地址插入正确字段
保存后重新打开仍能显示
打印预览中能够显示
```

---

## 31. 测试头像上传

进入：

```text
个人中心
→ 上传头像
→ 保存资料
```

确认：

```text
个人中心显示新头像
左侧导航显示新头像
刷新页面后头像仍存在
```

---

## 32. 检查云存储文件

上传成功后进入：

```text
CloudBase
→ 云存储
→ 文件管理
```

刷新列表，应看到新文件。

---

# 第十一部分：部署 GitHub Pages 前端

## 33. 设置 GitHub Pages

进入 GitHub 仓库：

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

---

## 34. 配置前端后端地址

进入：

```text
GitHub 仓库
→ Settings
→ Secrets and variables
→ Actions
→ Variables
```

新建：

```text
Name:
VITE_API_BASE_URL

Value:
https://你的CloudBase后端域名/api
```

必须带：

```text
/api
```

---

## 35. 触发前端部署

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

如果没有手动按钮，可提交一次代码：

```powershell
git add -A
git commit -m "deploy latest math wiki"
git push
```

等待：

```text
build
deploy
```

均变成绿色。

---

## 36. 打开最终网站

地址通常为：

```text
https://你的GitHub用户名.github.io/math-wiki/
```

首次部署可能需要等待几分钟。

打开后强制刷新：

```text
Ctrl + F5
```

---

# 第十二部分：完整上线验收

## 37. 管理员功能检查

依次测试：

```text
1. 管理员登录
2. 新增知识点
3. 上传知识点图片
4. 保存并重新打开知识点
5. 新增错题
6. 上传题目图片
7. 上传题解图片
8. 上传错误原因图片
9. 上传总结图片
10. 打开错题详情
11. 打印错题
12. 上传个人头像
13. 新增 Todo
14. 新增学习日志
15. 新增成绩记录
16. 导出 JSON 备份
17. 刷新页面确认数据仍存在
```

---

## 38. 游客模式检查

退出管理员账号，进入游客模式，确认：

```text
游客只能查看预设演示内容
游客看不到管理员真实数据
游客可以看到知识点和错题录入框架
上传按钮、输入和保存操作不可用
游客打印功能可以正常预览演示数据
```

---

# 第十三部分：常见错误排查

## 39. 图片上传显示 Failed to fetch

打开：

```text
F12
→ Network
→ Fetch/XHR
```

查看上传请求。

如果 Console 显示：

```text
No Access-Control-Allow-Origin
```

同时 CloudBase 日志显示：

```text
missing secretId or secretKey
```

真实问题通常不是 CORS，而是后端上传失败。

检查环境变量：

```text
TENCENTCLOUD_SECRETID
TENCENTCLOUD_SECRETKEY
```

并重新部署。

---

## 40. CloudBase 日志提示 missing secretId or secretKey

检查变量名是否完全一致：

```text
TENCENTCLOUD_SECRETID
TENCENTCLOUD_SECRETKEY
```

确认：

```text
值不为空
没有多余引号
没有前后空格
配置在 math-wiki-api 服务环境变量中
配置后已经重新部署
```

---

## 41. 图片上传成功但网页不显示

检查：

```text
云存储权限是否为公开读
CLOUDBASE_STORAGE_DOMAIN 是否正确
Markdown 图片语法是否为 ![说明](URL)
浏览器 Network 中图片请求是否返回 200
```

正确 Markdown：

```md
![测试图片](https://example.tcb.qcloud.la/path/image.jpg)
```

---

## 42. 图片地址打开后自动下载

只要 Markdown 页面中能正常显示，通常不影响项目使用。

若 Markdown 中也无法显示，检查图片响应头是否为：

```text
Content-Type: image/jpeg
Content-Type: image/png
Content-Type: image/webp
```

不要把非图片文件仅修改扩展名后上传。

---

## 43. 读取数据返回 500 Access denied

检查：

```text
DATABASE_URL 用户名
数据库密码
特殊字符编码
数据库 Host
数据库名
TIDB_SSL=true
是否重新部署后端
```

---

## 44. 页面提示 Invalid id.

说明后端可能仍是旧版本。

重新部署包含动态路由修复的最新版 CloudBase 后端。

---

## 45. 前端仍请求旧后端

检查：

```text
VITE_API_BASE_URL
```

修改后重新运行 GitHub Actions，并强制刷新浏览器。

---

## 46. GitHub Actions 构建失败

先在本地执行：

```powershell
cd frontend
npm install
npm run build
```

再检查：

```text
frontend/package.json
frontend/package-lock.json
VITE_API_BASE_URL
.github/workflows/deploy-frontend.yml
```

---

## 47. CloudBase 构建提示 tsc: not found

说明构建阶段没有安装 TypeScript。

检查：

```text
cloudbase-backend/package.json
cloudbase-backend/Dockerfile
```

构建阶段必须安装开发依赖并执行：

```text
npm run build
```

---

## 48. 修改环境变量后仍无效

CloudBase 环境变量修改后必须：

```text
保存
→ 新建版本或重新部署
→ 等待新版本状态变为正常
```

仅修改变量但不部署，旧实例不会自动更新。

---

# 第十四部分：后续更新流程

## 49. 只修改前端

例如：

```text
样式
页面布局
首页动画
游客演示数据
平板适配
Markdown 渲染
```

执行：

```powershell
git add -A
git commit -m "update frontend"
git push
```

等待 GitHub Pages 自动部署。

---

## 50. 修改后端

例如：

```text
上传接口
数据库接口
鉴权
CORS
云存储逻辑
```

执行：

```powershell
git add -A
git commit -m "update cloudbase backend"
git push
```

然后到 CloudBase：

```text
服务管理
→ math-wiki-api
→ 新建版本或重新部署
```

---

## 51. 修改数据库结构

执行顺序：

```text
1. 导出 JSON 备份
2. 推送新版代码
3. 部署新版后端
4. 执行 init-db
5. 测试新字段和新功能
```

---

# 第十五部分：备份和安全

## 52. 定期备份

建议定期导出 JSON：

```text
math-wiki-backup-2026-07-11.json
```

至少保留：

```text
最近一次
最近一周
最近一个月
```

---

## 53. 必须保密的内容

不要公开：

```text
DATABASE_URL
数据库密码
JWT_SECRET
ADMIN_PASSWORD
INIT_TOKEN
完整 JWT
TENCENTCLOUD_SECRETID
TENCENTCLOUD_SECRETKEY
```

如果泄露：

```text
立即更换对应密码或密钥
更新 CloudBase 环境变量
重新部署后端
重新登录
```

---

# 第十六部分：最终部署检查表

## GitHub

- [ ] 代码已上传到 GitHub
- [ ] 主分支为 `main`
- [ ] GitHub Pages 使用 GitHub Actions
- [ ] `VITE_API_BASE_URL` 已填写
- [ ] Actions 构建和部署成功

## TiDB Cloud

- [ ] Starter 实例可用
- [ ] 已创建 `kaoyan_math`
- [ ] `DATABASE_URL` 正确
- [ ] `TIDB_SSL=true`
- [ ] 数据读取返回 200

## CloudBase 后端

- [ ] 服务名为 `math-wiki-api`
- [ ] 目标目录为 `cloudbase-backend`
- [ ] 服务端口为 80
- [ ] `/api/health` 返回 200
- [ ] `init-db` 成功
- [ ] 管理员登录成功

## CloudBase 云存储

- [ ] 云存储已开通
- [ ] 权限为公开读、受控写
- [ ] 已记录默认域名
- [ ] `CLOUDBASE_ENV_ID` 已配置
- [ ] `CLOUDBASE_STORAGE_DOMAIN` 已配置
- [ ] `TENCENTCLOUD_SECRETID` 已配置
- [ ] `TENCENTCLOUD_SECRETKEY` 已配置
- [ ] 修改变量后已重新部署
- [ ] 知识点图片上传成功
- [ ] 错题图片上传成功
- [ ] 头像上传成功

## 最终网站

- [ ] 首页正常
- [ ] 管理员功能正常
- [ ] 游客模式正常
- [ ] 知识点图片可显示
- [ ] 错题图片可显示
- [ ] 打印页图片可显示
- [ ] 头像可显示
- [ ] 平板和手机导航正常
- [ ] 数据导出正常
- [ ] 刷新后数据仍存在

---

<p align="center">
  <strong>Math Wiki — Build your own mathematics learning system.</strong>
</p>
