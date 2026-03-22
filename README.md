# 影视个性化推荐平台

一个基于影视作品的个性化推荐系统，支持用户管理、影视信息维护、智能推荐和丰富的用户交互功能。

> **在线访问**：👉 [项目链接.md](./项目链接.md) 可查看网站地址（含国内 Gitee 线）  
> **首次了解本项目？** 请先看 [访问说明.md](./访问说明.md)：网站能否直接打开、为何有时打不开、Render / Vercel / Turso 各是什么，一眼看懂。  
> **国内部署**：按 [GITEE_DEPLOY.md](./GITEE_DEPLOY.md) 可部署到 Gitee Pages，国内用户无需梯子即可访问。

## 功能模块总览

### （1）用户管理功能
| 功能 | 说明 | 实现状态 |
|------|------|----------|
| 用户登录/注册 | 提供登录和注册页面，密码加密存储 | ✓ |
| 用户信息管理 | 查看、修改个人信息，API支持增删查改 | ✓ |
| 权限管理 | 管理员/普通用户等不同角色，不同权限 | ✓ |
| 用户活动日志 | 记录用户操作，审计和监控，前端可查看 | ✓ |

### （2）影视作品信息管理功能
| 功能 | 说明 | 实现状态 |
|------|------|----------|
| 影视作品维护 | 新增、修改、删除影视作品 | ✓ |
| 分类与标签管理 | 按类型、题材分类，便于管理和浏览 | ✓ |
| 作品详情展示 | 展示影视作品详细介绍 | ✓ |

### （3）推荐与结果展示功能
| 功能 | 说明 | 实现状态 |
|------|------|----------|
| 个性化推荐 | 根据推荐算法展示个性化列表 | ✓ |
| 人群口味推荐 | 学生党、上班族、家庭亲子、情侣约会、资深影迷等快捷标签筛选 | ✓ |
| 榜单 | 一周口碑榜、高分榜、热门榜，独立榜单页 + 首页展示 | ✓ |
| 热门影评 | 跨作品最新评论展示，支持长评（最多 2000 字） | ✓ |
| 推荐结果更新 | 根据用户最新行为动态调整 | ✓ |
| 推荐结果反馈 | 评分等方式反馈，辅助优化 | ✓ |
| 用户评分驱动推荐 | 普通用户评分 → 管理员可查看汇总 → 推荐页根据个人评分推荐可能感兴趣的电影 | ✓ |

### （4）用户交互与反馈功能
| 功能 | 说明 | 实现状态 |
|------|------|----------|
| 评分与收藏 | 对影视作品评分和收藏 | ✓ |
| 问题咨询与解答 | ~~问答社区~~ 已从前台关闭（导航与路由已移除）；后端 `/api/qa` 仍保留，若需恢复可再加路由 | — |
| 用户反馈 | 意见反馈渠道；管理员后台可**随时刷新**查看全部历史，可**删除**单条反馈 | ✓ |
| 简单评论 | 对影视作品进行简要评价；**登录用户可删除自己的评论** | ✓ |

## 技术栈

- **前端**：React 18 + Vite + React Router + Phosphor Icons（图标）
- **界面风格**：首页 / 个性推荐 / 影视库采用 **TMDB 风格深蓝 + 青绿渐变** 画布；首页顶部轮播为 **全宽高清底图 + 深色渐变遮罩（无磨砂模糊）**；影视库筛选含 **时长（0–360 分钟）双滑块**；列表卡片展示 **上映日期 + 片长**，不展示 TMDB 评分圆环（详情页仍可评分与查看 TMDB 信息）
- **字体**：Plus Jakarta Sans + Noto Sans SC（Google Fonts，高级无衬线风格）
- **后端**：Node.js + Express
- **数据库**：sql.js（纯 JavaScript 实现的 SQLite，**无需 Visual Studio 编译**，Windows 可直接运行）
- **认证**：JWT + bcrypt 密码加密

## 快速开始

### 环境要求
- Node.js 18+ 
- npm 或 yarn

### 安装与运行

```bash
# 1. 安装后端依赖
cd backend && npm install

# 2. 初始化数据库（自动创建表结构）
npm run init-db

# 3. 启动后端服务（端口 3001）
npm run dev

# 4. 新开终端，安装前端依赖
cd frontend && npm install

# 5. 启动前端开发服务器（端口 5173）
npm run dev
```

