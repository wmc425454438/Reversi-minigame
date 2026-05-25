import { COLORS } from '../game/constants.js';

const FACTION_MAIN = { '魏': COLORS.factionWei, '蜀': COLORS.factionShu, '吴': COLORS.factionWu };
const RARITY_COLORS = { '金': '#ffd700', '紫': '#c084fc', '蓝': '#60a5fa' };

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

function drawCardCell(renderer, x, y, w, h, card, isSelected, isInDeck) {
  const ctx = renderer.ctx;
  const fc = FACTION_MAIN[card.faction] || COLORS.text;

  ctx.fillStyle = isSelected ? 'rgba(196,148,60,0.3)' : (isInDeck ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.3)');
  renderer.roundRect(x, y, w, h, 4, true, false);

  ctx.strokeStyle = isSelected ? COLORS.tokenGold : rgba(fc, 0.4);
  ctx.lineWidth = isSelected ? 1.5 : 0.8;
  renderer.roundRect(x, y, w, h, 4, false, true);

  // 顶部阵营色条
  ctx.fillStyle = fc;
  ctx.fillRect(x + 2, y + 2, w - 4, 3);

  // 武将名
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const name = card.character._name.length > 2 ? card.character._name.slice(0, 2) : card.character._name;
  ctx.fillText(name, x + w / 2, y + h * 0.4);

  // 攻/连
  ctx.fillStyle = '#ff6644';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('攻' + card.character._attack + ' 连' + card.character._combo, x + w / 2, y + h * 0.74);

  // 稀有度点
  ctx.fillStyle = RARITY_COLORS[card.rarity] || '#888';
  ctx.beginPath();
  ctx.arc(x + w - 8, y + h - 8, 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawDeckManager(renderer, manager, selectedDeckId, selectedCardId, activeFilter, scrollY) {
  const ctx = renderer.ctx;
  const W = renderer.width;
  const H = renderer.height;
  const cx = W / 2;

  const decks = manager.getAllDecks();
  const selDeck = manager.getDeck(selectedDeckId);
  if (!selDeck) return;

  // === 背景 ===
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // === 顶部标题栏 ===
  ctx.fillStyle = rgba(COLORS.boardFrameGold, 0.1);
  ctx.fillRect(0, 0, W, 40);
  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('卡组管理', cx, 20);

  // 左上角返回
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  renderer.roundRect(8, 8, 48, 22, 11, true, false);
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← 返回', 32, 19);
  renderer._deckBackButton = { x: 8, y: 8, w: 48, h: 22 };

  // === 卡组标签栏 ===
  const tabY = 44;
  const tabH = 28;
  const tabGap = 6;
  let tabX = 8;
  renderer._deckTabs = [];
  renderer._deckAddTabButton = null;
  renderer._deckDeleteButtons = [];

  for (const d of decks) {
    const label = d.name.length > 3 ? d.name.slice(0, 3) + '..' : d.name;
    const hasDel = decks.length > 1;
    const tw = ctx.measureText(label).width + 16 + (hasDel ? 14 : 0);
    const isActive = d.id === selectedDeckId;

    ctx.fillStyle = isActive ? rgba(FACTION_MAIN[d.faction] || COLORS.textGold, 0.2) : COLORS.cardBg;
    renderer.roundRect(tabX, tabY, tw, tabH, tabH / 2, true, false);
    ctx.strokeStyle = isActive ? (FACTION_MAIN[d.faction] || COLORS.tokenGold) : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = isActive ? 1.5 : 0.5;
    renderer.roundRect(tabX, tabY, tw, tabH, tabH / 2, false, true);

    ctx.fillStyle = isActive ? COLORS.text : COLORS.textSecondary;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tabX + tw / 2, tabY + tabH / 2);

    if (hasDel) {
      const delX = tabX + tw - 14;
      const delY = tabY + 4;
      ctx.fillStyle = 'rgba(255,80,80,0.6)';
      ctx.beginPath();
      ctx.arc(delX + 7, delY + 8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', delX + 7, delY + 9);
      renderer._deckDeleteButtons.push({ x: delX, y: delY, w: 16, h: 16, deckId: d.id });
    }

    renderer._deckTabs.push({ x: tabX, y: tabY, w: tw, h: tabH, deckId: d.id });
    tabX += tw + tabGap;
  }

  // "+" 按钮
  if (decks.length < 10) {
    const addW = 24;
    tabX += 4;
    ctx.fillStyle = COLORS.cardBg;
    renderer.roundRect(tabX, tabY, addW, tabH, tabH / 2, true, false);
    ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.4);
    ctx.lineWidth = 1;
    renderer.roundRect(tabX, tabY, addW, tabH, tabH / 2, false, true);
    ctx.fillStyle = COLORS.textGold;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', tabX + addW / 2, tabY + tabH / 2);
    renderer._deckAddTabButton = { x: tabX, y: tabY, w: addW, h: tabH };
  }

  // === 可滚动内容区域 ===
  const scrollTop = tabY + tabH + 8;
  const scrollBottom = H - 48;
  const scrollAreaH = scrollBottom - scrollTop;

  // 计算内容总高度
  const cellW = (W - 30) / 3;
  const cellH = 48;
  const gridX = 10;

  const deckRows = Math.ceil(Math.min(selDeck.maxSize, selDeck.cards.length) / 3);
  const deckAreaPad = deckRows > 0 ? 18 : 0;
  const detailH = deckAreaPad + deckRows * (cellH + 3) + 4;

  const filterSectionH = 22 + 8; // filter tabs + gap
  const allFactions = (activeFilter || selDeck.faction) === '全部' ? ['魏', '蜀', '吴'] : [(activeFilter || selDeck.faction)];
  var totalPoolCards = 0;
  for (var pf2 = 0; pf2 < allFactions.length; pf2++) {
    totalPoolCards += manager.getCardPool(allFactions[pf2]).length;
  }
  const poolRows = Math.ceil(totalPoolCards / 3);
  const poolH = poolRows > 0 ? 4 + poolRows * (cellH + 3) : 0;

  const totalContentH = detailH + filterSectionH + poolH;
  const maxScroll = Math.max(0, totalContentH - scrollAreaH);
  renderer._deckMaxScroll = maxScroll;
  scrollY = Math.max(0, Math.min(scrollY, maxScroll));

  // 应用滚动偏移
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, scrollTop, W, scrollAreaH);
  ctx.clip();

  const detailY = scrollTop - scrollY;
  const filterY = detailY + detailH;
  const poolY = filterY + filterSectionH;

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  renderer.roundRect(6, detailY, W - 12, detailH, 6, true, false);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('当前卡组 (' + selDeck.cards.length + '/' + selDeck.maxSize + ')  ·  点击移出', 14, detailY + 4);

  const gridY = detailY + 18;
  renderer._deckCards = [];

  for (let i = 0; i < selDeck.cards.length; i++) {
    const card = selDeck.cards[i];
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx2 = gridX + col * (cellW + 4);
    const cy = gridY + row * (cellH + 3);
    if (cy + cellH > scrollBottom || cy + cellH > detailY + detailH - 4) break;
    if (cy < scrollTop) continue;

    drawCardCell(renderer, cx2, cy, cellW, cellH, card, selectedCardId === card.id, false);
    renderer._deckCards.push({ x: cx2, y: cy, w: cellW, h: cellH, cardId: card.id, isInDeck: true });
  }

  // === 卡池筛选标签 ===
  const filterTabH = 22;
  const filters = ['全部', '魏', '蜀', '吴'];
  const activeF = activeFilter || selDeck.faction;
  let fx = 8;
  renderer._deckFilterTabs = [];

  for (const f of filters) {
    const fw = 36;
    const isActive = f === activeF || (f === '全部' && activeF === '全部');
    ctx.fillStyle = f === activeF ? rgba(FACTION_MAIN[f] || COLORS.textGold, 0.3) : COLORS.cardBg;
    renderer.roundRect(fx, filterY, fw, filterTabH, filterTabH / 2, true, false);
    ctx.strokeStyle = f === activeF ? (FACTION_MAIN[f] || COLORS.tokenGold) : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = f === activeF ? 1.2 : 0.5;
    renderer.roundRect(fx, filterY, fw, filterTabH, filterTabH / 2, false, true);
    ctx.fillStyle = f === '全部' ? COLORS.text : (FACTION_MAIN[f] || COLORS.text);
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f, fx + fw / 2, filterY + filterTabH / 2);
    renderer._deckFilterTabs.push({ x: fx, y: filterY, w: fw, h: filterTabH, faction: f });
    fx += fw + 6;
  }

  // === 卡池网格 ===
  const poolCards = [];
  for (var pf3 = 0; pf3 < allFactions.length; pf3++) {
    const cards = manager.getCardPool(allFactions[pf3]);
    for (var ci = 0; ci < cards.length; ci++) {
      poolCards.push(cards[ci]);
    }
  }

  let pi = 0;
  for (const pc of poolCards) {
    const col = pi % 3;
    const row = Math.floor(pi / 3);
    const cx3 = gridX + col * (cellW + 4);
    const cy3 = poolY + row * (cellH + 3);

    // 仅处理可视区域内的卡牌
    if (cy3 + cellH < scrollTop) { pi++; continue; }
    if (cy3 > scrollBottom) break;

    const inDeck = manager.isCharInDeck(selectedDeckId, pc.id);

    ctx.globalAlpha = inDeck ? 0.35 : 1;
    drawCardCell(renderer, cx3, cy3, cellW, cellH, pc, selectedCardId === pc.id, inDeck);
    ctx.globalAlpha = 1;

    // 已编入标记
    if (inDeck) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(cx3 + 1, cy3 + cellH - 12, cellW - 2, 10);
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('已编入', cx3 + cellW / 2, cy3 + cellH - 7);
    }

    renderer._deckCards.push({ x: cx3, y: cy3, w: cellW, h: cellH, cardId: pc.id, isInDeck: false });
    pi++;
  }

  ctx.restore(); // 结束滚动裁剪

  // === 滚动条 ===
  if (maxScroll > 0) {
    var barX = W - 6;
    var barW = 3;
    var trackH = scrollAreaH - 4;
    var thumbH = Math.max(20, trackH * (scrollAreaH / (totalContentH)));
    var thumbY = scrollTop + 2 + (trackH - thumbH) * (scrollY / maxScroll);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    renderer.roundRect(barX, scrollTop + 2, barW, trackH, 1.5, true, false);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    renderer.roundRect(barX, thumbY, barW, thumbH, 1.5, true, false);
  }

  // === 底部操作栏（始终在最上层） ===
  const barH = 36;
  const barY = H - barH - 2;

  // 底部栏背景遮罩
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, barY - 4, W, barH + 6);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, barY - 4, W, barH + 6);

  const btnW = (W - 28) / 3;
  const btns = [
    { label: '保存', key: 'save' },
    { label: '重置', key: 'reset' },
    { label: '出战', key: 'deploy' },
  ];

  for (let b = 0; b < btns.length; b++) {
    const bx = 8 + b * (btnW + 6);
    const by = barY;
    const btn = btns[b];

    ctx.fillStyle = btn.key === 'deploy'
      ? rgba(COLORS.factionShu, 0.6)
      : COLORS.cardBg;
    renderer.roundRect(bx, by, btnW, barH, barH / 2, true, false);
    ctx.strokeStyle = btn.key === 'deploy'
      ? COLORS.factionShu
      : rgba(COLORS.boardFrameGold, 0.4);
    ctx.lineWidth = btn.key === 'deploy' ? 1.5 : 0.8;
    renderer.roundRect(bx, by, btnW, barH, barH / 2, false, true);
    ctx.fillStyle = btn.key === 'deploy' ? '#fff' : COLORS.text;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, bx + btnW / 2, by + barH / 2);

    if (btn.key === 'save') renderer._deckSaveButton = { x: bx, y: by, w: btnW, h: barH };
    if (btn.key === 'reset') renderer._deckResetButton = { x: bx, y: by, w: btnW, h: barH };
    if (btn.key === 'deploy') renderer._deckDeployButton = { x: bx, y: by, w: btnW, h: barH };
  }
}
