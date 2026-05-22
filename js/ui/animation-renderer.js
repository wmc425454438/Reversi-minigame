import { COLORS } from '../game/constants.js';
import { getFactionImage } from './board-renderer.js';

// 动画类型常量
export const ANIM_TYPE = { PLACE: 'place', FLIP: 'flip', LIGHTNING: 'lightning' };

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

// 势力色系 — 从 renderer._gameState 取势力
function _getFaction(type, state) {
  if (!state) return type === 1 ? '蜀' : '吴';
  return type === 1 ? (state.currentPlayerFaction || '蜀') : (state.player2Faction || '吴');
}

function playerRGB(type) {
  const faction = _currentFactions ? _getFaction(type, _currentFactions) : (type === 1 ? '蜀' : '吴');
  const map = { '魏': '139,92,246', '蜀': '255,180,150', '吴': '150,220,210' };
  return map[faction] || (type === 1 ? '255,180,150' : '150,220,210');
}

let _currentFactions = null;

function playerColors(type) {
  const faction = _currentFactions ? _getFaction(type, _currentFactions) : (type === 1 ? '蜀' : '吴');
  const map = {
    '魏': { main: COLORS.factionWei, light: '#b494f8', dark: '#5a30a0' },
    '蜀': { main: COLORS.factionShu, light: COLORS.player1Light, dark: COLORS.player1Dark },
    '吴': { main: COLORS.factionWu, light: COLORS.player2Light, dark: COLORS.player2Dark },
  };
  return map[faction] || { main: type === 1 ? COLORS.player1 : COLORS.player2, light: type === 1 ? COLORS.player1Light : COLORS.player2Light, dark: type === 1 ? COLORS.player1Dark : COLORS.player2Dark };
}

