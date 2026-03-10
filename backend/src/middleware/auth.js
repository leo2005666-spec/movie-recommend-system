/**
 * 认证与权限中间件
 */
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const { asyncHandler } = require('../utils/asyncHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'movie-recommend-secret-key-2024';

/**
 * 验证 JWT Token，将用户信息挂载到 req.user
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '请先登录' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.prepare('SELECT id, username, nickname, role FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
});

/**
 * 可选认证：有 token 则解析，无则继续（用于部分接口）
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.prepare('SELECT id, username, nickname, role FROM users WHERE id = ?').get(decoded.userId);
    if (user) req.user = user;
  } catch (_) {}
  next();
});

/**
 * 要求管理员权限
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '需要管理员权限' });
  }
  next();
}

module.exports = { authMiddleware, optionalAuth, requireAdmin, JWT_SECRET };
