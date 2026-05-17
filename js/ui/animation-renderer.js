import { COLORS } from '../game/constants.js';

// 动画类型常量
export const ANIM_TYPE = { PLACE: 'place', FLIP: 'flip', LIGHTNING: 'lightning' };

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

function playerRGB(type) {
  return type === 1 ? '255,180,150' : '150,220,210';
}

function playerColors(type) {
  if (type === 1) return { main: COLORS.player1, light: COLORS.player1Light, dark: COLORS.player1Dark };
  return { main: COLORS.player2, light: COLORS.player2Light, dark: COLORS.player2Dark };
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

      // 粒子
      if (anim.particles) {
        drawParticles(ctx, anim.particles, elapsed, anim.playerType, 20);
      }

      ctx.restore();
    } else if (anim.type === ANIM_TYPE.FLIP) {
      const elapsed = now - anim.startTime;
      if (elapsed < 0) continue;
      const progress = Math.min(elapsed / anim.duration, 1);
      const cr = (anim.cellSize || cellSize) * 0.4;
      const isToP1 = anim.toType === 1;
      const toClrs = playerColors(isToP1 ? 1 : 2);
      const fromClrs = playerColors(anim.fromType);

      // 三阶段: 蓄力下压 → X轴翻滚 → EaseOutBounce落地
      let angle, liftHeight, squashY;
      if (progress < 0.08) {
        // 蓄力下压: Y轴-2px, scaleY=0.85
        const t = progress / 0.08;
        angle = 0;
        liftHeight = -2 * t;
        squashY = 1 - t * 0.15;
      } else if (progress < 0.5) {
        // 翻起 0→90°: 快速翻转
        const t = (progress - 0.08) / 0.42;
        angle = t * Math.PI / 2;
        liftHeight = -2 * (1 - t) + Math.sin(t * Math.PI) * cr * 0.5;
        squashY = 1 - t * 0.15 + t * t * 0.15; // 恢复
      } else {
        // 落地 90→180°: EaseOutBounce
        let t = (progress - 0.5) / 0.5;
        angle = Math.PI / 2 + t * Math.PI / 2;
        // EaseOutBounce 公式
        const n1 = 7.5625, d1 = 2.75;
        let bounceT = t;
        if (t < 1 / d1) {
          bounceT = n1 * t * t;
        } else if (t < 2 / d1) {
          bounceT = n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
          bounceT = n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
          bounceT = n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
        liftHeight = (1 - bounceT) * cr * 0.4;
        squashY = 1;
      }

      const scaleX = Math.abs(Math.cos(angle));
      const showTop = Math.cos(angle) >= 0;
      const color = showTop ? fromClrs.main : toClrs.main;
      const clrs = showTop ? fromClrs : toClrs;
      const edgeAlpha = (scaleX < 0.3 && progress > 0.08) ? Math.max(0, (0.3 - scaleX) / 0.3) : 0;

      // 阴影随高度变化
      const shadowAlpha = 0.35 - Math.max(0, liftHeight) / (cr * 2) * 0.3;
      const shadowScale = 1 + Math.max(0, liftHeight) / cr * 0.12;
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.05, shadowAlpha)})`;
      ctx.beginPath();
      ctx.ellipse(anim.x, anim.y + cr * 0.5, cr * shadowScale, cr * 0.28 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(anim.x, anim.y - liftHeight);
      ctx.scale(scaleX, squashY || 1);

      // === 侧面木纹（在90°附近可见） ===
      if (edgeAlpha > 0.01) {
        const sideW = cr * 0.25; // 侧面厚度
        ctx.fillStyle = `rgba(90, 58, 26, ${edgeAlpha})`; // 木色
        ctx.fillRect(-cr - sideW / 2, -cr, cr * 2 + sideW, cr * 2);
        // 侧面上半高光线
        ctx.fillStyle = `rgba(120, 80, 40, ${edgeAlpha * 0.5})`;
        ctx.fillRect(-cr - sideW / 2, -cr, cr * 2 + sideW, cr);
      }

      // === 棋子主体 ===
      const pg = ctx.createRadialGradient(-cr * 0.2, -cr * 0.2, cr * 0.05, cr * 0.1, cr * 0.1, cr);
      pg.addColorStop(0, clrs.light);
      pg.addColorStop(0.7, color);
      pg.addColorStop(1, clrs.dark);
      ctx.beginPath();
      ctx.arc(0, 0, cr, 0, Math.PI * 2);
      ctx.fillStyle = pg;
      ctx.fill();

      // 示武将名(仅正面)
      if (showTop && scaleX > 0.3 && anim.character) {
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

      // 边缘线 - 侧面过渡色
      if (scaleX > 0.15) {
        ctx.strokeStyle = edgeAlpha > 0.3
          ? `rgba(90, 58, 26, ${edgeAlpha})`
          : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = edgeAlpha > 0.3 ? 2 : 0.8;
        ctx.stroke();
      }

      ctx.restore();

      // 翻转粒子光尘
      if (anim.particles && progress > 0.1 && progress < 0.9) {
        drawParticles(ctx, anim.particles, elapsed, isToP1 ? 1 : 2, -12);
      }

      // 落地瞬间晕影光环
      if (progress > 0.8) {
        const hp = (progress - 0.8) / 0.2;
        const haloAlpha = Math.min(1, hp) * 0.5;
        const haloR = cr * (1 + hp * 0.6);
        const prgb = playerRGB(isToP1 ? 1 : 2);
        ctx.beginPath();
        ctx.arc(anim.x, anim.y, haloR, 0, Math.PI * 2);
        const haloGrad = ctx.createRadialGradient(anim.x, anim.y, cr * 0.7, anim.x, anim.y, haloR);
        haloGrad.addColorStop(0, 'transparent');
        haloGrad.addColorStop(0.5, `rgba(${prgb}, ${haloAlpha})`);
        haloGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = haloGrad;
        ctx.fill();
      }
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
