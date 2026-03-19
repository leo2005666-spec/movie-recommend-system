# Gitee Pages 部署指南 · 国内网络可访问

> 前端同时部署到 **Vercel**（国外）和 **Gitee Pages**（国内），用户按网络情况选择访问地址。

---

## 一、前提

- 已有 Vercel + Render 部署（国外线）
- 后端 API 继续用 Render：`https://你的后端.onrender.com/api`
- 本指南只部署**前端**到 Gitee Pages，API 仍调用 Render

**注意**：国内用户访问 Gitee 页面时，接口请求仍会发到 Render。若 Render 在国内被限速，登录、加载数据可能略慢，但页面能打开。

---

## 二、部署步骤

### 1. 注册 Gitee 并创建仓库

1. 打开 https://gitee.com ，注册/登录
2. 点击 **新建仓库**
3. 仓库名：`movie-recommend-system`（或任意）
4. 选择 **公开**，**不勾选**「使用 Readme 初始化」
5. 创建

### 2. 将代码推送到 Gitee

**方式 A：从 GitHub 导入（推荐）**

1. Gitee 新建仓库时，选择 **导入已有仓库**
2. 填入 GitHub 地址：`https://github.com/leo2005666-spec/movie-recommend-system`
3. 导入后会同步代码

**方式 B：本地添加 Gitee 远程**

```bash
cd e:\毕设
git remote add gitee https://gitee.com/你的用户名/movie-recommend-system.git
git push gitee main
```

### 3. 构建前端

在项目目录执行：

```bash
cd frontend
set VITE_API_BASE=https://movie-recommend-system-aiea.onrender.com/api
npm run build
```

> 若后端地址不同，把 `VITE_API_BASE` 改成你的 Render 地址 + `/api`

构建完成后，`frontend/dist` 目录内是静态文件。

### 4. 配置 Gitee Pages

**方式 A：使用 docs 目录（简单）**

1. 把 `frontend/dist` 里的**全部文件**复制到项目根目录的 `docs` 文件夹
2. 若没有 `docs`，新建并放入
3. 提交并推送：
   ```bash
   git add docs
   git commit -m "添加 Gitee Pages 构建产物"
   git push gitee main
   ```
4. Gitee 仓库 → **管理** → **Gitee Pages**
5. 部署来源选择 **master 分支** 或 **main 分支**
6. 部署目录填：`docs`
7. 点击 **启动**

**方式 B：使用 Pages 分支**

1. 新建分支 `pages`，将 `frontend/dist` 内容推送进去
2. Gitee Pages 选择该分支、根目录部署

### 5. SPA 路由防 404

React Router 使用 History 模式，直接访问 `/movies` 等路径可能 404。解决：

1. 把 `docs/index.html` 复制一份为 `docs/404.html`
2. 提交并推送，Gitee 会优先用 404 页面处理找不到的路径，React 能正确路由

```bash
copy frontend\dist\index.html docs\404.html
git add docs\404.html
git commit -m "Gitee Pages: SPA 路由支持"
git push gitee main
```

### 6. 获取访问地址

部署成功后，Gitee Pages 地址格式：

- `https://你的用户名.gitee.io/movie-recommend-system`
- 或自定义域名（需在 Gitee 绑定）

---

## 三、后续更新

每次前端有改动时：

1. 本地执行 `npm run build`（同上，带上 `VITE_API_BASE`）
2. 把 `frontend/dist` 内容覆盖到 `docs`
3. 复制 `index.html` 为 `404.html`
4. 提交并推送到 Gitee

---

## 四、双线地址对照

| 用户 | 推荐地址 |
|------|----------|
| 国内、无梯子 | Gitee Pages 地址（如 `https://xxx.gitee.io/movie-recommend-system`） |
| 有梯子 / 国外 | Vercel 地址（如 `https://frontend-henna-omega-96.vercel.app`） |

两个地址都指向同一后端，数据一致。

---

## 五、常见问题

1. **Gitee Pages 开启要实名？**  
   Gitee 有时会要求实名，按平台指引完成即可。

2. **部署后页面空白？**  
   检查构建时 `VITE_API_BASE` 是否正确；打开浏览器控制台看接口是否报错。

3. **直接访问子路径 404？**  
   确保已添加 `docs/404.html`（内容与 `index.html` 相同）。
