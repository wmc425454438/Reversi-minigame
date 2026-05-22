import { BOARD_SIZE, COLORS } from '../game/constants.js';

// 棋盘透视倾斜参数
const TILT_ANGLE = 0;
const TILT_COS = 1;

// 阵营贴图缓存
const pieceImages = {};
export function getFactionImage(faction) {
  if (!pieceImages[faction]) {
    const nameMap = { '魏': 'wei', '蜀': 'shu', '吴': 'wu' };
    const img = wx.createImage();
    img.src = 'assets/img/' + (nameMap[faction] || 'shu') + '.png';
    pieceImages[faction] = img;
  }
  return pieceImages[faction];
}

// 预计算静态数据，避免每帧分配
const DOT_POSITIONS = [[2,2], [2,3], [3,2], [3,3]];

// 玩家色系映射 — 按势力动态取色
function playerColors(type, state) {
  const p1Faction = state ? state.currentPlayerFaction : '蜀';
  const p2Faction = state ? state.player2Faction : '吴';
  const faction = type === 1 ? p1Faction : p2Faction;
  const map = {
    '魏': { main: COLORS.factionWei, light: '#b494f8', dark: '#5a30a0', rgb: '139,92,246' },
    '蜀': { main: COLORS.factionShu, light: COLORS.player1Light, dark: COLORS.player1Dark, rgb: '255,180,150' },
    '吴': { main: COLORS.factionWu, light: COLORS.player2Light, dark: COLORS.player2Dark, rgb: '150,220,210' },
  };
  return map[faction] || playerColors(type, null);
}

// 统一棋子渐变
function pieceGradient(ctx, cx, cy, r, type, state) {
  const c = playerColors(type, state);
  const grad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.05, cx + r*0.15, cy + r*0.15, r);
  grad.addColorStop(0, c.light);
  grad.addColorStop(0.65, c.main);
  grad.addColorStop(1, c.dark);
  return grad;
}

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

export function drawBoard(renderer, board, lastMove, hasSelectedCard, previewFlipped, gameState) {
  const ctx = renderer.ctx;
  const { boardX, boardY, cellSize, boardSize } = renderer;

  // 构建预览翻转位置集合
  const previewSet = previewFlipped ? new Set(previewFlipped.map(p => p.row + ',' + p.col)) : null;

  // 构建翻转动画中的格子集合，这些格子由动画层绘制，棋盘不画
  const flippingCells = new Set();
  const animations = renderer._pendingFlipAnimations;
  if (animations) {
    const now = Date.now();
    for (const anim of animations) {
      if (anim.type === 'flip') {
        flippingCells.add(anim._row + ',' + anim._col);
      }
    }
  }
  const fw = 8;

  // 外框投影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  renderer.roundRect(boardX - fw + 2, boardY - fw + 2, boardSize + fw * 2, boardSize + fw * 2, 5, true, false);
  // 外框深木
  ctx.fillStyle = COLORS.boardFrame;
  renderer.roundRect(boardX - fw, boardY - fw, boardSize + fw * 2, boardSize + fw * 2, 5, true, false);
  // 外框内层
  ctx.fillStyle = COLORS.boardFrameInner;
  renderer.roundRect(boardX - fw + 2, boardY - fw + 2, boardSize + fw * 2 - 4, boardSize + fw * 2 - 4, 4, true, false);
  // 鎏金内框
  ctx.strokeStyle = COLORS.boardFrameGold;
  ctx.lineWidth = 1.5;
  renderer.roundRect(boardX - 2, boardY - 2, boardSize + 4, boardSize + 4, 3, false, true);

  // 沙盘背景
  ctx.fillStyle = COLORS.boardBg;
  ctx.fillRect(boardX, boardY, boardSize, boardSize);

  // 沙盘纹理
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  for (let ty = boardY; ty < boardY + boardSize; ty += 6) {
    ctx.fillRect(boardX, ty, boardSize, 1);
  }

  // 星位点
  for (const [di, dj] of DOT_POSITIONS) {
    const dx = boardX + dj * cellSize + cellSize / 2;
    const dy = boardY + di * cellSize + cellSize / 2;
    ctx.beginPath();
    ctx.arc(dx, dy, 2, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.boardFrameGold;
    ctx.fill();
  }

  // 四角鎏金角花 - 预计算
  if (!renderer._boardCorners) {
    const cs = 8;
    renderer._boardCorners = [
      [boardX - fw, boardY - fw, 1, 1],
      [boardX + boardSize + fw - cs, boardY - fw, -1, 1],
      [boardX - fw, boardY + boardSize + fw - cs, 1, -1],
      [boardX + boardSize + fw - cs, boardY + boardSize + fw - cs, -1, -1],
    ];
  }
  for (const [cx, cy, sx, sy] of renderer._boardCorners) {
    ctx.fillStyle = COLORS.boardFrameGold;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 8 * sx, cy);
    ctx.lineTo(cx, cy + 8 * sy);
    ctx.closePath();
    ctx.fill();
  }

  // 透视倾斜变换（绕棋盘中心X轴提升15°）
  const boardCX = boardX + boardSize / 2;
  const boardCY = boardY + boardSize / 2;
  ctx.save();
  ctx.translate(boardCX, boardCY);
  ctx.scale(1, TILT_COS);
  ctx.translate(-boardCX, -boardCY);
  // 记录倾斜参数供动画层使用
  renderer._boardTilt = { cx: boardCX, cy: boardCY, cos: TILT_COS };

  // 格子
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      const x = boardX + j * cellSize;
      const y = boardY + i * cellSize;
      const cell = board[i][j];

      ctx.fillStyle = (i + j) % 2 === 0 ? COLORS.cellBg : COLORS.boardGridDark;
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

      ctx.strokeStyle = COLORS.cellBorder;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      const pieceR = cellSize * 0.4;

      // 预览火焰边框
      if (previewSet && previewSet.has(i + ',' + j)) {
        const fpulse = Math.sin((renderer.frameTime || Date.now()) / 150) * 0.5 + 0.5;
        ctx.strokeStyle = 'rgba(255, 180, 30, ' + (0.4 + fpulse * 0.4) + ')';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 2]);
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        ctx.setLineDash([]);
        // 火焰光晕
        ctx.fillStyle = 'rgba(255, 200, 50, ' + (0.08 + fpulse * 0.07) + ')';
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      }

      if (cell.type === 1 || cell.type === 2) {
        if (flippingCells.has(i + ',' + j)) continue;
        drawPiece(ctx, cx, cy, pieceR, cell.type, cell.character, gameState);
      } else if (cell.type === 3) {
        drawMoveable(ctx, renderer.frameTime, cx, cy, pieceR, cell, hasSelectedCard);
      }
    }
  }
  ctx.restore(); // 恢复透视倾斜变换
}

