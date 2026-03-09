# 用户行为数据梳理

## 1. 数据存储位置

| 表名 | 字段 | 说明 | 接口 |
|------|------|------|------|
| ratings | user_id, movie_id, score, created_at | 用户评分 0.5-5 | POST /api/ratings |
| favorites | user_id, movie_id, created_at | 用户收藏 | POST /api/favorites |
| comments | user_id, movie_id, content, created_at | 用户评论 | POST /api/comments |
| activity_logs | user_id, action, target_type, target_id, created_at | 操作审计 | 内部 logActivity |

## 2. 可用于协同过滤的交互类型

| actionType | 来源表 | value | 权重建议 |
|------------|--------|-------|----------|
| rating | ratings | score (0.5-5) | 直接使用 |
| favorite | favorites | 1 | 等价 5 分 |
| comment | comments | 1 | 等价 3.5 分（隐性正向） |

*注：click/watchlist 当前无存储，可后续通过 recommend_events 埋点补充。*

## 3. 统一交互格式

```json
{
  "userId": 1,
  "movieId": 5,
  "actionType": "rating",
  "value": 4.5,
  "timestamp": "2025-03-03T10:00:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | number | 用户ID |
| movieId | number | 电影ID |
| actionType | string | rating \| favorite \| comment |
| value | number | 评分或权重 |
| timestamp | string | ISO 时间 |
