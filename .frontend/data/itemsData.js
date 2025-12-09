// Shared mock data for item_list.html and item_page.html
const mockItems = [
  {
    id: 4,
    title: 'MacBook Pro 14吋 M1 晶片',
    subtitle: '僅接受以物易物',
    price: 0,
    category: '筆電／3C',
    location: '台北市信義區',
    seller: {
      name: 'mac_user',
      rating: 4.6,
      ratingText: '97.2% 好評',
      deals: 56,
      since: '2022-06-15'
    },
    condition: '九成新',
    tags: ['Apple', 'MacBook', 'Pro', 'M1', '筆電'],
    mode: {
      purchase: false,
      trade: true,
      wish: true,
      tradeMode: 'both',
      tradeSummary: '想換高階遊戲主機或高階手機，也接受其他高價值 3C 產品'
    },
    pickup: {
      type: '面交',
      place: '台北市信義區',
      time: '時間可議'
    },
    stats: {
      views: 234,
      watchers: 12
    },
    images: [
      'images/no-image.png',
      'images/no-image.png'
    ],
    description: {
      main: 'MacBook Pro 14吋 M1 晶片，使用約兩年，功能正常，想換其他高階設備。',
      includes: [
        'MacBook Pro 14吋',
        '原廠充電器',
        '原廠包裝盒'
      ],
      conditionDetails: [
        '螢幕無刮痕',
        '鍵盤功能正常',
        '電池循環約 200 次',
        '外觀有輕微使用痕跡'
      ],
      extra: '僅接受以物易物，不接受現金購買。'
    }
  },
  {
    id: 5,
    title: '資料庫系統概論 第五版',
    subtitle: '二手課本，有筆記',
    price: 300,
    category: '課本／學習用品',
    location: '新竹市東區',
    seller: {
      name: 'book_worm',
      rating: 4.5,
      ratingText: '95.8% 好評',
      deals: 12,
      since: '2024-09-01'
    },
    condition: '二手',
    tags: ['書籍', '課本', '資料庫', '二手'],
    mode: {
      purchase: true,
      trade: false,
      wish: false,
      tradeMode: null,
      tradeSummary: ''
    },
    pickup: {
      type: '面交',
      place: '新竹市東區',
      time: '校園內可面交'
    },
    stats: {
      views: 89,
      watchers: 3
    },
    images: [
      'images/no-image.png'
    ],
    description: {
      main: '資料庫系統概論第五版，使用過一學期，書內有部分筆記。',
      includes: [
        '課本一本'
      ],
      conditionDetails: [
        '書本有使用痕跡',
        '內頁有部分筆記',
        '封面有輕微磨損',
        '無缺頁'
      ],
      extra: '僅限面交，地點：新竹市東區，校園內可面交。'
    }
  },
  {
    id: 6,
    title: 'Xbox Series X 主機',
    subtitle: '九成新，含遊戲',
    price: 11000,
    category: '遊戲與主機',
    location: '台中市西區',
    seller: {
      name: 'xbox_fan',
      rating: 4.8,
      ratingText: '99.1% 好評',
      deals: 78,
      since: '2022-08-22'
    },
    condition: '九成新',
    tags: ['Xbox', 'Series X', '遊戲主機', '二手'],
    mode: {
      purchase: true,
      trade: true,
      wish: false,
      tradeMode: 'target',
      tradeSummary: '想換 PlayStation 5 或 Nintendo Switch OLED'
    },
    pickup: {
      type: '面交',
      place: '台中市西區',
      time: '週末可議'
    },
    stats: {
      views: 445,
      watchers: 19
    },
    images: [
      'images/no-image.png',
      'images/no-image.png'
    ],
    description: {
      main: 'Xbox Series X 主機，使用約一年，功能正常，含兩片遊戲。',
      includes: [
        'Xbox Series X 主機',
        '原廠控制器',
        '原廠充電線',
        '遊戲兩片（附贈）',
        '原廠包裝盒'
      ],
      conditionDetails: [
        '主機功能正常',
        '外觀有輕微使用痕跡',
        '控制器功能正常',
        '所有配件齊全'
      ],
      extra: '可面交，地點：台中市西區，週末可議。'
    }
  },
  {
    id: 7,
    title: 'AirPods Pro 第二代',
    subtitle: '全新未拆',
    price: 5500,
    category: '筆電／3C',
    location: '台北市中山區',
    seller: {
      name: 'audio_lover',
      rating: 4.9,
      ratingText: '100% 好評',
      deals: 34,
      since: '2023-05-12'
    },
    condition: '全新',
    tags: ['Apple', 'AirPods', 'Pro', '無線耳機', '全新'],
    mode: {
      purchase: true,
      trade: false,
      wish: false,
      tradeMode: null,
      tradeSummary: ''
    },
    pickup: {
      type: '面交',
      place: '台北市中山區',
      time: '平日晚上'
    },
    stats: {
      views: 267,
      watchers: 15
    },
    images: [
      'images/no-image.png',
      'images/no-image.png'
    ],
    description: {
      main: 'AirPods Pro 第二代，全新未拆封，原廠保固。',
      includes: [
        'AirPods Pro 主體',
        '充電盒',
        '原廠充電線',
        '耳塞（多種尺寸）',
        '原廠包裝盒'
      ],
      conditionDetails: [
        '全新未拆封',
        '原廠保固一年',
        '可提供購買證明'
      ],
      extra: '僅限面交，地點：台北市中山區，平日晚上可面交。'
    }
  },
  {
    id: 8,
    title: '線性代數 課本',
    subtitle: '二手，有筆記',
    price: 250,
    category: '課本／學習用品',
    location: '桃園市中壢區',
    seller: {
      name: 'student_2024',
      rating: 4.3,
      ratingText: '92.5% 好評',
      deals: 5,
      since: '2024-10-01'
    },
    condition: '二手',
    tags: ['書籍', '課本', '數學', '線性代數', '二手'],
    mode: {
      purchase: true,
      trade: true,
      wish: false,
      tradeMode: 'offer',
      tradeSummary: '接受其他課本或書籍交換'
    },
    pickup: {
      type: '面交',
      place: '桃園市中壢區',
      time: '校園內可面交'
    },
    stats: {
      views: 56,
      watchers: 2
    },
    images: [
      'images/no-image.png'
    ],
    description: {
      main: '線性代數課本，使用過一學期，書內有部分筆記和劃記。',
      includes: [
        '課本一本'
      ],
      conditionDetails: [
        '書本有使用痕跡',
        '內頁有筆記和劃記',
        '封面有磨損',
        '無缺頁'
      ],
      extra: '可面交或交換，地點：桃園市中壢區，校園內可面交。'
    }
  }
];

