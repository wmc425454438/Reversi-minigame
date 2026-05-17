import { BOARD_SIZE, DIRECTIONS } from './constants.js';

export function createEmptyBoard() {
  const board = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < BOARD_SIZE; j++) {
      board[i][j] = { type: 0, reversal: true, character: null };
    }
  }
  return board;
}

export function createInitialBoard() {
  const board = createEmptyBoard();
  board[2][2] = { type: 1, reversal: true, character: null };
  board[2][3] = { type: 2, reversal: true, character: null };
  board[3][2] = { type: 2, reversal: true, character: null };
  board[3][3] = { type: 1, reversal: true, character: null };
  return board;
}

export function checkComboEffect(board, row, col, playerType, enemyType) {
  for (const [dx, dy] of DIRECTIONS) {
    let x = row + dx;
    let y = col + dy;
    let seenEnemy = false;

    while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      const t = board[x][y].type;
      if (t === enemyType) {
        seenEnemy = true;
        x += dx;
        y += dy;
        continue;
      }
      if (t === playerType) {
        if (seenEnemy) {
          const anchor = board[x][y];
          if (anchor && anchor.character && anchor.character._combo > 0) {
            return true;
          }
        }
      }
      break;
    }
  }
  return false;
}

function findMoveablePositions(board, row, col, playerType) {
  const enemyType = playerType === 1 ? 2 : 1;

  for (const [dx, dy] of DIRECTIONS) {
    let x = row + dx;
    let y = col + dy;
    let seenEnemy = false;

    while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      const cellType = board[x][y].type;
      if (cellType === enemyType) {
        seenEnemy = true;
        x += dx;
        y += dy;
        continue;
      }
      if (cellType === 0 || cellType === 3) {
        if (seenEnemy) {
          const hasCombo = checkComboEffect(board, x, y, playerType, enemyType);
          board[x][y] = {
            type: 3,
            reversal: false,
            character: null,
            hasCombo,
          };
        }
        break;
      }
      break;
    }
  }
}

export function calculateMoveableArea(board, currentPlayer) {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));

  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (newBoard[i][j].type === 3) {
        newBoard[i][j].type = 0;
      }
    }
  }

  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (newBoard[i][j].type === currentPlayer) {
        findMoveablePositions(newBoard, i, j, currentPlayer);
      }
    }
  }

  return newBoard;
}

export function reversiChess(board, row, col, playerType) {
  const enemyType = playerType === 1 ? 2 : 1;
  let comboDamage = 0;
  const flippedPositions = [];
  const chains = []; // 每条方向的翻转链: { flipped: [{row,col}], anchor: {row,col} }

  const flipInDirection = (startDx, startDy) => {
    let x = row + startDx;
    let y = col + startDy;
    const path = [];

    while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      if (board[x][y].type === playerType) {
        if (path.length > 0) {
          const anchor = board[x][y];
          if (anchor.character && anchor.character._combo) {
            comboDamage += anchor.character._combo;
          }
          const flipped = [];
          for (const [fx, fy] of path) {
            board[fx][fy] = {
              type: playerType,
              reversal: true,
              character: null,
              fromType: enemyType,
            };
            flippedPositions.push({ row: fx, col: fy });
            flipped.push({ row: fx, col: fy });
          }
          chains.push({
            flipped,
            anchor: { row: x, col: y },
          });
        }
        return;
      } else if (board[x][y].type === enemyType) {
        path.push([x, y]);
        x += startDx;
        y += startDy;
      } else {
        return;
      }
    }
  };

  for (const [dx, dy] of DIRECTIONS) {
    flipInDirection(dx, dy);
  }

  return { board, comboDamage, flippedPositions, chains };
}

export function hasAnyMoveable(board, currentPlayer) {
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j].type === 3) return true;
    }
  }
  return false;
}
