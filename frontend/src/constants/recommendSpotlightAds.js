/**
 * 个性推荐页 · 底部海报条中的「推广位」
 * 与真实推荐卡片同尺寸、同样式，便于自然嵌入；可改封面图与跳转链接。
 * 封面请使用可直连的 https 图床；部署到生产后也可换成本站静态资源。
 */
export const RECOMMEND_SPOTLIGHT_ADS = [
  {
    id: 'embed-ad-charts',
    label: '一周口碑榜',
    title: '口碑佳作正在更新',
    subtitle: '跟高分片单走，少踩雷',
    coverUrl:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=780&q=80',
    to: '/charts',
    badge: '榜单',
  },
  {
    id: 'embed-ad-library',
    label: '影视库',
    title: '随便逛逛也有惊喜',
    subtitle: '按类型、年代和口味慢慢挑',
    coverUrl:
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80',
    to: '/movies',
    badge: '精选',
  },
];

/** 在海报条中插入推广位的序号（0 起：第 2、第 5 张为推广，其余为真实推荐） */
export const RECOMMEND_SPOTLIGHT_AD_POSITIONS = [1, 4];
