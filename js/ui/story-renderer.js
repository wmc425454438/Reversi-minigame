import { COLORS } from '../game/constants.js';
import { CHAPTERS } from '../models/chapters.js';

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

export function drawModeSelect(renderer) {
  const ctx = renderer.ctx;
  const cx = renderer.width / 2;
  const cy = renderer.height / 2;

  // 标题
  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('三 国 黑 白 棋', cx, cy - 150);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  ctx.fillText('— 天下三分 · 落子定乾坤 —', cx, cy - 120);

  // 两个大按钮
  const btnW = 200, btnH = 100, gap = 20;

  // 剧情模式
  const sx = cx - btnW / 2;
  const sy = cy - btnH - gap / 2 + 20;
  const sglow = ctx.createLinearGradient(sx, sy, sx, sy + btnH);
  sglow.addColorStop(0, rgba(COLORS.factionShu, 0.15));
  sglow.addColorStop(1, 'transparent');
  ctx.fillStyle = sglow;
  renderer.roundRect(sx, sy, btnW, btnH, 12, true, false);
  ctx.fillStyle = COLORS.cardBg;
  renderer.roundRect(sx, sy, btnW, btnH, 12, true, false);
  ctx.strokeStyle = rgba(COLORS.factionShu, 0.6);
  ctx.lineWidth = 2;
  renderer.roundRect(sx, sy, btnW, btnH, 12, false, true);
  ctx.fillStyle = COLORS.text;
  ctx.font = '28px sans-serif';
  ctx.fillText('📜', cx, sy + 30);
  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('剧情模式', cx, sy + 62);
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '10px sans-serif';
  ctx.fillText('体验三国故事，逐章推进', cx, sy + 82);

  // 对战模式
  const bx = cx - btnW / 2;
  const by = cy + gap / 2 + 20;
  const bglow = ctx.createLinearGradient(bx, by, bx, by + btnH);
  bglow.addColorStop(0, rgba(COLORS.factionWei, 0.15));
  bglow.addColorStop(1, 'transparent');
  ctx.fillStyle = bglow;
  renderer.roundRect(bx, by, btnW, btnH, 12, true, false);
  ctx.fillStyle = COLORS.cardBg;
  renderer.roundRect(bx, by, btnW, btnH, 12, true, false);
  ctx.strokeStyle = rgba(COLORS.factionWei, 0.6);
  ctx.lineWidth = 2;
  renderer.roundRect(bx, by, btnW, btnH, 12, false, true);
  ctx.fillStyle = COLORS.text;
  ctx.font = '28px sans-serif';
  ctx.fillText('⚔', cx, by + 30);
  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('对战模式', cx, by + 62);
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '10px sans-serif';
  ctx.fillText('自由选择势力与难度', cx, by + 82);

  renderer._storyModeBtn = { x: sx, y: sy, w: btnW, h: btnH };
  renderer._battleModeBtn = { x: bx, y: by, w: btnW, h: btnH };
}