// 共享粒子渲染
function drawParticles(ctx, particles, elapsed, playerType, gravity) {
  for (const p of particles) {
    const pElapsed = elapsed / 1000;
    const pLife = Math.max(0, 1 - pElapsed * p.decay);
    if (pLife <= 0) continue;
    const px = p.x + p.vx * pElapsed * 60;
    const py = p.y + p.vy * pElapsed * 60 + gravity * pElapsed * pElapsed;
    const rgb = playerRGB(playerType);

    ctx.beginPath();
    ctx.arc(px, py, p.size * pLife, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, ${pLife * 0.7})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, p.size * 2 * pLife, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, ${pLife * 0.3})`;
    ctx.fill();
  }
}

// 闪电击中火花
function drawSparks(ctx, x, y, alpha, playerType, isLarge) {
  if (alpha <= 0) return;
  const rgb = playerRGB(playerType);
  const count = isLarge ? 8 : 5;
  const maxDist = isLarge ? 14 : 9;
  const coreSize = isLarge ? 5 : 3;

  ctx.save();
  ctx.globalAlpha = alpha;

  const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, coreSize * 3);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.2, playerType === 1 ? '#ffd700' : '#87ceeb');
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(x, y, coreSize * 3, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + alpha * 1.5;
    const dist = maxDist * alpha;
    const sx = x + Math.cos(angle) * dist;
    const sy = y + Math.sin(angle) * dist;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 1.2 * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${rgb}, ${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 3 * alpha, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawAnimations(renderer, animations) {
  const ctx = renderer.ctx;
  const now = Date.now();
  const cellSize = renderer.cellSize;
  _currentFactions = renderer._gameState || null;

  for (const anim of animations) {
    if (anim.type === ANIM_TYPE.PLACE) {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const prgb = playerRGB(anim.playerType);
      const maxRadius = anim.maxRadius || cellSize * 0.5;

      ctx.save();

      // 冲击波
      const ringP = Math.min(progress * 1.5, 1);
      const ringR = maxRadius * (0.3 + ringP * 1.8);
      ctx.beginPath();
      ctx.arc(anim.x, anim.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${prgb}, ${(1 - ringP) * 0.8})`;
      ctx.lineWidth = 2.5 * (1 - ringP * 0.6);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(anim.x, anim.y, maxRadius * (0.1 + ringP * 2.2), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255, ${(1 - ringP) * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 中心光晕
      const glowA = Math.max(0, 1 - progress * 0.7);
      ctx.beginPath();
      ctx.arc(anim.x, anim.y, maxRadius * 1.2, 0, Math.PI * 2);
      const glowGrad = ctx.createRadialGradient(anim.x, anim.y, 0, anim.x, anim.y, maxRadius * 1.2);
      const lightColor = anim.playerType === 1 ? COLORS.player1Light : COLORS.player2Light;
      glowGrad.addColorStop(0, lightColor);
      glowGrad.addColorStop(0.5, `rgba(${prgb}, ${glowA * 0.4})`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fill();

      ctx.restore();
    } else if (anim.type === ANIM_TYPE.FLIP) {
      const elapsed = now - anim.startTime;
      const cr = (anim.cellSize || cellSize) * 0.4;
      const isToP1 = anim.toType === 1;
      const toClrs = playerColors(isToP1 ? 1 : 2);
      const fromClrs = playerColors(anim.fromType);

      // 应用棋盘透视倾斜
      const tilt = renderer._boardTilt;
      if (tilt) { ctx.save(); ctx.translate(tilt.cx, tilt.cy); ctx.scale(1, tilt.cos); ctx.translate(-tilt.cx, -tilt.cy); }

      // 动画尚未开始：画静态旧色圆遮住已变色的棋盘
      if (elapsed < 0) {
        ctx.save();
        ctx.translate(anim.x, anim.y);
        // 厚度侧边
        const thickH = cr * 0.22;
        ctx.beginPath();
        ctx.ellipse(0, thickH, cr, cr * 0.3, 0, 0, Math.PI);
        ctx.lineTo(cr, 0);
        ctx.arc(0, 0, cr, 0, Math.PI, true);
        ctx.closePath();
        ctx.fillStyle = fromClrs.dark;
        ctx.fill();
        // 顶面
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, cr, 0, Math.PI * 2);
        ctx.clip();
        const pg = ctx.createRadialGradient(-cr * 0.2, -cr * 0.2, cr * 0.05, cr * 0.1, cr * 0.1, cr);
        pg.addColorStop(0, fromClrs.light);
        pg.addColorStop(0.65, fromClrs.main);
        pg.addColorStop(1, fromClrs.dark);
        ctx.beginPath();
        ctx.arc(0, 0, cr, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();
        // 贴图
        const fromFaction = _getFaction(anim.fromType, _currentFactions);
        const fImg = getFactionImage(fromFaction);
        if (fImg.complete && fImg.width > 0) {
          ctx.drawImage(fImg, -cr * 1.5, -cr * 1.5, cr * 3, cr * 3);
        }
        ctx.restore();
        ctx.restore();
        if (tilt) ctx.restore();
        continue;
      }

      const progress = Math.min(elapsed / anim.duration, 1);

      // scaleY: 1 → 0 → 1 (cos 缓动)
      const scaleY = Math.abs(Math.cos(progress * Math.PI));
      // 阶段2 (0.4~0.6) 切换颜色
      const showNew = progress >= 0.5;
      const clrs = showNew ? toClrs : fromClrs;
      const color = clrs.main;
      const thicknessH = cr * 0.25; // 棋子厚度

      ctx.save();
      ctx.translate(anim.x, anim.y);

      // --- 1. 底部阴影层 ---
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 5;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 0, cr, cr * scaleY, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();
      ctx.restore();

      // --- 2. 厚度侧边层 (椭圆环模拟侧面) ---
      ctx.beginPath();
      ctx.ellipse(0, thicknessH * (1 - scaleY), cr, cr * scaleY, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#5C3317'; // 深色木纹厚度
      ctx.fill();

      // 厚度与顶面之间的过渡暗环
      if (scaleY > 0.05) {
        ctx.beginPath();
        ctx.ellipse(0, thicknessH * (1 - scaleY) * 0.5, cr, cr * scaleY, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#3d2210';
        ctx.fill();
      }

      // --- 3. 顶面贴图层 ---
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5 * scaleY;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.scale(1, scaleY);

      // 裁剪圆形
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, cr, 0, Math.PI * 2);
      ctx.clip();

      // 底色渐变
      const pg = ctx.createRadialGradient(-cr * 0.2, -cr * 0.2, cr * 0.05, cr * 0.1, cr * 0.1, cr);
      pg.addColorStop(0, clrs.light);
      pg.addColorStop(0.65, color);
      pg.addColorStop(1, clrs.dark);
      ctx.beginPath();
      ctx.arc(0, 0, cr, 0, Math.PI * 2);
      ctx.fillStyle = pg;
      ctx.fill();

      // 贴图
      const flipFaction = _getFaction(showNew ? anim.toType : anim.fromType, _currentFactions);
      const flipImg = getFactionImage(flipFaction);
      if (flipImg.complete && flipImg.width > 0) {
        ctx.drawImage(flipImg, -cr * 1.5, -cr * 1.5, cr * 3, cr * 3);
      }
      ctx.restore();

      // 武将名 (翻转到新面后显示)
      if (showNew && scaleY > 0.3 && anim.character) {
        const fs = Math.max(9, Math.floor(cr * 0.8));
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText(anim.character.charAt(0), 0, 0.5);
        ctx.fillStyle = '#f5e6c8';
        ctx.fillText(anim.character.charAt(0), 0, 0.5);
      }

      ctx.restore(); // scale(1, scaleY)
      ctx.restore(); // translate

      if (tilt) ctx.restore(); // 恢复透视倾斜
    } else if (anim.type === ANIM_TYPE.LIGHTNING) {
      const elapsed = now - anim.startTime;
      if (elapsed < 0) continue;
      const isP1 = anim.playerType === 1;
      const prgb = playerRGB(anim.playerType);
      const isLong = anim.isLongChain;
      const segs = anim.polylineSegs || [];
      const segTime = anim.segmentTime || 150;
      const totalSegs = segs.length;
      if (totalSegs === 0) continue;

      // 当前活跃段索引+进度
      const overall = Math.min(elapsed / (segTime * totalSegs), 1.1);
      const activeIdx = Math.min(Math.floor(overall * totalSegs), totalSegs - 1);
      const segFrac = Math.min((overall * totalSegs) % 1, 1);

      ctx.save();

      // 绘制完成段 + 当前活跃段
      for (let s = 0; s <= activeIdx; s++) {
        const seg = segs[s];
        const pts = seg.points;
        const drawEnd = s === activeIdx
          ? Math.floor(segFrac * (pts.length - 1))
          : pts.length - 1;
        if (drawEnd < 1) continue;

        // 辉光层
        ctx.beginPath();
        ctx.moveTo(pts[0].bx, pts[0].by);
        for (let p = 1; p <= drawEnd; p++) {
          ctx.lineTo(pts[p].bx, pts[p].by);
        }
        ctx.strokeStyle = `rgba(${prgb}, 0.35)`;
        ctx.lineWidth = isLong ? 5 : 3;
        ctx.shadowColor = isP1 ? 'rgba(255,200,50,0.5)' : 'rgba(100,200,255,0.5)';
        ctx.shadowBlur = isLong ? 12 : 6;
        ctx.stroke();

        // 高频抖动亮线（每帧随机偏移）
        ctx.beginPath();
        ctx.moveTo(pts[0].bx, pts[0].by);
        const jitterAmp = isLong ? 5 : 3;
        for (let p = 1; p <= drawEnd; p++) {
          const jx = pts[p].bx + (Math.random() - 0.5) * jitterAmp * 2;
          const jy = pts[p].by + (Math.random() - 0.5) * jitterAmp * 2;
          ctx.lineTo(jx, jy);
        }
        ctx.strokeStyle = `rgba(${prgb}, 0.9)`;
        ctx.lineWidth = isLong ? 2.5 : 1.5;
        ctx.shadowBlur = 0;
        ctx.stroke();

        // 白色核心抖动
        ctx.beginPath();
        ctx.moveTo(pts[0].bx, pts[0].by);
        for (let p = 1; p <= drawEnd; p++) {
          const jx = pts[p].bx + (Math.random() - 0.5) * jitterAmp;
          const jy = pts[p].by + (Math.random() - 0.5) * jitterAmp;
          ctx.lineTo(jx, jy);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // 段终点电火花
        if (s === activeIdx && drawEnd >= pts.length - 2) {
          const sparkAlpha = Math.min(1, (drawEnd - (pts.length - 2)) / 2 + 0.5);
          drawSparks(ctx, seg.hitX, seg.hitY, sparkAlpha, isP1, isLong);
        } else if (s < activeIdx) {
          drawSparks(ctx, seg.hitX, seg.hitY, 0.25, isP1, false);
        }
      }

      ctx.restore();
    } else if (anim.type === 'combotext') {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      // 弹入+渐出
      const scale = progress < 0.15
        ? 0.5 + progress / 0.15 * 0.7
        : 1 + Math.sin((progress - 0.15) * 2) * 0.1;
      const alpha = progress < 0.2 ? 1 : Math.max(0, 1 - (progress - 0.2) / 0.8);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 描边
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(anim.text, anim.x, anim.y);
      // 金色填充
      ctx.fillStyle = COLORS.combo;
      ctx.fillText(anim.text, anim.x, anim.y);
      ctx.restore();
    } else if (anim.type === 'hpbounce') {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      if (progress < 0.6) {
        const bounceY = anim.y - Math.abs(Math.sin(progress * Math.PI * 3)) * 8 * (1 - progress);
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('-' + Math.abs(progress < 0.3 ? Math.floor((1 - progress) * 10) : 0), anim.x, bounceY);
        ctx.restore();
      }
    }
  }
}

export { drawSparks as drawLightningSparks };

// 闪电预览（拖拽悬停时显示半透明暗色路径）
export function drawPreviewLightning(renderer, preview) {
  const ctx = renderer.ctx;
  if (!preview || !preview.chains) return;

  const { chains, cell, playerType } = preview;
  const boardX = renderer.boardX;
  const boardY = renderer.boardY;
  const cellSize = renderer.cellSize;

  // 起点
  const sx = boardX + cell.col * cellSize + cellSize / 2;
  const sy = boardY + cell.row * cellSize + cellSize / 2;
  const prgb = playerRGB(playerType);

  ctx.save();
  ctx.globalAlpha = 0.35;

  for (const chain of chains) {
    if (!chain.flipped || chain.flipped.length === 0) continue;

    const ax = boardX + chain.anchor.col * cellSize + cellSize / 2;
    const ay = boardY + chain.anchor.row * cellSize + cellSize / 2;

    // 多线段路径
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    const pts = [sx, sy];
    for (const fp of chain.flipped) {
      const fx = boardX + fp.col * cellSize + cellSize / 2;
      const fy = boardY + fp.row * cellSize + cellSize / 2;
      ctx.lineTo(fx, fy);
    }
    ctx.lineTo(ax, ay);

    // 暗色预览闪电
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = `rgba(${prgb}, 0.5)`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 击中点暗色标记
    for (const fp of chain.flipped) {
      const fx = boardX + fp.col * cellSize + cellSize / 2;
      const fy = boardY + fp.row * cellSize + cellSize / 2;
      ctx.fillStyle = `rgba(${prgb}, 0.3)`;
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
