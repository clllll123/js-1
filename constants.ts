
import { ShopLevelConfig, Product, CustomerCard, NegotiationAction, GameEvent, ProductCategory, CustomerTrait, CustomerIntent, CustomerReactions } from './types';

// --- 1. SHOP LEVELS ---

export const SHOP_LEVELS_JUNIOR: ShopLevelConfig[] = [
    { level: 1, name: '路边杂货铺', description: '虽然简陋，但是梦想开始的地方。', maxStock: 20, maxCustomers: 3, upgradeCost: 0, imageEmoji: '⛺' },
    { level: 2, name: '社区便利店', description: '有了固定店面，可以进更多好货了。', maxStock: 60, maxCustomers: 6, upgradeCost: 600, imageEmoji: '🏪' },
    { level: 3, name: '连锁大超市', description: '全镇最大的超市，什么都卖！', maxStock: 150, maxCustomers: 10, upgradeCost: 1500, imageEmoji: '🏢' },
];

export const SHOP_LEVELS_SENIOR: ShopLevelConfig[] = [
    { level: 1, name: '创业孵化摊', description: '低成本试错，资金有限。', maxStock: 30, maxCustomers: 4, upgradeCost: 0, imageEmoji: '🛖' },
    { level: 2, name: '品牌专营店', description: '装修精美，拥有高价值商品许可。', maxStock: 80, maxCustomers: 8, upgradeCost: 3000, imageEmoji: '🏬' },
    { level: 3, name: '全球旗舰店', description: '行业标杆，资本雄厚，渠道通天。', maxStock: 200, maxCustomers: 15, upgradeCost: 8000, imageEmoji: '🌇' },
];

// --- 2. MASSIVE PRODUCT DATABASE ---

const createProduct = (id: string, name: string, cat: ProductCategory, cost: number, price: number, level: number): Product => ({
    id, name, category: cat, baseCost: cost, basePrice: price, unlockLevel: level, stock: 0, sold: 0, quality: 5 + Math.floor(Math.random() * 5)
});

// JUNIOR POOL
export const PRODUCTS_JUNIOR_POOL: Product[] = [
    // 1. Food (零食)
    createProduct('j_fd1', '棒棒糖', 'food', 1, 3, 1),
    createProduct('j_fd2', '热可可', 'food', 4, 10, 1), 
    createProduct('j_fd3', '老冰棍', 'food', 2, 5, 1), 
    createProduct('j_fd4', '进口巧克力', 'food', 15, 35, 2),
    createProduct('j_fd5', '豪华零食大礼包', 'food', 50, 120, 3),
    // 2. Stationery (文具)
    createProduct('j_st1', '铅笔', 'stationery', 1, 2, 1),
    createProduct('j_st2', '卡通橡皮', 'stationery', 3, 8, 1),
    createProduct('j_st3', '考试专用笔套装', 'stationery', 12, 30, 2), 
    createProduct('j_st4', '精装手账本', 'stationery', 25, 60, 2),
    createProduct('j_st5', '电动削笔机', 'stationery', 60, 150, 3),
    // 3. Toy (玩具)
    createProduct('j_ty1', '吹泡泡水', 'toy', 5, 12, 1),
    createProduct('j_ty2', '弹力球', 'toy', 8, 20, 1),
    createProduct('j_ty3', '变形机器人', 'toy', 30, 70, 2),
    createProduct('j_ty4', '毛绒公仔', 'toy', 45, 100, 2),
    createProduct('j_ty5', '遥控赛车', 'toy', 120, 280, 3),
    // 4. Daily (日用)
    createProduct('j_dy1', '暖宝宝贴', 'daily', 2, 5, 1), 
    createProduct('j_dy2', '迷你小风扇', 'daily', 15, 35, 1), 
    createProduct('j_dy3', '便携雨衣', 'daily', 10, 25, 2), 
    createProduct('j_dy4', '卡通保温杯', 'daily', 40, 90, 2), 
    createProduct('j_dy5', '护眼台灯', 'daily', 80, 199, 3),
    // 5. Book (书籍)
    createProduct('j_bk1', '拼音卡片', 'book', 5, 12, 1),
    createProduct('j_bk2', '漫画书', 'book', 10, 25, 1),
    createProduct('j_bk3', '作文大全', 'book', 20, 45, 2),
    createProduct('j_bk4', '精装绘本', 'book', 35, 80, 2),
    createProduct('j_bk5', '百科全书套装', 'book', 150, 350, 3),
    // 6. Sport (体育)
    createProduct('j_sp1', '毽子', 'sport', 3, 8, 1),
    createProduct('j_sp2', '跳绳', 'sport', 12, 28, 1),
    createProduct('j_sp3', '乒乓球拍', 'sport', 30, 70, 2),
    createProduct('j_sp4', '儿童篮球', 'sport', 60, 140, 2),
    createProduct('j_sp5', '轮滑鞋', 'sport', 180, 400, 3),
    // 7. DIY (手工)
    createProduct('j_di1', '彩纸', 'diy', 2, 5, 1),
    createProduct('j_di2', '橡皮泥', 'diy', 8, 20, 1),
    createProduct('j_di3', '涂色画板', 'diy', 25, 60, 2),
    createProduct('j_di4', '串珠礼盒', 'diy', 40, 95, 2),
    createProduct('j_di5', '3D打印笔', 'diy', 100, 250, 3),
];