export function drawChapterList(renderer, chapters) {
  const ctx = renderer.ctx;
  const cx = renderer.width / 2;
  const btnW = renderer.width - 60;
  const btnH = 68;
  const gap = 14;
  const startY = 90;

  // 标题
  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('剧 情 篇 章', cx, 40);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '11px sans-serif';
  ctx.fillText('— 完成章节，推进三国故事 —', cx, 62);

  renderer._chapterButtons = [];

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const bx = (renderer.width - btnW) / 2;
    const by = startY + i * (btnH + gap);

    if (ch.unlocked) {
      const glow = ctx.createLinearGradient(bx, by, bx + btnW, by);
      glow.addColorStop(0, rgba(COLORS.boardFrameGold, 0.08));
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      renderer.roundRect(bx, by, btnW, btnH, 8, true, false);
    }

    ctx.fillStyle = ch.unlocked ? COLORS.cardBg : '#1a1510';
    renderer.roundRect(bx, by, btnW, btnH, 8, true, false);

    ctx.strokeStyle = ch.completed
      ? COLORS.tokenGold
      : ch.unlocked ? rgba(COLORS.boardFrameGold, 0.5) : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = ch.completed ? 2 : 1;
    renderer.roundRect(bx, by, btnW, btnH, 8, false, true);

    // 章节序号
    ctx.fillStyle = ch.unlocked ? COLORS.textGold : '#555';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('第' + (i + 1) + '章', bx + 12, by + 10);

    // 标题
    ctx.fillStyle = ch.unlocked ? COLORS.text : '#444';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch.title, cx, by + btnH / 2 - 4);

    // 状态
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    if (ch.completed) {
      ctx.fillStyle = COLORS.tokenGold;
      ctx.fillText('已通关 ✓', bx + btnW - 12, by + 12);
    } else if (ch.unlocked) {
      ctx.fillStyle = COLORS.textSecondary;
      ctx.fillText('未挑战', bx + btnW - 12, by + 12);
    } else {
      ctx.fillStyle = '#555';
      ctx.fillText('🔒', bx + btnW - 16, by + btnH / 2);
    }

    renderer._chapterButtons.push({ x: bx, y: by, w: btnW, h: btnH, chapterId: ch.id, unlocked: ch.unlocked });
  }

  // 左上角返回按钮
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  renderer.roundRect(10, 8, 56, 24, 12, true, false);
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← 返回', 38, 20);
  renderer._chapterBackButton = { x: 10, y: 8, w: 56, h: 24 };
}

export function drawStoryDetail(renderer, chapter, textIndex) {
  const ctx = renderer.ctx;
  const cx = renderer.width / 2;
  const panelX = 20, panelW = renderer.width - 40;
  const panelY = 30, panelH = renderer.height - 120;

  // 面板背景
  ctx.fillStyle = 'rgba(30, 20, 12, 0.9)';
  renderer.roundRect(panelX, panelY, panelW, panelH, 10, true, false);
  ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.3);
  ctx.lineWidth = 1;
  renderer.roundRect(panelX, panelY, panelW, panelH, 10, false, true);

  // 标题栏
  ctx.fillStyle = rgba(COLORS.boardFrameGold, 0.1);
  ctx.fillRect(panelX + 8, panelY + 8, panelW - 16, 40);
  ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.2);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(panelX + 8, panelY + 8, panelW - 16, 40);

  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('第' + (CHAPTERS.indexOf(chapter) + 1) + '章 · ' + chapter.title, cx, panelY + 28);

  // 特殊规则提示
  if (chapter.specialRules && chapter.specialRules.description) {
    ctx.fillStyle = rgba(COLORS.tokenRed, 0.15);
    renderer.roundRect(panelX + 16, panelY + 55, panelW - 32, 22, 4, true, false);
    ctx.fillStyle = COLORS.tokenRed;
    ctx.font = '10px sans-serif';
    ctx.fillText('⚔ ' + chapter.specialRules.description, cx, panelY + 66);
  }

  // 剧情文本区域
  const textStartY = panelY + 85;
  const textAreaH = panelH - 160;
  const texts = chapter.storyTexts;
  const visibleCount = textIndex + 1;

  for (let i = 0; i < visibleCount && i < texts.length; i++) {
    const isCurrent = i === textIndex;
    const ty = textStartY + i * 52;
    if (ty + 40 > textStartY + textAreaH) break;

    if (isCurrent) {
      ctx.fillStyle = rgba(COLORS.boardFrameGold, 0.08);
      renderer.roundRect(panelX + 16, ty, panelW - 32, 40, 4, true, false);
    }

    ctx.fillStyle = isCurrent ? COLORS.text : COLORS.textSecondary;
    ctx.font = (isCurrent ? '' : '') + '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // 自动换行
    wrapText(ctx, texts[i], panelX + 24, ty + 8, panelW - 48, 18);
  }

  // 底部按钮
  const btnY = panelY + panelH - 50;
  const isLastText = textIndex >= texts.length - 1;

  if (!isLastText) {
    // "下一句"按钮
    const nbw = 120, nbh = 34;
    const nbx = cx - nbw / 2, nby = btnY;
    ctx.fillStyle = COLORS.buttonBg;
    renderer.roundRect(nbx, nby, nbw, nbh, nbh / 2, true, false);
    ctx.strokeStyle = COLORS.tokenGold;
    ctx.lineWidth = 1;
    renderer.roundRect(nbx, nby, nbw, nbh, nbh / 2, false, true);
    ctx.fillStyle = COLORS.textGold;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('下一句 ▸', cx, nby + nbh / 2);
    renderer._storyNextButton = { x: nbx, y: nby, w: nbw, h: nbh };
    renderer._storyStartButton = null;
  } else {
    // "开始对弈"按钮
    const sbw = 160, sbh = 38;
    const sbx = cx - sbw / 2, sby = btnY;
    ctx.fillStyle = COLORS.factionShu;
    renderer.roundRect(sbx, sby, sbw, sbh, sbh / 2, true, false);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    renderer.roundRect(sbx, sby, sbw, sbh, sbh / 2, false, true);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔ 开始对弈', cx, sby + sbh / 2);
    renderer._storyStartButton = { x: sbx, y: sby, w: sbw, h: sbh };
    renderer._storyNextButton = null;
  }

  // 返回
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '11px sans-serif';
  ctx.fillText('← 返回章节列表', cx, panelY + panelH - 8);
  renderer._storyBackButton = { x: cx - 60, y: panelY + panelH - 18, w: 120, h: 18 };
}