浏览器访问：http://localhost:5173

### 部署到互联网（生成可分享链接）

详见 [DEPLOY.md](./DEPLOY.md)，包含：完整部署步骤、代码更新后重新部署、404/登录失败等故障排查、换平台配置。支持 **Turso 云数据库** 实现数据持久化（Render 重启后数据不丢失）。

**平台说明**：前端用 **Vercel**（网页托管）、后端用 **Render**（程序托管）、数据库可选 **Turso**（云数据库）。详见 [访问说明.md](./访问说明.md)。

**若线上网页没有反应**：多为 Vercel 未配置 `VITE_API_BASE`。在 Vercel 项目 Settings → Environment Variables 添加 `VITE_API_BASE` = `https://你的后端.onrender.com/api`，然后 Redeploy。若页面顶部出现红色提示条，说明后端不可达，按提示检查。**长时间未访问后首次打开需等 30～50 秒**（Render 免费版休眠冷启动），属正常现象。

### 默认账号
- 管理员：admin / admin123
- 普通用户：user / user123

### 注册与账号
- **注册**：用户名+密码即可注册，支持选填昵称。无邮箱、无验证码

### 从公用电影数据库获取影片（含封面）

支持两种数据源，任选其一：

#### 方案一：OMDb（推荐，注册最简单）

- 申请：https://www.omdbapi.com/apikey.aspx
- 只需**填写邮箱**，选 FREE（1000次/天），Key 会发到邮箱
- 无需填应用概述、无需审核

```bash
cd backend
set OMDB_API_KEY=你的key
npm run fetch-movies-omdb
```

#### 方案二：TMDB

- 申请：https://www.themoviedb.org/settings/api
- 需填应用 URL、应用概述等
- 数据更丰富，支持中文

```bash
cd backend
set TMDB_API_KEY=你的key
npm run fetch-movies
```

**注意**：运行前请先停止后端服务，完成后重启

**往线上导入**：若使用 Turso 云数据库，在本地同时设置 `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`（与 Render 相同）和 `OMDB_API_KEY`，再运行上述命令，电影会写入线上数据库。

### TMDB 电影同步脚本（推荐，数据最全）

使用 TMDB 官方 API（非爬虫），支持：电影名、评分、海报、简介、导演、演员、年份、片长。数据源：热门、高分、正在上映、即将上映，约 400+ 部。

```bash
cd backend
set TMDB_API_KEY=你的key
npm run crawler              # 单次同步
npm run crawler:cron         # 启动定时任务（每 6 小时同步）
```

**为何选 TMDB 不选豆瓣**：豆瓣无公开 API，爬虫易被封且违反 ToS；TMDB 官方接口稳定、数据完整、支持中文。

**往线上 Turso 同步**：设置 `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN` 后运行，数据会写入线上库。

**本地 ETIMEDOUT**：若本地网络无法访问 TMDB，可用 GitHub Actions 同步：仓库 → Settings → Secrets 添加 `TMDB_API_KEY`、`TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`，然后 Actions → Sync Movies from TMDB → Run workflow。

### 删除无封面电影

```bash
cd backend
npm run remove-no-cover
```

### 将电影标题和简介改为中文（本地映射）

使用本地映射表将常见电影的标题和简介替换为中文，**无需联网**。导演、演员等字段保持不变。

```bash
cd backend
# 请先停止后端服务
npm run translate-chinese
```

- 映射表位于 `backend/scripts/movie-zh-mapping.json`，可按需添加更多条目
- 格式：`"英文片名 (年份)"` → `{ "title": "中文片名", "description": "中文简介" }`
- 未在映射表中的电影保持原名和原简介

### 补充缺失的电影封面

为没有封面或豆瓣链接失效的电影从 OMDb 拉取海报：

```bash
cd backend
# 请先停止后端
set OMDB_API_KEY=你的key
npm run fill-covers
```

## 项目结构