export const PRODUCTS_SENIOR_POOL: Product[] = [
    // 1. Tech
    createProduct('s_tc1', '数据线', 'tech', 10, 25, 1),
    createProduct('s_tc2', '手机壳', 'tech', 15, 40, 1),
    createProduct('s_tc3', '有线耳机', 'tech', 25, 60, 1),
    createProduct('s_tc4', '充电宝', 'tech', 60, 140, 2), 
    createProduct('s_tc5', '真无线耳机', 'tech', 150, 350, 2),
    createProduct('s_tc6', '机械键盘', 'tech', 300, 700, 2),
    createProduct('s_tc7', '智能手表', 'tech', 800, 1800, 3),
    createProduct('s_tc8', '高性能笔电', 'tech', 4000, 7500, 3),
    // 2. Luxury
    createProduct('s_lx1', '品牌挂饰', 'luxury', 50, 120, 1),
    createProduct('s_lx2', '设计师水杯', 'luxury', 80, 200, 1),
    createProduct('s_lx3', '真丝眼罩', 'luxury', 120, 300, 2),
    createProduct('s_lx4', '品牌香水(小)', 'luxury', 250, 600, 2),
    createProduct('s_lx5', '限量口红', 'luxury', 300, 750, 2),
    createProduct('s_lx6', '轻奢墨镜', 'luxury', 500, 1200, 3),
    createProduct('s_lx7', '品牌钱包', 'luxury', 1500, 3500, 3),
    createProduct('s_lx8', '联名潮鞋', 'luxury', 2500, 6000, 3),
    // 3. Gift
    createProduct('s_gf1', '贺卡', 'gift', 5, 15, 1),
    createProduct('s_gf2', '包装纸', 'gift', 8, 20, 1),
    createProduct('s_gf3', '毛绒玩偶', 'gift', 40, 100, 1),
    createProduct('s_gf4', '八音盒', 'gift', 80, 200, 2),
    createProduct('s_gf5', '永生花', 'gift', 150, 380, 2),
    createProduct('s_gf6', '拍立得', 'gift', 400, 900, 2),
    createProduct('s_gf7', '黄金转运珠', 'gift', 1000, 2200, 3),
    createProduct('s_gf8', '限量手办', 'gift', 2000, 5000, 3),
    // 4. Health
    createProduct('s_hl1', '维C泡腾片', 'health', 15, 35, 1), 
    createProduct('s_hl2', '蒸汽眼罩', 'health', 30, 70, 1),
    createProduct('s_hl3', 'N95口罩(盒)', 'health', 40, 100, 2), 
    createProduct('s_hl4', '护颈仪', 'health', 150, 350, 2),
    createProduct('s_hl5', '电动牙刷', 'health', 200, 500, 2),
    createProduct('s_hl6', '足浴盆', 'health', 300, 700, 3),
    createProduct('s_hl7', '体脂秤', 'health', 100, 250, 3),
    createProduct('s_hl8', '家用跑步机', 'health', 1500, 3500, 3),
    // 5. Office
    createProduct('s_of1', '便利贴', 'office', 5, 12, 1),
    createProduct('s_of2', '文件夹', 'office', 10, 25, 1),
    createProduct('s_of3', '订书机', 'office', 20, 45, 1),
    createProduct('s_of4', '商务笔记本', 'office', 40, 100, 2),
    createProduct('s_of5', '无线鼠标', 'office', 60, 150, 2),
    createProduct('s_of6', '人体工学坐垫', 'office', 100, 250, 2),
    createProduct('s_of7', '打印机', 'office', 800, 1800, 3),
    createProduct('s_of8', '人体工学椅', 'office', 1200, 3000, 3),
    // 6. Food
    createProduct('s_fd1', '矿泉水', 'food', 2, 5, 1),
    createProduct('s_fd2', '自热火锅', 'food', 25, 55, 1),
    createProduct('s_fd3', '精品挂耳咖啡', 'food', 40, 100, 1),
    createProduct('s_fd4', '每日坚果', 'food', 60, 150, 2),
    createProduct('s_fd5', '进口红酒', 'food', 120, 300, 2),
    createProduct('s_fd6', '代餐奶昔', 'food', 80, 200, 2),
    createProduct('s_fd7', '有机大米礼盒', 'food', 150, 400, 3),
    createProduct('s_fd8', '顶级海鲜包', 'food', 500, 1200, 3),
    // 7. Hobby
    createProduct('s_hb1', '素描铅笔', 'hobby', 10, 25, 1),
    createProduct('s_hb2', '拼图(500片)', 'hobby', 40, 90, 1),
    createProduct('s_hb3', '高达模型', 'hobby', 100, 250, 2),
    createProduct('s_hb4', '尤克里里', 'hobby', 200, 500, 2),
    createProduct('s_hb5', '露营天幕', 'hobby', 300, 800, 2),
    createProduct('s_hb6', '微单相机镜头', 'hobby', 1500, 3500, 3),
    createProduct('s_hb7', '专业画材箱', 'hobby', 500, 1200, 3),
    createProduct('s_hb8', '钓鱼全套装备', 'hobby', 2000, 5000, 3),
    // 8. Daily
    createProduct('s_dy1', '抽纸', 'daily', 3, 8, 1),
    createProduct('s_dy2', '围巾手套', 'daily', 35, 80, 1),
    createProduct('s_dy3', '收纳箱', 'daily', 30, 70, 1),
    createProduct('s_dy4', '晴雨伞', 'daily', 45, 100, 2),
    createProduct('s_dy5', '乳胶枕', 'daily', 150, 400, 2),
    createProduct('s_dy6', '扫地机器人', 'daily', 1200, 2800, 3),
    createProduct('s_dy7', '空气净化器', 'daily', 800, 2000, 3),
    createProduct('s_dy8', '戴森吹风机', 'daily', 2500, 3500, 3),
];

