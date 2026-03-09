# 影视推荐平台 - 完整部署指南

本文档包含：从零到上线、故障排查、重新部署、换平台等全部操作，**无需再问 AI**。

---

## 一、部署方案概览

| 组件 | 平台 | 免费额度 | 说明 |
|------|------|----------|------|
| 前端 | **Vercel** | 免费 | 自动构建、全球 CDN、支持 SPA 路由 |
| 后端 | **Render** | 免费（有休眠） | Node.js，15 分钟无访问休眠，冷启动约 30 秒 |

**链接有效期**：不删项目则长期有效；Render 休眠后首次访问需等待冷启动。

---

## 二、前置准备

1. **GitHub**：注册并创建仓库
2. **Vercel**：https://vercel.com（GitHub 登录）
3. **Render**：https://render.com（GitHub 登录）

---

## 三、首次完整部署步骤

### 步骤 1：代码推送到 GitHub

```bash
cd e:\毕设   # 或你的项目根目录
git add .
git commit -m "准备部署"
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

### 步骤 2：部署后端到 Render

1. 打开 https://dashboard.render.com
2. **New** → **Web Service**
3. 连接 GitHub 仓库，选择项目
4. 配置：
   - **Root Directory**：`backend`
   - **Build Command**：`npm install`
   - **Start Command**：`npm run dev`
   - **Instance Type**：Free
5. **Create Web Service**
6. 等待部署完成，**记下 URL**：`https://xxx.onrender.com`

### 步骤 3：部署前端到 Vercel

**方式 A：网页操作**

1. 打开 https://vercel.com
2. **Add New** → **Project**，导入 GitHub 仓库
3. 配置：
   - **Root Directory**：`frontend`
   - **Framework Preset**：Vite
   - **Build Command**：`npm run build`
   - **Output Directory**：`dist`
4. **Environment Variables** 添加：
   - 名称：`VITE_API_BASE`
   - 值：`https://xxx.onrender.com/api`（步骤 2 的 URL + `/api`）
5. **Deploy**

**方式 B：命令行**

```bash
cd frontend
npx vercel login          # 首次需在浏览器完成登录
npx vercel --prod --env VITE_API_BASE=https://xxx.onrender.com/api --yes
```

### 步骤 4：确认 SPA 路由配置（防 404）

项目已包含 `frontend/vercel.json`：

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**作用**：直接访问 `/login`、`/movies` 等路径或刷新页面时，由 `index.html` 接管，避免 404。**不要删除此文件**。

---

## 四、代码修改后如何重新部署

### 前端

- **Vercel 已连接 GitHub**：提交并 push 后会自动重新部署
  ```bash
  git add .
  git commit -m "更新内容"
  git push
  ```
- **手动部署**：
  ```bash
  cd frontend
  npx vercel --prod --env VITE_API_BASE=https://你的后端地址.onrender.com/api --yes
  ```

### 后端

- **Render 已连接 GitHub**：push 后自动重新部署
- **Render 控制台**：Dashboard → 你的服务 → **Manual Deploy** → **Deploy latest commit**

### 修改了后端地址

1. Vercel 项目 → **Settings** → **Environment Variables**
2. 修改 `VITE_API_BASE` 为新地址（如 `https://新地址.onrender.com/api`）
3. **Deployments** → 最新部署右侧 **⋮** → **Redeploy**

---

## 五、常见问题与解决办法

### 1. 页面显示 404（刷新或直接打开子路径时）

**原因**：SPA 路由未正确配置。

**解决**：
- 确认 `frontend/vercel.json` 存在且内容正确（见第三节步骤 4）
- 若使用 Netlify，在 `frontend/public` 创建 `_redirects`，内容：`/* /index.html 200`
- 重新部署前端

### 2. 登录/注册无反应、一直加载、或显示超时

**原因**：Render 免费版休眠后冷启动约需 **30–50 秒**，原前端超时 30 秒会提前断开。

**解决**：
- **先等待 30–60 秒**，再点登录/注册（前端已改为 60 秒超时）
- 首次访问或长时间未用后，建议先打开 `https://你的后端.onrender.com/api/health` 预热，看到 `{"ok":true}` 后再操作
- 确认 `VITE_API_BASE` 正确：应为 `https://xxx.onrender.com/api`（含 `/api`）
- 修改环境变量后必须 **Redeploy** 才能生效

### 3. 跨域错误（CORS）

**原因**：后端未允许前端域名。

**解决**：本后端已配置 `cors({ origin: true })`，接受所有来源。若仍报错，检查后端是否正常启动。

### 4. 首次访问很慢（30 秒以上）

**原因**：Render 免费版休眠，冷启动需要时间。

**解决**：属于正常现象，等待即可。如需避免休眠，可升级 Render 付费方案。

### 5. 数据丢失、用户/电影没了

**原因**：Render 免费版重启或重建时，文件数据库会被清空。

**解决**：使用默认账号 admin/admin123、user/user123，或重新注册。需持久化数据可考虑 Render 付费磁盘或云数据库。

### 6. 修改了环境变量但没生效

**原因**：Vite 的环境变量在 **构建时** 注入，修改后必须重新构建。

**解决**：在 Vercel 修改 `VITE_API_BASE` 后，进入 **Deployments** → **Redeploy**。

---

## 六、项目内关键文件说明

| 文件 | 作用 |
|------|------|
| `frontend/vercel.json` | Vercel SPA 路由，防 404，**勿删** |
| `frontend/src/api/request.js` | 使用 `VITE_API_BASE`，开发时用 `/api` 代理 |
| `backend/src/index.js` | 启动时自动初始化数据库 |
| `.gitignore` | 排除 node_modules、database.db 等，避免提交无用文件 |

---

## 七、换用其他平台时的配置

### Netlify（替代 Vercel）

在 `frontend/public` 创建 `_redirects`：

```
/* /index.html 200
```

或在项目根创建 `netlify.toml`：

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "frontend/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

环境变量：`VITE_API_BASE` = `https://后端地址/api`

### Railway（前后端均可）

- 后端：新建 Service，Root 填 `backend`，Start 填 `npm run dev`
- 前端：Root 填 `frontend`，Build 填 `npm run build`，环境变量 `VITE_API_BASE`

### 自建 Nginx

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## 八、快速检查清单

部署后自检：

- [ ] 后端健康检查：`https://后端.onrender.com/api/health` 返回 `{"ok":true}`
- [ ] 前端首页可打开
- [ ] 直接访问 `/login` 不 404
- [ ] 刷新任意页面不 404
- [ ] 登录功能正常（若首次访问慢，等待约 30 秒）
- [ ] 默认账号 admin/admin123 可登录

---

## 九、本项目的在线地址（示例）

- 前端：https://frontend-henna-omega-96.vercel.app
- 后端：https://movie-recommend-system-aiea.onrender.com
- 默认账号：admin / admin123
