export const BOARD_SIZE = 6;
export const INITIAL_HP = 120;
export const MAX_HAND_SIZE = 5;

export const DIRECTIONS = [
  [-1, 0],  // 上
  [1, 0],   // 下
  [0, -1],  // 左
  [0, 1],   // 右
  [-1, -1], // 左上
  [-1, 1],  // 右上
  [1, -1],  // 左下
  [1, 1],   // 右下
];

// 颜色配置 - 国风/水墨三国主题
export const COLORS = {
  // 背景 - 墨色底
  bg: '#1a1410',
  bgLight: '#2a1f18',

  // 文字 - 古卷金/米白
  text: '#f5e6c8',
  textGold: '#d4a843',
  textSecondary: '#a09080',

  // 棋盘 - 沙盘/木质
  boardFrame: '#2a1508',           // 深木外框
  boardFrameInner: '#4a2a12',      // 木框内层
  boardFrameGold: '#c4943c',       // 鎏金装饰
  boardBg: '#3d2b1a',              // 沙盘底色
  cellBg: '#4d3822',               // 格子底色
  cellBorder: '#3d2b1a',           // 格子边框
  boardGridDark: '#352215',        // 深色格线

  // 棋子 - 阵营色系
  player1: '#b8304f',              // 蜀红
  player1Light: '#e8546a',
  player1Dark: '#6b1a2a',
  player2: '#2a8a7a',              // 吴青碧
  player2Light: '#4ec0a8',
  player2Dark: '#1a5a4a',

  // 魏势力色 (暗金紫)
  factionWei: '#8b5cf6',
  factionWeiBg: 'rgba(139, 92, 246, 0.3)',
  // 蜀势力色 (赤红)
  factionShu: '#e8546a',
  factionShuBg: 'rgba(232, 84, 106, 0.3)',
  // 吴势力色 (碧青)
  factionWu: '#4ec0a8',
  factionWuBg: 'rgba(78, 192, 168, 0.3)',

  // 可落子提示
  movable: 'rgba(245, 230, 200, 0.15)',
  movableBorder: 'rgba(245, 230, 200, 0.5)',
  combo: '#d4a843',
  comboBorder: '#f0d060',

  // UI元素
  hpBarBg: '#2a1a12',
  cardBg: '#3d2b1a',
  cardSelected: 'rgba(196, 148, 60, 0.5)',
  cardBorder: '#5a3a22',
  cardBorderSelected: '#c4943c',
  buttonBg: '#5a3820',
  buttonHover: '#7a4a28',
  overlay: 'rgba(15, 10, 8, 0.85)',

  // 令箭/令牌色
  tokenGold: '#d4a843',
  tokenRed: '#c04040',
};
