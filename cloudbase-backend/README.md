# Math Wiki CloudBase Backend

这是从原 Vercel Functions 后端转换出的 CloudBase 云托管版本。原有 `/api/...` 路径保持不变。

## CloudBase Git 部署设置

- 服务名称：`math-wiki-api`
- 仓库：`23ypz/math-wiki`
- 分支：`main`
- 构建目录：`cloudbase-backend`
- Dockerfile：`cloudbase-backend/Dockerfile`
- 访问端口：`80`
- 服务端口：`80`
- 启用公网访问
- 最小实例数：`0`
- 最大实例数：`1`

## 环境变量

把 Vercel 项目中的以下变量原样复制到 CloudBase：

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ALLOWED_ORIGIN`
- `INIT_TOKEN`
- `TIDB_SSL`

`ALLOWED_ORIGIN` 应填写 GitHub Pages 的 Origin，例如：

```text
https://23ypz.github.io
```

## 本地测试

```bash
npm install
cp .env.example .env
npm run dev
```

测试：

```text
http://localhost/api/health
```

## 说明

- 原 `backend/` 仍保留，可继续部署到 Vercel 作为备用。
- CloudBase 使用 `cloudbase-backend/`，不会影响现有前端和数据库。
- 数据仍保存在原 TiDB Cloud 中，不需要迁移数据。

## CloudBase 构建说明（v1.0.1）

本目录不提交 `package-lock.json`。Docker 构建时使用国内 npm 镜像安装依赖，避免 CloudBase 构建节点访问外部或私有镜像超时。Dockerfile 使用单次依赖安装，完成 TypeScript 构建后再移除开发依赖。
