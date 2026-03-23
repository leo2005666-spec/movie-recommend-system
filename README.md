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
| 个性推荐 · 理由标签 | 推荐页卡片展示短标签（如「口味相近」「热门推荐」等，来自协同过滤/兜底逻辑） | ✓ |
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
- **界面风格**：全站 **浅灰画布 + 白卡片**；**影视库** 主区域 **`main--movie-list` 加宽（约 1680px）**、筛选列靠左、网格 **更大海报 / 约 5 列**、**分页每页 15 部**（5×3 铺满）；卡片为 **TMDB 式左下角好评率圆环**（TMDB 分×10 或站内均分换算，悬停可看说明）+ **标题 + 上映日期**，**不展示片长**；**个性推荐页** 卡片顶部有 **推荐理由小标签**（与 TMDB 商标无关）；**首页最上方**为 **`HomeWelcomeHero`**：白底细搜索条 + 全宽欢迎区（左深右亮蓝青渐变 + 胶囊搜索跳转 **`/movies?keyword=…`**）；横版背景优先从 **`GET /recommend?prefer=popular`** 取片单再请求 **`GET /movies/:id/credits`** 的 `backdrop_path`（TMDB `original`），经 **`/api/proxy-img?u=`** 加载，并用 `Image` 校验宽度 ≥960px，**不清晰则丢弃**；不足时用 `frontend/src/constants/homeHeroFallbacks.js` 中备用高清图，**约 9 秒**轮换一张；详情页仍可评分
- **推荐算法**：协同过滤在 **用户–物品矩阵** 上引入 **时间衰减**（`exp(-λ·天数)`，近期交互权重大）；在 `GET /api/recommendations` 的个性化路径上叠加 **微标签（movie_tags）内容分**，**混合得分 = α·归一化CF + β·标签匹配**（可调 `RECOMMEND_CF_ALPHA` / `RECOMMEND_CONTENT_BETA` / `RECOMMEND_TIME_LAMBDA`）。详见 `backend/src/docs/HYBRID_RECOMMEND.md`
- **管理后台**：**数据概览**（`/admin/dashboard`）展示用户数、影片数、评分/评论/收藏/反馈等统计；**每张统计卡片可点击**进入对应明细（如评论明细 `/admin/explore/comments`、收藏明细 `/admin/explore/favorites`，其余链到用户/影片/评分/反馈管理页）；**个人资料** 仅 **本地上传头像**（jpg/png/gif/webp，≤10MB），**邮箱** 在编辑中填写；**顶栏** 对已登录用户展示 **头像缩略图**（含管理员）；**影视详情评论** 支持 **10 条/页** 与 **加载更多**；**影视库搜索** 关键词匹配 **标题 + 简介 + 导演 + 演员** 字段
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
npm run crawler              # 单次全量同步（多页，见脚本内 PAGES 默认）
npm run crawler:quick        # 单次快速：每源只抓 1 页（适合频繁手动跑）
npm run crawler:cron         # 定时同步：默认 **每 30 分钟** + **快速增量**（每源 1 页）；可用 `TMDB_CRAWLER_CRON` 改计划（如 `*/15 * * * *` 每 15 分钟）
npm run crawler:cron:full    # 定时 **全量**（多页），建议配合较慢的 CRON（如每天一次）
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
- `/api/users/me/ratings` - **GET** 当前用户已评分影片列表（需登录）
- `/api/users/me/comments` - **GET** 当前用户影评列表分页（`page`、`limit`，需登录）
- `/api/actors/:tmdbPersonId` - **GET** TMDB 演员详情（`person`：含 `gender`、`birthday`、`place_of_birth`、`also_known_as`、`homepage`、`imdb_id`、`popularity` 等）+ **`movies`**：本站已入库参演作品 + **`filmography`**：TMDB 参演片单（去重，含 `tmdb_id`、`title`、`release_date`、`release_year_label`、`character`、`poster_thumb`、`in_library`、`local_id`）+ **`tmdb_person_url`**（链到 TMDB 人物页）；需配置 `TMDB_API_KEY`
- `/api/logs` - 活动日志
- `/api/tmdb/lists?kind=upcoming|now_playing|popular&region=CN` - **TMDB 电影列表**（`upcoming`/`now_playing` 带 **`region`**，与 tmdb.org 地区一致；服务端约 **5 分钟**缓存）
- `/api/tmdb/trailer-row?tab=hot|streaming|tv|rent|theaters&region=CN` - **首页「最新预告片」各 Tab**：**全部为未上映/即将上映**（与 TMDB 一致）。电影：`movie/upcoming` 第 1～4 页（`hot`/`streaming`/`rent`/`theaters`）；电视：`discover/tv` + `first_air_date.gte=今天`（尚未首播或即将开播）。缓存键 **v2**，约 **5 分钟** TTL
- `/api/tmdb/rail?type=trending&tab=streaming|tv|rent|theaters&region=CN` - **首页「热门」横条**：`streaming`=`trending/all/day`（混合影视）、`tv`=`tv/on_the_air`、`rent`=`discover/movie` rent、`theaters`=`movie/now_playing`
- `/api/tmdb/rail?type=free&tab=movie|tv&region=CN` - **后端仍可用**（`discover` + `with_watch_monetization_types=free`）；**首页已不展示「可免费观看」区块**
- 上述接口均返回 `media_type`（`movie`|`tv`）、`vote_average`、`release_date` 等；电视剧无本站 `id` 时链 **TMDB**。全量入库仍靠 **`npm run crawler`**。前端可选 **`VITE_TMDB_REGION`**（默认 `CN`）与后端 **`TMDB_REGION`** 对齐
- `/api/movies` - 影视作品列表/CRUD；列表支持：`releaseStatus` —— **影视库侧栏四态**：`popular`（热门，按 `tmdb_vote_count`↓、`tmdb_rating`↓）、`now_playing`（正在上映：`release_date` 在近 **120 天内**且已首映）、`upcoming`（即将上映，同 `unreleased`：未来年或 `release_date` 晚于今天，按发行日升序）、`top_rated`（高分：`tmdb_rating ≥ 6.5`）；兼容旧值 `released` / `unreleased`。**排序**：侧栏四态与 TMDB 一致，**优先按上述模式排序**，不再被 `tasteType` 的人群口味排序覆盖（口味仍参与 WHERE 筛选）。另支持 `orderBy=release_asc`、`typeKeys`（类型多选 AND）、`dateFrom`/`dateTo`、`durationMin`/`durationMax`、`scoreMin`/`scoreMax`、`country`、`tasteType`
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
- `/api/users/me` - **PUT**：`username`、`email`（可空）、`password`（可选）；**不再**通过本接口修改头像 URL
- `/api/users/me/avatar` - **POST** `multipart/form-data`，字段名 **`avatar`**，上传头像（需登录；jpg/png/gif/webp，≤10MB）；成功后 `users.avatar` 存为 `/uploads/avatars/...`，静态文件由后端 **`GET /uploads/...`** 提供
- `/api/admin/dashboard` - 管理员数据概览计数
- `/api/admin/explore/comments` - 管理员分页查看全站评论明细（`page`、`limit`）
- `/api/admin/explore/favorites` - 管理员分页查看全站收藏明细（谁收藏了哪部影片）

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

