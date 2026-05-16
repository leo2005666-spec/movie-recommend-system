/**
 * 数据库初始化脚本 - 使用 sql.js
 */
const path = require('path');
const fs = require('fs');

async function run() {
  const { init, getDb, save } = require('./db');
  await init();
  const db = getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      email TEXT,
      avatar TEXT,
      gender TEXT,
      age INTEGER,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try {
    await db.exec('ALTER TABLE users ADD COLUMN email TEXT');
  } catch (_) {
    /* 旧库已含 email 列 */
  }
  await db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      detail TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      cover TEXT,
      description TEXT,
      release_year INTEGER,
      director TEXT,
      actors TEXT,
      duration INTEGER,
      tmdb_id INTEGER UNIQUE,
      tmdb_rating REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS movie_categories (
      movie_id INTEGER,
      category_id INTEGER,
      PRIMARY KEY (movie_id, category_id),
      FOREIGN KEY (movie_id) REFERENCES movies(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS movie_tags (
      movie_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (movie_id, tag_id),
      FOREIGN KEY (movie_id) REFERENCES movies(id),
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      score REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, movie_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (movie_id) REFERENCES movies(id)
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, movie_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (movie_id) REFERENCES movies(id)
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_movie_shelves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      shelf_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, movie_id, shelf_type),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (movie_id) REFERENCES movies(id)
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      parent_id INTEGER,
      reply_to_user_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (movie_id) REFERENCES movies(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id),
      FOREIGN KEY (reply_to_user_id) REFERENCES users(id)
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS qa_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_answer INTEGER DEFAULT 0,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES qa_posts(id)
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS recommend_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      scene TEXT NOT NULL,
      movie_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (movie_id) REFERENCES movies(id)
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      content TEXT NOT NULL,
      type TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS forum_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      topic_key TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS forum_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      parent_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES forum_replies(id)
    )
  `);

  const bcrypt = require('bcryptjs');
  const adminPass = bcrypt.hashSync('admin123', 10);
  const userPass = bcrypt.hashSync('user123', 10);
  await db.prepare(`
    INSERT OR IGNORE INTO users (username, password, nickname, role)
    VALUES ('admin', ?, '管理员', 'admin'), ('user', ?, '普通用户', 'user')
  `).run(adminPass, userPass);

  try {
    await db.exec('ALTER TABLE users ADD COLUMN avatar_style INTEGER');
  } catch (_) {
    /* 列已存在 */
  }
  try {
    await db.exec('ALTER TABLE users ADD COLUMN avatar_data TEXT');
  } catch (_) {
    /* 列已存在 */
  }
  try {
    await db.exec('ALTER TABLE comments ADD COLUMN images TEXT');
  } catch (_) {
    /* 列已存在 */
  }
  try {
    await db.exec('ALTER TABLE comments ADD COLUMN parent_id INTEGER');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE comments ADD COLUMN reply_to_user_id INTEGER');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE forum_threads ADD COLUMN updated_at DATETIME');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE forum_threads ADD COLUMN topic_key TEXT');
  } catch (_) {}
  await db.exec(`
    UPDATE users SET avatar_style = (ABS(id * 17 + LENGTH(COALESCE(username,''))) % 12)
    WHERE avatar_style IS NULL
  `);

  await db.exec(`
    INSERT OR IGNORE INTO categories (name, description) VALUES
    ('动作', '动作片'), ('喜剧', '喜剧片'), ('爱情', '爱情片'),
    ('科幻', '科幻片'), ('悬疑', '悬疑片'), ('动画', '动画片')
  `);
  await db.exec(`
    INSERT OR IGNORE INTO tags (name) VALUES
    ('高分'), ('经典'), ('热门'), ('新片'), ('治愈'), ('烧脑')
  `);

  // 确保 tmdb_id、tmdb_rating 列存在（兼容旧库，SQLite 不支持 ADD COLUMN 时加 UNIQUE）
  try {
    await db.exec('ALTER TABLE movies ADD COLUMN tmdb_id INTEGER');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE movies ADD COLUMN tmdb_rating REAL');
  } catch (_) {}
  // 影视库高级筛选：发行日、语言、TMDB 投票数、观看平台（TMDB provider id 列表，如 |8|119|）
  try {
    await db.exec('ALTER TABLE movies ADD COLUMN release_date TEXT');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE movies ADD COLUMN original_language TEXT');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE movies ADD COLUMN tmdb_vote_count INTEGER');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE movies ADD COLUMN watch_provider_ids TEXT');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE movies ADD COLUMN origin_countries TEXT');
  } catch (_) {}

  // 旧库补全：便于「在哪里观看 / 语言 / 投票数」筛选有数据（不覆盖已有非空值）
  try {
    const provs = ['|8|9|', '|119|337|', '|8|119|337|'];
    const noProv = await db.prepare('SELECT id FROM movies WHERE watch_provider_ids IS NULL').all();
    for (let i = 0; i < noProv.length; i++) {
      await db.prepare('UPDATE movies SET watch_provider_ids = ? WHERE id = ?').run(provs[i % provs.length], noProv[i].id);
    }
    const noLang = await db.prepare('SELECT id FROM movies WHERE original_language IS NULL').all();
    for (let i = 0; i < noLang.length; i++) {
      await db.prepare('UPDATE movies SET original_language = ? WHERE id = ?').run(i % 2 === 0 ? 'en' : 'zh', noLang[i].id);
    }
    const noVotes = await db.prepare('SELECT id FROM movies WHERE tmdb_vote_count IS NULL').all();
    for (let i = 0; i < noVotes.length; i++) {
      await db.prepare('UPDATE movies SET tmdb_vote_count = ? WHERE id = ?').run(50 + (i * 17) % 450, noVotes[i].id);
    }
  } catch (e) {
    console.warn('[init] 补全 watch_provider / language / vote_count 跳过:', e.message);
  }

  // 制片国家/地区：|ISO2| 形式；由 original_language 粗映射（可后续由爬虫覆盖）
  try {
    const LANG_TO_CC = {
      en: 'US', zh: 'CN', 'zh-cn': 'CN', ja: 'JP', ko: 'KR', fr: 'FR', es: 'ES', de: 'DE', it: 'IT',
      pt: 'BR', ru: 'RU', hi: 'IN', th: 'TH', vi: 'VN', tr: 'TR', pl: 'PL', nl: 'NL', sv: 'SE',
      da: 'DK', fi: 'FI', no: 'NO', cs: 'CZ', hu: 'HU', el: 'GR', he: 'IL', fa: 'IR', ar: 'EG',
      uk: 'UA', id: 'ID', ro: 'RO', bn: 'BD', ta: 'IN', te: 'IN', ml: 'IN',
    };
    const need = await db.prepare(
      "SELECT id, original_language FROM movies WHERE origin_countries IS NULL OR TRIM(origin_countries) = ''"
    ).all();
    for (const row of need) {
      const raw = String(row.original_language || 'en').toLowerCase();
      const key = raw.split('-')[0];
      const cc = LANG_TO_CC[raw] || LANG_TO_CC[key] || 'US';
      await db.prepare('UPDATE movies SET origin_countries = ? WHERE id = ?').run(`|${cc}|`, row.id);
    }
  } catch (e) {
    console.warn('[init] origin_countries 补全跳过:', e.message);
  }

  const movieCount = (await db.prepare('SELECT COUNT(*) as n FROM movies').get()).n;
  if (movieCount === 0) {
    const examples = [
      { title: '肖申克的救赎', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p480747492.jpg', description: '20世纪40年代末，小有成就的青年银行家安迪因涉嫌杀害妻子及她的情人而锒铛入狱。在肖申克监狱，他结识了瑞德，学会了在体制内生存，并利用自己的金融知识为狱警处理税务。十九年来，安迪始终心怀希望，默默筹划着逃狱计划，用一把小锤子挖通地道，最终在一个雷雨之夜成功越狱，重获自由。影片探讨了希望、自由与体制化的人性主题。', release_year: 1994, director: '弗兰克·德拉邦特', actors: '蒂姆·罗宾斯,摩根·弗里曼', duration: 142, cats: [2, 5], tags: [1, 2] },
      { title: '阿甘正传', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2372307693.jpg', description: '阿甘于二战结束后不久出生在美国南方阿拉巴马州一个闭塞的小镇，他先天弱智，智商只有75，但母亲始终鼓励他"人生就像一盒巧克力，你永远不知道下一颗是什么味道"。他凭借奔跑的天赋进入大学、参加越战、成为乒乓外交使者、经营虾业成为富翁。阿甘用简单的善良和执着，见证了美国几十年的历史变迁，并与青梅竹马的珍妮演绎了一段跨越一生的深情。', release_year: 1994, director: '罗伯特·泽米吉斯', actors: '汤姆·汉克斯,罗宾·怀特', duration: 142, cats: [2, 3], tags: [1, 2] },
      { title: '泰坦尼克号', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p457760035.jpg', description: '1912年4月10日，号称"世界工业史上的奇迹"的豪华客轮泰坦尼克号从英国南安普敦驶往纽约，开始处女航。穷画家杰克在赌局中赢得船票，与即将被迫嫁人的贵族少女露丝相识相爱。当巨轮撞上冰山沉没，杰克把生的希望留给了露丝，自己沉入冰冷的大西洋。这段跨越阶级的爱情与灾难叙事，成为影史永恒的经典。', release_year: 1997, director: '詹姆斯·卡梅隆', actors: '莱昂纳多·迪卡普里奥,凯特·温斯莱特', duration: 194, cats: [3], tags: [1, 2] },
      { title: '盗梦空间', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2616355133.jpg', description: '道姆·柯布是一名窃取他人梦境中秘密的盗梦者，因被通缉无法回国与子女团聚。日本能源大亨齐藤雇佣他完成一项"植入想法"的艰巨任务：让商业对手的继承人放弃继承公司。柯布组建团队深入多层梦境，却在潜意识中不断遭遇亡妻梅尔的干扰。在险象环生的梦境世界中，真实与虚幻的边界逐渐模糊。', release_year: 2010, director: '克里斯托弗·诺兰', actors: '莱昂纳多·迪卡普里奥,约瑟夫·高登-莱维特', duration: 148, cats: [4, 5], tags: [2, 6] },
      { title: '这个杀手不太冷', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p511118051.jpg', description: '职业杀手莱昂独居纽约，以牛奶和盆栽为伴。某日邻居家遭毒贩灭门，12岁的女孩玛蒂尔达被莱昂收留。玛蒂尔达一心想为弟弟报仇，莱昂则在相处中逐渐打开心扉，教会她杀人技巧，两人产生了超越年龄的深情。为救玛蒂尔达，莱昂与腐败警察斯坦菲尔德展开殊死搏斗，最终用自己的生命换来了女孩的新生。', release_year: 1994, director: '吕克·贝松', actors: '让·雷诺,娜塔莉·波特曼', duration: 110, cats: [1, 3], tags: [1, 2] },
      { title: '千与千寻', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2557573348.jpg', description: '10岁的少女千寻与父母搬家途中误入神明世界，父母因贪吃变成猪。千寻在少年白龙的帮助下，到汤婆婆的油屋工作以拯救父母。她在这里遇见无脸男、锅炉爷爷、小玲，历经考验后变得勇敢独立。宫崎骏用奇幻的想象力，探讨了成长、环保与人性，打造了一个令人沉醉的东方奇幻世界。', release_year: 2001, director: '宫崎骏', actors: '柊瑠美,入野自由', duration: 125, cats: [6], tags: [1, 2, 5] },
      { title: '楚门的世界', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p479682972.jpg', description: '楚门从出生起就生活在一个巨大的摄影棚内，他的每一天都被全球观众实时观看，身边的人全是演员，只有他浑然不知。当儿时"溺水身亡"的父亲突然出现、初恋女友被强行带走，楚门开始怀疑世界。他决心突破导演克里斯托夫设定的重重障碍，驾船驶向真实的世界，完成对自由与自我的追寻。', release_year: 1998, director: '彼得·威尔', actors: '金·凯瑞,劳拉·琳妮', duration: 103, cats: [2, 4], tags: [2, 6] },
      { title: '星际穿越', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2205598808.jpg', description: '地球农作物因枯萎病逐渐灭绝，前NASA宇航员库珀被迫离开女儿墨菲，与团队穿越虫洞寻找宜居星球。他们在黑洞附近经历了时间膨胀，一小时等于地球七年。库珀落入五维空间，通过引力向过去的墨菲传递关键数据。父女跨越时空的羁绊拯救了人类，当库珀归来，墨菲已垂垂老矣。科学与爱交织成动人的宇宙史诗。', release_year: 2014, director: '克里斯托弗·诺兰', actors: '马修·麦康纳,安妮·海瑟薇', duration: 169, cats: [4], tags: [1, 2, 6] },
      { title: '当幸福来敲门', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2614359276.jpg', description: '克里斯·加德纳是一名 struggling 的推销员，妻子离家后他独自带着儿子生活。因欠租被逐出公寓，父子俩住过收容所、地铁厕所，甚至排队争抢有限的床位。克里斯决心成为股票经纪人，凭借顽强的意志和父爱的支撑，在无薪实习中脱颖而出，最终获得正式职位。这是一个真实的故事，讲述普通人如何通过坚持改变命运。', release_year: 2006, director: '加布里尔·穆奇诺', actors: '威尔·史密斯,贾登·史密斯', duration: 117, cats: [2], tags: [2, 5] },
      { title: '放牛班的春天', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2561716440.jpg', description: '怀才不遇的音乐家马修来到池塘底教养院担任学监，面对的是一群被放弃的问题少年和严苛的校长。马修发现孩子们喜欢唱歌，便组建合唱团，用音乐打开他们封闭的心门。叛逆的皮埃尔在他的培养下展露天籁之音。马修最终被开除，但孩子们从窗口抛出的纸飞机和歌声，成为对他最好的告别。音乐与教育改变命运的故事。', release_year: 2004, director: '克里斯托夫·巴拉蒂', actors: '杰拉尔·朱诺,让-巴蒂斯特·莫尼耶', duration: 97, cats: [2], tags: [2, 5] },
      { title: '忠犬八公的故事', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p524964016.jpg', description: '大学教授帕克在火车站偶遇走失的秋田犬八公，带回家抚养。八公每天送帕克上班，下午准时在车站等候。某日帕克突发心脏病去世，八公依然每天按时到车站等待，风雨无阻，直至十年后衰老而亡。根据真实事件改编，八公的忠诚感动了无数人，成为人与动物情感羁绊的经典象征。', release_year: 2009, director: '拉斯·霍尔斯道姆', actors: '理查·基尔,琼·艾伦', duration: 93, cats: [3], tags: [2, 5] },
      { title: '三傻大闹宝莱坞', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p579729551.jpg', description: '法罕、拉加与兰彻是皇家工程学院的同学。兰彻特立独行，质疑死记硬背的教育制度，用创意解决问题，却因此得罪院长。法罕想当摄影师却被迫学工程，拉加家境贫寒背负全家期待。兰彻鼓励他们追逐梦想，三人共同反抗僵化的体制。十年后真相揭开，兰彻实为富家子弟化名求学。欢笑与泪水交织的印度校园喜剧。', release_year: 2009, director: '拉吉库马尔·希拉尼', actors: '阿米尔·汗,马德哈万', duration: 171, cats: [2], tags: [2, 3] },
      { title: '海上钢琴师', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2574551676.jpg', description: '1900年在 Virginian 号轮船上，锅炉工丹尼在头等舱发现一名被遗弃的婴儿，取名1900。1900在船上长大，无师自通成为钢琴天才，从未踏足陆地。他与爵士乐鼻祖的钢琴对决、与一见倾心的女孩擦肩而过，都在那艘船上发生。当轮船将被炸毁，1900选择与船同沉，因为"有限的琴键能奏出无限的乐章，而陆地是艘太大的船"。', release_year: 1998, director: '朱塞佩·托纳多雷', actors: '蒂姆·罗斯,普路特·泰勒·文斯', duration: 165, cats: [3], tags: [2] },
      { title: '控方证人', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p1505392928.jpg', description: '伦敦著名刑案辩护律师威尔弗里德因心脏病修养，却接下一桩谋杀案：沃尔被控谋杀富婆以继承遗产。沃尔的妻子克莉丝汀是唯一能证明他不在场的人，却成为控方证人。威尔弗里德抽丝剥茧，发现案件背后隐藏着惊人的真相。改编自阿加莎·克里斯蒂小说，多重反转的法庭悬疑杰作，黑白影像下的推理盛宴。', release_year: 1957, director: '比利·怀尔德', actors: '泰隆·鲍华,玛琳·黛德丽', duration: 116, cats: [5], tags: [1, 2] },
      { title: '熔炉', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p1363250216.jpg', description: '美术老师姜仁浩到聋哑学校雾津任教，发现校长和老师们长期性侵学生。他和人权组织干事友真联手，带领受害学生走上法庭。尽管证据确凿，权势与金钱却操控了判决。孩子们在法庭上手语诉说"我们一路奋战，不是为了改变世界，而是不让世界改变我们"。影片上映后推动韩国修法，真实的力量撼动人心。', release_year: 2011, director: '黄东赫', actors: '孔侑,郑有美', duration: 125, cats: [5], tags: [1, 2] },
      { title: '寻梦环游记', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2503997609.jpg', description: '墨西哥男孩米格出身制鞋世家，却梦想成为音乐家，遭到家人反对。亡灵节当晚，米格误入亡灵世界，遇见已故的曾曾祖父埃克托。原来埃克托被搭档陷害，无法与家人团聚，而忘记他的活人将让他在亡灵世界消逝。米格展开冒险，揭晓家族秘密，也用音乐化解了隔代的误解。皮克斯用绚烂的想象诠释生死与记忆。', release_year: 2017, director: '李·昂克里奇', actors: '安东尼·冈萨雷斯,本杰明·布拉特', duration: 105, cats: [6], tags: [3, 5] },
      { title: '触不可及', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2552053346.jpg', description: '富翁菲利普因跳伞事故瘫痪，招聘全职陪护。刚从监狱出来的德瑞斯为领取救济金前来应征，对护工工作毫无兴趣，却因率真被菲利普看中。出身、阶级截然不同的两人，从起初的摩擦到成为挚友。德瑞斯带菲利普抽烟、飙车、接触女性，让他重拾生活的乐趣。幽默与温情并存，探讨尊重、友谊与生命的价值。', release_year: 2011, director: '奥利维·纳卡什', actors: '弗朗索瓦·克鲁塞,奥玛·希', duration: 112, cats: [2], tags: [2, 5] },
      { title: '霸王别姬', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2561716440.jpg', description: '段小楼与程蝶衣自幼在京戏班学戏，一演霸王，一演虞姬，红遍京城。程蝶衣人戏不分，将对师兄的感情寄托于戏中。段小楼娶了菊仙，蝶衣心碎。历经抗战、解放、文革，两人在时代的洪流中浮沉，师徒反目、夫妻离散。当多年后再度登台，蝶衣在《霸王别姬》的高潮中假戏真做，自刎于台上，完成了他对艺术与情感的终极献祭。', release_year: 1993, director: '陈凯歌', actors: '张国荣,张丰毅,巩俐', duration: 171, cats: [3], tags: [1, 2] },
      { title: '疯狂动物城', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2614500649.jpg', description: '兔子朱迪从小梦想成为警察，成为动物城第一位兔子警官后却只被分配当交通协管。为了证明自己，她接下水獭失踪案，与狐狸骗子尼克结成搭档。他们发现失踪的食肉动物集体发狂，背后隐藏着让食肉动物退化的阴谋。朱迪与尼克破除偏见，揭穿副市长的阴谋。迪士尼打造的乌托邦动物都市，探讨偏见、梦想与勇气。', release_year: 2016, director: '拜伦·霍华德', actors: '金妮弗·古德温,杰森·贝特曼', duration: 108, cats: [6], tags: [2, 3] },
      { title: '摔跤吧！爸爸', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2457983084.jpg', description: '前摔跤冠军马哈维亚因生计放弃梦想，将希望寄托于儿子，却接连生了四个女儿。当发现大女儿吉塔和二女儿巴比塔有摔跤天赋，他顶住村民嘲笑，将女儿训练成摔跤手。吉塔赢得全国冠军后进入国家队，在新教练指导下迷失方向。父亲重新执教，帮助她找回自我，最终为印度赢得首枚女子摔跤世锦赛金牌。', release_year: 2016, director: '涅提·蒂瓦里', actors: '阿米尔·汗,萨卡诗·泰瓦', duration: 161, cats: [1], tags: [2, 3] },
      { title: '怦然心动', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p501177137.jpg', description: '布莱斯全家搬来小镇，邻家女孩朱莉对他一见钟情。朱莉喜欢爬梧桐树看风景，当树被砍掉她伤心不已。布莱斯起初嫌弃朱莉，却在祖父的引导下逐渐发现她的善良与独特。两人从误解到理解，从疏远到靠近。以双视角叙述的青春爱情小品，讲述关于成长、审美与勇敢去爱的小镇故事。', release_year: 2010, director: '罗伯·莱纳', actors: '玛德琳·卡罗尔,卡兰·麦克奥利菲', duration: 90, cats: [3], tags: [2, 5] },
      { title: '龙猫', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2540924496.jpg', description: '小月和小梅随父亲搬入乡间老宅，等待住院的母亲康复。姐妹俩在森林中遇见了巨大的龙猫，它会吹埙、撑雨伞、召唤猫巴士。龙猫带着她们在树顶吹风、在医院窗外探望母亲。宫崎骏用孩童的视角，将乡间生活描绘成温暖梦幻的童话，龙猫成为治愈与童真的永恒符号，陪伴一代代人长大。', release_year: 1988, director: '宫崎骏', actors: '日高法子,坂本千夏', duration: 86, cats: [6], tags: [2, 5] },
      { title: '辛德勒的名单', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2554604923.jpg', description: '二战期间，德国商人辛德勒为牟利雇用犹太工人，目睹纳粹屠杀后良知觉醒。他倾尽家财贿赂纳粹军官，将1100多名犹太人列入"生产必需"名单，迁至自己的工厂保护。战争结束后，辛德勒因耗尽积蓄痛哭，工人们用金牙铸成戒指刻上"救人一命即救全世界"相赠。斯皮尔伯格的黑白影像，记录人性在深渊中的光辉。', release_year: 1993, director: '史蒂文·斯皮尔伯格', actors: '连姆·尼森,拉尔夫·费因斯', duration: 195, cats: [1], tags: [1, 2] },
      { title: '绿皮书', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2549177902.jpg', description: '1962年美国南部，意裔保镖托尼因夜总会关门需要找工，接受黑人钢琴家唐的巡演司机工作。带着绿皮旅行指南，两人驱车穿越种族隔离严重的南方。托尼从起初的偏见，到被唐的才华与遭遇打动；唐在托尼的守护下完成巡演，也走出孤独。公路片外壳下的种族和解与友谊赞歌，温暖而有力。', release_year: 2018, director: '彼得·法雷里', actors: '维果·莫腾森,马赫沙拉·阿里', duration: 130, cats: [2], tags: [2, 3] },
      { title: '我不是药神', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2519070834.jpg', description: '程勇经营着一家印度神油店，前妻要带儿子出国，父亲病危需手术费。白血病患者吕受益找到他，希望从印度走私廉价仿制药格列宁。程勇召集病友组队，从牟利到赔本救人，成为患者口中的"药神"。警察追查、药厂施压、同伴离去，程勇在法与情之间挣扎。取材真实事件，探讨医疗、法律与人性的灰色地带。', release_year: 2018, director: '文牧野', actors: '徐峥,周一围,王传君', duration: 117, cats: [2], tags: [1, 3] },
      { title: '心灵奇旅', cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2624323117.jpg', description: '爵士乐教师乔伊终于获得梦寐以求的登台机会，却意外跌入井中灵魂出窍，来到"生之来处"。为回到地球，他必须帮助厌世灵魂22找到"火花"。22在乔伊的身体里体验了纽约的生活——披萨、落叶、地铁的风——发现了活着的意义。乔伊则领悟到，目标固然重要，但珍惜当下的每一刻才是人生的真谛。皮克斯的哲学小品。', release_year: 2020, director: '彼特·道格特', actors: '杰米·福克斯,蒂娜·菲', duration: 100, cats: [6], tags: [3, 5] },
    ];
    for (const m of examples) {
      await db.prepare('INSERT INTO movies (title, cover, description, release_year, director, actors, duration) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(m.title, m.cover, m.description, m.release_year, m.director, m.actors || null, m.duration);
      const mid = (await db.prepare('SELECT last_insert_rowid() as id').get()).id;
      for (const cid of m.cats || []) {
        await db.prepare('INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, ?)').run(mid, cid);
      }
      for (const tid of m.tags || []) {
        await db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(mid, tid);
      }
    }
    console.log('已插入示例影视数据');
  }

  // ============================================================
  // 演示用户 + 头像（本地生成 SVG，无需外部 API）
  // ============================================================
  const demoUserCount = (await db.prepare(
    "SELECT COUNT(*) as n FROM users WHERE role != 'admin'"
  ).get()).n;

  if (demoUserCount < 3) {
    const avatarColors = [
      '#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#ec4899',
      '#14b8a6', '#d946ef', '#f97316', '#22c55e', '#3b82f6',
      '#a855f7', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16',
    ];
    const genAvatar = (username) => {
      const idx = (username.length * 17) % avatarColors.length;
      const bg = avatarColors[idx];
      const letter = (username[0] || '?').toUpperCase();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${bg}"/><text x="64" y="64" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="56" font-weight="bold" fill="#fff">${letter}</text></svg>`;
      return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    };

    const demoUsers = [
      { username: 'zhangwei', nickname: '影迷阿哲', gender: 'male', age: 25 },
      { username: 'lina', nickname: '糖炒栗子', gender: 'female', age: 22 },
      { username: 'wangqiang', nickname: 'NightOwl', gender: 'male', age: 30 },
      { username: 'xiaochen', nickname: '小陈不沉', gender: 'male', age: 20 },
      { username: 'seabreeze', nickname: 'SeaBreeze', gender: 'female', age: 27 },
      { username: 'muzi', nickname: '木子李', gender: 'female', age: 24 },
      { username: 'moviefan_wang', nickname: '电影民工小王', gender: 'male', age: 28 },
      { username: 'popcorntime', nickname: 'PopcornTime', gender: 'female', age: 23 },
      { username: 'filmgeek_liu', nickname: '胶片大叔', gender: 'male', age: 35 },
      { username: 'cinephile_chen', nickname: '文艺片控', gender: 'female', age: 26 },
      { username: 'dapeng', nickname: '大鹏看电影', gender: 'male', age: 32 },
      { username: 'xinyi', nickname: '心怡爱追剧', gender: 'female', age: 21 },
      { username: 'moviebuff_zhou', nickname: '周周影评', gender: 'male', age: 29 },
      { username: 'catlover_movie', nickname: '猫猫头', gender: 'female', age: 25 },
      { username: 'directorcut', nickname: '导演剪辑版', gender: 'male', age: 33 },
    ];

    const demoPass = bcrypt.hashSync('user123', 10);
    for (const u of demoUsers) {
      const exist = await db.prepare(
        'SELECT id FROM users WHERE LOWER(username) = LOWER(?)'
      ).get(u.username);
      if (!exist) {
        await db.prepare(
          `INSERT INTO users (username, password, nickname, gender, age, role, avatar_data, avatar_style)
           VALUES (?, ?, ?, ?, ?, 'user', ?, ?)`
        ).run(
          u.username, demoPass, u.nickname, u.gender, u.age,
          genAvatar(u.username),
          Math.abs(u.username.length * 17 + u.age) % 12
        );
      }
    }
    console.log('已创建演示用户（含头像）');
  }

  // ============================================================
  // 演示评分/收藏数据：让推荐系统有行为数据可分析
  // 仅当演示用户尚未产生评分时才注入（避免覆盖真实数据）
  // ============================================================
  const demoRatingUsers = await db.prepare(
    `SELECT COUNT(DISTINCT r.user_id) as n FROM ratings r
     INNER JOIN users u ON r.user_id = u.id
     WHERE u.username IN ('zhangwei','lina','wangqiang','xiaochen','seabreeze','muzi','moviefan_wang','popcorntime','filmgeek_liu','cinephile_chen','dapeng','xinyi','moviebuff_zhou','catlover_movie','directorcut')`
  ).get();
  const ratedDemoUsers = demoRatingUsers?.n || 0;
  if (ratedDemoUsers < 2) {
    const allMovies = await db.prepare('SELECT id, title FROM movies').all();
    const allUsers = await db.prepare("SELECT id, username FROM users WHERE role != 'admin'").all();
    if (allMovies.length > 0 && allUsers.length >= 2) {
      // 为用户分配偏好类型，让推荐更有多样性
      const preferences = [
        { name: '科幻迷', movieFilter: /星际|盗梦|沙丘|蝙蝠|蜘蛛|复仇|阿凡达|黑客|明日|降临|银翼|火星|地心/ },
        { name: '文艺控', movieFilter: /肖申克|楚门|霸王|花样|钢琴|杀手|阿甘|千与千寻|龙猫|怦然|天堂|放牛|海上/ },
        { name: '动作粉', movieFilter: /药神|绿皮|绿里|搏击|搏斗|教父|辛德勒|拯救|勇敢|角斗|速度|疾速/ },
        { name: '日漫迷', movieFilter: /千与千寻|龙猫|哈尔|天空|风之|幽灵|魔法|你的名|天气|声之形|萤火/ },
      ];
      let rCount = 0;
      for (const u of allUsers.slice(0, 15)) {
        const pref = preferences[u.id % preferences.length];
        const candidates = allMovies.filter(m => pref.movieFilter.test(m.title));
        const toRate = candidates.length >= 5 ? candidates : allMovies;
        const shuffled = [...toRate].sort(() => Math.random() - 0.5).slice(0, 15 + (u.id % 15));
        for (const m of shuffled) {
          // 偏好电影给高分，其他随机
          const isPreferred = pref.movieFilter.test(m.title);
          const score = isPreferred
            ? 3.5 + Math.random() * 1.5 // 3.5-5.0
            : 2 + Math.random() * 3;     // 2.0-5.0
          await db.prepare(
            'INSERT OR IGNORE INTO ratings (user_id, movie_id, score) VALUES (?, ?, ?)'
          ).run(u.id, m.id, Math.round(score * 10) / 10);
          rCount += 1;
          // 高分 → 收藏
          if (score >= 4) {
            await db.prepare(
              'INSERT OR IGNORE INTO favorites (user_id, movie_id) VALUES (?, ?)'
            ).run(u.id, m.id);
          }
        }
      }
      console.log(`已生成 ${rCount} 条评分 + 收藏数据`);
    }
  }

  // ============================================================
  // 丰富评论：为热门电影生成引用具体演员/导演/剧情的影评
  // 如果还没有丰富评论（旧数据评论都是短评/种子模板），则插入
  // ============================================================
  const commentCount = (await db.prepare('SELECT COUNT(*) as n FROM comments').get()).n;
  // 检查是否已有长影评（>40字），有则说明已种子化，避免重复
  const longCommentCount = (await db.prepare(
    "SELECT COUNT(*) as n FROM comments WHERE LENGTH(content) > 40"
  ).get()).n;
  if (longCommentCount < 5) {
    const movieReviews = [
      { kw: '肖申克', reviews: [
        "摩根·弗里曼的旁白像一壶陈年老酒，蒂姆·罗宾斯把安迪的隐忍和坚定演到了骨髓里。雨中张开双臂那一幕是影史永恒的经典。",
        "'有些鸟是关不住的，它们的羽毛太亮了。'这句台词我记了二十年。安迪在广播室放《费加罗的婚礼》那段，所有人的仰望，是影史最动人的瞬间。",
        "弗兰克·德拉邦特的导演处女作就如此惊艳，把斯蒂芬·金的短篇改编得恰到好处。布鲁克斯出狱后自杀那段太扎心了，体制化不仅是监狱里的命题。",
      ]},
      { kw: '阿甘', reviews: [
        "汤姆·汉克斯演出了阿甘的纯真和执着，换任何一个演员都演不出这种感觉。Gary Sinise 演的丹中尉也非常出彩，从愤怒到和解的转变让人泪目。",
        "罗伯特·泽米吉斯用一个人的视角串联了整个美国现代史，这种叙事太巧妙了。Alan Silvestri 的配乐与那片飘落的羽毛一起成为经典。",
      ]},
      { kw: '盗梦', reviews: [
        "诺兰用建筑来隐喻梦境的结构，层层套叠的叙事让人目不暇接。莱昂纳多演的柯布比《泰坦尼克号》时期深沉太多了，对亡妻的愧疚贯穿始终。",
        "汉斯·季默的配乐是这部电影的另一半灵魂，尤其是那首 Time，层层递进的情感张力跟多层梦境的崩塌完美对应。",
        "约瑟夫·高登-莱维特在旋转走廊那场戏是实拍的！诺兰对实拍的执念让人敬佩，这在 CG 泛滥的好莱坞太难得了。",
      ]},
      { kw: '星际', reviews: [
        "诺兰用相对论来讲父女情，马修·麦康纳看女儿传来的视频、二十三年弹指一挥间那场戏，哭到停不下来。汉斯·季默的管风琴配乐把宇宙的浩瀚和人性的渺小都写出来了。",
        "安妮·海瑟薇有一段'爱是超越维度的力量'的独白，当时觉得有点矫情，但看完结局回头看，诺兰其实在铺垫整个故事的底层逻辑——爱就是引力。",
      ]},
      { kw: '药神', reviews: [
        "徐峥贡献了生涯最佳表演，从油腻市侩到'就当是我还给他们的'那个转变完全不突兀。王传君演的吕受益把一个白血病人的绝望和求生欲都写在了脸上。",
        "文牧野的处女作就敢拍医疗体制这个题材，而且既商业又深刻。周一围演的警察说'这个案子我不查了'那段，把体制内个人的无力感演到了骨髓里。",
      ]},
      { kw: '霸王', reviews: [
        "张国荣的程蝶衣是华语电影史上不可超越的角色，'不疯魔不成活'被他演到了骨子里。陈凯歌用五十年的时间跨度拍了一个关于执念与背叛的故事。",
        "张丰毅演的段小楼是个'明白人'，他知道戏不是人生，但正是这种'明白'让他在文革中背叛了所有人。巩俐演的菊仙穿着红嫁衣上吊那一幕太震撼了。",
      ]},
      { kw: '千与千寻', reviews: [
        "宫崎骏创造了一个让人不想醒来的世界。无脸男是我们内心的孤独，白龙是被遗忘的自然的化身。久石让的配乐尤其是海上列车那段，每次听都起鸡皮疙瘩。",
        "宫崎骏说这是拍给十岁女孩看的，但成年人看了感触更深。油屋里的规矩就像职场规则，千寻从不适应到找到自己的位置，简直就是社畜隐喻。",
      ]},
      { kw: '楚门', reviews: [
        "金·凯瑞用一张喜剧脸演了一出悲剧，彼得·威尔用'真人秀'这个超前概念预言了社交媒体时代。楚门最后鞠躬说'祝你们早安午安晚安'，是电影史上最动人的告别之一。",
        "艾德·哈里斯演的导演克里斯托夫不是纯粹的反派，他是创造者也是囚禁者，那句'外面的世界比我虚构的世界更虚伪'道出了故事的黑色内核。",
      ]},
      { kw: '杀手', reviews: [
        "让·雷诺演的莱昂是全片最温柔的角色，他和娜塔莉·波特曼之间那种超越年龄的情感，吕克·贝松处理得非常细腻。加里·奥德曼的反派演出是教科书级别的。",
        "12岁的娜塔莉·波特曼在这部处女作中令人惊艳。那句'人生是一直辛苦，还是只有童年如此？''一直如此。'我永远记得。",
      ]},
      { kw: '绿皮书', reviews: [
        "维果·莫腾森为演托尼增重了20公斤，马赫沙拉·阿里演的唐·谢利在两个世界都被排挤。吃炸鸡那场戏把两个阶层的距离和逐渐靠近写得轻松又动人。",
      ]},
      { kw: '泰坦尼克', reviews: [
        "詹姆斯·卡梅隆用爱情故事包裹了阶级寓言。莱昂纳多那时候帅得惊天动地，凯特·温斯莱特把贵族少女的叛逆灵魂演活了。沉船时选择体面赴死的人们比爱情线更让我动容。",
      ]},
      { kw: '龙猫', reviews: [
        "宫崎骏和久石让的王炸组合永远不会让人失望。猫巴士的设计太有想象力了，龙猫带着姐妹俩在树顶吹埙的画面是动画史上最治愈的场景之一。",
      ]},
      { kw: '绿里|绿书', reviews: [
        "彼得·法雷里从一个无厘头喜剧导演转型拍出了如此沉稳有力的作品，维果·莫腾森和马赫沙拉·阿里的化学反应绝了。",
      ]},
    ];

    const allUsers = await db.prepare('SELECT id, username FROM users').all();
    const userIds = allUsers.map(u => u.id);
    if (userIds.length >= 2) {
      let cCreated = 0, rCreated = 0;
      for (const mr of movieReviews) {
        const movies = await db.prepare(
          `SELECT id, title FROM movies WHERE title LIKE '%' || ? || '%'`
        ).all(mr.kw);
        if (!movies.length) continue;
        const movieId = movies[0].id;
        for (let i = 0; i < mr.reviews.length && i < 4; i++) {
          const uid = userIds[i % userIds.length];
          await db.prepare(
            'INSERT INTO comments (user_id, movie_id, content) VALUES (?, ?, ?)'
          ).run(uid, movieId, mr.reviews[i]);
          cCreated += 1;
          // 20% 的评论有回复
          if (Math.random() < 0.3) {
            const ridRow = await db.prepare('SELECT last_insert_rowid() as id').get();
            if (ridRow?.id) {
              const replyUid = userIds[(i + 1) % userIds.length];
              const replies = [
                '同感！你说得太好了，完全说出了我的感受。',
                '我看的时候也有类似的感觉，握手！',
                '这个解读角度很新颖，我之前没想到。',
                '细节控+1，我也注意到了你说的这点。',
              ];
              await db.prepare(
                'INSERT INTO comments (user_id, movie_id, parent_id, content) VALUES (?, ?, ?, ?)'
              ).run(replyUid, movieId, ridRow.id, replies[i % replies.length]);
              rCreated += 1;
            }
          }
        }
      }
      console.log(`已生成 ${cCreated} 条影评 + ${rCreated} 条回复`);
    }
  }

  // 展示名统一为「用户名」：保留 nickname 列兼容旧库，内容与 username 对齐
  await db.exec(`UPDATE users SET nickname = username`);

  save();
  console.log('数据库初始化完成！');
}

if (require.main === module) {
  run().catch((err) => { console.error(err); process.exit(1); });
} else {
  module.exports = { run };
}
