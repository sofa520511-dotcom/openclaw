'use strict';

function defineProduct(id, name, brand, category, spec, keywords, prices) {
  return { id, name, brand, category, spec, keywords, prices };
}

const STORES = [
  { id: 'pchome', name: 'PChome 24h', short: 'PC', domain: '24h.pchome.com.tw', shipping: 0, freeOver: 0, speed: '24 小時到貨' },
  { id: 'momo', name: 'momo購物網', short: 'mo', domain: 'www.momoshop.com.tw', shipping: 75, freeOver: 799, speed: '約 1–2 日' },
  { id: 'shopee', name: '蝦皮購物', short: '蝦', domain: 'shopee.tw', shipping: 60, freeOver: 499, speed: '依賣場而定' },
  { id: 'yahoo', name: 'Yahoo購物中心', short: 'Y!', domain: 'tw.buy.yahoo.com', shipping: 99, freeOver: 999, speed: '約 2–4 日' },
  { id: 'books', name: '博客來', short: '書', domain: 'www.books.com.tw', shipping: 79, freeOver: 699, speed: '約 2–5 日' },
  { id: 'tk3c', name: '燦坤 3C', short: '燦', domain: 'www.tk3c.com', shipping: 0, freeOver: 0, speed: '門市或宅配' },
  { id: 'efun', name: '全國電子', short: '全', domain: 'www.efun.com.tw', shipping: 80, freeOver: 1500, speed: '門市或宅配' },
  { id: 'pine', name: '松果購物', short: '松', domain: 'www.pcone.com.tw', shipping: 60, freeOver: 800, speed: '約 1–3 日' },
];