- **影视库分页**：列表接口与前端默认 **每页 15 条**，便于 5 列网格 **3 行铺满**。
- **演员页**：影视详情「演员阵容」中点击演员进入 **`/actors/:tmdbPersonId`**。布局为 **TMDB 式左栏资料 + 右栏片单**，主内容区 **`actor-page--fullbleed`** 与影视库同档 **加宽（约 1680px）**、**横向铺满**（避免窄容器居中）；**系统无衬线字体栈**（含 Noto Sans SC / 苹方 / 微软雅黑）。侧栏：头像、知名领域、参与作品数、性别/生日/出生地/又名、资料完整度、TMDB/IMDb/官网链接。主区：**AWARDS 横幅**（链 TMDB）、生平简介、**表演作品**表格式列表（年份｜圆点｜标题 + 饰演），支持 **全部 / 仅本站已收录** 与 **排序**；已入库链本站详情，未入库链 TMDB。需后端配置 **TMDB_API_KEY**。
- **个性推荐页**：顶部增加 **沉浸式焦点区**（大背景剧照 + 左文右渐层 + 底部横向海报条），海报条内 **真实推荐与「站内推广位」同卡片样式**（白边高亮当前项），推广文案与图片可在 `frontend/src/constants/recommendSpotlightAds.js` 中配置。
- **首页横幅**：`MovieBanner` 组件仍保留在工程内，但**首页默认不再使用**；首页改为 **TMDB 式全宽布局**（`main--home-tmdb`）：**最上方 `HomeWelcomeHero`**（`frontend/src/components/home/HomeWelcomeHero.jsx`：白底细搜索条 + 全宽欢迎 Hero + 高清横版背景轮换与影视库 `?keyword=` 联动，详见上文「界面风格」）；**「趋势」**（今日=热门榜 / 本周=一周口碑，胶囊切换 + 底部波形装饰 + **固定 175px 宽**横向轮播）、**「最新预告片」**（数据 **`GET /api/tmdb/lists`**（热门/影院）与 TMDB 同步；悬停横条切换宽幅背景；**16:9** 横条，未入库影片链 TMDB；其余 Tab 为本地人群口味）、**「猜你喜欢」**轻量条带；底部 **「影迷热议」** 合并 **真实热门影评** 与 **`constants/mockHomeReviews.js` 虚拟用户**，营造社区氛围（仅展示，不落库）。
- **旧版首页大横幅**：若需恢复轮播，可在 `Home.jsx` 中重新引入 `MovieBanner`。
- **MovieBanner（组件）**：仍可单独使用；数据逻辑见前文「即将上映」说明。
- **头像与登录态**：`GET /users/me` 现返回 **nickname**；前端 **打开站点或登录成功后会再请求 `/users/me`** 写回 `localStorage` 与顶栏头像；`/uploads/` 通过 **`getBackendOrigin()`** 拼绝对地址（优先 **`VITE_API_BASE`** 完整域名推导后端根，或单独配置 **`VITE_UPLOADS_ORIGIN`**，用于 Vercel 前端 + Render 后端分离场景）。与服务端一致时 **跳过重复 `setUser`**，减轻首页重复请求。
- **首页/个性推荐加载**：`GET /recommend?prefer=popular` 与 **`GET /recommendations` 并行**，并 **`normalizeMovieListResponse`** 兼容 `data` 为数组或 `{ list }`；**`useEffect` 依赖 `user?.id`**，避免用户对象引用抖动导致反复拉取。默认请求超时：**`VITE_API_TIMEOUT_MS`**（默认 45000ms）。
- **个人中心**：**我的评分** → `/profile/ratings`，**我的影评** → `/profile/comments`（列表含影片名、分数/正文、时间）。
- **协同过滤增强**：`collabFilter.js` 使用 **时间加权矩阵** + **标签混合重排**；推荐理由可出现 **「混合推荐」**。
- **个人头像**：仅 **本地上传**（`POST /api/users/me/avatar`，单张 **≤10MB**），**不再提供头像外链输入**；开发环境 Vite 需代理 **`/uploads`** 到后端以便预览上传图。
- **个人资料页**：默认 **仅展示**；点击 **「编辑」** 后出现 **相机换头像**、用户名、**邮箱**、密码；**邮箱显示在头像正下方**；宽屏下 **双列卡片网格** 铺满主内容区。
- **管理端数据概览**：各统计卡片可点击；**评论 / 收藏** 进入 **`/admin/explore/comments`**、**`/admin/explore/favorites`** 分页明细表。
- **影视详情 · 推荐观看**：TMDB 返回的推荐片若未在本库入库则无本地 `id`。现逻辑为：只把**已入库**的 TMDB 推荐做成可点进本站的卡片，并与「相似推荐」去重合并展示，避免出现「有海报但点不进去」。
- **影视详情 · 评论**：原「评价 / 讨论」两个 Tab 内容相同，已合并为一块「评论」区域。
- **问答社区**：顶部导航与 `/qa` 路由已移除；后端 `/api/qa` 未删，需要时可再挂回前端。
- **评论删除**：`DELETE /api/comments/:id`，仅评论作者本人；详情页与首页热门影评对自己发的评论显示「删除」。
- **反馈管理**：管理员 `GET /api/feedbacks` 始终返回全表，可重复刷新查看；`DELETE /api/feedbacks/:id` 物理删除单条反馈。
- **影视库筛选**：侧栏顶部 **「电影」** 为深蓝标题 + 白卡片竖排四选项（**热门 / 正在上映 / 即将上映 / 高分**），对应后端 `releaseStatus` 与排序/条件见上文接口说明；卡片海报下为 **粗黑标题 + 灰色上映日期**（`MovieCard` `variant="library"`，无日期则显示「日期待定」）。**时长**：双滑块 **0–360 分钟**。**已从前台移除**：旧版「全部/已上映/未上映」单选、制片国家下拉等（后端仍兼容 `released`/`unreleased`）。**TMDB 同步**：`npm run crawler`；已有库可 **`npm run backfill-origin`**。
- **为何以前像「小众片」、现在更像 TMDB 热门**：库内若长期按 **`id` 新** 或 **站内评分少** 排序，会排到冷门老片。已改为 **热门/冷启动/补足** 统一优先 **`tmdb_vote_count` → `tmdb_rating` → 年份`**；协同过滤结果增加 **投票数加权**，避免全是低曝光片；**首页轮播** 单独请求 **`/api/recommend?prefer=popular`**，始终拉 TMDB 向热门作品。若仍偏冷：请运行 **`npm run crawler`** 同步更多 TMDB 热门数据并确保 **`tmdb_vote_count` 已写入**。
- **人群口味（影视库 vs 个性推荐）**：同一套 `tasteType` 预设，但影视库列表改为 **须同时命中预设「分类之一」与「标签之一」**（AND），排序为 **TMDB 分 ↓、投票数 ↓、年份 ↑**，更易出现高分与经典感；个性推荐页在结果不足时仍会 **热门补足**。
- **影视详情 Hero**：**TMDB 第二张参考**——左侧海报 + 右侧信息列，**横向渐变直接压在剧照上**（左深右浅），**白字 + 轻阴影**；**不用**整块圆角半透明「信息玻璃盒」（避免第三张参考那种装箱感）。剧照由后端 **`original` backdrop**；无横版时用封面 **`?w=1280`** 弱背景。评分旁装饰表情为纯展示（`pointer-events: none`）。
- **演员阵容**：横向滚动，**上剧照下姓名/角色**，白底圆角卡片、轻阴影；演员头像接口使用 TMDB **`w342`** 以适配较大卡片。
- **详情页版式（TMDB 式）**：顶部 Hero 仍为深色剧照条；**下方主内容区为白底**（`main--movie-detail` + `detail-page--tmdb-light`），评论/侧栏/关键词等为浅色主题，与全站浅色画布一致。
- **前端性能**：路由 **`React.lazy` + `Suspense`** 按页拆包；`vite` 将 `react/react-dom/react-router-dom` 打入 **`vendor-react`** chunk；首页进入动画缩短；详情页评论/演职员/相似推荐改为 **`Promise.all` 并行**；首屏加载用轻量骨架占位。
- **顶栏交互**：导航改为 **`position: fixed`**，`main` 增加 **`padding-top`** 避免内容被挡；**向下滚动**约 8px 以上时顶栏收起（`header--scroll-hidden`），**向上滚动**或回到页面顶部时重新显示。后端异常时的红条 **`api-status-banner`** 固定在最顶，顶栏在其下方（`:has` 调整 `padding-top` / `top`）。
- **首页轮播（TMDB Hero）**：**与主内容区同宽**（`movie-banner--contained`）、**无横向溢出**；高清封面 `cover` 铺满、**无磨砂模糊**；**深蓝左向右渐变遮罩** + **白字**；数据 **`prefer=popular`**。首页「为你推荐」与影视库、个性推荐共用 **`movie-grid--tmdb-list`**（大屏约 **5 列**铺满，减少两侧留白）。
- **观影平台图标**：国内常无法直连 `image.tmdb.org` / Clearbit，新增后端 **`GET /api/proxy-img?u=`**（仅允许白名单域名），前端 **`ProviderIcon`** 优先走代理，并增加 **Google favicon** 备用链；TMDB logo 尺寸改为 **w185**。
- **影视库平台列表去重**：`STREAM_PROVIDERS` 由原始表经 **相同 logoPath、相同展示名** 去重后导出，减少界面重复项（如双 Amazon、同图多 ID）。
- **详情顶栏遮挡**：后写的 `.detail-page` 负 margin 会覆盖浅色详情样式，已用 **`.main--movie-detail .detail-page.detail-page--tmdb-light { margin: 0 }`** 修正，并略增 **`main--movie-detail` 的 padding-top** 与 Hero 内容区上内边距。
- **影视库布局**：根节点 **`movie-list-page--tmdb`**，浅灰底上的 **白侧栏 + 白主列表区**（与 TMDB 列表页协调）。**分页**使用 **`btn-outline`**。
- **详情加载**：`DetailPageLoading` 使用 **`position: fixed`** 铺满顶栏下方视口（**`100dvh`/`safe-area` 友好**），**flex 水平垂直居中**浅色卡片；有 **`api-status-banner`** 时同步下移顶边距；`main` 设 **`min-height`** 减轻结束加载时高度跳动。
- **全站背景与详情画布**：`BackgroundFX` 渐变改为 **左右对称**、动画仅微缩放，遮罩用 **均匀 `--bg-canvas` 系**；**`main--movie-detail`** 背景改为 **`var(--bg-canvas)`**（不再单独 `#e8eaed`），避免与浏览器两侧 gutter 冷暖不一致。
- **详情白区字体**：`detail-body` 与侧栏标题/正文 **字重与灰阶统一**（侧栏标签取消全大写），与首页区块标题层级一致。
- **推荐观看**：TMDB 链与相似推荐 **统一为 `MovieCard`**，横向 **`rec-carousel` 固定约 148px 宽**，标题/年份用 **深灰字**，避免浅灰字贴在白底海报下看不清。
- **封面 URL**：`getCoverUrl(movie)` **仅需 `movie.id`**（不再要求 `cover` 字段有值），便于推荐卡片只带 id 即可走后端代理。
