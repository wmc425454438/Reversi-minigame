import { COLORS } from '../game/constants.js';
import { drawDemoFlip } from './board-renderer.js';

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

export function drawTutorial(renderer, page) {
  const ctx = renderer.ctx;
  const cx = renderer.width / 2;
  const panelY = 40, panelH = renderer.height - 120;
  const panelW = renderer.width - 30, panelX = 15;

  ctx.fillStyle = 'rgba(30, 20, 12, 0.8)';
  renderer.roundRect(panelX, panelY, panelW, panelH, 10, true, false);
  ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.3);
  ctx.lineWidth = 1;
  renderer.roundRect(panelX, panelY, panelW, panelH, 10, false, true);

  ctx.fillStyle = rgba(COLORS.boardFrameGold, 0.1);
  ctx.fillRect(panelX + 10, panelY + 8, panelW - 20, 50);
  ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.2);
  ctx.strokeRect(panelX + 10, panelY + 8, panelW - 20, 50);

  const titles = ['翻转规则', '卡牌技能', '胜利条件'];
  const icons = ['⚔', '🃏', '🏆'];
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icons[page], cx, panelY + 22);
  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(titles[page], cx, panelY + 50);

  const demoY = panelY + 65;
  const demoH = panelH - 160;
  const demoW = Math.min(panelW - 30, 240);

  if (page === 0) {
    drawDemoFlip(renderer, cx, demoY + demoH / 2, demoW * 0.7, renderer.frameTime);
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('落子夹住敌方 → 翻转颜色', cx, demoY + demoH + 5);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('八个方向均可夹击：上下左右+四角', cx, demoY + demoH + 22);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px sans-serif';
    ctx.fillText('↑ ↓ ← → ↖ ↗ ↙ ↘', cx, demoY + demoH + 40);
  } else if (page === 1) {
    const cdx = cx - 55, cdy = demoY + 10;
    ctx.fillStyle = COLORS.cardBg;
    renderer.roundRect(cdx, cdy, 110, 90, 8, true, false);
    ctx.strokeStyle = COLORS.cardBorderSelected;
    ctx.lineWidth = 2;
    renderer.roundRect(cdx, cdy, 110, 90, 8, false, true);
    ctx.fillStyle = COLORS.factionShu;
    renderer.roundRect(cdx + 6, cdy + 6, 98, 5, 2, true, false);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('关 羽', cx, cdy + 30);
    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('12', cx - 22, cdy + 60);
    ctx.font = '11px sans-serif';
    ctx.fillText('⚔攻', cx - 22, cdy + 80);
    ctx.fillStyle = COLORS.combo;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('5', cx + 30, cdy + 60);
    ctx.font = '11px sans-serif';
    ctx.fillText('⚡连', cx + 30, cdy + 80);
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '12px sans-serif';
    ctx.fillText('攻击力 = 直接伤害值', cx, demoY + demoH - 15);
    ctx.fillStyle = COLORS.combo;
    ctx.fillText('连击 = 翻转时额外触发伤害', cx, demoY + demoH + 10);
  } else {
    const by2 = demoY + 30, bw = 200, bh = 20, bx2 = cx - bw / 2;
    ctx.fillStyle = COLORS.hpBarBg;
    renderer.roundRect(bx2, by2, bw, bh, 4, true, false);
    ctx.fillStyle = COLORS.player1;
    renderer.roundRect(bx2, by2, bw * 0.7, bh, 4, true, false);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('蜀军 84/120', bx2 + 6, by2 + bh / 2);
    const by3 = by2 + 40;
    ctx.fillStyle = COLORS.hpBarBg;
    renderer.roundRect(bx2, by3, bw, bh, 4, true, false);
    ctx.fillStyle = COLORS.player2;
    renderer.roundRect(bx2, by3, bw * 0.3, bh, 4, true, false);
    ctx.fillText('吴军 36/120', bx2 + 6, by3 + bh / 2);
    ctx.fillStyle = COLORS.textGold;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('一方兵力归零即落败', cx, by3 + 50);
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '12px sans-serif';
    ctx.fillText('若双方均无合法落子点', cx, by3 + 75);
    ctx.fillText('兵力多者获胜', cx, by3 + 93);
  }

  const dotY = panelY + panelH - 40;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx - 16 + i * 16, dotY, i === page ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = i === page ? COLORS.textGold : 'rgba(255,255,255,0.3)';
    ctx.fill();
  }

  const btnY = dotY + 20;
  if (page < 2) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '12px sans-serif';
    ctx.fillText('→ 滑动翻页 或 点击跳过 →', cx, btnY + 16);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    renderer.roundRect(cx - 50, btnY + 2, 100, 30, 15, true, false);
    renderer._tutorialSkipButton = { x: cx - 50, y: btnY + 2, w: 100, h: 30 };
  } else {
    const ebw = 140, ebh = 36, ebx = cx - ebw / 2, eby = btnY + 2;
    ctx.fillStyle = COLORS.buttonBg;
    renderer.roundRect(ebx, eby, ebw, ebh, ebh / 2, true, false);
    ctx.strokeStyle = COLORS.tokenGold;
    ctx.lineWidth = 1.5;
    renderer.roundRect(ebx, eby, ebw, ebh, ebh / 2, false, true);
    ctx.fillStyle = COLORS.textGold;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('进入游戏', cx, eby + ebh / 2);
    renderer._tutorialEnterButton = { x: ebx, y: eby, w: ebw, h: ebh };
  }

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '10px sans-serif';
  ctx.fillText('左右滑动切换页面', cx, panelY + panelH - 6);
}
