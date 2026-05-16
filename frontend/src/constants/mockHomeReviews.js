/**
 * 首页「影迷热议」虚拟用户数据（仅展示，不写入数据库）
 * 当后端评论接口无数据或用户未登录时兜底展示
 * 每条引用具体电影特征/演员/导演，增强真实感
 */
export const MOCK_HOME_REVIEWS = [
  {
    id: 'mock-r1',
    username: '影迷阿哲',
    initial: '哲',
    color: '#0ea5e9',
    rating: 5,
    content: '诺兰的叙事一如既往地烧脑，汉斯·季默的配乐把紧张感拉满，莱昂纳多演这种内心破碎的角色太有说服力了。',
    movieTitle: '盗梦空间',
  },
  {
    id: 'mock-r2',
    username: '糖炒栗子',
    initial: '糖',
    color: '#a855f7',
    rating: 5,
    content: '宫崎骏和久石让的王炸组合永远不会让人失望，无脸男的孤独感太戳我了，每次看都有新感悟。',
    movieTitle: '千与千寻',
  },
  {
    id: 'mock-r3',
    username: 'NightOwl_07',
    initial: 'N',
    color: '#22c55e',
    rating: 5,
    content: '马修·麦康纳看女儿视频那段哭到停不下来，诺兰用相对论讲父女情，硬科幻外壳包裹的是最柔软的情感。',
    movieTitle: '星际穿越',
  },
  {
    id: 'mock-r4',
    username: '小陈不沉',
    initial: '陈',
    color: '#f97316',
    rating: 5,
    content: '徐峥从油腻中年到平民英雄的转变太自然了，王传君把一个白血病人的绝望和求生欲都写在了脸上。',
    movieTitle: '我不是药神',
  },
  {
    id: 'mock-r5',
    username: 'SeaBreeze',
    initial: 'S',
    color: '#ec4899',
    rating: 4,
    content: '维果·莫腾森和马赫沙拉·阿里的化学反应太妙了，吃炸鸡那场戏笑得我肚子疼，结尾酒吧弹琴又让人泪目。',
    movieTitle: '绿皮书',
  },
  {
    id: 'mock-r6',
    username: '木子李',
    initial: '李',
    color: '#14b8a6',
    rating: 5,
    content: '张国荣的程蝶衣至今无人能超越，"不疯魔不成活"这句话被他演到了骨子里，陈凯歌再也回不去的巅峰。',
    movieTitle: '霸王别姬',
  },
  {
    id: 'mock-r7',
    username: '电影民工小王',
    initial: '王',
    color: '#e11d48',
    rating: 5,
    content: '摩根·弗里曼的旁白像一壶陈年老酒越品越有味，蒂姆·罗宾斯的安迪在雨中张开双臂的那一幕是影史永恒的经典。',
    movieTitle: '肖申克的救赎',
  },
  {
    id: 'mock-r8',
    username: 'PopcornTime',
    initial: 'P',
    color: '#8b5cf6',
    rating: 4,
    content: '娜塔莉·波特曼12岁的处女作就如此惊艳，加里·奥德曼的反派演出堪称教科书级别，吕克·贝松的欧式美学太对味了。',
    movieTitle: '这个杀手不太冷',
  },
];
