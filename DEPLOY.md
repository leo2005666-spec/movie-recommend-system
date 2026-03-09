# 影视推荐平台 - 在线部署指南

将项目部署到互联网，生成可分享的链接，让他人在浏览器中直接使用，功能与本地一致。

## 部署方案概览

| 组件   | 推荐平台      | 免费额度        | 说明                 |
|--------|---------------|-----------------|----------------------|
| 前端   | **Vercel**    | 免费            | 自动构建、全球 CDN   |
| 后端   | **Render**    | 免费（有休眠）  | Node.js，自动重启时数据库重置 |

**注意**：Render 免费版 15 分钟无访问会休眠，首次访问需冷启动约 30 秒；数据库为文件存储，服务重建后数据会重置。

---

## 前置准备

1. 注册 GitHub 账号
2. 将项目推送到 GitHub（若尚未推送）：
   ```bash
   cd e:\毕设
   git init
   git add .
   git commit -m "Initial commit"
   # 在 GitHub 创建仓库后：
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```

3. 注册 [Vercel](https://vercel.com) 和 [Render](https://render.com) 账号（可用 GitHub 登录）

---

## 第一步：部署后端到 Render

1. 登录 [Render](https://dashboard.render.com)
2. 点击 **New** → **Web Service**
3. 连接你的 GitHub 仓库，选择该项目
4. 配置：
   - **Root Directory**：`backend`
   - **Build Command**：`npm install`
   - **Start Command**：`npm run dev`
   - **Instance Type**：Free
5. 点击 **Create Web Service**
6. 等待部署完成，记下生成的 URL，例如：`https://你的服务名.onrender.com`

---

## 第二步：部署前端到 Vercel

1. 登录 [Vercel](https://vercel.com)
2. 点击 **Add New** → **Project**，导入 GitHub 仓库
3. 配置：
   - **Root Directory**：`frontend`
   - **Framework Preset**：Vite
   - **Build Command**：`npm run build`
   - **Output Directory**：`dist`
4. **环境变量**（重要）：
   - 名称：`VITE_API_BASE`
   - 值：`https://你的服务名.onrender.com/api`（第一步得到的后端地址 + `/api`）
5. 点击 **Deploy**
6. 部署完成后会得到前端链接，例如：`https://你的项目.vercel.app`

---

## 第三步：修正 CORS 与 API 地址

前端通过 `VITE_API_BASE` 请求后端，会自动拼接 `/api`。确认 `frontend/src/api/request.js` 使用：

```js
const BASE = import.meta.env.VITE_API_BASE || '/api';
```

请求时会访问：`${BASE}/auth/login` 即 `https://xxx.onrender.com/api/auth/login`。

后端已配置 `cors({ origin: true })`，可接受任意来源请求。

---

## 部署后访问

- **前端地址**：`https://你的项目.vercel.app`（分享给他人）
- **默认账号**：admin / admin123、user / user123
- **注册**：用户名 + 密码即可

---

## 常见问题

### 1. 后端首次请求很慢？
Render 免费版会休眠，冷启动约 30 秒，属于正常现象。

### 2. 数据丢失？
Render 免费版重启或重建时，sql.js 文件数据库会清空，需重新注册或使用默认账号。

### 3. 前端访问后端报跨域错误？
确认后端已正确启动，且 Render 中的服务 URL 可访问。

### 4. 想保留数据？
可使用 Render 付费磁盘，或迁移到 Turso / Neon 等云数据库（需改代码）。

---

## 替代方案：Railway 全栈部署

[Railway](https://railway.app) 可同时部署前后端，免费额度有限。

- 后端：新建 Service，Root 填 `backend`，Start 填 `npm run dev`
- 前端：新建 Service，Root 填 `frontend`，Build 填 `npm run build`，并设置 `VITE_API_BASE` 为后端地址
