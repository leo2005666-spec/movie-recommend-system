# Cursor 指令清单 · 把评价建议变成代码

> 把下面每一条「指令」原文复制粘贴到 Cursor 的对话框，Cursor 会直接帮你改对应文件。
> 建议按顺序做，每做完一条先测试、提交，再做下一条。

---

## 【A1】推荐理由展示（改动最小，视觉感最强，优先做）

**要改的文件**：`frontend/src/pages/Recommend.jsx`、`frontend/src/components/MovieCard.jsx`

**Cursor 指令**：

```
我有一个 React + Node.js 的电影推荐系统。

背景：
- 推荐列表由 GET /api/recommendations 返回，响应格式为：
  { code: 0, data: [...movies], source: "collab_filter" | "fallback" | "fallback_error" }
- 人群口味推荐由 GET /api/recommend?tasteType=xxx 返回，无 source 字段。

任务：在推荐页（frontend/src/pages/Recommend.jsx）每张电影卡片底部加一行小字推荐理由：
- 当 source === "collab_filter" 时，显示「✦ 根据你的偏好推荐」
- 当 tasteType 有值时，显示「✦ 人群口味推荐」
- 否则（热门兜底）显示「✦ 热门推荐」

实现方式：
1. 在 Recommend.jsx 中，把 source 和 tasteType 状态传给每张卡片，给 MovieCard 新增一个可选 prop：reasonLabel（字符串）
2. 在 frontend/src/components/MovieCard.jsx 的 .info 块最后，若 reasonLabel 存在则渲染：
   <div className="movie-card__reason">{reasonLabel}</div>
3. 在 frontend/src/index.css 末尾添加样式：
   .movie-card__reason { font-size: 0.7rem; color: var(--accent); margin-top: 2px; opacity: 0.8; }

请直接修改这两个文件，不要改其他文件。
```

---

## 【A2】管理员后台仪表盘（Dashboard）

**要改的文件**：`backend/src/routes/admin.js`、`frontend/src/pages/admin/Dashboard.jsx`（新建）、`frontend/src/App.jsx`、`frontend/src/components/AdminNav.jsx`

**第一步：加后端接口**（Cursor 指令）：

```
在 backend/src/routes/admin.js 文件末尾（module.exports 之前）新增一个接口：

GET /api/admin/stats
需要 requireAdmin 权限（文件顶部已有 router.use(authMiddleware, requireAdmin)）。

返回格式：
{
  code: 0,
  data: {
    totalUsers: number,       // SELECT COUNT(*) FROM users
    totalMovies: number,      // SELECT COUNT(*) FROM movies
    totalRatings: number,     // SELECT COUNT(*) FROM ratings
    totalComments: number,    // SELECT COUNT(*) FROM comments
    totalFavorites: number,   // SELECT COUNT(*) FROM favorites
    todayRatings: number,     // SELECT COUNT(*) FROM ratings WHERE date(created_at) = date('now')
    todayComments: number,    // SELECT COUNT(*) FROM comments WHERE date(created_at) = date('now')
    todayNewUsers: number     // SELECT COUNT(*) FROM users WHERE date(created_at) = date('now')
  }
}

使用项目现有的 asyncHandler 包裹，db.prepare().get() 查询。
不要改其他接口。
```

**第二步：新建 Dashboard 页面**（Cursor 指令）：

```
在 frontend/src/pages/admin/ 目录下新建 Dashboard.jsx。

参考 frontend/src/pages/admin/Users.jsx 的风格（使用 AdminNav、api.get、useState/useEffect）。

页面内容：
1. 顶部 AdminNav 导航
2. 标题「数据概览」
3. 8 个统计卡片，排成两行（用 CSS grid），每个卡片显示：
   - 图标（用 emoji 即可：👤 🎬 ⭐ 💬 ❤️ 📊 🗓️ 🆕）
   - 数字（大字体，颜色用 var(--accent)）
   - 说明文字（小字）
   
   8 个卡片与数据字段的对应关系：
   👤 totalUsers → 标题「注册用户总数」
   🆕 todayNewUsers → 标题「今日新增用户」
   🎬 totalMovies → 标题「影视总数」
   ⭐ totalRatings → 标题「评分总数」
   📊 todayRatings → 标题「今日评分」
   💬 totalComments → 标题「评论总数」
   🗓️ todayComments → 标题「今日评论」
   ❤️ totalFavorites → 标题「收藏总数」

4. 数据从 GET /api/admin/stats 获取

卡片 grid 样式直接写 style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}
每个卡片用 <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>

不要新增 CSS 文件，不要引入新依赖。
```

