import { Player } from './models/player.js';
import { PlayerDeck, PlayerHand } from './models/card.js';
import { createInitialBoard, calculateMoveableArea, reversiChess, hasAnyMoveable } from './game/logic.js';
import { Renderer } from './ui/renderer.js';
import { AIPlayer, AI_DIFFICULTY } from './ai/ai-player.js';
import { getChapterList, getChapter, completeChapter } from './models/chapters.js';
import { DeckManager } from './models/deck-manager.js';

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

    this.scene = 'loading';  // loading → modeSelect → ...
    this.selectedFaction = null;
    this.selectedCard = null;

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

    // 剧情模式状态
    this.isChapterMode = false;
    this.currentChapterId = null;
    this.chapterRules = null;
    this.storyTextIndex = 0;

    // 对话系统状态
    this.dialogueIndex = 0;
    this.dialogueRevealed = 0;
    this.typewriterTimer = null;

    // 胜利/失败动画状态
    this.endGameMode = null;
    this.endGameStartTime = null;
    this.endGameDuration = 0;

    // 卡组管理系统
    try {
      this.deckManager = new DeckManager();
    } catch (e) {
      this.deckManager = null;
    }
    this.deckManageSelectedId = null;
    this.deckActiveFilter = null;
    this.deckSelectedCardId = null;
    this.deckScrollY = 0;
    this.deckTouchStartY = 0;
    if (this.deckManager) {
      var sd = this.deckManager.getSelectedDeck();
      this.deckManageSelectedId = sd ? sd.id : null;
    }

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

    this.scene = 'modeSelect';
  }

  startTypewriter(text) {
    this.stopTypewriter();
    this.dialogueRevealed = 0;
    if (!text) return;
    var self = this;
    this.typewriterTimer = setInterval(function () {
      if (self.dialogueRevealed < text.length) {
        self.dialogueRevealed++;
      } else {
        self.stopTypewriter();
      }
    }, 40);
  }

  stopTypewriter() {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  startDialogue(chapterId) {
    var chapter = getChapter(chapterId);
    if (!chapter) return;
    this.currentChapterId = chapterId;
    this.dialogueIndex = 0;
    var dialogues = chapter.dialogues;
    if (!dialogues || dialogues.length === 0) {
      this.storyTextIndex = 0;
      this.scene = 'storyDetail';
      return;
    }
    this.scene = 'dialogue';
    this.startTypewriter(dialogues[0].text);
  }

  startEndGameAnimation(player1Won) {
    this.endGameMode = player1Won ? 'victory' : 'defeat';
    this.endGameStartTime = Date.now();
    this.endGameDuration = player1Won ? 2500 : 2000;
  }

  showResult() {
    this.endGameMode = null;
    this.endGameStartTime = null;
    this.gameState.gameOver = true;
  }

  initGameState() {
    this.endGameMode = null;
    this.endGameStartTime = null;
    this.gameState = {
      tableArr: [],
      lastMove: 1,
      player1: new Player('玩家1', 1),
      player2: new Player('玩家2', 2),
      gameOver: false,
      currentPlayerFaction: null,
      player2Faction: null,
      player1Deck: null,
      player2Deck: null,
      player1Hand: null,
      player2Hand: null,
      selectedCard: null,
      animations: [],
      discardUsedThisTurn: false,
    };
  }

  startGame(faction, difficulty, deckId) {
    this.initGameState();

    // AI从剩余势力中随机选一个
    const allFactions = ['魏', '蜀', '吴'];
    const remaining = allFactions.filter(f => f !== faction);
    const p2Faction = remaining[Math.floor(Math.random() * remaining.length)];

    const board = createInitialBoard();
    const p1Deck = new PlayerDeck(faction);
    const p2Deck = new PlayerDeck(p2Faction);

    // 使用自定义卡组
    if (deckId && this.deckManager) {
      var customDeck = this.deckManager.getDeck(deckId);
      if (customDeck && customDeck.cards.length > 0) {
        p1Deck.cards = customDeck.cards.map(function(c) { return { id: c.id, character: c.character, faction: c.faction }; });
        p1Deck.shuffle();
      }
    }

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
      player2Faction: p2Faction,
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

  startChapterGame(chapterId) {
    const chapter = getChapter(chapterId);
    if (!chapter) return;

    this.isChapterMode = true;
    this.currentChapterId = chapterId;
    this.chapterRules = chapter.specialRules || null;
    this.storyTextIndex = 0;
    this.selectedCard = null;

    this.initGameState();

    const faction = chapter.faction || '蜀';
    const allFactions = ['魏', '蜀', '吴'];
    const p2Faction = allFactions.filter(f => f !== faction)[Math.floor(Math.random() * 2)];
    const board = createInitialBoard();
    const handLimit = this.chapterRules.handLimit || 5;
    const p1Deck = new PlayerDeck(faction);
    const p2Deck = new PlayerDeck(p2Faction);
    const p1Hand = new PlayerHand(handLimit);
    const p2Hand = new PlayerHand(handLimit);

    for (let i = 0; i < handLimit; i++) {
      const c1 = p1Deck.drawCard();
      if (c1) p1Hand.addCard(c1);
      const c2 = p2Deck.drawCard();
      if (c2) p2Hand.addCard(c2);
    }

    this.gameState = {
      ...this.gameState,
      tableArr: calculateMoveableArea(board, 1),
      currentPlayerFaction: faction,
      player2Faction: p2Faction,
      player1Deck: p1Deck,
      player2Deck: p2Deck,
      player1Hand: p1Hand,
      player2Hand: p2Hand,
    };

    this.aiPlayer = new AIPlayer(AI_DIFFICULTY.MEDIUM);
    this.aiDifficulty = AI_DIFFICULTY.MEDIUM;
    this.scene = 'storyGame';
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
    if (gs.gameOver || gs._ending) return;
    if (gs.tableArr[row][col].type !== 3) return;
    if (!gs.selectedCard) return;

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
        _row: fp.row,
        _col: fp.col,
        fromType: newBoard[fp.row][fp.col].fromType || (currentPlayerType === 1 ? 2 : 1),
        toType: currentPlayerType,
        startTime: now + flipDelay,
        duration: 500,
        cellSize,
        particles: flipParticles,
      });
      flipIndex++;
    }

    const totalDamage = gs.selectedCard.character._attack + comboDamage
      + (this.chapterRules && this.chapterRules.flipBonus ? flippedPositions.length * this.chapterRules.flipBonus : 0);
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
      var self = this;
      var winnerIsP1 = !gs.player1.isDead();
      setTimeout(function () { self.startEndGameAnimation(winnerIsP1); }, 800);
      gs._ending = true;
    }

    const hand = currentPlayerType === 1 ? gs.player1Hand : gs.player2Hand;
    hand.removeCard(gs.selectedCard.id);

    const nextPlayer = currentPlayerType === 1 ? 2 : 1;

    const boardWithMoves = calculateMoveableArea(newBoard, nextPlayer);

    if (!hasAnyMoveable(boardWithMoves, nextPlayer)) {
      const boardForCurrent = calculateMoveableArea(newBoard, currentPlayerType);
      if (!hasAnyMoveable(boardForCurrent, currentPlayerType)) {
        var self2 = this;
        var winnerIsP1 = !gs.player1.isDead();
        setTimeout(function () { self2.startEndGameAnimation(winnerIsP1); }, 800);
        gs._ending = true;
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

    if (this.scene === 'modeSelect') {
      if (this.renderer.getStoryModeBtnAt(x, y)) {
        this.scene = 'chapterList';
      } else if (this.renderer.getBattleModeBtnAt(x, y)) {
        this.scene = 'menu';
      }
      return;
    }

    if (this.scene === 'menu') {
      this.handleMenuTouch(x, y);
    } else if (this.scene === 'game' || this.scene === 'storyGame') {
      this.handleGameTouchStart(x, y);
    } else if (this.scene === 'chapterList') {
      this.handleChapterListTouch(x, y);
    } else if (this.scene === 'storyDetail') {
      this.handleStoryDetailTouch(x, y);
    } else if (this.scene === 'branchSelect') {
      this.handleBranchTouch(x, y);
    } else if (this.scene === 'dialogue') {
      this.handleDialogueTouch(x, y);
    } else if (this.scene === 'deckManage') {
      this.handleDeckTouch(x, y);
    }
  }

  handleTouchMove(e) {
    if ((this.scene === 'game' || this.scene === 'storyGame') && this.dragState.isDragging) {
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
    } else if (this.scene === 'deckManage') {
      const touch = e.touches[0];
      const { x, y } = this.toDesignCoords(touch);
      var dy = y - this.deckTouchStartY;
      if (Math.abs(dy) > 3) {
        this._deckTouchMoved = true;
        var maxScroll = this.renderer._deckMaxScroll || 0;
        this.deckScrollY = Math.max(0, Math.min(this.deckScrollY - dy, maxScroll));
        this.deckTouchStartY = y;
      }
    }
  }

  handleTouchEnd(e) {
    if (this.scene === 'game' || this.scene === 'storyGame') {
      const touch = e.changedTouches[0];
      const { x, y } = this.toDesignCoords(touch);
      this.handleGameTouchEnd(x, y);
    }
  }

  handleMenuTouch(x, y) {
    // 返回按钮
    if (this.renderer.getMenuBackAt(x, y)) {
      this.scene = 'modeSelect';
      this.selectedFaction = null;
      return;
    }

    // 卡组管理按钮
    if (this.renderer.getDeckManageAt(x, y)) {
      if (this.deckManager) {
        var sd = this.deckManager.getSelectedDeck();
        this.deckManageSelectedId = sd ? sd.id : null;
        this.deckActiveFilter = sd ? sd.faction : '蜀';
      }
      this.deckSelectedCardId = null;
      this.deckScrollY = 0;
      this.scene = 'deckManage';
      return;
    }

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
          if (this.deckManager) { var d = this.deckManager.getSelectedDeck(); this.startGame(this.selectedFaction, null, d ? d.id : null); }
          else { this.startGame(this.selectedFaction, null); }
        } else {
          if (this.deckManager) { var d2 = this.deckManager.getSelectedDeck(); this.startGame(this.selectedFaction, diff, d2 ? d2.id : null); }
          else { this.startGame(this.selectedFaction, diff); }
        }
      }
    }
  }

  handleGameTouchStart(x, y) {
    const gs = this.gameState;
    if (this.isAIThinking) return;

    // 胜利/失败动画中，点击跳过
    if (this.endGameMode) {
      this.showResult();
      return;
    }

    if (gs.gameOver) {
      if (this.renderer.getRestartButtonAt(x, y)) {
        if (this.isChapterMode) {
          const player1Won = !gs.player1.isDead();
          if (player1Won) {
            this.scene = 'branchSelect';
          } else {
            this.scene = 'chapterList';
          }
          this.isChapterMode = false;
        } else {
          this.scene = 'menu';
          this.selectedFaction = null;
        }
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

    const card = this.renderer.getCardAt(x, y);
    if (card && gs.lastMove === 1) {
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

  handleChapterListTouch(x, y) {
    if (this.renderer.getChapterBackAt(x, y)) {
      this.scene = 'modeSelect';
      return;
    }
    const btn = this.renderer.getChapterButtonAt(x, y);
    if (btn && btn.unlocked) {
      this.startDialogue(btn.chapterId);
    }
  }

  handleStoryDetailTouch(x, y) {
    if (this.renderer.getStoryBackAt(x, y)) {
      this.scene = 'chapterList';
      return;
    }
    if (this.renderer.getStoryNextAt(x, y)) {
      this.storyTextIndex++;
      return;
    }
    if (this.renderer.getStoryStartAt(x, y)) {
      this.startChapterGame(this.currentChapterId);
    }
  }

  handleBranchTouch(x, y) {
    const btn = this.renderer.getBranchAt(x, y);
    if (btn) {
      completeChapter(this.currentChapterId, btn.nextChapter);
      this.scene = 'chapterList';
    }
  }

  handleDialogueTouch(x, y) {
    var chapter = getChapter(this.currentChapterId);
    if (!chapter || !chapter.dialogues) return;
    var dialogues = chapter.dialogues;
    var current = dialogues[this.dialogueIndex];
    if (!current) return;

    if (this.renderer.getDialogueSkipAt(x, y)) {
      this.stopTypewriter();
      var last = dialogues[dialogues.length - 1];
      this.dialogueIndex = dialogues.length - 1;
      this.dialogueRevealed = last.text.length;
      return;
    }

    var textComplete = this.dialogueRevealed >= current.text.length;
    var isLast = this.dialogueIndex >= dialogues.length - 1;

    if (!textComplete) {
      this.stopTypewriter();
      this.dialogueRevealed = current.text.length;
    } else if (!isLast) {
      this.dialogueIndex++;
      this.startTypewriter(dialogues[this.dialogueIndex].text);
    } else {
      if (this.renderer.getDialogueNextAt(x, y)) {
        this.stopTypewriter();
        this.startChapterGame(this.currentChapterId);
      }
    }
  }

  handleDeckTouch(x, y) {
    var dm = this.deckManager;
    if (!dm) return;

    // 记录触摸起点（用于滚动检测）
    this.deckTouchStartY = y;
    this._deckTouchMoved = false;

    // 返回
    if (this.renderer.getDeckBackAt(x, y)) {
      this.scene = 'menu';
      return;
    }

    // 筛选标签
    var ftab = this.renderer.getDeckFilterAt(x, y);
    if (ftab) {
      this.deckActiveFilter = ftab.faction;
      this.deckSelectedCardId = null;
      this.deckScrollY = 0;
      return;
    }

    // 删除卡组
    var delBtn = this.renderer.getDeckDeleteAt(x, y);
    if (delBtn && dm.getAllDecks().length > 1) {
      dm.deleteDeck(delBtn.deckId);
      if (this.deckManageSelectedId === delBtn.deckId) {
        var remaining = dm.getAllDecks();
        this.deckManageSelectedId = remaining.length > 0 ? remaining[0].id : null;
      }
      return;
    }

    var tab = this.renderer.getDeckTabAt(x, y);
    if (tab) {
      this.deckManageSelectedId = tab.deckId;
      this.deckSelectedCardId = null;
      this.deckScrollY = 0;
      var newDeck2 = dm.getDeck(tab.deckId);
      if (newDeck2) this.deckActiveFilter = newDeck2.faction;
      return;
    }

    if (this.renderer.getDeckAddTabAt(x, y)) {
      var decks = dm.getAllDecks();
      if (decks.length < 10) {
        var factions = ['魏', '蜀', '吴'];
        var f = factions[decks.length % 3];
        var names = {
          '魏': ['虎豹骑', '青州兵', '虎贲军', '武卫营'],
          '蜀': ['白耳兵', '无当军', '连弩营', '陷阵营'],
          '吴': ['解烦军', '敢死营', '锦帆营', '车下虎士'],
        };
        var nameList = names[f] || ['新卡组'];
        var name = nameList[Math.floor(Math.random() * nameList.length)];
        var newDeck = dm.createDeck(name, f);
        this.deckManageSelectedId = newDeck.id;
      }
      return;
    }

    // 拖拽滚动时不触发点击
    if (this._deckTouchMoved) return;

    // 底部操作栏（优先于卡牌点击）
    if (this.renderer.getDeckSaveAt(x, y)) {
      dm._save();
      if (wx.showToast) wx.showToast({ title: '已保存', icon: 'success', duration: 1000 });
      return;
    }
    if (this.renderer.getDeckResetAt(x, y)) {
      dm.resetDeck(this.deckManageSelectedId);
      this.deckSelectedCardId = null;
      return;
    }
    if (this.renderer.getDeckDeployAt(x, y)) {
      dm.setSelectedDeck(this.deckManageSelectedId);
      dm._save();
      this.scene = 'menu';
      return;
    }

    // 点击卡牌：卡组中的→移除，卡池中未编入的→添加
    var card = this.renderer.getDeckCardAt(x, y);
    if (card) {
      if (card.isInDeck) {
        dm.removeCard(this.deckManageSelectedId, card.cardId);
        this.deckSelectedCardId = null;
      } else if (!dm.isCharInDeck(this.deckManageSelectedId, card.cardId)) {
        if (dm.addCard(this.deckManageSelectedId, card.cardId)) {
          this.deckSelectedCardId = card.cardId;
        }
      }
      return;
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
    } else if (this.scene === 'modeSelect') {
      this.renderer.drawModeSelect();
    } else if (this.scene === 'menu') {
      this.renderer.drawMenu(this.selectedFaction, this.aiDifficulty);
    } else if (this.scene === 'game' || this.scene === 'storyGame') {
      // AI回合检测（非结算动画期间）
      if (!this.endGameMode && !this.gameState._ending) {
        this.processAITurn();
      }
      this.gameState.previewChains = this.previewChains;
      this.gameState.isAIThinking = this.isAIThinking;
      this.gameState._isChapterMode = this.isChapterMode;
      this.renderer.drawGame(this.gameState);
      if (this.isChapterMode && this.chapterRules) {
        this.renderer.drawChapterRuleTip(this.chapterRules);
      }
      // 胜利/失败动画叠加
      if (this.endGameMode) {
        var elapsed = Date.now() - this.endGameStartTime;
        if (elapsed >= this.endGameDuration) {
          this.renderer.drawEndGameScene(this.endGameMode, this.endGameDuration, this.endGameDuration);
        } else {
          this.renderer.drawEndGameScene(this.endGameMode, elapsed, this.endGameDuration);
        }
      }
    } else if (this.scene === 'chapterList') {
      this.renderer.drawChapterList(getChapterList());
    } else if (this.scene === 'storyDetail') {
      const chapter = getChapter(this.currentChapterId);
      this.renderer.drawStoryDetail(chapter, this.storyTextIndex);
    } else if (this.scene === 'branchSelect') {
      const chapter = getChapter(this.currentChapterId);
      this.renderer.clear();
      this.renderer.drawBackground();
      this.renderer.drawBranchSelect(chapter);
    } else if (this.scene === 'dialogue') {
      const chapter = getChapter(this.currentChapterId);
      if (chapter && chapter.dialogues) {
        this.renderer.drawDialogueScene(chapter.dialogues, this.dialogueIndex, this.dialogueRevealed);
      }
    } else if (this.scene === 'deckManage') {
      this.renderer.drawDeckManagerScene(this.deckManager, this.deckManageSelectedId, this.deckSelectedCardId, this.deckActiveFilter, this.deckScrollY);
    }
  }

  processAITurn() {
    const gs = this.gameState;
    if (!gs || gs.gameOver || gs._ending) return;
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
            var self3 = this;
            var winnerIsP1 = !gs.player1.isDead();
            setTimeout(function () { self3.startEndGameAnimation(winnerIsP1); }, 800);
            gs._ending = true;
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