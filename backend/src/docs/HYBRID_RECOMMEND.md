# 混合推荐与时间衰减说明

## 1. 数据前提

| 数据 | 时间戳 | 用途 |
|------|--------|------|
| `ratings.created_at` | ✓ | 评分 × 时间衰减 → 用户向量 & 标签偏好 |
| `favorites.created_at` | ✓ | 收藏视为高分交互，参与衰减与标签聚合 |
| `comments.created_at` | ✓ | 参与协同矩阵（弱权重 3.5） |
| `movie_tags` | — | 微标签（与 `tags` 表关联），用于内容侧得分 |

## 2. 时间衰减

对每条交互计算：

\[
w = v \cdot e^{-\lambda \cdot \Delta t}
\]

- \(v\)：评分分值 / 收藏=5 / 评论=3.5  
- \(\Delta t\)：距今天数（非负）  
- \(\lambda\)：环境变量 `RECOMMEND_TIME_LAMBDA`，默认 `0.012`（约 58 天衰减到约 `e^-0.7`）

用户–物品矩阵中的值为「同一用户–影片」多条交互的加权分取 **max**。

## 3. 混合得分

在协同过滤得到候选集（扩增至最多约 150 条）后，对每条候选：

\[
S = \alpha' \cdot \hat{s}_{CF} + \beta' \cdot s_{tag}
\]

- \(\hat{s}_{CF}\)：CF 分数 / 批次内 max（归一化到 0–1）  
- \(s_{tag}\)：用户历史高评分/收藏影片上的标签偏好（同样带时间衰减）与当前影片标签的加权余弦式匹配，∈ [0,1]  
- \(\alpha,\beta\)：环境变量 `RECOMMEND_CF_ALPHA`（默认 0.62）、`RECOMMEND_CONTENT_BETA`（默认 0.38），内部再归一化使 \(\alpha'+\beta'=1\)

若用户无任何可聚合标签（无 ≥3.5 分或未打标签影片），则 \(\beta=0\)，退化为纯 CF。

## 4. 相关代码

- `backend/src/services/collabFilter.js`：`calculateTimeDecayWeight`、`buildWeightedUserItemMatrix`、`getUserTagAffinity`、`mergeHybridPersonalized`
- `backend/src/utils/recommendLabels.js`：`hybrid_mix` → 前端展示「混合推荐」

## 5. 环境变量（可选）

```bash
RECOMMEND_TIME_LAMBDA=0.012
RECOMMEND_CF_ALPHA=0.62
RECOMMEND_CONTENT_BETA=0.38
```