**第三步：接入路由和导航**（Cursor 指令）：

```
在这个项目中：
- frontend/src/App.jsx 是路由配置文件，管理员路由均用 <ProtectedRoute admin> 包裹
- frontend/src/components/AdminNav.jsx 是管理员导航，有一个 links 数组

请做两处修改：

1. 在 App.jsx 中：
   - 在文件顶部的 lazy import 区域加一行：
     const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
   - 在 admin/movies 路由之前加：
     <Route path="admin" element={<ProtectedRoute admin><AdminDashboard /></ProtectedRoute>} />

2. 在 AdminNav.jsx 中：
   - 在 links 数组最开头插入：
     { to: '/admin', label: '数据概览' }

不要改其他文件。
```

---

## 【B1】评论分页（加载更多）

**要改的文件**：`frontend/src/pages/MovieDetail.jsx`

> 注意：后端 `GET /api/comments/movie/:movieId?page=&limit=` **已经支持分页**，不需要改后端。

**Cursor 指令**：

```
在 frontend/src/pages/MovieDetail.jsx 中，评论区目前是一次性加载所有评论。
后端接口 GET /api/comments/movie/:movieId?page=1&limit=10 已支持分页，
返回格式为 { code: 0, data: { list: [...], total: number, page: number, limit: number } }

请修改 MovieDetail.jsx 中评论相关的逻辑：
1. 初始只加载第 1 页（limit=10），把 comments state 拆分为 comments（列表）+ commentPage（当前页，默认1）+ commentTotal（总数）
2. 把 Promise.all 里的评论请求改为 /comments/movie/${id}?page=1&limit=10
3. 在评论列表底部，若 comments.length < commentTotal，显示一个「加载更多」按钮
4. 点击「加载更多」时，请求下一页并把新评论 append 到现有列表，commentPage +1
5. 「加载更多」按钮样式用 className="btn btn-outline" style={{ margin: '1rem auto', display: 'block' }}

不要改其他逻辑，不要改后端文件。
```

---

## 【B2】用户头像 URL 设置

**要改的文件**：`frontend/src/pages/Profile.jsx`

> 注意：后端 `PUT /api/users/me` 已支持 `avatar` 字段（URL 格式），不需要改后端。

**Cursor 指令**：

```
在 frontend/src/pages/Profile.jsx 中修改用户头像功能。

现状：
- 头像区域显示用户名首字母（.profile-overview__avatar 的文字内容）
- PUT /api/users/me 已支持 avatar 字段（合法 URL），后端会校验是否为 URL 格式
- GET /api/users/me 返回 user.avatar 字段

请做如下修改：
1. 从接口取到 profile 时，把 profile.avatar 存入 state（新增 avatar state）
2. 头像区域：若 profile.avatar 有值，把 <div className="profile-overview__avatar"> 的内容换成
   <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={(e)=>e.target.style.display='none'} />
   没有头像时仍显示首字母
3. 在「个人资料」表单中，「昵称」字段下方新增一个表单项：
   <div className="form-group">
     <label>头像 URL（选填，粘贴图片链接）</label>
     <input className="form-input" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
   </div>
4. handleSubmit 中，若 avatar 有值则加入 body.avatar = avatar

不要改其他文件，不要引入新依赖。
```

---

## 【B3】搜索扩展（补充演员字段）

**要改的文件**：`backend/src/routes/movies.js`

**Cursor 指令**：

```
在 backend/src/routes/movies.js 中，搜索关键字（keyword）的 SQL WHERE 条件目前是：

  conditions.push('(m.title LIKE ? OR m.description LIKE ? OR m.director LIKE ?)');
  const kw = `%${keyword}%`;
  params.push(kw, kw, kw);

movies 表有 actors（演员）字段，但搜索时未包含它。

请把上面两行改为：
  conditions.push('(m.title LIKE ? OR m.description LIKE ? OR m.director LIKE ? OR m.actors LIKE ?)');
  const kw = `%${keyword}%`;
  params.push(kw, kw, kw, kw);

只改这两行，不要改其他逻辑，不要改前端文件。
```

---

## 小提示

- **每条指令独立**，可以单独执行，不依赖前一条
- **A1（推荐理由）** 改动最小（3 个文件，约 15 行），最容易做，答辩效果最好，建议第一个做
- **A2（仪表盘）** 分三步做，每步单独发给 Cursor，做完一步测一步
- **B1/B2/B3** 属于锦上添花，有时间再做
- 做完每条后，启动本地服务（`cd backend && npm run dev` + `cd frontend && npm run dev`）在浏览器验证效果再提交
