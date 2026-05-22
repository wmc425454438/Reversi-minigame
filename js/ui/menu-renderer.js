import { COLORS } from '../game/constants.js';

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

export function drawMenu(renderer, selectedFaction, aiDifficulty) {
  const ctx = renderer.ctx;
  const cx = renderer.width / 2;

  ctx.fillStyle = rgba(COLORS.boardFrameGold, 0.12);
  ctx.fillRect(15, renderer.menuTitleY - 5, renderer.width - 30, 32);
  ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.25);
  ctx.lineWidth = 1;
  ctx.strokeRect(15, renderer.menuTitleY - 5, renderer.width - 30, 32);

  ctx.fillStyle = COLORS.textGold;
  ctx.font = `bold ${renderer.fontSizeTitle}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('天 下 三 分', cx, renderer.menuTitleY + 3);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = `${renderer.fontSizeSubtitle}px sans-serif`;
  ctx.fillText('— 择一势力 · 逐鹿中原 —', cx, renderer.menuSubtitleY);

  const factions = [
    { name: '魏', color: COLORS.factionWei, bg: COLORS.factionWeiBg, desc: '曹魏 · 挟天子令诸侯', totem: '🐯', totemName: '虎', icon: '魏' },
    { name: '蜀', color: COLORS.factionShu, bg: COLORS.factionShuBg, desc: '蜀汉 · 兴复汉室', totem: '🦌', totemName: '鹿', icon: '蜀' },
    { name: '吴', color: COLORS.factionWu, bg: COLORS.factionWuBg, desc: '东吴 · 据长江天险', totem: '🐉', totemName: '龙', icon: '吴' },
  ];

  renderer._menuButtons = [];

  for (let i = 0; i < factions.length; i++) {
    const f = factions[i];
    const btnX = (renderer.width - renderer.menuBtnW) / 2;
    const btnY = renderer.menuBtnStartY + i * (renderer.menuBtnH + renderer.menuBtnGap);
    const isSelected = selectedFaction === f.name;

    if (isSelected) {
      const glow = ctx.createRadialGradient(cx, btnY + renderer.menuBtnH / 2, renderer.menuBtnW * 0.2, cx, btnY + renderer.menuBtnH / 2, renderer.menuBtnW * 1.2);
      glow.addColorStop(0, f.bg);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(btnX - 30, btnY - 10, renderer.menuBtnW + 60, renderer.menuBtnH + 20);
    }

    ctx.fillStyle = isSelected ? 'rgba(0,0,0,0.3)' : COLORS.cardBg;
    renderer.roundRect(btnX, btnY, renderer.menuBtnW, renderer.menuBtnH, 8, true, false);

    ctx.strokeStyle = isSelected ? COLORS.tokenGold : rgba(COLORS.boardFrameGold, 0.3);
    ctx.lineWidth = isSelected ? 2.5 : 1;
    renderer.roundRect(btnX, btnY, renderer.menuBtnW, renderer.menuBtnH, 8, false, true);

    if (isSelected) {
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(btnX + renderer.menuBtnW - 28, btnY);
      ctx.lineTo(btnX + renderer.menuBtnW, btnY);
      ctx.lineTo(btnX + renderer.menuBtnW, btnY + 28);
      ctx.fill();
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('选', btnX + renderer.menuBtnW - 4, btnY + 3);
    }

    ctx.font = '30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.totem, cx - 50, btnY + renderer.menuBtnH * 0.5);

    ctx.fillStyle = isSelected ? f.color : COLORS.text;
    ctx.font = `bold ${renderer.fontSizeMenuBtnName}px sans-serif`;
    ctx.fillText(f.icon + ' · ' + f.totemName, cx + 5, btnY + renderer.menuBtnH * 0.28);

    ctx.font = `${renderer.fontSizeMenuBtnDesc}px sans-serif`;
    ctx.fillStyle = isSelected ? COLORS.text : COLORS.textSecondary;
    ctx.fillText(f.desc, cx, btnY + renderer.menuBtnH * 0.72);

    renderer._menuButtons.push({ x: btnX, y: btnY, w: renderer.menuBtnW, h: renderer.menuBtnH, faction: f.name });
  }

  if (selectedFaction) {
    const diffStartY = renderer.menuBtnStartY + 3 * (renderer.menuBtnH + renderer.menuBtnGap) + 4;
    const diffBtnW = 140, diffBtnH = 30, diffGap = 8;

    ctx.fillStyle = COLORS.textGold;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('— 选择对战模式 —', cx, diffStartY);

    renderer._difficultyButtons = [];

    const modes = [
      { id: 'easy', label: '简单 · 随机AI', diff: 'easy' },
      { id: 'medium', label: '中等 · 贪心AI', diff: 'medium' },
      { id: 'hard', label: '困难 · 策略AI', diff: 'hard' },
      { id: 'pvp', label: '双人对战', diff: 'pvp' },
    ];

    for (let m = 0; m < modes.length; m++) {
      const mode = modes[m];
      const bx = cx - diffBtnW / 2;
      const by = diffStartY + 16 + m * (diffBtnH + diffGap);
      const isSelected = aiDifficulty === mode.diff;

      ctx.fillStyle = isSelected ? 'rgba(196, 148, 60, 0.2)' : COLORS.cardBg;
      renderer.roundRect(bx, by, diffBtnW, diffBtnH, diffBtnH / 2, true, false);
      ctx.strokeStyle = isSelected ? COLORS.tokenGold : 'rgba(196, 148, 60, 0.3)';
      ctx.lineWidth = isSelected ? 1.5 : 0.8;
      renderer.roundRect(bx, by, diffBtnW, diffBtnH, diffBtnH / 2, false, true);

      ctx.fillStyle = isSelected ? COLORS.textGold : COLORS.textSecondary;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(mode.label, cx, by + diffBtnH / 2);

      renderer._difficultyButtons.push({
        x: bx, y: by, w: diffBtnW, h: diffBtnH, diff: mode.diff,
      });
    }

    renderer._startButton = null;
  } else {
    renderer._startButton = null;
    renderer._difficultyButtons = null;
  }

  if (!selectedFaction) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('请先选择一个势力', cx, renderer.menuBtnStartY + 3 * (renderer.menuBtnH + renderer.menuBtnGap) - 6);
  }

  // 剧情模式按钮
  const storyY = renderer.menuBtnStartY + 3 * (renderer.menuBtnH + renderer.menuBtnGap) + 10;
  const storyBtnW = 160, storyBtnH = 32;
  const sbx = cx - storyBtnW / 2;
  ctx.fillStyle = COLORS.cardBg;
  renderer.roundRect(sbx, storyY, storyBtnW, storyBtnH, storyBtnH / 2, true, false);
  ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.4);
  ctx.lineWidth = 1;
  renderer.roundRect(sbx, storyY, storyBtnW, storyBtnH, storyBtnH / 2, false, true);
  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📜 剧情模式', cx, storyY + storyBtnH / 2);
  renderer._storyButton = { x: sbx, y: storyY, w: storyBtnW, h: storyBtnH };
}