```
毕设/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── db/             # 数据库相关
│   │   ├── routes/         # API 路由
│   │   ├── middleware/     # 中间件（认证、权限、日志）
│   │   └── utils/          # 工具函数
│   └── data/               # SQLite 数据库文件
├── frontend/               # 前端应用
│   └── src/
│       ├── pages/          # 页面组件
│       ├── components/     # 公共组件
│       └── api/            # API 调用
└── README.md
```

## API 接口说明

详见各模块路由文件注释，主要接口包括：
- `/api/auth` - 登录、注册
- `/api/users` - 用户信息管理
- `/api/users/me/stats` - 当前用户统计（收藏、评分、影评数量）
- `/api/logs` - 活动日志
- `/api/movies` - 影视作品列表/CRUD；列表支持：`releaseStatus`、`typeKeys`（类型多选 AND）、`dateFrom`/`dateTo`、`durationMin`/`durationMax`（片长分钟）、`scoreMin`/`scoreMax`、`country`（可选）、`tasteType`（人群口味）
- `/api/categories` - 分类管理
- `/api/tags` - 标签管理
- `/api/recommend` - 个性化推荐（`tasteType`、`limit`≤80；**`prefer=popular`** 时固定按 TMDB 投票数/评分排序，供首页轮播）
- `/api/recommend/tastes` - 人群口味预设列表（学生党、上班族、家庭、情侣、影迷等）
- `/api/charts` - 榜单（`type=weekly|top|hot`：一周口碑榜、高分榜、热门榜）
- `/api/charts/all` - 一次性获取全部榜单
- `/api/comments/hot` - 热门影评（跨作品最新评论）
- `/api/ratings` - 评分
- `/api/favorites` - 收藏
- `/api/comments` - 评论（`DELETE /api/comments/:id` 删除**本人**评论）
- `/api/qa` - 问答接口（**前台已不展示**；页面与导航已移除，接口仍可用）
- `/api/feedbacks` - 用户反馈（`GET /me` 本人列表；`GET /` 管理员全部；`PATCH /:id` 改状态；`DELETE /:id` **管理员删除**）

## 人群口味说明

系统预设五类人群口味，便于用户快速筛选和推荐：

| 口味 | 适用人群 | 偏好类型/标签 |
|------|----------|---------------|
| 学生党 | 学生群体 | 喜剧、动画；治愈、热门、高分 |
| 上班族 | 上班族解压 | 喜剧；治愈、热门 |
| 家庭亲子 | 家庭观影 | 动画；治愈、经典 |
| 情侣约会 | 情侣观影 | 爱情；高分、经典 |
| 资深影迷 | 影迷向 | 科幻、悬疑；烧脑、经典 |

前端首页、推荐页、影视库均提供人群口味快捷标签，点击即可按人群偏好筛选。推荐数量默认 36 条，支持最多 80 条。

## 榜单与影评说明

