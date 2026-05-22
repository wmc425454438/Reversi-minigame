import { INITIAL_HP, COLORS } from '../game/constants.js';
import { factionColor } from './card-renderer.js';

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

export function drawLoading(renderer, text, progress) {
  const ctx = renderer.ctx;
  const cx = renderer.width / 2;
  const cy = renderer.height / 2;

  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('三 国 黑 白 棋', cx, cy - 90);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  ctx.fillText('— 天下三分 · 落子定乾坤 —', cx, cy - 55);

  const sealSize = 50;
  ctx.strokeStyle = rgba(COLORS.tokenGold, 0.3);
  ctx.lineWidth = 2;
  renderer.roundRect(cx - sealSize / 2, cy - 120, sealSize, 80, 6, false, true);

  if (text) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '13px sans-serif';
    ctx.fillText(text + '...', cx, cy - 15);
  }

  const barWidth = 200, barHeight = 6;
  const barX = cx - barWidth / 2, barY = cy + 25;
  ctx.fillStyle = COLORS.hpBarBg;
  renderer.roundRect(barX, barY, barWidth, barHeight, 3, true, false);

  const fillWidth = barWidth * (progress / 100);
  const grad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
  grad.addColorStop(0, COLORS.tokenRed);
  grad.addColorStop(0.5, COLORS.tokenGold);
  grad.addColorStop(1, COLORS.boardFrameGold);
  ctx.fillStyle = grad;
  renderer.roundRect(barX, barY, fillWidth, barHeight, 3, true, false);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${Math.floor(progress)}%`, cx, barY + 24);
}

export function drawEnemyBanner(renderer, state) {
  const ctx = renderer.ctx;
  const p1Faction = state.currentPlayerFaction || '?';
  const p2Faction = state.player2Faction || '?';
  const totems = { '魏': '🐯', '蜀': '🦌', '吴': '🐉' };
  const factionColorMap = { '魏': COLORS.factionWei, '蜀': COLORS.factionShu, '吴': COLORS.factionWu };
  const enemyHand = state.player2Hand;
  const enemyHP = state.player2._hp;
  const eColor = factionColorMap[p2Faction] || COLORS.player2;

  const bx = renderer.cardSideMargin;
  const by = renderer.enemyBannerY;
  const bw = renderer.width - renderer.cardSideMargin * 2;
  const bh = renderer.enemyBannerH;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  renderer.roundRect(bx, by, bw, bh, bh / 2, true, false);
  ctx.strokeStyle = eColor;
  ctx.lineWidth = 1;
  renderer.roundRect(bx, by, bw, bh, bh / 2, false, true);

  ctx.fillStyle = eColor;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('敌方: ' + p2Faction + ' ' + (totems[p2Faction] || '') + '  兵力 ' + enemyHP, bx + 8, by + bh / 2);

  const eCount = enemyHand.getCardCount();
  const stackX = bx + bw - 8;
  const stackY = by + bh / 2;
  for (let s = 0; s < Math.min(3, eCount); s++) {
    ctx.fillStyle = s === 0 ? '#3d2b1a' : (s === 1 ? '#4a3522' : '#5a3f2a');
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    renderer.roundRect(stackX - 35 + s * 3, stackY - 8 + s * 2, 14, 18, 2, true, true);
  }
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('x' + eCount, stackX - 16, stackY + 14);
}

export function drawTurnIndicator(renderer, state) {
  const ctx = renderer.ctx;
  const cx = renderer.width / 2;
  const isP1Turn = state.lastMove === 1;
  const turnFaction = isP1Turn ? state.currentPlayerFaction : state.player2Faction;
  const factionColorMap = { '魏': COLORS.factionWei, '蜀': COLORS.factionShu, '吴': COLORS.factionWu };
  const turnColor = factionColorMap[turnFaction] || (isP1Turn ? COLORS.player1 : COLORS.player2);
  const turnLabel = isP1Turn ? '⚔ 你的回合' : '敌方回合';

  const bw = 160, bh = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  renderer.roundRect(cx - bw / 2, renderer.turnIndicatorY - 1, bw, bh, bh / 2, true, false);
  ctx.strokeStyle = turnColor;
  ctx.lineWidth = 1.5;
  renderer.roundRect(cx - bw / 2, renderer.turnIndicatorY - 1, bw, bh, bh / 2, false, true);

  ctx.fillStyle = turnColor;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(turnLabel, cx, renderer.turnIndicatorY + bh / 2 - 1);
}

export function drawHPBar(renderer, player, playerNum, faction) {
  if (playerNum !== 1) return;
  const ctx = renderer.ctx;
  const barX = renderer.cardSideMargin;
  const barY = renderer.hpBarY2;
  const barW = renderer.width - renderer.cardSideMargin * 2;
  const barH = renderer.hpBarH;
  const fColor = factionColor(faction);

  ctx.fillStyle = COLORS.hpBarBg;
  renderer.roundRect(barX, barY, barW, barH, 3, true, false);

  const ratio = Math.max(0, player._hp / INITIAL_HP);
  const fillW = Math.max(0, barW * ratio);
  const hpGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
  hpGrad.addColorStop(0, fColor);
  hpGrad.addColorStop(1, fColor + 'cc');
  ctx.fillStyle = hpGrad;
  renderer.roundRect(barX, barY, fillW, barH, 3, true, false);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.5;
  for (let t = 1; t < 5; t++) {
    ctx.beginPath();
    ctx.moveTo(barX + barW * (t / 5), barY + 2);
    ctx.lineTo(barX + barW * (t / 5), barY + barH - 2);
    ctx.stroke();
  }

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold ' + renderer.fontSizeHpLabel + 'px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(faction ? faction + '军' : '玩家1', barX + 4, barY + barH / 2);
  ctx.textAlign = 'right';
  ctx.fillText('兵力 ' + player._hp, barX + barW - 4, barY + barH / 2);
}

export function drawGameOver(renderer, state) {
  const ctx = renderer.ctx;
  const cx = renderer.width / 2, cy = renderer.height / 2;
  const boxW = Math.min(260, renderer.width - 40), boxH = 170;
  const bx = cx - boxW / 2, by = cy - boxH / 2;

  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, renderer.width, renderer.height);

  ctx.fillStyle = '#2a1a12';
  renderer.roundRect(bx, by, boxW, boxH, 12, true, false);
  ctx.strokeStyle = COLORS.boardFrameGold;
  ctx.lineWidth = 2;
  renderer.roundRect(bx, by, boxW, boxH, 12, false, true);

  ctx.fillStyle = rgba(COLORS.boardFrameGold, 0.15);
  ctx.fillRect(bx + 8, by + 10, boxW - 16, 35);
  ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.3);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(bx + 8, by + 10, boxW - 16, 35);

  const winner = state.player1.isDead() ? '玩家2' : '玩家1';
  const winColor = state.player1.isDead() ? COLORS.player2 : COLORS.player1;
  ctx.fillStyle = winColor;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(winner, cx, by + 28);
  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('一统天下', cx, by + 52);
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  ctx.fillText(`玩家1 剩余 ${state.player1._hp}HP   |   玩家2 剩余 ${state.player2._hp}HP`, cx, by + 80);

  const rbw = 140, rbh = 40, rbx = cx - rbw / 2, rby = by + boxH - 55;
  ctx.fillStyle = COLORS.buttonBg;
  renderer.roundRect(rbx, rby, rbw, rbh, rbh / 2, true, false);
  ctx.strokeStyle = COLORS.tokenGold;
  ctx.lineWidth = 1;
  renderer.roundRect(rbx, rby, rbw, rbh, rbh / 2, false, true);
  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('重整旗鼓', cx, rby + rbh / 2);

  renderer._restartButton = { x: rbx, y: rby, w: rbw, h: rbh };
}