export function drawBranchSelect(renderer, chapter) {
  const ctx = renderer.ctx;
  const cx = renderer.width / 2;
  const cy = renderer.height / 2;

  // 遮罩
  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, renderer.width, renderer.height);

  // 面板
  const pw = 280, ph = 260;
  const px = cx - pw / 2, py = cy - ph / 2;
  ctx.fillStyle = '#2a1a12';
  renderer.roundRect(px, py, pw, ph, 12, true, false);
  ctx.strokeStyle = COLORS.boardFrameGold;
  ctx.lineWidth = 2;
  renderer.roundRect(px, py, pw, ph, 12, false, true);

  // 标题
  ctx.fillStyle = rgba(COLORS.boardFrameGold, 0.15);
  ctx.fillRect(px + 8, py + 10, pw - 16, 36);
  ctx.fillStyle = COLORS.textGold;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('剧情分支', cx, py + 28);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  ctx.fillText('选择你的道路：', cx, py + 65);

  // 选项按钮
  const options = chapter.branchOptions || [];
  const btnW = 220, btnH = 42, btnGap = 12;
  const startY = py + 85;
  renderer._branchButtons = [];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const bx = cx - btnW / 2;
    const by = startY + i * (btnH + btnGap);

    ctx.fillStyle = COLORS.cardBg;
    renderer.roundRect(bx, by, btnW, btnH, btnH / 2, true, false);
    ctx.strokeStyle = rgba(COLORS.boardFrameGold, 0.5);
    ctx.lineWidth = 1;
    renderer.roundRect(bx, by, btnW, btnH, btnH / 2, false, true);

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opt.text, cx, by + btnH / 2);

    renderer._branchButtons.push({ x: bx, y: by, w: btnW, h: btnH, nextChapter: opt.nextChapter, text: opt.text });
  }
}

export function drawChapterRuleTip(renderer, rules) {
  if (!rules || !rules.description) return;
  const ctx = renderer.ctx;
  const cx = renderer.width / 2;
  const tipY = renderer.boardY - 20;
  const tipW = 200, tipH = 16;

  ctx.fillStyle = rgba(COLORS.tokenRed, 0.12);
  renderer.roundRect(cx - tipW / 2, tipY, tipW, tipH, tipH / 2, true, false);
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚔ ' + rules.description, cx, tipY + tipH / 2);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = ch;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}
