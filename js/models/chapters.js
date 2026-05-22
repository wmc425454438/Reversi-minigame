const STORAGE_KEY = 'reversi_story_progress';

export const CHAPTERS = [
  {
    id: '001',
    title: '桃园逢真龙',
    faction: '蜀',
    storyTexts: [
      '东汉末年，天下大乱。黄巾贼寇横行，百姓流离失所。',
      '刘备叹息道："皇纲不振，贼寇横行，吾虽力薄，愿以布衣之身，匡扶汉室！"',
      '⚔【翻转规则】落子时夹住敌方棋子，即可翻转颜色。上下左右及四角，八个方向均可夹击。',
      '🃏【卡牌技能】每张武将卡有攻击力和连击值。攻击力造成直接伤害，连击值在翻转时额外触发伤害。',
      '🏆【胜利条件】将对方兵力降至零即获胜。若双方均无合法落子点，兵力多者胜。',
      '关羽抚须道："兄长高义，关某愿追随左右，虽万死而不辞。"',
      '张飞拍案而起："俺也是！三个臭皮匠，顶个诸葛亮——不对，俺就是想打架！"',
      '桃园之中，三人焚香结义，誓同生死。自此，蜀汉基业，始于此处。',
    ],
    specialRules: {
      handLimit: 4,
      description: '兵微将寡：手牌上限 4 张',
    },
    branchOptions: [
      { text: '广发英雄帖，招兵买马', nextChapter: '002a' },
      { text: '投奔恩师卢植，从军历练', nextChapter: '002b' },
    ],
  },
  {
    id: '002a',
    title: '虎牢三英战吕布',
    faction: '蜀',
    storyTexts: [
      '各路诸侯会盟讨董，兵至虎牢关前。',
      '飞将吕布，手持方天画戟，坐下赤兔马，一人挡关，万夫莫开！',
      '连斩数将之后，张飞挺丈八蛇矛出阵："三姓家奴，燕人张翼德在此！"',
      '关羽、刘备相继杀出，三英战吕布，杀得天昏地暗，日月无光。',
      '这一战，虽未斩杀吕布，却让天下人知道了——刘关张的名号！',
    ],
    specialRules: {
      flipBonus: 2,
      description: '三英之力：每次翻转伤害翻倍',
    },
    branchOptions: [
      { text: '乘胜追击，直取长安', nextChapter: '003a' },
      { text: '稳扎稳打，回徐州安民', nextChapter: '003b' },
    ],
  },
  {
    id: '003a',
    title: '赤壁·借东风',
    faction: '吴',
    storyTexts: [
      '曹操率八十万大军南下，号称百万，旌旗蔽日，战船遮江。',
      '孙刘联军退无可退，诸葛亮道："亮虽不才，愿借东风三日，火烧赤壁！"',
      '周瑜冷笑："借风？你若借不来，军法从事！"',
      '是夜，东南风起。孔明羽扇一挥，千船齐发，火光冲天！',
      '赤壁一炬，烧尽曹营百里连船。三分天下之势，就此而定。',
    ],
    specialRules: {
      handLimit: 5,
      flipBonus: 3,
      description: '火烧连营：翻转伤害 +3，手牌满额',
    },
    branchOptions: [
      { text: '乘势北伐，一统中原', nextChapter: null },
      { text: '固守江东，养精蓄锐', nextChapter: null },
    ],
  },
];

const DEFAULT_PROGRESS = {
  unlockedChapters: ['001'],
  completedChapters: [],
  choices: {},
};

export function getStoryProgress() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    // ignore
  }
  return { ...DEFAULT_PROGRESS, unlockedChapters: [...DEFAULT_PROGRESS.unlockedChapters], completedChapters: [], choices: {} };
}

export function saveStoryProgress(progress) {
  try {
    wx.setStorageSync(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    // ignore
  }
}

export function getChapter(id) {
  return CHAPTERS.find(ch => ch.id === id) || null;
}

export function isUnlocked(id) {
  const progress = getStoryProgress();
  return progress.unlockedChapters.includes(id);
}

export function completeChapter(id, nextChapterId) {
  const progress = getStoryProgress();
  if (!progress.completedChapters.includes(id)) {
    progress.completedChapters.push(id);
  }
  if (nextChapterId && !progress.unlockedChapters.includes(nextChapterId)) {
    progress.unlockedChapters.push(nextChapterId);
  }
  progress.choices[id] = nextChapterId;
  saveStoryProgress(progress);
}

export function getChapterList() {
  const progress = getStoryProgress();
  return CHAPTERS.map(ch => ({
    ...ch,
    unlocked: progress.unlockedChapters.includes(ch.id),
    completed: progress.completedChapters.includes(ch.id),
  }));
}
