import { Player } from './models/player.js';
import { PlayerDeck, PlayerHand } from './models/card.js';
import { createInitialBoard, calculateMoveableArea, reversiChess, hasAnyMoveable } from './game/logic.js';
import { Renderer } from './ui/renderer.js';
import { AIPlayer, AI_DIFFICULTY } from './ai/ai-player.js';

const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 667;

export default class Main {
  constructor() {
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');

    const sysInfo = wx.getSystemInfoSync();

    this.scaleX = sysInfo.screenWidth / DESIGN_WIDTH;
    this.scaleY = sysInfo.screenHeight / DESIGN_HEIGHT;
    this.scale = Math.min(this.scaleX, this.scaleY);

    const renderWidth = DESIGN_WIDTH * this.scale;
    const renderHeight = DESIGN_HEIGHT * this.scale;
    this.screenOffsetX = (sysInfo.screenWidth - renderWidth) / 2;
    this.screenOffsetY = (sysInfo.screenHeight - renderHeight) / 2;

    // 先平移再缩放，使设计区域居中，与toDesignCoords保持一致
    this.ctx.translate(this.screenOffsetX, this.screenOffsetY);
    this.ctx.scale(this.scale, this.scale);

    this.renderer = new Renderer(DESIGN_WIDTH, DESIGN_HEIGHT, this.ctx, () => this.dragState, () => this.loadProgress);

    this.scene = 'loading';  // loading → tutorial → menu → game
    this.selectedFaction = null;
    this.selectedCard = null;

    // 新手引导状态
    this.tutorialPage = 0;
    this.tutorialTouchStartX = 0;
    this.tutorialTouchStartY = 0;

    // 闪电预览
    this.previewChains = null;

    // AI 状态
    this.aiDifficulty = null;      // null=PVP, 或 AI_DIFFICULTY
    this.aiPlayer = null;
    this.isAIThinking = false;
    this.aiTimer = null;

    this.dragState = {
      isDragging: false,
      card: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    };

    // 加载进度
    this.loadProgress = 0;

    // 性能监控
    this.setupPerformanceMonitoring();

    this.initGameState();
    this.bindTouch();
    this.startLoading();

    this.loop();
  }

  setupPerformanceMonitoring() {
    // 内存警告监听
    wx.onMemoryWarning((res) => {
      console.warn('内存警告:', res.level);
      // 可以在这里清理缓存等
    });

    // 性能数据
    wx.getPerformance((res) => {
      console.log('性能数据:', res);
    });

    // 设置目标帧率（安卓设备有效）
    if (wx.setPreferredFramesPerSecond) {
      wx.setPreferredFramesPerSecond(60);
    }
  }