// UPDATED GAME EVENTS (60 Total)
export const GAME_EVENTS: GameEvent[] = [
    // 1-10: Basic / Junior Friendly
    { id: 'e01', name: '平淡的一周', description: '市场平稳，按需进货。', boostedCategories: [], priceMultiplier: 1.0, trafficMultiplier: 1.0, icon: '🌤️' },
    { id: 'e02', name: '儿童节前夕', description: '家长们开始准备礼物了。', boostedCategories: ['toy', 'food', 'diy', 'fun'], priceMultiplier: 1.2, trafficMultiplier: 1.1, icon: '🎈' },
    { id: 'e03', name: '开学季', description: '文具和书籍需求暴增。', boostedCategories: ['stationery', 'book', 'office'], priceMultiplier: 1.3, trafficMultiplier: 1.2, icon: '🎒' },
    { id: 'e04', name: '暑假开始', description: '户外活动和娱乐需求增加。', boostedCategories: ['sport', 'toy', 'hobby'], priceMultiplier: 1.2, trafficMultiplier: 1.1, icon: '🏖️' },
    { id: 'e05', name: '寒潮来袭', description: '好冷！大家需要保暖用品和热量食物。', boostedCategories: ['daily', 'food', 'health'], priceMultiplier: 1.4, trafficMultiplier: 0.9, icon: '❄️' },
    { id: 'e06', name: '流感季节', description: '健康防护用品紧缺。', boostedCategories: ['health', 'daily'], priceMultiplier: 2.0, trafficMultiplier: 0.8, icon: '😷' },
    { id: 'e07', name: '情人节', description: '鲜花巧克力与礼物。', boostedCategories: ['gift', 'luxury', 'food', 'diy'], priceMultiplier: 1.5, trafficMultiplier: 1.1, icon: '🌹' },
    { id: 'e08', name: '母亲节', description: '感恩回馈，健康与日用品畅销。', boostedCategories: ['health', 'daily', 'gift', 'diy'], priceMultiplier: 1.2, trafficMultiplier: 1.1, icon: '💐' },
    { id: 'e09', name: '父亲节', description: '数码和办公用品销量微涨。', boostedCategories: ['tech', 'office', 'sport', 'stationery'], priceMultiplier: 1.2, trafficMultiplier: 1.0, icon: '👔' },
    { id: 'e10', name: '春节年货节', description: '全面消费热潮！', boostedCategories: ['food', 'gift', 'daily', 'luxury', 'toy'], priceMultiplier: 1.3, trafficMultiplier: 1.5, icon: '🧧' },

    // 11-20: Intermediate
    { id: 'e11', name: '科技新品发布会', description: '数码发烧友们躁动起来了！', boostedCategories: ['tech', 'hobby'], priceMultiplier: 1.3, trafficMultiplier: 1.1, icon: '📱' },
    { id: 'e12', name: '马拉松大赛', description: '全城运动装备热销中。', boostedCategories: ['sport', 'health', 'daily'], priceMultiplier: 1.2, trafficMultiplier: 1.2, icon: '🏃' },
    { id: 'e13', name: '世界读书日', description: '知识就是力量，书籍与文具热卖。', boostedCategories: ['book', 'stationery', 'office'], priceMultiplier: 1.1, trafficMultiplier: 1.0, icon: '📖' },
    { id: 'e14', name: '动漫展漫展', description: '二次元浓度超标，手办与周边大卖。', boostedCategories: ['toy', 'hobby', 'gift', 'diy'], priceMultiplier: 1.4, trafficMultiplier: 1.3, icon: '🦸' },
    { id: 'e15', name: '梅雨季节', description: '雨具和除湿用品需求激增。', boostedCategories: ['daily', 'health'], priceMultiplier: 1.3, trafficMultiplier: 0.8, icon: '☔' },
    { id: 'e16', name: '露营热潮', description: '逃离城市，亲近自然。', boostedCategories: ['hobby', 'sport', 'food'], priceMultiplier: 1.2, trafficMultiplier: 1.1, icon: '⛺' },
    { id: 'e17', name: '复古风尚', description: '怀旧零食和玩具突然翻红。', boostedCategories: ['toy', 'food', 'gift'], priceMultiplier: 1.5, trafficMultiplier: 1.0, icon: '📻' },
    { id: 'e18', name: '办公室改造周', description: '企业批量采购办公用品。', boostedCategories: ['office', 'tech', 'daily'], priceMultiplier: 1.1, trafficMultiplier: 1.2, icon: '🖨️' },
    { id: 'e19', name: '宠物领养日', description: '虽然不卖宠物，但清洁用品沾光了。', boostedCategories: ['daily', 'health'], priceMultiplier: 1.1, trafficMultiplier: 1.1, icon: '🐶' },
    { id: 'e20', name: '停电通知', description: '备用电源和应急食品需求增加。', boostedCategories: ['tech', 'food', 'daily'], priceMultiplier: 1.6, trafficMultiplier: 1.0, icon: '🕯️' },

    // 21-30: Advanced
    { id: 'e21', name: '股市大崩盘', description: '消费降级，只有必需品卖得动。', boostedCategories: ['food', 'daily'], priceMultiplier: 0.8, trafficMultiplier: 0.7, icon: '📉' },
    { id: 'e22', name: '网红带货直播', description: '某类商品突然爆火，但也可能稍纵即逝。', boostedCategories: ['luxury', 'tech', 'gift'], priceMultiplier: 1.8, trafficMultiplier: 1.5, icon: '🤳' },
    { id: 'e23', name: '消费券发放', description: '政府刺激消费，全品类需求提升。', boostedCategories: ['food', 'daily', 'tech', 'luxury', 'sport'], priceMultiplier: 1.1, trafficMultiplier: 1.4, icon: '🎫' },
    { id: 'e24', name: '雾霾红色预警', description: '健康防护成为第一要务。', boostedCategories: ['health', 'daily'], priceMultiplier: 2.5, trafficMultiplier: 0.6, icon: '🌫️' },
    { id: 'e25', name: '黄金周长假', description: '旅游相关与礼品需求旺盛。', boostedCategories: ['gift', 'tech', 'luxury', 'food'], priceMultiplier: 1.3, trafficMultiplier: 1.3, icon: '✈️' },
    { id: 'e26', name: 'DIY手作大赛', description: '手工材料全城断货。', boostedCategories: ['diy', 'stationery', 'hobby'], priceMultiplier: 1.4, trafficMultiplier: 1.1, icon: '🎨' },
    { id: 'e27', name: '高端商务论坛', description: '高端礼品和奢品需求小幅上升。', boostedCategories: ['luxury', 'gift', 'office'], priceMultiplier: 1.5, trafficMultiplier: 0.9, icon: '🤝' },
    { id: 'e28', name: '环保检查', description: '过度包装产品滞销，环保产品受宠。', boostedCategories: ['daily', 'health', 'food'], priceMultiplier: 1.1, trafficMultiplier: 1.0, icon: '♻️' },
    { id: 'e29', name: '疯狂双十一', description: '所有人都在买买买，但都在比价！', boostedCategories: ['tech', 'luxury', 'daily', 'food', 'hobby'], priceMultiplier: 0.9, trafficMultiplier: 2.0, icon: '🛒' },
    { id: 'e30', name: '神秘富豪考察', description: '据说有大客户在扫货高价商品。', boostedCategories: ['luxury', 'tech', 'hobby'], priceMultiplier: 2.0, trafficMultiplier: 0.8, icon: '🕴️' },

    // 31-40: New Junior Events (Simple & Fun)
    { id: 'e31', name: '快乐周末', description: '孩子们放假啦，零食玩具走起！', boostedCategories: ['toy', 'food', 'sport'], priceMultiplier: 1.1, trafficMultiplier: 1.2, icon: '🌤️' },
    { id: 'e32', name: '班级野餐会', description: '学校组织野餐，零食饮料大卖。', boostedCategories: ['food', 'daily'], priceMultiplier: 1.2, trafficMultiplier: 1.1, icon: '🧺' },
    { id: 'e33', name: '校园艺术节', description: '需要大量手工材料和文具。', boostedCategories: ['diy', 'stationery'], priceMultiplier: 1.3, trafficMultiplier: 1.1, icon: '🎨' },
    { id: 'e34', name: '萌宠大派对', description: '社区宠物聚会，玩具和清洁用品畅销。', boostedCategories: ['toy', 'daily'], priceMultiplier: 1.2, trafficMultiplier: 1.0, icon: '🐾' },
    { id: 'e35', name: '动画大电影', description: '热门动画上映，周边玩具和书籍火了。', boostedCategories: ['toy', 'book'], priceMultiplier: 1.4, trafficMultiplier: 1.2, icon: '🎬' },
    { id: 'e36', name: '小小科学家', description: '科普书籍和实验材料受欢迎。', boostedCategories: ['book', 'diy'], priceMultiplier: 1.2, trafficMultiplier: 1.0, icon: '🔬' },
    { id: 'e37', name: '社区运动会', description: '运动器材和补充能量的零食卖得好。', boostedCategories: ['sport', 'food'], priceMultiplier: 1.2, trafficMultiplier: 1.1, icon: '⚽' },
    { id: 'e38', name: '手工义卖日', description: '大家都在买手工材料做慈善。', boostedCategories: ['diy', 'stationery'], priceMultiplier: 1.1, trafficMultiplier: 1.3, icon: '🤝' },
    { id: 'e39', name: '阴雨绵绵周', description: '不能出门，只能在家看书玩玩具。', boostedCategories: ['book', 'toy'], priceMultiplier: 1.1, trafficMultiplier: 0.9, icon: '🌧️' },
    { id: 'e40', name: '糖果嘉年华', description: '甜食爱好者的节日！', boostedCategories: ['food'], priceMultiplier: 1.5, trafficMultiplier: 1.2, icon: '🍬' },

    // 41-60: New Senior Events (Complex Macro/Business)
    { id: 'e41', name: '全球芯片短缺', description: '电子产品成本飙升，供应紧张。', boostedCategories: ['tech', 'office'], priceMultiplier: 1.5, trafficMultiplier: 0.8, icon: '💾' },
    { id: 'e42', name: '极简主义风潮', description: '断舍离流行，非必需品销量下滑。', boostedCategories: ['daily', 'food'], priceMultiplier: 0.9, trafficMultiplier: 0.8, icon: '🍃' },
    { id: 'e43', name: '严重通货膨胀', description: '钱不值钱了，生活必需品价格飞涨。', boostedCategories: ['food', 'daily'], priceMultiplier: 1.4, trafficMultiplier: 0.9, icon: '💸' },
    { id: 'e44', name: '消费降级趋势', description: '大家只买便宜实惠的食物和日用品。', boostedCategories: ['food'], priceMultiplier: 0.8, trafficMultiplier: 1.2, icon: '📉' },
    { id: 'e45', name: '碳中和新政', description: '环保健康产品受追捧，高耗能产品遇冷。', boostedCategories: ['health', 'daily'], priceMultiplier: 1.2, trafficMultiplier: 1.1, icon: '♻️' },
    { id: 'e46', name: '奢侈品税改', description: '奢侈品进口税提高，价格大涨。', boostedCategories: ['luxury'], priceMultiplier: 1.6, trafficMultiplier: 0.7, icon: '💎' },
    { id: 'e47', name: '全民健身热潮', description: '健康饮食和运动装备需求井喷。', boostedCategories: ['health', 'food', 'sport'], priceMultiplier: 1.3, trafficMultiplier: 1.3, icon: '🧘' },
    { id: 'e48', name: '复古怀旧回潮', description: '老式玩具和收藏品价格被炒高。', boostedCategories: ['hobby', 'gift'], priceMultiplier: 1.5, trafficMultiplier: 1.0, icon: '📼' },
    { id: 'e49', name: '远程办公常态化', description: '居家办公设备和电子产品持续热销。', boostedCategories: ['office', 'tech'], priceMultiplier: 1.2, trafficMultiplier: 1.1, icon: '💻' },
    { id: 'e50', name: '旅游旺季来临', description: '礼品和高端消费随游客增加。', boostedCategories: ['gift', 'luxury'], priceMultiplier: 1.3, trafficMultiplier: 1.4, icon: '✈️' },
    { id: 'e51', name: '国际进口博览会', description: '进口食品和奢侈品关注度极高。', boostedCategories: ['food', 'luxury'], priceMultiplier: 1.4, trafficMultiplier: 1.2, icon: '🚢' },
    { id: 'e52', name: '国潮品牌崛起', description: '本土日用和礼品受到年轻人喜爱。', boostedCategories: ['gift', 'daily'], priceMultiplier: 1.2, trafficMultiplier: 1.3, icon: '🏮' },
    { id: 'e53', name: '病毒式营销', description: '某款数码或爱好产品突然在网上爆火。', boostedCategories: ['tech', 'hobby'], priceMultiplier: 1.8, trafficMultiplier: 2.0, icon: '📱' },
    { id: 'e54', name: '股市牛市效应', description: '大家赚了钱，奢侈品和礼品消费大增。', boostedCategories: ['luxury', 'gift'], priceMultiplier: 1.3, trafficMultiplier: 1.2, icon: '🐂' },
    { id: 'e55', name: '全球能源危机', description: '高能耗电子产品滞销，节能产品涨价。', boostedCategories: ['tech', 'daily'], priceMultiplier: 1.3, trafficMultiplier: 0.7, icon: '⚡' },
    { id: 'e56', name: '人工智能革命', description: '最新科技产品供不应求。', boostedCategories: ['tech', 'office'], priceMultiplier: 1.5, trafficMultiplier: 1.5, icon: '🤖' },
    { id: 'e57', name: '国际时装周', description: '时尚单品和奢侈配饰需求旺盛。', boostedCategories: ['luxury', 'daily'], priceMultiplier: 1.4, trafficMultiplier: 1.1, icon: '👠' },
    { id: 'e58', name: '开学装机热潮', description: '大学生配置电脑和数码设备。', boostedCategories: ['tech', 'hobby'], priceMultiplier: 1.1, trafficMultiplier: 1.4, icon: '🖥️' },
    { id: 'e59', name: '极端高温天气', description: '饮料和降温日用品卖疯了。', boostedCategories: ['food', 'daily'], priceMultiplier: 1.2, trafficMultiplier: 1.5, icon: '☀️' },
    { id: 'e60', name: '年终大奖发放', description: '手里有钱了，专门买贵的！', boostedCategories: ['luxury', 'tech'], priceMultiplier: 1.1, trafficMultiplier: 1.6, icon: '💰' },
];

