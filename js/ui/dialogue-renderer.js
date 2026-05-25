import { COLORS } from '../game/constants.js';

const CHARACTER_FACTIONS = {
  '刘备': '蜀', '关羽': '蜀', '张飞': '蜀', '诸葛亮': '蜀', '赵云': '蜀',
  '曹操': '魏', '司马懿': '魏', '夏侯惇': '魏', '许褚': '魏', '张辽': '魏',
  '孙权': '吴', '周瑜': '吴', '陆逊': '吴', '甘宁': '吴', '吕蒙': '吴',
  '林弈': '魏',
};

const FACTION_COLORS = {
  '魏': { main: COLORS.factionWei, light: '#b494f8', dark: '#5a30a0' },
  '蜀': { main: COLORS.factionShu, light: COLORS.player1Light, dark: COLORS.player1Dark },
  '吴': { main: COLORS.factionWu, light: COLORS.player2Light, dark: COLORS.player2Dark },
};

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

function getFactionColor(speakerColor) {
  return FACTION_COLORS[speakerColor] || FACTION_COLORS['蜀'];
}

// 角色头像立绘（阵营色渐变圆 + 首字）
function drawPortrait(ctx, cx, cy, r, name, faction, isActive) {
  const fc = getFactionColor(faction);

  ctx.save();
  ctx.globalAlpha = isActive ? 1 : 0.3;

  // 外发光（仅活跃角色）
  if (isActive) {
    const glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r + 12);
    glow.addColorStop(0, rgba(fc.main, 0.3));
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // 底圆渐变
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx + r * 0.15, cy + r * 0.15, r);
  grad.addColorStop(0, fc.light);
  grad.addColorStop(0.65, fc.main);
  grad.addColorStop(1, fc.dark);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 边框
  ctx.strokeStyle = isActive ? '#fff' : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = isActive ? 2 : 1;
  ctx.stroke();

  // 角色名首字
  const fs = Math.max(Math.floor(r * 0.9), 14);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = `bold ${fs}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.charAt(0), cx, cy + 1);

  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  let cy = y;
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy;
}

export function drawDialogue(renderer, dialogues, textIndex, revealedChars) {
  const ctx = renderer.ctx;
  const W = renderer.width;
  const H = renderer.height;
  const cx = W / 2;

  if (!dialogues || dialogues.length === 0) return;
  const safeIndex = Math.max(0, Math.min(textIndex, dialogues.length - 1));
  const current = dialogues[safeIndex];
  const isLast = safeIndex >= dialogues.length - 1;

  // === 背景层 ===
  ctx.fillStyle = 'rgba(10, 8, 6, 0.8)';
  ctx.fillRect(0, 0, W, H);

  // 顶部章节标题
  ctx.fillStyle = rgba(COLORS.boardFrameGold, 0.4);
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('— 第' + (safeIndex + 1) + '/' + dialogues.length + '句 —', cx, 12);

  // === 角色立绘层 ===
  const portraitR = 40;
  const portraitY = H * 0.42;

  // 收集左右角色（过滤旁白）
  const leftChar = dialogues.find(d => d.side === 'left' && d.speaker);
  const rightChar = dialogues.find(d => d.side === 'right' && d.speaker);

  if (leftChar) {
    const lx = 55;
    const faction = leftChar.speakerColor || CHARACTER_FACTIONS[leftChar.speaker] || '蜀';
    const isActive = current.side === 'left';
    drawPortrait(ctx, lx, portraitY, portraitR, leftChar.speaker, faction, isActive);
  }

  if (rightChar) {
    const rx = W - 55;
    const faction = rightChar.speakerColor || CHARACTER_FACTIONS[rightChar.speaker] || '魏';
    const isActive = current.side === 'right';
    drawPortrait(ctx, rx, portraitY, portraitR, rightChar.speaker, faction, isActive);
  }

  // === 对话框层 ===
  const boxH = Math.floor(H * 0.28);
  const boxY = H - boxH - 10;
  const boxX = 10;
  const boxW = W - 20;
  const boxR = 10;

  // 对话框背景
  ctx.fillStyle = 'rgba(25, 18, 12, 0.92)';
  renderer.roundRect(boxX, boxY, boxW, boxH, boxR, true, false);

  // 暗金边框
  ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.6);
  ctx.lineWidth = 1.5;
  renderer.roundRect(boxX, boxY, boxW, boxH, boxR, false, true);

  // 顶部装饰线
  const decoGrad = ctx.createLinearGradient(boxX + boxW * 0.2, boxY, boxX + boxW * 0.8, boxY);
  decoGrad.addColorStop(0, 'transparent');
  decoGrad.addColorStop(0.5, rgba(COLORS.boardFrameGold, 0.4));
  decoGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = decoGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boxX + 20, boxY + 0.5);
  ctx.lineTo(boxX + boxW - 20, boxY + 0.5);
  ctx.stroke();

  // 角色名标签
  if (current.speaker) {
    const fc = getFactionColor(current.speakerColor || CHARACTER_FACTIONS[current.speaker] || '蜀');
    const nameW = ctx.measureText(current.speaker).width + 16;
    const nameH = 20;
    const nameX = boxX + 16;
    const nameY = boxY + 12;

    ctx.fillStyle = rgba(fc.main, 0.25);
    renderer.roundRect(nameX, nameY, nameW, nameH, nameH / 2, true, false);
    ctx.strokeStyle = rgba(fc.main, 0.6);
    ctx.lineWidth = 1;
    renderer.roundRect(nameX, nameY, nameW, nameH, nameH / 2, false, true);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(current.speaker, nameX + nameW / 2, nameY + nameH / 2);
  }

  // 对话文本（打字机效果）
  const textAreaX = boxX + 20;
  const textAreaY = boxY + 40;
  const textAreaW = boxW - 40;
  const textAreaH = boxH - 80;
  const lineHeight = 18;

  const displayText = current.text.substring(0, revealedChars);
  ctx.fillStyle = COLORS.text;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  wrapText(ctx, displayText, textAreaX, textAreaY, textAreaW, lineHeight);

  // 光标闪烁（打字机未完成时）
  if (revealedChars < current.text.length) {
    const now = Date.now();
    if (Math.floor(now / 500) % 2 === 0) {
      // 计算光标位置
      const lastChar = displayText.length > 0 ? displayText[displayText.length - 1] : '';
      const beforeCursor = displayText;
      const lines = [];
      let line = '';
      for (const ch of beforeCursor) {
        const test = line + ch;
        if (ctx.measureText(test).width > textAreaW && line) {
          lines.push(line);
          line = ch;
        } else {
          line = test;
        }
      }
      lines.push(line);
      const cursorX = textAreaX + ctx.measureText(lines[lines.length - 1]).width + 2;
      const cursorY = textAreaY + (lines.length - 1) * lineHeight;
      ctx.fillStyle = COLORS.textGold;
      ctx.fillRect(cursorX, cursorY, 8, 14);
    }
  }

  // === 底部按钮 ===
  const btnAreaY = boxY + boxH - 38;

  // 右下角：继续/开始对弈
  if (isLast && revealedChars >= current.text.length) {
    const sbw = 120, sbh = 30;
    const sbx = boxX + boxW - sbw - 12;
    const sby = btnAreaY;
    ctx.fillStyle = COLORS.factionShu;
    renderer.roundRect(sbx, sby, sbw, sbh, sbh / 2, true, false);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    renderer.roundRect(sbx, sby, sbw, sbh, sbh / 2, false, true);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('进入对弈 ⚔', sbx + sbw / 2, sby + sbh / 2);
    renderer._dialogueNextButton = { x: sbx, y: sby, w: sbw, h: sbh, isStart: true };
  } else {
    const nbw = 80, nbh = 28;
    const nbx = boxX + boxW - nbw - 12;
    const nby = btnAreaY;
    ctx.fillStyle = COLORS.buttonBg;
    renderer.roundRect(nbx, nby, nbw, nbh, nbh / 2, true, false);
    ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.5);
    ctx.lineWidth = 1;
    renderer.roundRect(nbx, nby, nbw, nbh, nbh / 2, false, true);
    ctx.fillStyle = COLORS.textGold;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('继续 ▸', nbx + nbw / 2, nby + nbh / 2);
    renderer._dialogueNextButton = { x: nbx, y: nby, w: nbw, h: nbh, isStart: false };
  }

  // 右上角：跳过（避开小程序胶囊按钮）
  const skipW = 48, skipH = 22;
  const skipX = W - skipW - 55;
  const skipY = 10;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  renderer.roundRect(skipX, skipY, skipW, skipH, skipH / 2, true, false);
  ctx.fillStyle = rgba(COLORS.text, 0.5);
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('跳过 »', skipX + skipW / 2, skipY + skipH / 2);
  renderer._dialogueSkipButton = { x: skipX, y: skipY, w: skipW, h: skipH };
}