const PRODUCTS = [
  defineProduct('mx-master', '羅技 MX Master 3S 無線滑鼠', '羅技', '3C', '石墨黑', ['滑鼠', 'logitech'], {
    pchome: 3290, momo: 3190, shopee: 3090, yahoo: 3390, tk3c: 3340, efun: 3490, pine: 3150,
  }),
  defineProduct('anker-65w', 'Anker Nano II 65W 氮化鎵充電器', 'Anker', '3C', 'USB-C', ['充電器', '氮化鎵', 'gan'], {
    pchome: 1290, momo: 1190, shopee: 1090, yahoo: 1350, books: 1250, tk3c: 1320, efun: 1280, pine: 1180,
  }),
  defineProduct('usbc-cable', 'Apple USB-C 充電線（1 公尺）', 'Apple', '3C', '1 公尺', ['充電線', '線', '蘋果'], {
    pchome: 690, momo: 450, shopee: 490, yahoo: 650, books: 720, tk3c: 750, pine: 640,
  }),
  defineProduct('airpods', 'Apple AirPods Pro 2（USB-C）', 'Apple', '3C', 'USB-C', ['airpods', '耳機', '蘋果', '藍牙'], {
    pchome: 7490, momo: 7290, shopee: 6990, yahoo: 7590, tk3c: 7690, efun: 7790, pine: 7390,
  }),
  defineProduct('powerbank', '小米 20000mAh 33W 行動電源', '小米', '3C', '20000mAh', ['行動電源', '充電寶'], {
    pchome: 895, momo: 849, shopee: 799, yahoo: 929, books: 899, pine: 859,
  }),
  defineProduct('ssd-t7', 'Samsung T7 1TB 外接 SSD', 'Samsung', '3C', '1TB', ['ssd', '固態硬碟'], {
    pchome: 3288, momo: 3090, shopee: 2990, yahoo: 3390, tk3c: 3190, efun: 3290, pine: 3150,
  }),
  defineProduct('xm5', 'Sony WH-1000XM5 降噪耳機', 'Sony', '3C', '黑色', ['耳機', '降噪', 'sony', '索尼'], {
    pchome: 9980, momo: 9480, shopee: 9290, yahoo: 10280, tk3c: 9680, efun: 9890, pine: 9590,
  }),
  defineProduct('ipad-case', 'iPad 11 吋透明保護殼', 'Apple', '3C', '11 吋', ['ipad', '保護殼'], {
    pchome: 1490, momo: 1290, shopee: 990, yahoo: 1390, books: 1590, pine: 1190,
  }),
  defineProduct('keychron-k2', 'Keychron K2 機械鍵盤', 'Keychron', '3C', '茶軸', ['鍵盤', '機械'], {
    pchome: 2890, momo: 2790, shopee: 2690, yahoo: 2990, tk3c: 2950, pine: 2850,
  }),
  defineProduct('airfryer', '飛利浦氣炸鍋 HD9252', '飛利浦', '家電', '4.1 公升', ['氣炸鍋', 'philips'], {
    pchome: 3990, momo: 3690, shopee: 3490, yahoo: 3890, tk3c: 3790, efun: 4090, pine: 3590,
  }),
  defineProduct('thermos', '象印不鏽鋼保溫杯', '象印', '家電', '480ml', ['保溫杯', '保溫瓶'], {
    pchome: 990, momo: 890, shopee: 850, yahoo: 1050, books: 980, pine: 920,
  }),
  defineProduct('dryer', '國際牌奈米水離子吹風機', '國際牌', '家電', 'NA0E', ['panasonic', '吹風機'], {
    pchome: 3280, momo: 2990, tk3c: 2890, efun: 3090,
  }),
  defineProduct('purifier', '小米空氣清淨機 4 Lite', '小米', '家電', '4 Lite', ['空氣清淨機', '清淨機'], {
    pchome: 3450, momo: 3290, shopee: 3190, yahoo: 3590, pine: 3390, efun: 3690,
  }),
  defineProduct('dehumidifier', '聲寶 8 公升除濕機', '聲寶', '家電', '8 公升', ['除濕機'], {
    pchome: 4280, momo: 3990, yahoo: 4490, tk3c: 3890, efun: 4190,
  }),
  defineProduct('tissue', '舒潔棉柔抽取衛生紙', '舒潔', '生活', '100 抽 × 24 包', ['衛生紙', '紙巾'], {
    pchome: 399, momo: 369, shopee: 349, yahoo: 419, books: 389, pine: 359,
  }),
  defineProduct('wipes', '康那香超厚超純水濕紙巾', '康那香', '生活', '80 抽 × 3 包', ['濕紙巾', '濕巾'], {
    pchome: 199, momo: 179, shopee: 159, yahoo: 209, books: 189, pine: 169,
  }),
  defineProduct('mop', '妙潔輕巧拖替換組', '妙潔', '生活', '替換組', ['拖把', '平板拖'], {
    pchome: 329, momo: 299, shopee: 279, yahoo: 349, pine: 309,
  }),
  defineProduct('hooks', '3M 無痕掛鉤中型', '3M', '生活', '6 入', ['掛鉤', '無痕'], {
    pchome: 189, momo: 169, shopee: 149, yahoo: 199, books: 179, pine: 159, tk3c: 209,
  }),
  defineProduct('sunscreen', '理膚寶水安得利防曬液', '理膚寶水', '美妝', '50ml SPF50+', ['防曬'], {
    pchome: 890, momo: 820, shopee: 790, yahoo: 860, books: 650, pine: 830,
  }),
  defineProduct('cleanser', '露得清深層淨化洗面乳', '露得清', '美妝', '100g', ['洗面乳', '洗臉'], {
    pchome: 189, momo: 169, shopee: 149, yahoo: 199, books: 179, pine: 159,
  }),
  defineProduct('shampoo', '多芬深層修護洗髮乳', '多芬', '美妝', '680ml', ['洗髮乳', '洗髮精'], {
    pchome: 229, momo: 199, shopee: 179, yahoo: 239, pine: 209,
  }),
  defineProduct('lipbalm', '曼秀雷敦潤唇膏', '曼秀雷敦', '美妝', '無香', ['護唇膏', '唇膏'], {
    pchome: 89, momo: 79, shopee: 69, yahoo: 99, books: 85, pine: 75,
  }),
  defineProduct('skii', 'SK-II 青春露', 'SK-II', '美妝', '230ml', ['青春露', 'skii', 'sk-ii'], {
    pchome: 5990, momo: 5690, shopee: 5490, yahoo: 5890,
  }),
  defineProduct('nuts', '萬歲牌杏仁果', '萬歲牌', '食品', '300g', ['堅果', '杏仁'], {
    pchome: 249, momo: 229, shopee: 199, yahoo: 259, books: 239, pine: 219,
  }),
  defineProduct('puff', '義美小泡芙', '義美', '食品', '巧克力 57g × 6', ['泡芙'], {
    pchome: 129, momo: 115, shopee: 99, yahoo: 139, books: 125, pine: 119,
  }),
  defineProduct('noodles', '統一肉燥麵', '統一', '食品', '3 合 1 × 5 入', ['泡麵', '速食麵'], {
    pchome: 89, momo: 79, shopee: 69, yahoo: 99, pine: 85,
  }),
  defineProduct('coffee', '星巴克早餐綜合咖啡豆', '星巴克', '食品', '1.13 公斤', ['咖啡', '咖啡豆'], {
    pchome: 1280, momo: 1190, shopee: 1090, yahoo: 1350, pine: 1240,
  }),
  defineProduct('tea', '茶裏王無糖綠茶', '茶裏王', '食品', '975ml × 12', ['茶', '綠茶', '飲料'], {
    pchome: 399, momo: 369, shopee: 349, yahoo: 429, pine: 389,
  }),
  defineProduct('atomic-habits', '原子習慣', '方智', '圖書', '繁體中文版', ['書', '習慣', 'atomic'], {
    books: 300, yahoo: 340, shopee: 320, pine: 330,
  }),
  defineProduct('courage', '被討厭的勇氣', '究竟', '圖書', '繁體中文版', ['書', '阿德勒'], {
    books: 250, yahoo: 280, momo: 270, shopee: 240, pine: 265,
  }),
];

const PRESETS = [
  {
    id: 'commute',
    title: '通勤 3C',
    desc: '一次買齊比分頭買更省',
    items: [
      { id: 'mx-master', qty: 1 },
      { id: 'anker-65w', qty: 1 },
      { id: 'usbc-cable', qty: 1 },
    ],
  },
  {
    id: 'lipbalm',
    title: '護唇膏',
    desc: '低單價會被運費翻盤',
    items: [{ id: 'lipbalm', qty: 1 }],
  },
  {
    id: 'split-win',
    title: '分開買較省',
    desc: '吹風機與防曬',
    items: [
      { id: 'dryer', qty: 1 },
      { id: 'sunscreen', qty: 1 },
    ],
  },
  {
    id: 'no-overlap',
    title: '沒有店能一次買齊',
    desc: '書與吹風機',
    items: [
      { id: 'atomic-habits', qty: 1 },
      { id: 'dryer', qty: 1 },
    ],
  },
];

const CATEGORIES = ['全部', '3C', '家電', '生活', '美妝', '食品', '圖書'];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STORES, PRODUCTS, PRESETS, CATEGORIES };
}