export const CUTE_LOGOS = ['🐼', '🐱', '🦊', '🦁', '🐸', '🦄', '🐙', '🚀', '🍭', '🎨', '🎮', '🏰', '🎩', '✨', '🦖', '🐝', '🐳', '🍎', '🍩', '⚽'];

export const MAX_TURNS_JUNIOR = 6;
export const MAX_TURNS_SENIOR = 8;

const FIRST_NAMES = ["小明", "李华", "王大妈", "张大爷", "Sarah", "Tony", "Linda", "乐乐", "强子", "阿珍", "赵总", "钱医生", "孙老师", "周同学"];
const AVATARS = ["👨", "👩", "👴", "👵", "👱‍♂️", "👱‍♀️", "👨‍🦰", "👩‍🦰", "👨‍🏫", "👩‍⚕️", "👮", "🧑‍🎤", "🧕", "🤵"];
const TRAITS: CustomerTrait[] = ['price_sensitive', 'quality_first', 'impulsive', 'skeptical', 'trend_follower'];

const CATEGORY_MAP: Record<string, string> = {
    'food': '食品', 'stationery': '文具', 'toy': '玩具', 'daily': '日用',
    'tech': '数码', 'luxury': '奢品', 'health': '健康', 'gift': '礼品',
    'fun': '娱乐', 'book': '书籍', 'sport': '体育', 'diy': '手工', 'office': '办公', 'hobby': '爱好'
};

