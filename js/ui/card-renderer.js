import { COLORS } from '../game/constants.js';

const FACTION_COLORS = {
  '魏': COLORS.factionWei,
  '蜀': COLORS.factionShu,
  '吴': COLORS.factionWu,
};

const FACTION_BG = { '魏': '#3d2a50', '蜀': '#5a2020', '吴': '#1a3d35' };

export function factionColor(faction) {
  return FACTION_COLORS[faction] || COLORS.player1;
}

export function drawCards(renderer, state) {
  const ctx = renderer.ctx;
  const hand = state.player1Hand;
  const cards = hand.getCards();
  const faction = state.currentPlayerFaction;
  const { cardLabelY, cardAreaY, cardWidth, cardHeight, cardOverlap, cardSideMargin } = renderer;
  const fColor = factionColor(faction);

  // 手牌标签条
  const labelBarH = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  renderer.roundRect(cardSideMargin, cardLabelY, renderer.width - cardSideMargin * 2, labelBarH, labelBarH / 2, true, false);
  ctx.strokeStyle = COLORS.player1;
  ctx.lineWidth = 0.8;
  renderer.roundRect(cardSideMargin, cardLabelY, renderer.width - cardSideMargin * 2, labelBarH, labelBarH / 2, false, true);

  ctx.font = 'bold 10px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.player1;
  ctx.textAlign = 'left';
  ctx.fillText('我方手牌', cardSideMargin + 6, cardLabelY + labelBarH / 2);

  // 牌库
  const deck = state.player1Deck;
  const deckX = renderer.width - cardSideMargin - 34;
  const deckY = cardLabelY - 2;
  const dkw = 18, dkh = 24;
  for (let d = 0; d < Math.min(3, deck.getRemainingCards()); d++) {
    ctx.fillStyle = d === 0 ? COLORS.cardBg : (d === 1 ? '#4a3020' : '#5a3828');
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth = 0.5;
    renderer.roundRect(deckX - d * 3, deckY - d * 2, dkw, dkh, 2, true, true);
  }
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(deck.getRemainingCards()), deckX + dkw / 2, deckY + dkh + 8);

  // 弃牌按钮
  const discardX = deckX - 34;
  renderer._discardButton = { x: discardX, y: deckY, w: 26, h: 26 };
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  renderer.roundRect(discardX, deckY, 26, 26, 6, true, false);
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('弃', discardX + 13, deckY + 14);

  const positions = [];
  if (cards.length === 0) { renderer.cardPositions = positions; return; }

  // === 悬浮底台 ===
  const totalW = cardWidth + (cardWidth - cardOverlap) * 4 + 24;
  const baseH = cardHeight + 34;
  const baseX = (renderer.width - totalW) / 2;
  const baseY = cardAreaY - 6;
  ctx.fillStyle = 'rgba(20, 15, 10, 0.5)';
  renderer.roundRect(baseX, baseY, totalW, baseH, 10, true, false);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 0.8;
  renderer.roundRect(baseX, baseY, totalW, baseH, 10, false, true);

  // === 固定偏移折扇 ===
  const hasSelection = !!state.selectedCard;
  const dragState = renderer.getDragState ? renderer.getDragState() : null;
  const isDragging = dragState && dragState.isDragging && dragState.card;
  const fanBaseY = cardAreaY + cardHeight * 0.8;
  const fanCenterX = renderer.width / 2;
  const xStep = cardWidth - cardOverlap;
  const yStep = 7;
  const rotStep = 5.5 * (Math.PI / 180);
  const centerIdx = (cards.length - 1) / 2;

  // 绘制顺序：选中牌最后(置顶)
  const drawOrder = [];
  for (let i = 0; i < cards.length; i++) {
    if (!(state.selectedCard && state.selectedCard.id === cards[i].id)) drawOrder.push(i);
  }
  for (let i = 0; i < cards.length; i++) {
    if (state.selectedCard && state.selectedCard.id === cards[i].id) drawOrder.push(i);
  }

  // 检查场上已存在的武将名
  const boardChars = new Set();
  const board = state.tableArr;
  if (board) {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (board[r] && board[r][c] && board[r][c].character && board[r][c].character._name) {
          boardChars.add(board[r][c].character._name);
        }
      }
    }
  }

  for (const i of drawOrder) {
    const card = cards[i];
    const isSelected = state.selectedCard && state.selectedCard.id === card.id;
    const isDuplicate = boardChars.has(card.character._name);
    const offset = i - centerIdx;
    const dimmed = hasSelection && !isSelected;

    // 固定偏移计算
    const bx = fanCenterX + offset * xStep - cardWidth / 2;
    const by = fanBaseY + Math.abs(offset) * yStep - cardHeight;
    const rot = offset * rotStep;
    const s = isSelected ? 1.1 : (hasSelection ? 0.88 : 1);
    const lift = isSelected ? 22 : 0;

    const sx = bx - (cardWidth * s - cardWidth) / 2;
    const sy = by - lift - (cardHeight * s - cardHeight);

    ctx.save();
    ctx.translate(sx + cardWidth * s / 2, sy + cardHeight * s);
    ctx.rotate(rot);
    ctx.scale(s, s);

    // 拖拽剪影
    if (isSelected && isDragging) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = fColor;
      renderer.roundRect(-cardWidth / 2, -cardHeight, cardWidth, cardHeight, 5, true, false);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = fColor;
      ctx.lineWidth = 1.5;
      renderer.roundRect(-cardWidth / 2, -cardHeight, cardWidth, cardHeight, 5, false, true);
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (isDuplicate) ctx.globalAlpha = 0.35;
    else if (dimmed) ctx.globalAlpha = 0.5;

    // === 卡面三区布局 ===
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = isSelected ? 16 : 6;
    ctx.shadowOffsetY = isSelected ? 8 : 3;

    // 高对比阵营底色
    if (isSelected) {
      ctx.fillStyle = COLORS.cardSelected;
    } else {
      const g = ctx.createLinearGradient(-cardWidth / 2, -cardHeight, -cardWidth / 2, 0);
      g.addColorStop(0, FACTION_BG[faction] || COLORS.cardBg);
      g.addColorStop(1, '#1a1008');
      ctx.fillStyle = g;
    }
    renderer.roundRect(-cardWidth / 2, -cardHeight, cardWidth, cardHeight, 5, true, false);
    ctx.shadowColor = 'transparent';

    // 顶部：阵营色带 + 武将名
    ctx.fillStyle = fColor;
    renderer.roundRect(-cardWidth / 2 + 2, -cardHeight + 2, cardWidth - 4, 8, 2, true, false);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold ' + Math.max(10, Math.floor(cardWidth * 0.15)) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(card.character._name, 0, -cardHeight + 12);

    // 中部：巨幅立绘 (70%)
    const avatarY = -cardHeight + 27;
    const avatarH = cardHeight * 0.6;
    const ag = ctx.createLinearGradient(-cardWidth / 2, avatarY, -cardWidth / 2, avatarY + avatarH);
    ag.addColorStop(0, 'rgba(255,255,255,0.05)');
    ag.addColorStop(0.5, 'rgba(0,0,0,0.02)');
    ag.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = ag;
    renderer.roundRect(-cardWidth / 2 + 4, avatarY, cardWidth - 8, avatarH, 4, true, false);

    ctx.fillStyle = fColor;
    ctx.globalAlpha = 0.12;
    ctx.font = 'bold ' + Math.max(24, Math.floor(avatarH * 0.6)) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.character._name.charAt(0), 0, avatarY + avatarH / 2);
    ctx.globalAlpha = 1;

    // 阵营边框
    ctx.strokeStyle = isDuplicate ? '#555555' : (isSelected ? '#ffffff' : fColor);
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    renderer.roundRect(-cardWidth / 2, -cardHeight, cardWidth, cardHeight, 5, false, true);

    // 已出战标记
    if (isDuplicate) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-cardWidth / 2, -cardHeight, cardWidth, cardHeight);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold ' + Math.max(9, Math.floor(cardWidth * 0.13)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('已出战', 0, -cardHeight * 0.15);
    }

    // 底部：属性水平排列
    const statY = -5;
    const statFS = Math.max(12, Math.floor(cardWidth * 0.17));
    const comboVal = card.character._combo || 0;

    const atkX = -cardWidth * 0.22;
    const comboX = cardWidth * 0.22;

    // 🔥攻击
    ctx.font = 'bold ' + statFS + 'px sans-serif';
    ctx.fillStyle = '#ff6644';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥 ' + card.character._attack, atkX, statY);

    // ⛓️连击
    if (comboVal > 0) {
      ctx.fillStyle = COLORS.combo;
      ctx.fillText('⛓️ ' + comboVal, comboX, statY);
    }

    ctx.restore();

    positions.push({ x: sx, y: sy, w: cardWidth * s, h: cardHeight * s, card });
  }

  renderer.cardPositions = positions;
}

