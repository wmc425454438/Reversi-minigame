import { BOARD_SIZE, COLORS } from '../game/constants.js';
import { drawBoard } from './board-renderer.js';
import { drawCards, drawDraggedCard as drawDragged } from './card-renderer.js';
import { drawAnimations, drawPreviewLightning } from './animation-renderer.js';
import { drawMenu } from './menu-renderer.js';
import { drawTutorial } from './tutorial-renderer.js';
import { drawLoading, drawEnemyBanner, drawTurnIndicator, drawHPBar, drawGameOver } from './hud-renderer.js';

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

export class Renderer {
  constructor(designWidth, designHeight, ctx, getDragState, getLoadProgress) {
    this.ctx = ctx;
    this.width = designWidth;
    this.height = designHeight;
    this.getDragState = getDragState || (() => null);
    this.getLoadProgress = getLoadProgress || (() => ({ progress: 0, text: '' }));
    this.calculateLayout();
  }

  calculateLayout() {
    this.cardSideMargin = 8;
    this.cardGap = 3;

    this.menuTitleY = 30;
    this.menuSubtitleY = 55;
    this.menuBtnStartY = 85;
    this.menuBtnW = 200;
    this.menuBtnH = 75;
    this.menuBtnGap = 18;
    this.menuStartBtnGap = 15;
    this.menuStartBtnH = 42;

    // === 垂直居中布局：上(敌) → 中(棋) → 下(我) ===
    this.hpBarH = 14;
    this.hpBarMargin = 6;

    // 手牌满宽平分屏幕 (宽高比保持~1.08)
    this.cardWidth = 96;
    this.cardOverlap = 32;
    this.cardHeight = 104;
    this.cardLift = 22;

    // 计算各区域高度: 上(敌)→中(棋)→下(手牌→兵力)
    const enemySectionH = 26;
    const turnSectionH = 19;
    const topGap = 6;
    const labelSectionH = 14;
    // cardSectionH: 卡片可视区 + HP条 + 边距
    const cardVisH = this.cardHeight * 0.8 + 10;
    const hpSectionH = this.hpBarH + 8;

    const topFixed = enemySectionH + turnSectionH + topGap;
    const bottomFixed = labelSectionH + cardVisH + hpSectionH;

    const availW = this.width - this.cardSideMargin * 2;
    const availH = this.height - topFixed - bottomFixed;

    this.boardSize = Math.min(availW, availH);
    this.boardSize = Math.floor(this.boardSize / BOARD_SIZE) * BOARD_SIZE;
    this.cellSize = this.boardSize / BOARD_SIZE;
    this.boardX = (this.width - this.boardSize) / 2;

    const totalContentH = topFixed + this.boardSize + bottomFixed;
    const topOffset = Math.max(0, (this.height - totalContentH) / 2);

    this.enemyBannerY = topOffset;
    this.enemyBannerH = 22;
    this.turnIndicatorY = this.enemyBannerY + this.enemyBannerH + 4;

    this.boardY = this.turnIndicatorY + 20;
    this.cardLabelY = this.boardY + this.boardSize + 4;
    this.cardAreaY = this.cardLabelY + labelSectionH;
    // HP条固定在屏幕底部
    this.hpBarY2 = this.height - this.hpBarH - 8;

    const totalHandWidth = this.cardWidth + (this.cardWidth - this.cardOverlap) * 4;
    this.cardStartX = (this.width - totalHandWidth) / 2;

    this.fontSizeTitle = 28;
    this.fontSizeSubtitle = 13;
    this.fontSizeMenuBtnName = 22;
    this.fontSizeMenuBtnDesc = 11;
    this.fontSizeMenuStartBtn = 16;
    this.fontSizeTurn = 12;
    this.fontSizeHpLabel = 10;
    this.fontSizeCardName = 11;
    this.fontSizeCardStat = 9;

    this._boardCorners = null;
  }