export const generateCustomer = (turn: number, event: GameEvent, canHaveRefunds: boolean = false): CustomerCard => {
    const id = `cust_${turn}_${Math.random().toString(36).substr(2, 9)}`;
    const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const trait = TRAITS[Math.floor(Math.random() * TRAITS.length)];
    
    // INTENT LOGIC
    const roll = Math.random();
    let intent: CustomerIntent = 'consulting';
    if (roll < 0.25) intent = 'buying';
    else if (roll < 0.75) intent = 'consulting';
    else if (roll < 0.90) intent = 'browsing';
    else if (roll < 0.95 && canHaveRefunds) intent = 'returning'; 
    else if (roll < 0.95 && !canHaveRefunds) intent = 'consulting'; 
    else intent = 'thief';

    // Budget
    let baseBudget = 50 + Math.floor(Math.random() * 450); 
    if (trait === 'quality_first' || trait === 'trend_follower') baseBudget *= 1.5;
    if (trait === 'price_sensitive') baseBudget *= 0.7;
    
    // --- PREFERENCE LOGIC (TIERED PROBABILITY) ---
    // High (Boosted): 50%
    // Medium (Staples: Food/Daily): 30% (if not boosted)
    // Low (Others): 20%
    
    let prefs: ProductCategory[] = [];
    const rnd = Math.random();
    
    // Determine the primary preference based on tiers
    if (event.boostedCategories.length > 0 && rnd < 0.55) {
        // TIER 1: HIGH (55% chance) - Pick from boosted
        prefs = [...event.boostedCategories];
    } else {
        const staples: ProductCategory[] = ['food', 'daily'];
        // Filter out boosted from staples to avoid duplication logic confusion
        const availableStaples = staples.filter(s => !event.boostedCategories.includes(s));
        
        if (availableStaples.length > 0 && rnd < 0.85) {
             // TIER 2: MEDIUM (30% chance) - Staples
             prefs = [availableStaples[Math.floor(Math.random() * availableStaples.length)]];
        } else {
             // TIER 3: LOW (15% chance) - Any other category
             const allCats = ['stationery', 'toy', 'tech', 'gift', 'health', 'book', 'sport', 'diy', 'office', 'hobby', 'luxury'] as ProductCategory[];
             const others = allCats.filter(c => !event.boostedCategories.includes(c) && !staples.includes(c));
             if (others.length > 0) {
                 prefs = [others[Math.floor(Math.random() * others.length)]];
             } else {
                 // Fallback if everything is boosted/staple
                 prefs = ['gift']; 
             }
        }
    }
    
    // Add a secondary random preference sometimes
    if (Math.random() > 0.6) {
        const allCats = ['food', 'stationery', 'toy', 'daily', 'tech', 'gift', 'health'] as ProductCategory[];
        prefs.push(allCats[Math.floor(Math.random() * allCats.length)]);
    }
    prefs = [...new Set(prefs)]; // Unique

    const traitLabels: Record<CustomerTrait, string> = {
        'price_sensitive': '精打细算',
        'quality_first': '品质至上',
        'impulsive': '冲动消费',
        'skeptical': '谨慎多疑',
        'trend_follower': '跟风达人'
    };
    
    const prefsCN = prefs.map(p => CATEGORY_MAP[p] || p);
    
    // Custom Dialogue
    let opening = "老板，请问有什么好推荐的吗？";
    if (intent === 'buying') opening = `老板！快给我拿点${prefsCN[0] || '好东西'}，我赶时间！`;
    if (intent === 'browsing') opening = "不用管我，我就是路过随便看看。";
    if (intent === 'returning') opening = "老板，上次买的东西好像坏了，我要退货！";
    if (intent === 'thief') opening = "老板，你们这最贵的东西在哪？拿给我看看。"; 

    // Reactions
    const reactions: CustomerReactions = {
        expensive: "哎呀，这个价格有点超出预算了。",
        cheap: "价格确实不错。",
        flattery: "哈哈，你真会说话！",
        logic: "听起来质量确实不错。",
        angry: "感觉不太合适，我再看看吧。",
        happy: "这个不错，我就要它了！"
    };

    if (intent === 'thief') {
        reactions.happy = "（突然抓起商品就跑）嘿嘿，谢啦！";
        reactions.angry = "切，不买就不买。";
    }

    return {
        id,
        name,
        avatar: intent === 'thief' ? '🥷' : avatar, 
        age: 10 + Math.floor(Math.random() * 50),
        trait,
        traitLabel: intent === 'returning' ? '售后处理' : (intent === 'thief' ? '可疑人员' : (intent === 'browsing' ? '闲逛路人' : traitLabels[trait])),
        budget: Math.floor(baseBudget),
        intent,
        preferredCategories: prefs,
        story: `来自社区的${name}，今天心情${Math.random() > 0.5 ? '不错' : '一般'}。`,
        need: intent === 'returning' ? "想要退掉之前的商品" : (intent === 'browsing' ? "打发时间" : `想要买点 ${prefsCN.join(' 或 ')} 相关的商品。`),
        dialogueOpening: opening,
        reactions,
        purchaseQuantity: 1 + Math.floor(Math.random() * 2), 
        basePatience: 60 + Math.floor(Math.random() * 40), 
        baseInterest: 40 + Math.floor(Math.random() * 30)  
    };
};

