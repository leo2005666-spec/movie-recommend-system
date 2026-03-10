/**
 * 用户活动日志中间件
 * 记录用户操作用于审计和监控
 */
const db = require('../db/db');

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
}

/**
 * 记录活动日志
 * @param {object} req - 请求对象
 * @param {string} action - 操作类型
 * @param {string} targetType - 目标类型 (movie, user, category 等)
 * @param {number} targetId - 目标ID
 * @param {string} detail - 补充说明
 */
async function logActivity(req, action, targetType = null, targetId = null, detail = null) {
  try {
    const userId = req.user?.id || null;
    const ip = getClientIP(req);
    await db.prepare(`
      INSERT INTO activity_logs (user_id, action, target_type, target_id, detail, ip)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, action, targetType, targetId, detail, ip);
  } catch (err) {
    console.error('[Log] 记录活动日志失败:', err.message);
  }
}

module.exports = { logActivity, getClientIP };