export function drawDraggedCard(renderer, dragState) {
  const ctx = renderer.ctx;
  const { card, currentX, currentY } = dragState;

  const overBoard = currentY >= renderer.boardY && currentY <= renderer.boardY + renderer.boardSize
    && currentX >= renderer.boardX && currentX <= renderer.boardX + renderer.boardSize;

  if (overBoard) {
    const pr = renderer.cellSize * 0.45;
    const glow = ctx.createRadialGradient(currentX, currentY, pr * 0.3, currentX, currentY, pr * 1.5);
    glow.addColorStop(0, 'rgba(255, 220, 180, 0.3)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(currentX, currentY, pr * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    const pg = ctx.createRadialGradient(currentX - pr*0.3, currentY - pr*0.3, pr*0.05, currentX + pr*0.15, currentY + pr*0.15, pr);
    pg.addColorStop(0, COLORS.player1Light);
    pg.addColorStop(0.65, COLORS.player1);
    pg.addColorStop(1, COLORS.player1Dark);
    ctx.beginPath();
    ctx.arc(currentX, currentY, pr, 0, Math.PI * 2);
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(currentX - pr*0.25, currentY - pr*0.25, pr*0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();

    const fs = Math.max(10, Math.floor(pr * 0.8));
    ctx.font = 'bold ' + fs + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2.5;
    ctx.strokeText(card.character._name.charAt(0), currentX, currentY + 0.5);
    ctx.fillStyle = '#f5e6c8';
    ctx.fillText(card.character._name.charAt(0), currentX, currentY + 0.5);
  } else {
    const cw = renderer.cardWidth * 1.2;
    const ch = renderer.cardHeight * 1.2;
    const x = currentX - cw / 2;
    const y = currentY - ch / 2;

    const glow = ctx.createRadialGradient(currentX, currentY, cw * 0.3, currentX, currentY, cw * 0.9);
    glow.addColorStop(0, 'rgba(255, 220, 180, 0.2)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(currentX, currentY, cw * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = COLORS.cardSelected;
    renderer.roundRect(x, y, cw, ch, 8, true, false);
    ctx.restore();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    renderer.roundRect(x, y, cw, ch, 8, false, true);

    ctx.fillStyle = '#ffffff';
    const nameFS = renderer.fontSizeCardName * 1.3;
    ctx.font = 'bold ' + nameFS + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.character._name, x + cw / 2, y + ch * 0.25);

    const statFS = Math.max(10, Math.floor(cw * 0.15));
    ctx.font = 'bold ' + statFS + 'px sans-serif';
    ctx.fillStyle = '#ff6644';
    ctx.fillText('🔥' + card.character._attack, x + cw / 2, y + ch * 0.6);
  }
}

export function drawEnemyHand(renderer, state) {
  const ctx = renderer.ctx;
  const enemyHand = state.player2Hand;
  const cardCount = enemyHand.getCardCount();
  const ey = renderer.enemyHandY || 22;
  const cardW = 28, cardH = 36, overlap = 18;

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('敌方 x' + cardCount, renderer.width - renderer.cardSideMargin, ey + cardH / 2);

  if (cardCount === 0) return;

  const totalW = cardW + (cardCount - 1) * (cardW - overlap);
  const startX = (renderer.width - totalW) / 2;

  for (let i = 0; i < cardCount; i++) {
    const x = startX + i * (cardW - overlap);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#3d2b1a';
    renderer.roundRect(x, ey, cardW, cardH, 3, true, false);
    ctx.restore();

    ctx.strokeStyle = 'rgba(90, 58, 26, 0.6)';
    ctx.lineWidth = 0.5;
    for (let ly = ey + 5; ly < ey + cardH; ly += 6) {
      ctx.beginPath();
      ctx.moveTo(x + 3, ly);
      ctx.lineTo(x + cardW - 3, ly);
      ctx.stroke();
    }
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 0.8;
    renderer.roundRect(x, ey, cardW, cardH, 3, false, true);

    ctx.fillStyle = 'rgba(196, 148, 60, 0.25)';
    ctx.beginPath();
    const mx = x + cardW / 2, my = ey + cardH / 2;
    ctx.moveTo(mx, my - 5);
    ctx.lineTo(mx + 5, my);
    ctx.lineTo(mx, my + 5);
    ctx.lineTo(mx - 5, my);
    ctx.closePath();
    ctx.fill();
  }
}