export const NEGOTIATION_ACTIONS: NegotiationAction[] = [
    { id: 'act_discount', label: '给个优惠', textPayload: "老板给你打个折，这个价格很公道了！", category: 'financial', description: '便宜才是硬道理', costPercentage: 0.1, energyCost: 15, impact: { price_sensitive: { interest: 40 }, quality_first: { interest: -30 }, impulsive: { interest: 20 }, skeptical: { interest: 5 }, trend_follower: { interest: 10 } } },
    { id: 'act_quality', label: '强调质量', textPayload: "看这做工，这可是进口材质，绝对耐用！", category: 'logical', description: '强调做工与耐用', energyCost: 15, impact: { price_sensitive: { interest: -10 }, quality_first: { interest: 50 }, impulsive: { interest: -10 }, skeptical: { interest: 30 }, trend_follower: { interest: 5 } } },
    { id: 'act_emotion', label: '拉近关系', textPayload: "咱们都是邻居，我肯定不会坑你，这东西特别适合你！", category: 'emotional', description: '拉近关系', energyCost: 15, impact: { price_sensitive: { interest: 10 }, quality_first: { interest: -20 }, impulsive: { interest: 50 }, skeptical: { interest: -40 }, trend_follower: { interest: 30 } } },
    { id: 'act_trend', label: '强调热销', textPayload: "这个现在卖得超级火，最后几个了，不买就没了！", category: 'aggressive', description: '大家都在买', energyCost: 15, impact: { price_sensitive: { interest: -20 }, quality_first: { interest: -10 }, impulsive: { interest: 40 }, skeptical: { interest: -30 }, trend_follower: { interest: 60 } } }
];