  clear() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  drawBackground() {
    const ctx = this.ctx;
    const topGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.25);
    topGrad.addColorStop(0, 'rgba(200, 180, 140, 0.04)');
    topGrad.addColorStop(1, 'rgba(200, 180, 140, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, this.width, this.height * 0.25);

    const vignette = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.height * 0.4,
      this.width / 2, this.height / 2, this.height * 0.75
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.08);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 6);
    ctx.lineTo(this.width - 10, 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, this.height - 6);
    ctx.lineTo(this.width - 10, this.height - 6);
    ctx.stroke();
  }

  // ==================== Loading Screen ====================

  drawLoading(text, progress) {
    this.clear();
    this.drawBackground();
    drawLoading(this, text, progress);
  }

  // ==================== Menu Screen ====================

  drawMenu(selectedFaction, aiDifficulty) {
    this.clear();
    this.drawBackground();
    drawMenu(this, selectedFaction, aiDifficulty);
  }

  getMenuButtonAt(x, y) { return this._hitButton(x, y, this._menuButtons); }
  getStartButtonAt(x, y) { return this._hitRect(x, y, this._startButton); }
  getDifficultyAt(x, y) {
    const btns = this._difficultyButtons;
    if (!btns) return null;
    for (const b of btns) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.diff;
    }
    return null;
  }

  // ==================== Tutorial Screen ====================

  drawTutorial(page) {
    this.clear();
    this.drawBackground();
    this.frameTime = Date.now();
    drawTutorial(this, page);
  }

  getTutorialSkipAt(x, y) { return this._hitRect(x, y, this._tutorialSkipButton); }
  getTutorialEnterAt(x, y) { return this._hitRect(x, y, this._tutorialEnterButton); }

  // ==================== Game Screen ====================

  drawGame(state) {
    this.clear();
    this.drawBackground();
    this.frameTime = Date.now();

    drawEnemyBanner(this, state);
    drawTurnIndicator(this, state);
    const previewFlipped = state.previewChains ? state.previewChains.flippedPositions : null;
    drawBoard(this, state.tableArr, state.lastMove, !!state.selectedCard, previewFlipped);
    drawCards(this, state);
    drawHPBar(this, state.player1, 1, state.currentPlayerFaction);

    if (state.animations && state.animations.length > 0) {
      drawAnimations(this, state.animations);
    }

    // 闪电预览
    if (state.previewChains) {
      drawPreviewLightning(this, state.previewChains);
    }

    const dragState = this.getDragState();
    if (dragState && dragState.isDragging && dragState.card) {
      drawDragged(this, dragState);
    }

    // AI思考中提示
    if (state.isAIThinking) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.roundRect(this.width / 2 - 70, this.height / 2 - 18, 140, 36, 18, true, false);
      ctx.fillStyle = COLORS.textGold;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('敌方思考中...', this.width / 2, this.height / 2);
    }

    if (state.gameOver) {
      drawGameOver(this, state);
    }
  }

  getRestartButtonAt(x, y) { return this._hitRect(x, y, this._restartButton); }

  getCardAt(x, y) {
    const positions = this.cardPositions || [];
    for (let i = positions.length - 1; i >= 0; i--) {
      if (this._hitRectRaw(x, y, positions[i])) return positions[i].card;
    }
    return null;
  }

  getCellAt(x, y) {
    const col = Math.floor((x - this.boardX) / this.cellSize);
    const row = Math.floor((y - this.boardY) / this.cellSize);
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) return { row, col };
    return null;
  }

  // ==================== Hit Detection Helpers ====================

  _hitRect(x, y, rect) {
    return rect ? this._hitRectRaw(x, y, rect) : false;
  }

  _hitButton(x, y, buttons) {
    for (const btn of (buttons || [])) {
      if (this._hitRectRaw(x, y, btn)) return btn.faction || true;
    }
    return null;
  }

  _hitRectRaw(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // ==================== Utility ====================

  roundRect(x, y, w, h, r, fill, stroke) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}
