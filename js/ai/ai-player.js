import { BOARD_SIZE } from '../game/constants.js';
import { calculateMoveableArea, reversiChess } from '../game/logic.js';

// 格子权重：角10、边5、内1
const POSITION_WEIGHTS = (() => {
  const w = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    w[i] = [];
    for (let j = 0; j < BOARD_SIZE; j++) {
      const isCorner = (i === 0 || i === BOARD_SIZE - 1) && (j === 0 || j === BOARD_SIZE - 1);
      const isEdge = i === 0 || i === BOARD_SIZE - 1 || j === 0 || j === BOARD_SIZE - 1;
      w[i][j] = isCorner ? 10 : isEdge ? 5 : 1;
    }
  }
  return w;
})();

// 手牌综合战力
function cardValue(card) {
  if (!card || !card.character) return 0;
  return (card.character._attack || 0) * 1.5 + (card.character._combo || 0) * 2;
}

export const AI_DIFFICULTY = { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard', PVP: 'pvp' };

export class AIPlayer {
  constructor(difficulty) {
    this.difficulty = difficulty || AI_DIFFICULTY.MEDIUM;
  }

  // 过滤掉已存在于场上的同名武将卡
  _getValidCards(hand, board) {
    const cards = hand.getCards();
    return cards.filter(card => {
      const name = card.character && card.character._name;
      if (!name) return true;
      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          if (board[i][j].character && board[i][j].character._name === name) {
            return false;
          }
        }
      }
      return true;
    });
  }

  // 找到所有合法落子位置
  _getLegalMoves(board, playerType) {
    const moves = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j].type === 3) {
          moves.push({ row: i, col: j });
        }
      }
    }
    return moves;
  }

  // 模拟落子并评估得分
  _simulateMove(board, row, col, playerType, card) {
    const simBoard = board.map(r => r.map(c => ({ ...c })));
    simBoard[row][col] = {
      type: playerType,
      reversal: true,
      character: card ? card.character : null,
    };
    const result = reversiChess(simBoard, row, col, playerType);
    const flipCount = result.flippedPositions.length;
    const posWeight = POSITION_WEIGHTS[row][col];
    const hasCombo = result.comboDamage > 0;
    return flipCount * 2 + posWeight + (hasCombo ? 10 : 0);
  }

  // EASY: 随机选
  _getRandomMove(board, playerType, hand) {
    const moves = this._getLegalMoves(board, playerType);
    if (moves.length === 0) return null;
    const cards = this._getValidCards(hand, board);
    if (cards.length === 0) return null;
    const move = moves[Math.floor(Math.random() * moves.length)];
    const card = cards[Math.floor(Math.random() * cards.length)];
    return { row: move.row, col: move.col, card };
  }

  // MEDIUM: 优先翻最多子
  _getMediumMove(board, playerType, hand) {
    const moves = this._getLegalMoves(board, playerType);
    const cards = this._getValidCards(hand, board);
    if (moves.length === 0 || cards.length === 0) return null;

    let best = null, bestFlips = -1;
    for (const move of moves) {
      for (const card of cards) {
        const simBoard = board.map(r => r.map(c => ({ ...c })));
        simBoard[move.row][move.col] = {
          type: playerType, reversal: true,
          character: card.character,
        };
        const result = reversiChess(simBoard, move.row, move.col, playerType);
        const flips = result.flippedPositions.length;
        if (flips > bestFlips) {
          bestFlips = flips;
          best = { row: move.row, col: move.col, card };
        }
      }
    }
    return best;
  }

  // HARD: 完整贪心 (翻子*2 + 位置权重 + 连击加分 + 卡牌价值)
  _getHardMove(board, playerType, hand) {
    const moves = this._getLegalMoves(board, playerType);
    const cards = this._getValidCards(hand, board);
    if (moves.length === 0 || cards.length === 0) return null;

    let best = null, bestScore = -Infinity;
    for (const move of moves) {
      for (const card of cards) {
        const score = this._simulateMove(board, move.row, move.col, playerType, card)
          + cardValue(card) * 0.5;
        if (score > bestScore) {
          bestScore = score;
          best = { row: move.row, col: move.col, card };
        }
      }
    }
    return best;
  }

  // 主入口：返回最佳落子方案
  getBestMove(board, playerType, hand) {
    if (this.difficulty === AI_DIFFICULTY.EASY) {
      return this._getRandomMove(board, playerType, hand);
    } else if (this.difficulty === AI_DIFFICULTY.HARD) {
      return this._getHardMove(board, playerType, hand);
    }
    return this._getMediumMove(board, playerType, hand);
  }
}