export const getNegotiationDeck = (category: ProductCategory): NegotiationAction[] => {
    return [...NEGOTIATION_ACTIONS];
};

export const FOLLOW_UP_ACTIONS: NegotiationAction[] = [
    { id: 'fu_bundle', label: '加购立减', textPayload: "多买点算你便宜点，怎么样？", category: 'financial', description: '多买更划算', costPercentage: 0.15, energyCost: 10, impact: { price_sensitive: { interest: 0 }, quality_first: { interest: 0 }, impulsive: { interest: 0 }, skeptical: { interest: 0 }, trend_follower: { interest: 0 } } },
    { id: 'fu_specs', label: '详细参数', textPayload: "你看这参数，同价位里性能最强。", category: 'logical', description: '用数据说话', energyCost: 10, impact: { price_sensitive: { interest: 0 }, quality_first: { interest: 0 }, impulsive: { interest: 0 }, skeptical: { interest: 0 }, trend_follower: { interest: 0 } } },
    { id: 'fu_praise', label: '真诚赞美', textPayload: "您真有眼光，这东西配您正合适。", category: 'emotional', description: '夸客户眼光好', energyCost: 10, impact: { price_sensitive: { interest: 0 }, quality_first: { interest: 0 }, impulsive: { interest: 0 }, skeptical: { interest: 0 }, trend_follower: { interest: 0 } } },
    { id: 'fu_limited', label: '库存告急', textPayload: "真的没货了，错过今天就得等下个月！", category: 'aggressive', description: '最后两件', energyCost: 10, impact: { price_sensitive: { interest: 0 }, quality_first: { interest: 0 }, impulsive: { interest: 0 }, skeptical: { interest: 0 }, trend_follower: { interest: 0 } } },
];