参考 [豆瓣电影](https://movie.douban.com/) 的榜单与影评展示形式，**数据全部来自本平台用户**，不涉及爬取第三方：

- **一周口碑榜**：过去 7 天内有新评分的电影，按口碑排序
- **高分榜**：历史评分最高的电影
- **热门榜**：评分人数最多的电影
- **热门影评**：最新发表的评论，支持长评（最多 2000 字），首页与影视详情页展示

## 权限说明

- **普通用户**：浏览、评分、收藏、评论、反馈、查看个人日志
- **管理员**：以上全部 + 影视作品管理、分类标签管理、用户管理、查看所有日志

---

## 功能覆盖自检清单

根据需求文档逐项核对，确保功能完整实现：

### （1）用户管理功能 ✓

| 需求项 | 实现方式 | 状态 |
|--------|----------|------|
| 用户登录/注册 | 前端 Login/Register 页面，后端 `/api/auth/login`、`/api/auth/register`，密码 bcrypt 加密 | ✓ |
| 用户信息管理 | 前端 Profile 页面，后端 `/api/users/me` GET/PUT，支持增查改 | ✓ |
| 权限管理 | `user` / `admin` 角色，requireAdmin 中间件，前端 ProtectedRoute | ✓ |
| 用户活动日志 | 后端 logActivity 记录，`/api/logs/me` 用户查看，`/api/logs` 管理员查看 | ✓ |

### （2）影视作品信息管理功能 ✓

| 需求项 | 实现方式 | 状态 |
|--------|----------|------|
| 影视作品维护 | 管理员后台影视 CRUD，`/api/movies` | ✓ |
| 分类与标签管理 | `/api/categories`、`/api/tags`，影视列表/详情支持筛选展示 | ✓ |
| 作品详情展示 | `/movies/:id` 页面，展示完整信息 | ✓ |

### （3）推荐与结果展示功能 ✓

| 需求项 | 实现方式 | 状态 |
|--------|----------|------|
| 个性化推荐展示 | `/api/recommend` 基于评分/收藏/分类偏好生成列表 | ✓ |
| 人群口味推荐 | `tasteType` 参数（student/worker/family/couple/buff），首页/推荐页/影视库快捷标签 | ✓ |
| 推荐结果更新 | 用户行为变化后再次请求即得到新结果 | ✓ |
| 推荐结果反馈 | 评分接口 `/api/ratings`，推荐算法使用评分数据 | ✓ |

### （4）用户交互与反馈功能 ✓

| 需求项 | 实现方式 | 状态 |
|--------|----------|------|
| 评分与收藏 | `/api/ratings`、`/api/favorites`，影视详情页操作 | ✓ |
| 问题咨询与解答 | 前台已下线；后端 `/api/qa` 仍支持提问和回答 | — |
| 用户反馈 | `/api/feedbacks`，支持匿名/登录反馈，管理员可查看处理 | ✓ |
| 简单评论 | `/api/comments`，影视详情页单一「评论」区（原评价/讨论 Tab 已合并） | ✓ |

---

## 近期调整说明（维护备忘）

- **影视详情 · 推荐观看**：TMDB 返回的推荐片若未在本库入库则无本地 `id`。现逻辑为：只把**已入库**的 TMDB 推荐做成可点进本站的卡片，并与「相似推荐」去重合并展示，避免出现「有海报但点不进去」。
- **影视详情 · 评论**：原「评价 / 讨论」两个 Tab 内容相同，已合并为一块「评论」区域。
- **问答社区**：顶部导航与 `/qa` 路由已移除；后端 `/api/qa` 未删，需要时可再挂回前端。
- **评论删除**：`DELETE /api/comments/:id`，仅评论作者本人；详情页与首页热门影评对自己发的评论显示「删除」。
- **反馈管理**：管理员 `GET /api/feedbacks` 始终返回全表，可重复刷新查看；`DELETE /api/feedbacks/:id` 物理删除单条反馈。
- **影视库筛选**：「已上映/未上映」按 `release_year` 与当前年比较。**时长**：双滑块 **0–360 分钟**（`durationMin`/`durationMax`，对应库字段 `duration`）。**已从前台移除**：制片国家下拉、用户评分（TMDB）滑块（后端 `country`/`scoreMin`/`scoreMax` 仍可作为 API 兼容保留）。**TMDB 同步**：`npm run crawler` 写入制片国等；已有库可 **`npm run backfill-origin`**。**已移除**：观看平台网格、语言筛选、最少投票滑块。
- **为何以前像「小众片」、现在更像 TMDB 热门**：库内若长期按 **`id` 新** 或 **站内评分少** 排序，会排到冷门老片。已改为 **热门/冷启动/补足** 统一优先 **`tmdb_vote_count` → `tmdb_rating` → 年份`**；协同过滤结果增加 **投票数加权**，避免全是低曝光片；**首页轮播** 单独请求 **`/api/recommend?prefer=popular`**，始终拉 TMDB 向热门作品。若仍偏冷：请运行 **`npm run crawler`** 同步更多 TMDB 热门数据并确保 **`tmdb_vote_count` 已写入**。
- **人群口味（影视库 vs 个性推荐）**：同一套 `tasteType` 预设，但影视库列表改为 **须同时命中预设「分类之一」与「标签之一」**（AND），排序为 **TMDB 分 ↓、投票数 ↓、年份 ↑**，更易出现高分与经典感；个性推荐页在结果不足时仍会 **热门补足**。
- **影视详情 Hero**：**TMDB 第二张参考**——左侧海报 + 右侧信息列，**横向渐变直接压在剧照上**（左深右浅），**白字 + 轻阴影**；**不用**整块圆角半透明「信息玻璃盒」（避免第三张参考那种装箱感）。剧照由后端 **`original` backdrop**；无横版时用封面 **`?w=1280`** 弱背景。评分旁装饰表情为纯展示（`pointer-events: none`）。
- **演员阵容**：横向滚动，**上剧照下姓名/角色**，白底圆角卡片、轻阴影；演员头像接口使用 TMDB **`w342`** 以适配较大卡片。
- **详情页版式（TMDB 式）**：顶部 Hero 仍为深色剧照条；**下方主内容区为白底**（`main--movie-detail` + `detail-page--tmdb-light`），评论/侧栏/关键词等为浅色主题，与全站浅色画布一致。
- **前端性能**：路由 **`React.lazy` + `Suspense`** 按页拆包；`vite` 将 `react/react-dom/react-router-dom` 打入 **`vendor-react`** chunk；首页进入动画缩短；详情页评论/演职员/相似推荐改为 **`Promise.all` 并行**；首屏加载用轻量骨架占位。
- **顶栏交互**：导航改为 **`position: fixed`**，`main` 增加 **`padding-top`** 避免内容被挡；**向下滚动**约 8px 以上时顶栏收起（`header--scroll-hidden`），**向上滚动**或回到页面顶部时重新显示。后端异常时的红条 **`api-status-banner`** 固定在最顶，顶栏在其下方（`:has` 调整 `padding-top` / `top`）。
- **首页轮播（TMDB Hero）**：**全宽高清封面/剧照**、`object-fit: cover` 铺满、**无磨砂模糊**；**深蓝左向右渐变遮罩** + **白字**；CTA 为 **青绿渐变按钮**；轮播数据为 **`prefer=popular`** 热门片。首页/推荐/影视库外层使用 **`tmdb-page-theme`** 深蓝渐变画布。
- **观影平台图标**：国内常无法直连 `image.tmdb.org` / Clearbit，新增后端 **`GET /api/proxy-img?u=`**（仅允许白名单域名），前端 **`ProviderIcon`** 优先走代理，并增加 **Google favicon** 备用链；TMDB logo 尺寸改为 **w185**。
- **影视库平台列表去重**：`STREAM_PROVIDERS` 由原始表经 **相同 logoPath、相同展示名** 去重后导出，减少界面重复项（如双 Amazon、同图多 ID）。
- **详情顶栏遮挡**：后写的 `.detail-page` 负 margin 会覆盖浅色详情样式，已用 **`.main--movie-detail .detail-page.detail-page--tmdb-light { margin: 0 }`** 修正，并略增 **`main--movie-detail` 的 padding-top** 与 Hero 内容区上内边距。
- **影视库布局**：根节点 **`movie-list-page--tmdb tmdb-page-theme`**，深蓝渐变背景上的半透明侧栏/主区卡片；列表卡片信息区仍为白底。**分页**使用 **`btn-outline`**。
- **详情加载**：`DetailPageLoading` 使用 **`position: fixed`** 铺满顶栏下方视口（**`100dvh`/`safe-area` 友好**），**flex 水平垂直居中**浅色卡片；有 **`api-status-banner`** 时同步下移顶边距；`main` 设 **`min-height`** 减轻结束加载时高度跳动。
- **全站背景与详情画布**：`BackgroundFX` 渐变改为 **左右对称**、动画仅微缩放，遮罩用 **均匀 `--bg-canvas` 系**；**`main--movie-detail`** 背景改为 **`var(--bg-canvas)`**（不再单独 `#e8eaed`），避免与浏览器两侧 gutter 冷暖不一致。
- **详情白区字体**：`detail-body` 与侧栏标题/正文 **字重与灰阶统一**（侧栏标签取消全大写），与首页区块标题层级一致。
- **推荐观看**：TMDB 链与相似推荐 **统一为 `MovieCard`**，横向 **`rec-carousel` 固定约 148px 宽**，标题/年份用 **深灰字**，避免浅灰字贴在白底海报下看不清。
- **封面 URL**：`getCoverUrl(movie)` **仅需 `movie.id`**（不再要求 `cover` 字段有值），便于推荐卡片只带 id 即可走后端代理。
