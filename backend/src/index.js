/**
 * 影视推荐平台 - 后端入口
 * 端口: 3001
 * 使用 sql.js，需先初始化数据库
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function start() {
  const db = require('./db/db');
  await db.init();
  const { run: runInit } = require('./db/init');
  await runInit();

  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json());

  const uploadsRoot = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsRoot));

  const authRouter = require('./routes/auth');
  const usersRouter = require('./routes/users');
  const logsRouter = require('./routes/logs');
  const moviesRouter = require('./routes/movies');
  const categoriesRouter = require('./routes/categories');
  const tagsRouter = require('./routes/tags');
  const recommendRouter = require('./routes/recommend');
  const recommendationsRouter = require('./routes/recommendations');
  const chartsRouter = require('./routes/charts');
  const ratingsRouter = require('./routes/ratings');
  const favoritesRouter = require('./routes/favorites');
  const commentsRouter = require('./routes/comments');
  const qaRouter = require('./routes/qa');
  const feedbacksRouter = require('./routes/feedbacks');
  const adminRouter = require('./routes/admin');
  const actorsRouter = require('./routes/actors');
  const proxyImgRouter = require('./routes/proxyImg');

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/logs', logsRouter);
  app.use('/api/movies', moviesRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/recommend', recommendRouter);
  app.use('/api/recommendations', recommendationsRouter);
  app.use('/api/charts', chartsRouter);
  app.use('/api/ratings', ratingsRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/comments', commentsRouter);
  app.use('/api/qa', qaRouter);
  app.use('/api/feedbacks', feedbacksRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/actors', actorsRouter);

  app.use('/api/proxy-img', proxyImgRouter);

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, message: '服务正常' });
  });

  app.use((err, req, res, next) => {
    console.error('[Error]', err.message);
    res.status(500).json({ code: 500, message: err.message || '服务器错误' });
  });

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`影视推荐平台后端已启动: http://localhost:${PORT}`);
  });

  // 定期保存数据库
  setInterval(() => {
    try {
      db.save();
    } catch (e) {
      console.error('[DB] 保存失败:', e.message);
    }
  }, 30000);

  process.on('SIGINT', () => {
    try {
      db.save();
    } catch (e) {}
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});