export function drawPiece(ctx, cx, cy, r, type, character, gameState) {
  const faction = (character && character._faction)
    || (type === 1 ? (gameState && gameState.currentPlayerFaction) : (gameState && gameState.player2Faction))
    || '蜀';
  const c = playerColors(type, gameState);
  const thickH = r * 0.22; // 棋子厚度

  // 投影阴影
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  ctx.ellipse(cx, cy + thickH + 2, r * 1.02, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();
  ctx.restore();

  // 厚度侧边层（从底部到顶部的渐变色圆柱侧面）
  ctx.beginPath();
  ctx.ellipse(cx, cy + thickH, r, r * 0.3, 0, 0, Math.PI);
  ctx.lineTo(cx + r, cy);
  ctx.arc(cx, cy, r, 0, Math.PI, true);
  ctx.closePath();
  const sideGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  sideGrad.addColorStop(0, c.dark);
  sideGrad.addColorStop(0.3, c.main);
  sideGrad.addColorStop(0.7, c.main);
  sideGrad.addColorStop(1, c.dark);
  ctx.fillStyle = sideGrad;
  ctx.fill();

  // 底部椭圆暗边
  ctx.beginPath();
  ctx.ellipse(cx, cy + thickH, r, r * 0.3, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 顶面
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // 底色渐变
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = pieceGradient(ctx, cx, cy, r, type, gameState);
  ctx.fill();

  // 阵营贴图
  // IMAGE_SCALE 控制贴图缩放：1.0=刚好填满圆, >1.0=放大裁掉透明边, <1.0=缩小留边
  const IMAGE_SCALE = 1.5;
  const img = getFactionImage(faction);
  if (img.complete && img.width > 0) {
    const isr = r * IMAGE_SCALE;
    ctx.drawImage(img, cx - isr, cy - isr, isr * 2, isr * 2);
  }

  ctx.restore();

  // 武将名带描边
  if (character && character._name) {
    const fs = Math.max(Math.floor(r * 0.8), 9);
    ctx.font = 'bold ' + fs + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.strokeText(character._name.charAt(0), cx, cy + 0.5);
    ctx.fillStyle = '#f5e6c8';
    ctx.fillText(character._name.charAt(0), cx, cy + 0.5);
  }
}

export function drawMoveable(ctx, frameTime, cx, cy, r, cell, hasSelectedCard) {
  const now = frameTime || Date.now();
  const pulseSpeed = hasSelectedCard ? 200 : 350;
  const pulse = Math.sin(now / pulseSpeed) * 0.5 + 0.5;
  const breatheAlpha = hasSelectedCard ? (0.5 + pulse * 0.4) : (0.3 + pulse * 0.4);
  const breatheRadius = hasSelectedCard ? (0.55 + pulse * 0.12) : (0.45 + pulse * 0.15);

  if (cell.hasCombo) {
    // 基础高亮
    ctx.fillStyle = rgba(COLORS.tokenGold, hasSelectedCard ? 0.15 + pulse * 0.15 : 0.08 + pulse * 0.12);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // 金色外框(拖拽时加粗)
    ctx.strokeStyle = COLORS.comboBorder;
    ctx.lineWidth = hasSelectedCard ? 3 : 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
    ctx.setLineDash([]);
    // 拖拽时额外第二圈金色呼吸外框
    if (hasSelectedCard) {
      ctx.strokeStyle = rgba(COLORS.comboBorder, 0.5 + pulse * 0.3);
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);
    }
  }

  if (hasSelectedCard) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * breatheRadius * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = rgba(COLORS.text, breatheAlpha * 0.2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r * breatheRadius * 1.3, 0, Math.PI * 2);
  ctx.fillStyle = rgba(COLORS.text, breatheAlpha * 0.15);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r * breatheRadius, 0, Math.PI * 2);
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = rgba(COLORS.text, breatheAlpha);
  ctx.lineWidth = hasSelectedCard ? 2 : 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  if (hasSelectedCard) {
    const flagSize = r * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, cy - flagSize * 1.2);
    ctx.lineTo(cx, cy + flagSize * 1.2);
    ctx.strokeStyle = rgba(COLORS.text, 0.5 + pulse * 0.3);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - flagSize * 1.1);
    ctx.lineTo(cx + flagSize * 1.3, cy - flagSize * 0.6);
    ctx.lineTo(cx, cy - flagSize * 0.1);
    ctx.closePath();
    ctx.fillStyle = rgba(COLORS.tokenGold, 0.5 + pulse * 0.3);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r * (hasSelectedCard ? 0.14 + pulse * 0.08 : 0.1 + pulse * 0.06), 0, Math.PI * 2);
  ctx.fillStyle = hasSelectedCard ? COLORS.combo : COLORS.movableBorder;
  ctx.fill();
}

