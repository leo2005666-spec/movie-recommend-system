/**
 * 推荐系统共享工具：每日种子、伪随机、语言过滤
 * 供 collabFilter / recommendFallback / recommendations / recommend 共用
 */

/** 仅推荐中英文电影（ISO 639-1 两字母码，兼容 zh-CN/zh-TW 等子标签） */
const LANG_FILTER = "m.original_language IN ('en', 'zh') OR m.original_language LIKE 'zh-%'";

/** JS 端语言过滤谓词 */
function isAllowedLanguage(lang) {
  if (!lang) return false;
  const s = String(lang).toLowerCase();
  return s === 'en' || s === 'zh' || s.startsWith('zh-');
}

/** 每日种子值（年月日拼接整数，同一天不变） */
function dailySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** 确定性伪随机数 x ∈ [0, 1)，基于 movieId + 种子 */
function seededRandom(movieId, seed) {
  const x = Math.sin((movieId * 9301 + seed * 49297) * 0.0123) * 49297;
  return x - Math.floor(x);
}

/** seededRandom 的抖动变体 x ∈ [-1, 1] */
function seededJitter(movieId, seed) {
  return seededRandom(movieId, seed) * 2 - 1;
}

/** 每日随机排序 SQL ORDER BY 片段 */
function dailyRandomOrder(seed) {
  const a = (seed * 9301 + 49297) % 10007;
  const b = (seed * 49297 + 233280) % 10007;
  return `((m.id * ${a} + ${b}) % 10007)`;
}

module.exports = {
  LANG_FILTER,
  isAllowedLanguage,
  dailySeed,
  seededRandom,
  seededJitter,
  dailyRandomOrder,
};
