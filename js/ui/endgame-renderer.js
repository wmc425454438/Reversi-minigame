import { COLORS } from '../game/constants.js';

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

// 弹性缓动
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// 缓出
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

// 飘落落叶
function drawLeaf(ctx, x, y, size, rotation, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = '#8b6b3a';
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 叶脉
  ctx.strokeStyle = 'rgba(60,40,20,0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-size * 0.8, 0);
  ctx.lineTo(size * 0.8, 0);
  ctx.stroke();
  ctx.restore();
}

// 旌旗
function drawFlag(ctx, x, y, h, progress, color) {
  const flagH = h;
  const poleH = flagH * 1.2;
  const flagW = 28;
  const rise = easeOut(Math.min(progress * 1.5, 1));
  const currentY = y + poleH * (1 - rise);

  // 旗杆
  ctx.strokeStyle = '#8b7355';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, currentY);
  ctx.lineTo(x, currentY - poleH);
  ctx.stroke();

  // 旗帜（飘动）
  const wave = Math.sin(progress * Math.PI * 4) * 3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, currentY - poleH);
  ctx.quadraticCurveTo(x + flagW * 0.5, currentY - poleH + 8 + wave, x + flagW, currentY - poleH + 5);
  ctx.lineTo(x + flagW - 2, currentY - poleH + flagH);
  ctx.quadraticCurveTo(x + flagW * 0.5, currentY - poleH + flagH - 3 + wave * 0.5, x, currentY - poleH + flagH);
  ctx.closePath();
  ctx.fill();

  // 旗帜边框
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 旗杆顶装饰
  ctx.fillStyle = COLORS.tokenGold;
  ctx.beginPath();
  ctx.arc(x, currentY - poleH - 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

// 金色烟火粒子
function drawFireworkParticle(ctx, x, y, size, alpha, rgb) {
  // 光晕
  ctx.beginPath();
  ctx.arc(x, y, size * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb}, ${alpha * 0.3})`;
  ctx.fill();
  // 核心
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
  ctx.fill();
}

export function drawEndGame(renderer, mode, elapsed, duration) {
  const ctx = renderer.ctx;
  const W = renderer.width;
  const H = renderer.height;
  const cx = W / 2;
  const cy = H / 2;
  const progress = Math.min(elapsed / duration, 1);

  // 全屏可点击区域
  renderer._endGameSkipButton = { x: 0, y: 0, w: W, h: H };

  if (mode === 'victory') {
    // === 胜利动画 ===

    // 背景渐变：暗 → 金红色
    const bgAlpha = Math.min(progress * 2, 0.85);
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.7);
    bgGrad.addColorStop(0, `rgba(80, 50, 20, ${bgAlpha * 0.6})`);
    bgGrad.addColorStop(0.5, `rgba(40, 20, 10, ${bgAlpha * 0.8})`);
    bgGrad.addColorStop(1, `rgba(15, 10, 8, ${bgAlpha})`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 四角金色光晕
    const glowAlpha = Math.min(progress * 1.5, 1) * 0.3;
    const corners = [[0, 0], [W, 0], [0, H], [W, H]];
    for (const [gx, gy] of corners) {
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 120);
      g.addColorStop(0, `rgba(212, 168, 67, ${glowAlpha})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(gx - 120, gy - 120, 240, 240);
    }

    // 旌旗升起
    if (progress > 0.2) {
      const flagProgress = (progress - 0.2) / 0.8;
      drawFlag(ctx, cx - 60, H, 50, flagProgress, rgba(COLORS.factionShu, 0.7));
      drawFlag(ctx, cx + 32, H, 50, flagProgress, rgba(COLORS.tokenGold, 0.7));
    }

    // 烟火粒子
    const particleCount = 16;
    const pSeed = [
      [0.12, 0.15], [0.88, 0.12], [0.15, 0.85], [0.85, 0.88],
      [0.25, 0.2], [0.75, 0.18], [0.3, 0.82], [0.7, 0.8],
      [0.5, 0.1], [0.1, 0.5], [0.9, 0.5], [0.5, 0.9],
      [0.35, 0.15], [0.65, 0.15], [0.35, 0.85], [0.65, 0.85],
    ];
    for (let i = 0; i < particleCount; i++) {
      const delay = i * 0.04;
      const pProg = Math.max(0, (progress - delay) / (1 - delay));
      if (pProg <= 0) continue;
      const pLife = Math.max(0, 1 - pProg * 1.2);
      if (pLife <= 0) continue;
      const bx = pSeed[i][0] * W;
      const by = pSeed[i][1] * H;
      const angle = Math.atan2(by - cy, bx - cx);
      const dist = 40 + pProg * 80;
      const px = bx + Math.cos(angle) * dist * pProg;
      const py = by + Math.sin(angle) * dist * pProg - pProg * 30;
      const rgb = i % 3 === 0 ? '212,168,67' : (i % 3 === 1 ? '232,84,106' : '255,220,100');
      drawFireworkParticle(ctx, px, py, 2.5 * pLife, pLife * 0.8, rgb);
    }

    // 中央文字"大胜！"
    const textProgress = Math.min(progress * 2.5, 1);
    const scale = textProgress < 1 ? easeOutBack(textProgress) : 1;
    const textAlpha = Math.min(progress * 3, 1);

    ctx.save();
    ctx.globalAlpha = textAlpha;
    ctx.translate(cx, cy - 20);
    ctx.scale(scale, scale);

    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 金色描边
    ctx.strokeStyle = 'rgba(180,140,40,0.8)';
    ctx.lineWidth = 4;
    ctx.strokeText('大胜！', 0, 0);
    // 金色填充
    const textGrad = ctx.createLinearGradient(-60, -20, 60, 20);
    textGrad.addColorStop(0, '#ffd700');
    textGrad.addColorStop(0.5, '#fff5cc');
    textGrad.addColorStop(1, '#d4a843');
    ctx.fillStyle = textGrad;
    ctx.fillText('大胜！', 0, 0);
    ctx.restore();

    // 副标题
    if (progress > 0.3) {
      const subAlpha = Math.min((progress - 0.3) * 3, 0.7);
      ctx.fillStyle = `rgba(245, 230, 200, ${subAlpha})`;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('天命所归，一统天下', cx, cy + 25);
    }

  } else {
    // === 失败动画 ===

    // 背景渐变：暗 → 暗红灰
    const bgAlpha = Math.min(progress * 2, 0.85);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, `rgba(60, 20, 15, ${bgAlpha * 0.5})`);
    bgGrad.addColorStop(0.5, `rgba(30, 15, 10, ${bgAlpha * 0.8})`);
    bgGrad.addColorStop(1, `rgba(15, 10, 8, ${bgAlpha})`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 上方天光熄灭效果
    if (progress < 0.6) {
      const lightAlpha = (1 - progress / 0.6) * 0.15;
      const lightGrad = ctx.createRadialGradient(cx, -50, 0, cx, -50, H * 0.6);
      lightGrad.addColorStop(0, `rgba(200, 150, 100, ${lightAlpha})`);
      lightGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, W, H * 0.5);
    }

    // 落叶飘落
    const leaves = [
      { x: 0.2, delay: 0.1, speed: 0.6, size: 5 },
      { x: 0.45, delay: 0.25, speed: 0.5, size: 4 },
      { x: 0.7, delay: 0.05, speed: 0.7, size: 6 },
      { x: 0.85, delay: 0.3, speed: 0.55, size: 4.5 },
      { x: 0.35, delay: 0.4, speed: 0.65, size: 5 },
      { x: 0.6, delay: 0.15, speed: 0.5, size: 3.5 },
    ];
    for (const leaf of leaves) {
      const lProg = Math.max(0, (progress - leaf.delay) / (1 - leaf.delay));
      if (lProg <= 0) continue;
      const lx = leaf.x * W + Math.sin(lProg * Math.PI * 3) * 20;
      const ly = -20 + lProg * (H + 40) * leaf.speed;
      const rotation = lProg * Math.PI * 4;
      const alpha = Math.min(lProg * 3, 0.7) * (1 - Math.max(0, (lProg - 0.7) / 0.3));
      drawLeaf(ctx, lx, ly, leaf.size, rotation, alpha);
    }

    // 中央文字 "兵败如山倒"
    const textProgress = Math.min(progress * 2, 1);
    const textAlpha = Math.min(progress * 2.5, 0.9);
    const textY = cy - 20 - (1 - easeOut(textProgress)) * 30;

    ctx.save();
    ctx.globalAlpha = textAlpha;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 暗色描边
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText('兵败如山倒', cx, textY);
    // 灰白填充
    ctx.fillStyle = '#a09080';
    ctx.fillText('兵败如山倒', cx, textY);
    ctx.restore();

    // 副标题
    if (progress > 0.4) {
      const subAlpha = Math.min((progress - 0.4) * 3, 0.5);
      ctx.fillStyle = `rgba(160, 144, 128, ${subAlpha})`;
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('暂露锋芒，来日再战', cx, cy + 20);
    }
  }

  // 底部跳过提示
  ctx.fillStyle = 'rgba(245, 230, 200, 0.35)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('点击屏幕跳过', cx, H - 16);
}