// 教程演示用小棋盘
export function drawDemoFlip(renderer, cx, cy, size, now) {
  const ctx = renderer.ctx;
  const cellSize = size / 4;
  const bx = cx - size / 2;
  const by = cy - size / 2;
  const pulse = Math.sin(now / 600) * 0.5 + 0.5;
  const r = cellSize * 0.38;

  ctx.fillStyle = COLORS.boardBg;
  ctx.fillRect(bx, by, size, size);

  for (let i = 0; i <= 4; i++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(bx + i * cellSize, by);
    ctx.lineTo(bx + i * cellSize, by + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by + i * cellSize);
    ctx.lineTo(bx + size, by + i * cellSize);
    ctx.stroke();
  }

  const drawPDemo = (col, row, type) => {
    const px = bx + col * cellSize + cellSize / 2;
    const py = by + row * cellSize + cellSize / 2;
    const grad = ctx.createRadialGradient(px - r*0.3, py - r*0.3, r*0.05, px + r*0.15, py + r*0.15, r);
    const c = playerColors(type);
    grad.addColorStop(0, c.light);
    grad.addColorStop(0.65, c.main);
    grad.addColorStop(1, c.dark);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  };

  drawPDemo(1, 1, 1);
  drawPDemo(3, 3, 2);

  const blinkAlpha = pulse;
  const targets = [[2, 2], [2, 1]];
  for (const [tc, tr] of targets) {
    const tcx = bx + tc * cellSize + cellSize / 2;
    const tcy = by + tr * cellSize + cellSize / 2;
    ctx.beginPath();
    ctx.arc(tcx, tcy, r * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${blinkAlpha * 0.3})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tcx, tcy, r * 0.5, 0, Math.PI * 2);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + blinkAlpha * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + blinkAlpha * 0.5})`;
    ctx.font = `bold ${Math.floor(r * 1.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', tcx, tcy);
  }

  const arrowY = by + 2.5 * cellSize;
  ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 + pulse * 0.2})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(bx + 1.5 * cellSize, arrowY);
  ctx.lineTo(bx + 2.5 * cellSize, arrowY);
  ctx.stroke();
  ctx.setLineDash([]);

  const ax = bx + 2.5 * cellSize;
  ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + pulse * 0.2})`;
  ctx.beginPath();
  ctx.moveTo(ax, arrowY);
  ctx.lineTo(ax - 6, arrowY - 4);
  ctx.lineTo(ax - 6, arrowY + 4);
  ctx.closePath();
  ctx.fill();
}