  async startLoading() {
    // 模拟资源加载
    const steps = [
      { name: '初始化引擎', duration: 100 },
      { name: '加载游戏逻辑', duration: 150 },
      { name: '准备卡牌数据', duration: 200 },
      { name: '就绪', duration: 50 },
    ];

    let progress = 0;
    const progressStep = 100 / steps.length;

    for (const step of steps) {
      this.loadingText = step.name;
      progress += progressStep;
      this.loadProgress = progress;
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    this.scene = 'tutorial';
    this.tutorialPage = 0;
  }

  initGameState() {
    this.gameState = {
      tableArr: [],
      lastMove: 1,
      player1: new Player('玩家1', 1),
      player2: new Player('玩家2', 2),
      gameOver: false,
      currentPlayerFaction: null,
      player1Deck: null,
      player2Deck: null,
      player1Hand: null,
      player2Hand: null,
      selectedCard: null,
      animations: [],
      discardUsedThisTurn: false,
    };
  }

  startGame(faction, difficulty) {
    this.initGameState();

    const board = createInitialBoard();
    const p1Deck = new PlayerDeck(faction);
    const p2Deck = new PlayerDeck(faction);
    const p1Hand = new PlayerHand(5);
    const p2Hand = new PlayerHand(5);

    for (let i = 0; i < 5; i++) {
      const c1 = p1Deck.drawCard();
      if (c1) p1Hand.addCard(c1);
      const c2 = p2Deck.drawCard();
      if (c2) p2Hand.addCard(c2);
    }

    this.gameState = {
      ...this.gameState,
      tableArr: calculateMoveableArea(board, 1),
      currentPlayerFaction: faction,
      player1Deck: p1Deck,
      player2Deck: p2Deck,
      player1Hand: p1Hand,
      player2Hand: p2Hand,
    };

    // 初始化AI
    this.aiDifficulty = difficulty || null;
    if (this.aiDifficulty && this.aiDifficulty !== AI_DIFFICULTY.PVP) {
      this.aiPlayer = new AIPlayer(this.aiDifficulty);
    } else {
      this.aiPlayer = null;
    }

    this.scene = 'game';
  }

  refillHand(playerType) {
    const hand = playerType === 1 ? this.gameState.player1Hand : this.gameState.player2Hand;
    const deck = playerType === 1 ? this.gameState.player1Deck : this.gameState.player2Deck;
    if (hand.getCardCount() < 5 && deck.getRemainingCards() > 0) {
      const card = deck.drawCard();
      if (card) hand.addCard(card);
    }
  }

  // 添加落子爆发动画（光环+粒子）
  addPlaceAnimation(row, col, playerType, card) {
    const boardX = this.renderer.boardX;
    const boardY = this.renderer.boardY;
    const cellSize = this.renderer.cellSize;
    const cx = boardX + col * cellSize + cellSize / 2;
    const cy = boardY + row * cellSize + cellSize / 2;

    // 生成飞散粒子
    const particles = [];
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
      const speed = cellSize * (0.15 + Math.random() * 0.35);
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.6 + Math.random() * 0.4,
        size: 1.5 + Math.random() * 2.5,
      });
    }

    this.gameState.animations.push({
      type: 'place',
      x: cx,
      y: cy,
      playerType,
      characterName: card ? card.character._name : '',
      startTime: Date.now(),
      duration: 500,
      maxRadius: cellSize * 0.5,
      particles,
    });
  }

  moveChess(row, col) {
    const gs = this.gameState;
    if (gs.gameOver) return;
    if (gs.tableArr[row][col].type !== 3) return;
    if (!gs.selectedCard) return;

    // 同名武将唯一性检查：场上已有同名棋子则禁止落子
    const charName = gs.selectedCard.character._name;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        const cell = gs.tableArr[i][j];
        if (cell.character && cell.character._name === charName) return;
      }
    }

    const currentPlayerType = gs.lastMove;

    const newBoard = gs.tableArr.map(r => r.map(c => ({ ...c })));

    newBoard[row][col] = {
      type: currentPlayerType,
      reversal: true,
      character: gs.selectedCard.character,
    };

    const { comboDamage, flippedPositions, chains } = reversiChess(newBoard, row, col, currentPlayerType);

    // 添加落子爆发动画
    this.addPlaceAnimation(row, col, currentPlayerType, gs.selectedCard);

    // 添加闪电链动画 + 翻转动画
    const boardX = this.renderer.boardX;
    const boardY = this.renderer.boardY;
    const cellSize = this.renderer.cellSize;
    const now = Date.now();

    // 闪电链：仅当两端均为有武将的棋子时触发
    const startX = boardX + col * cellSize + cellSize / 2;
    const startY = boardY + row * cellSize + cellSize / 2;
    const startChar = gs.selectedCard ? gs.selectedCard.character : null;

    for (const chain of chains) {
      const chainLength = chain.flipped.length;
      // 检查锚点棋子是否有武将
      const anchorCell = newBoard[chain.anchor.row] && newBoard[chain.anchor.row][chain.anchor.col];
      const anchorChar = anchorCell && anchorCell.character;

      // 仅两端都有武将时才生成闪电
      if (!startChar || !anchorChar || !startChar._name || !anchorChar._name) continue;

      const ax = boardX + chain.anchor.col * cellSize + cellSize / 2;
      const ay = boardY + chain.anchor.row * cellSize + cellSize / 2;

      // 多线段中间点（起点 → 翻转子 → 锚点）
      const waypoints = [{ x: startX, y: startY }];
      for (const fp of chain.flipped) {
        waypoints.push({
          x: boardX + fp.col * cellSize + cellSize / 2,
          y: boardY + fp.row * cellSize + cellSize / 2,
        });
      }
      waypoints.push({ x: ax, y: ay });

      // 每段生成多段锯齿子点（预生成基准偏差种子）
      const polylineSegs = [];
      for (let w = 1; w < waypoints.length; w++) {
        const from = waypoints[w - 1];
        const to = waypoints[w];
        const segDist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
        const subSteps = Math.max(3, Math.floor(segDist / 6));
        const points = [];
        for (let s = 0; s <= subSteps; s++) {
          const t = s / subSteps;
          points.push({
            bx: from.x + (to.x - from.x) * t,
            by: from.y + (to.y - from.y) * t,
          });
        }
        polylineSegs.push({ points, hitX: to.x, hitY: to.y });
      }

      const isLongChain = chainLength >= 5;
      const speed = isLongChain ? 120 : chainLength <= 2 ? 220 : 180;

      this.gameState.animations.push({
        type: 'lightning',
        startX, startY,
        endX: ax, endY: ay,
        polylineSegs,
        startTime: now + 150,
        segmentTime: speed / Math.max(polylineSegs.length, 1),
        playerType: currentPlayerType,
        chainLength,
        isLongChain,
      });
    }

    // 翻转动画 - 延迟到闪电击中后触发
    const totalFlips = flippedPositions.length;
    let flipIndex = 0;
    // 闪电基础延迟 + 闪电旅行时间比例
    const lightningBaseDelay = 150;
    const lightningTravelTime = totalFlips > 0 ? (250 + totalFlips * 80) : 200;

    for (const fp of flippedPositions) {
      const hitMoment = lightningTravelTime * (flipIndex + 0.5) / Math.max(totalFlips, 1);
      const flipDelay = lightningBaseDelay + hitMoment;
      const fcx = boardX + fp.col * cellSize + cellSize / 2;
      const fcy = boardY + fp.row * cellSize + cellSize / 2;

      // 翻转粒子光尘
      const flipParticles = [];
      for (let p = 0; p < 8; p++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = cellSize * (0.08 + Math.random() * 0.15);
        flipParticles.push({
          x: fcx,
          y: fcy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - cellSize * 0.05,
          life: 1,
          decay: 0.7 + Math.random() * 0.3,
          size: 1 + Math.random() * 1.5,
        });
      }

      this.gameState.animations.push({
        type: 'flip',
        x: fcx,
        y: fcy,
        fromType: newBoard[fp.row][fp.col].fromType || (currentPlayerType === 1 ? 2 : 1),
        toType: currentPlayerType,
        startTime: now + flipDelay,
        duration: 500,
        cellSize,
        particles: flipParticles,
      });
      flipIndex++;
    }

    const totalDamage = gs.selectedCard.character._attack + comboDamage;
    const opponent = currentPlayerType === 1 ? gs.player2 : gs.player1;
    opponent.takeDamage(totalDamage);

    // 连击大字反馈
    if (comboDamage > 0) {
      this.gameState.animations.push({
        type: 'combotext',
        x: this.renderer.width / 2,
        y: this.renderer.hpBarY2 - 8,
        text: comboDamage >= 10 ? '爆裂连击!' : (comboDamage >= 5 ? '强连击!' : '连击!'),
        comboCount: comboDamage,
        startTime: Date.now(),
        duration: 1200,
      });
      // HP弹跳
      this.gameState.animations.push({
        type: 'hpbounce',
        x: this.renderer.width - this.renderer.cardSideMargin - 20,
        y: this.renderer.hpBarY2 + this.renderer.hpBarH / 2,
        startTime: Date.now(),
        duration: 500,
      });
    }

    if (opponent.isDead()) {
      gs.gameOver = true;
    }

    const hand = currentPlayerType === 1 ? gs.player1Hand : gs.player2Hand;
    hand.removeCard(gs.selectedCard.id);

    const nextPlayer = currentPlayerType === 1 ? 2 : 1;

    const boardWithMoves = calculateMoveableArea(newBoard, nextPlayer);

    if (!hasAnyMoveable(boardWithMoves, nextPlayer)) {
      const boardForCurrent = calculateMoveableArea(newBoard, currentPlayerType);
      if (!hasAnyMoveable(boardForCurrent, currentPlayerType)) {
        gs.gameOver = true;
      } else {
        gs.tableArr = boardForCurrent;
        gs.lastMove = currentPlayerType;
        this.gameState.selectedCard = null;
        gs.discardUsedThisTurn = false;

        const deck = currentPlayerType === 1 ? gs.player1Deck : gs.player2Deck;
        const currentHand = currentPlayerType === 1 ? gs.player1Hand : gs.player2Hand;
        if (!currentHand.isFull() && deck.getRemainingCards() > 0) {
          const card = deck.drawCard();
          if (card) currentHand.addCard(card);
        }
        return;
      }
    }

    gs.tableArr = boardWithMoves;
    gs.lastMove = nextPlayer;
    gs.selectedCard = null;
    gs.discardUsedThisTurn = false;

    const deck = currentPlayerType === 1 ? gs.player1Deck : gs.player2Deck;
    if (!hand.isFull() && deck.getRemainingCards() > 0) {
      const card = deck.drawCard();
      if (card) hand.addCard(card);
    }

    this.refillHand(nextPlayer);
  }

  bindTouch() {
    wx.onTouchStart((e) => this.handleTouchStart(e));
    wx.onTouchMove((e) => this.handleTouchMove(e));
    wx.onTouchEnd((e) => this.handleTouchEnd(e));
  }

  toDesignCoords(touch) {
    const x = (touch.clientX - this.screenOffsetX) / this.scale;
    const y = (touch.clientY - this.screenOffsetY) / this.scale;
    return { x, y };
  }

  handleTouchStart(e) {
    const touch = e.touches[0];
    const { x, y } = this.toDesignCoords(touch);

    if (this.scene === 'tutorial') {
      this.tutorialTouchStartX = x;
      this.tutorialTouchStartY = y;

      // 检测跳过/进入按钮
      if (this.renderer.getTutorialSkipAt(x, y)) {
        this.scene = 'menu';
        this.tutorialPage = 0;
        return;
      }
      if (this.renderer.getTutorialEnterAt(x, y)) {
        this.scene = 'menu';
        this.tutorialPage = 0;
        return;
      }
      return;
    }

    if (this.scene === 'menu') {
      this.handleMenuTouch(x, y);
    } else if (this.scene === 'game') {
      this.handleGameTouchStart(x, y);
    }
  }

  handleTouchMove(e) {
    if (this.scene === 'game' && this.dragState.isDragging) {
      const touch = e.touches[0];
      const { x, y } = this.toDesignCoords(touch);
      this.dragState.currentX = x;
      this.dragState.currentY = y;

      // 闪电预览：计算拖拽悬停位置的夹击链
      const cell = this.renderer.getCellAt(x, y);
      if (cell && this.gameState.tableArr[cell.row][cell.col].type === 3 && this.gameState.selectedCard) {
        const gs = this.gameState;
        const previewBoard = gs.tableArr.map(r => r.map(c => ({ ...c })));
        previewBoard[cell.row][cell.col] = {
          type: gs.lastMove,
          reversal: true,
          character: gs.selectedCard.character,
        };
        const { chains, flippedPositions } = reversiChess(previewBoard, cell.row, cell.col, gs.lastMove);
        this.previewChains = { chains, cell, playerType: gs.lastMove, flippedPositions };
      } else {
        this.previewChains = null;
      }
    }
  }

  handleTouchEnd(e) {
    if (this.scene === 'tutorial') {
      const touch = e.changedTouches[0];
      const { x, y } = this.toDesignCoords(touch);
      const dx = x - this.tutorialTouchStartX;
      const dy = y - this.tutorialTouchStartY;

      // 横向滑动超过30px触发翻页
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        if (dx < 0 && this.tutorialPage < 2) {
          this.tutorialPage++;
        } else if (dx > 0 && this.tutorialPage > 0) {
          this.tutorialPage--;
        }
      }
      return;
    }

    if (this.scene === 'game') {
      const touch = e.changedTouches[0];
      const { x, y } = this.toDesignCoords(touch);
      this.handleGameTouchEnd(x, y);
    }
  }

  handleMenuTouch(x, y) {
    const faction = this.renderer.getMenuButtonAt(x, y);
    if (faction) {
      this.selectedFaction = faction;
      this.aiDifficulty = null;
      return;
    }

    if (this.selectedFaction) {
      const diff = this.renderer.getDifficultyAt(x, y);
      if (diff) {
        if (diff === 'pvp') {
          this.startGame(this.selectedFaction, null);
        } else {
          this.startGame(this.selectedFaction, diff);
        }
      }
    }
  }

  handleGameTouchStart(x, y) {
    const gs = this.gameState;
    if (this.isAIThinking) return;

    if (gs.gameOver) {
      if (this.renderer.getRestartButtonAt(x, y)) {
        this.scene = 'menu';
        this.selectedFaction = null;
        this.initGameState();
      }
      return;
    }

    // 弃牌按钮（仅玩家1回合可用，每回合限一次）
    if (gs.lastMove === 1 && !gs.discardUsedThisTurn && this.renderer._discardButton) {
      const db = this.renderer._discardButton;
      if (x >= db.x && x <= db.x + db.w && y >= db.y && y <= db.y + db.h) {
        const hand = gs.player1Hand;
        const deck = gs.player1Deck;
        const cards = hand.getCards();
        if (cards.length > 0 && deck.getRemainingCards() > 0) {
          hand.removeCard(cards[0].id);
          const newCard = deck.drawCard();
          if (newCard) hand.addCard(newCard);
          gs.discardUsedThisTurn = true;
          gs.selectedCard = null;
        }
        return;
      }
    }

    // 检查是否已在场上
    const isDuplicateOnBoard = (c) => {
      if (!c || !c.character) return false;
      const n = c.character._name;
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          const cl = gs.tableArr[i] && gs.tableArr[i][j];
          if (cl && cl.character && cl.character._name === n) return true;
        }
      }
      return false;
    };

    const card = this.renderer.getCardAt(x, y);
    if (card && gs.lastMove === 1 && !isDuplicateOnBoard(card)) {
      this.dragState.isDragging = true;
      this.dragState.card = card;
      this.dragState.startX = x;
      this.dragState.startY = y;
      this.dragState.currentX = x;
      this.dragState.currentY = y;

      gs.selectedCard = card;
      return;
    }

    const cell = this.renderer.getCellAt(x, y);
    if (cell && gs.selectedCard) {
      this.moveChess(cell.row, cell.col);
    }
  }

  handleGameTouchEnd(x, y) {
    if (this.dragState.isDragging) {
      const cell = this.renderer.getCellAt(x, y);
      if (cell && this.gameState.selectedCard && this.gameState.tableArr[cell.row][cell.col].type === 3) {
        this.moveChess(cell.row, cell.col);
      }

      this.dragState.isDragging = false;
      this.dragState.card = null;
      this.previewChains = null;
    }
  }

  loop() {
    this.render();
    this.updateAnimations();

    requestAnimationFrame(() => {
      this.loop();
    });
  }

  updateAnimations() {
    if (!this.gameState.animations) return;

    const now = Date.now();
    this.gameState.animations = this.gameState.animations.filter(anim => {
      return now - anim.startTime < anim.duration;
    });
  }

  render() {
    if (this.scene === 'loading') {
      this.renderer.drawLoading(this.loadingText, this.loadProgress);
    } else if (this.scene === 'tutorial') {
      this.renderer.drawTutorial(this.tutorialPage);
    } else if (this.scene === 'menu') {
      this.renderer.drawMenu(this.selectedFaction, this.aiDifficulty);
    } else if (this.scene === 'game') {
      // AI回合检测
      this.processAITurn();
      this.gameState.previewChains = this.previewChains;
      this.gameState.isAIThinking = this.isAIThinking;
      this.renderer.drawGame(this.gameState);
    }
  }

  processAITurn() {
    const gs = this.gameState;
    if (!gs || gs.gameOver) return;
    if (!this.aiPlayer) return;

    // AI是玩家2，当lastMove=2时轮到AI
    const isAITurn = gs.lastMove === 2;
    if (!isAITurn) {
      this.isAIThinking = false;
      return;
    }

    // 检查是否有合法移动
    if (!hasAnyMoveable(gs.tableArr, 2)) {
      this.isAIThinking = false;
      return;
    }

    // 已经启动AI思考
    if (this.isAIThinking) return;

    this.isAIThinking = true;
    const hand = gs.player2Hand;
    const board = gs.tableArr;

    // 延迟模拟"思考"
    this.aiTimer = setTimeout(() => {
      const move = this.aiPlayer.getBestMove(board, 2, hand);
      if (move) {
        gs.selectedCard = move.card;
        this.moveChess(move.row, move.col);
      }
      // 安全兜底：如果AI无合法移动，强制跳过
      if (gs.lastMove === 2) {
        // moveChess失败(同名检查等)，尝试随机措施
        const anyCell = board.find(row => row.some(c => c.type === 3));
        if (!anyCell) {
          // 真无合法落子，跳过回合
          const boardForP1 = calculateMoveableArea(board.map(r => r.map(c => ({...c}))), 1);
          if (!hasAnyMoveable(boardForP1, 1)) {
            gs.gameOver = true;
          }
          gs.lastMove = 1;
          gs.selectedCard = null;
          gs.discardUsedThisTurn = false;
        }
      }
      this.isAIThinking = false;
      this.aiTimer = null;
    }, 600 + Math.random() * 400);
  }
}