export const RECOVERY_ACTIONS: NegotiationAction[] = [
    { id: 'rec_apology', label: '诚恳致歉', textPayload: "抱歉抱歉，刚才是我的问题，咱们重新聊。", category: 'emotional', description: '缓和气氛', energyCost: 5, impact: { price_sensitive: { interest: 0 }, quality_first: { interest: 0 }, impulsive: { interest: 0 }, skeptical: { interest: 0 }, trend_follower: { interest: 0 } } },
];

export const DISTRACTOR_ACTIONS: NegotiationAction[] = [
    { id: 'bad_price', label: '突然涨价', textPayload: "哎呀，我看错了，这个得加钱才行。", category: 'financial', description: '成本上升', costPercentage: -0.2, energyCost: 20, impact: { price_sensitive: { interest: 0 }, quality_first: { interest: 0 }, impulsive: { interest: 0 }, skeptical: { interest: 0 }, trend_follower: { interest: 0 } } },
    { id: 'bad_push', label: '强买强卖', textPayload: "你都看了半天了，必须得买！", category: 'aggressive', description: '不买不让走', energyCost: 30, impact: { price_sensitive: { interest: 0 }, quality_first: { interest: 0 }, impulsive: { interest: 0 }, skeptical: { interest: 0 }, trend_follower: { interest: 0 } } },
];

export const CLOSING_ACTION: NegotiationAction = {
    id: 'act_close', label: '最终成交', textPayload: "那就这么定了！给您包起来！", category: 'financial', description: '签单收款！', energyCost: 0, 
    impact: { price_sensitive: { interest: 0 }, quality_first: { interest: 0 }, impulsive: { interest: 0 }, skeptical: { interest: 0 }, trend_follower: { interest: 0 } }
};
