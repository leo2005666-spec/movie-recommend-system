# 协同过滤推荐接入说明

## 一、改动文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| backend/src/docs/BEHAVIOR_DATA_SPEC.md | 新增 | 用户行为数据梳理 |
| backend/src/services/collabFilter.js | 新增 | 协同过滤算法实现 |
| backend/src/services/recommendFallback.js | 新增 | 冷启动/fallback 逻辑 |
| backend/src/routes/recommendations.js | 新增 | GET /api/recommendations |
| backend/src/routes/recommend.js | 修改 | 新增 POST /api/recommend/events 埋点 |
| backend/src/db/init.js | 修改 | 新增 recommend_events 表 |
| backend/src/index.js | 修改 | 注册 recommendations 路由 |
| backend/scripts/migrate-recommend-events.js | 新增 | 迁移脚本 |
| frontend/src/pages/Home.jsx | 修改 | 接入 recommendations + 埋点 |
| frontend/src/pages/MovieDetail.jsx | 修改 | 新增「喜欢这部的人也喜欢」区块 + 埋点 |
| frontend/src/pages/Recommend.jsx | 修改 | 为你推荐接入 CF / recommendations，基于用户评分等行为 |
| backend/src/routes/admin.js | 新增 | 管理员 GET /api/admin/ratings 查看用户评分 |
| frontend/src/pages/admin/Ratings.jsx | 新增 | 管理员「用户评分」页面 |

## 二、接口定义

### GET /api/recommendations

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scene | string | 否 | home_personalized \| similar，默认 home_personalized |
| userId | number | 否 | 登录时自动从 token 取 |
| movieId | number | scene=similar 时必填 | 源电影 ID |
| limit | number | 否 | 6-80，默认 12 |

**响应示例：**
```json
{
  "code": 0,
  "data": [
    { "id": 1, "title": "肖申克的救赎", "cover": "...", "description": "...", "release_year": 1994 }
  ],
  "source": "collab_filter"
}
```

**source 取值：** collab_filter | similar_users | content_similar | popular | fallback | fallback_error

### POST /api/recommend/events（埋点）

| 参数 | 类型 | 说明 |
|------|------|------|
| scene | string | 场景：home_personalized 等 |
| movieId | number | 电影 ID |
| eventType | string | exposure \| click \| favorite |

## 三、Fallback 路径

```
home_personalized:
  1. CF 有结果 → 时间衰减加权矩阵 + 微标签混合重排 → 返回（推荐理由可为「混合推荐」）
  2. CF 冷启动/空 → 原有个性化（评分+收藏+分类标签）
  3. 未登录 → 热门推荐
  4. 异常 → 原有个性化/热门

similar:
  1. 物品相似（喜欢该片的用户也喜欢）→ 返回
  2. 空 → 内容相似（同分类/标签）
  3. 仍空 → 热门
```

**算法细节**：见 `backend/src/docs/HYBRID_RECOMMEND.md`（时间衰减 λ、混合权重 α/β）。

## 四、冷启动策略

- 用户交互数 < 3：使用原有个性化逻辑（热门 + 内容相似）
- 无相似用户：fallback 到内容推荐

## 五、测试用例

1. **未登录**：GET /api/recommendations?scene=home_personalized → 返回热门
2. **新用户（无评分/收藏）**：返回 fallback 个性化/热门
3. **有交互用户**：返回 CF 结果或 fallback
4. **similar**：GET /api/recommendations?scene=similar&movieId=1 → 返回相似电影；详情页展示「喜欢这部的人也喜欢」
5. **埋点**：POST /api/recommend/events { scene, movieId, eventType } → code 0

## 六、迁移（已有 DB）

```bash
cd backend
node scripts/migrate-recommend-events.js
```
