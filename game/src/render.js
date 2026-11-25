// Padang Kilat — all canvas drawing: kitchen, order board, HUD, chef, food, screens.
// One job: paint the world state. It never changes the rules.
import { INGREDIENTS, PALETTE, RECIPES, SEATS, STAGES, STATIONS, TARGET_COINS, W, H, itemColor, itemName, recipeById } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// Chunky, appetising food icons: one distinct silhouette + colour per ingredient.
export function drawFood(ctx, key, x, y, s) {
  const [id, st] = key.split(':');
  const c = itemColor(key);
  ctx.save();
  ctx.translate(x, y);
  if (id === 'NASI') {
    ctx.fillStyle = '#fff8e6';
    ctx.beginPath(); ctx.ellipse(0, 2, s * 0.52, s * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2e3b8';
    for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.arc(i * s * 0.14, -s * 0.16, s * 0.09, 0, Math.PI * 2); ctx.fill(); }
  } else if (id === 'AYAM') {
    ctx.fillStyle = '#e8893a';
    ctx.beginPath(); ctx.ellipse(-s * 0.08, 0, s * 0.42, s * 0.3, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7e8c8';
    ctx.beginPath(); ctx.arc(s * 0.34, s * 0.22, s * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a96f36'; ctx.lineWidth = s * 0.08;
    ctx.beginPath(); ctx.moveTo(s * 0.16, s * 0.1); ctx.lineTo(s * 0.34, s * 0.24); ctx.stroke();
  } else if (id === 'TELUR') {
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb51e';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'SAYUR') {
    ctx.fillStyle = '#2f8f3e';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath(); ctx.ellipse(i * s * 0.24, -s * 0.08, s * 0.2, s * 0.34, i * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#58b368';
    ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.34, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'CABAI') {
    ctx.strokeStyle = '#c22e1f'; ctx.lineWidth = s * 0.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.2); ctx.quadraticCurveTo(0, s * 0.42, s * 0.38, -s * 0.14); ctx.stroke();
    ctx.fillStyle = '#2f8f3e';
    ctx.beginPath(); ctx.ellipse(s * 0.4, -s * 0.2, s * 0.14, s * 0.08, 0.6, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'DAGING') {
    // Rendang: a dark slow-cooked beef chunk with chilli flecks.
    ctx.fillStyle = '#6e3b1f';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.36, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a5a34';
    ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.06, s * 0.3, s * 0.2, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d64533';
    ctx.beginPath(); ctx.arc(s * 0.2, s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.arc(-s * 0.24, s * 0.12, s * 0.06, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'MIE') {
    // Indomie: a wavy nest of golden noodles.
    ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = s * 0.14; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, i * s * 0.2);
      ctx.quadraticCurveTo(-s * 0.14, i * s * 0.2 - s * 0.16, s * 0.14, i * s * 0.2);
      ctx.quadraticCurveTo(s * 0.34, i * s * 0.2 + s * 0.14, s * 0.42, i * s * 0.2);
      ctx.stroke();
    }
  } else if (id === 'KETUPAT') {
    // Ketupat: a woven palm-leaf diamond.
    ctx.fillStyle = '#dfe8c8';
    ctx.beginPath(); ctx.moveTo(0, -s * 0.42); ctx.lineTo(s * 0.4, 0); ctx.lineTo(0, s * 0.42); ctx.lineTo(-s * 0.4, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a9a6a'; ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.42); ctx.lineTo(0, s * 0.42); ctx.moveTo(-s * 0.4, 0); ctx.lineTo(s * 0.4, 0); ctx.stroke();
  } else if (id === 'SAMBAL') {
    // Sambal ijo: a bowl of green chilli relish.
    ctx.fillStyle = '#fff6e3';
    ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.48, s * 0.3, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#3f9e4d';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.02, s * 0.4, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1f6b2e';
    ctx.beginPath(); ctx.arc(-s * 0.12, -s * 0.06, s * 0.06, 0, Math.PI * 2); ctx.arc(s * 0.14, s * 0.02, s * 0.06, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'ESTEH') {
    // Es teh manis: amber tea, ice, a straw.
    ctx.fillStyle = '#b4552d';
    rr(ctx, -s * 0.24, -s * 0.34, s * 0.48, s * 0.68, s * 0.08); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-s * 0.16, -s * 0.2, s * 0.16, s * 0.16);
    ctx.fillRect(s * 0.02, -s * 0.02, s * 0.16, s * 0.16);
    ctx.strokeStyle = '#d64533'; ctx.lineWidth = s * 0.08;
    ctx.beginPath(); ctx.moveTo(s * 0.14, -s * 0.34); ctx.lineTo(s * 0.26, -s * 0.52); ctx.stroke();
  } else if (id === 'TEHTALUA') {
    // Teh talua: frothy golden tea with egg foam.
    ctx.fillStyle = '#e8c96a';
    rr(ctx, -s * 0.24, -s * 0.34, s * 0.48, s * 0.68, s * 0.08); ctx.fill();
    ctx.fillStyle = '#fff6e3';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.28, s * 0.26, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2b234';
    ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.08, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'ESJERUK') {
    // Es jeruk: orange juice with a slice on top.
    ctx.fillStyle = '#f2a541';
    rr(ctx, -s * 0.24, -s * 0.34, s * 0.48, s * 0.68, s * 0.08); ctx.fill();
    ctx.fillStyle = '#ff8c1a';
    ctx.beginPath(); ctx.arc(0, -s * 0.26, s * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6e3';
    ctx.beginPath(); ctx.arc(0, -s * 0.26, s * 0.09, 0, Math.PI * 2); ctx.fill();
  }
  // Cold drinks (Es Teh, Es Jeruk): ice cubes, dew on the glass, a wisp
  // of cold mist above it. Teh Talua is served hot — no ice.
  if (id === 'ESTEH' || id === 'ESJERUK') {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(-s * 0.18, -s * 0.1, s * 0.16, s * 0.16);
    ctx.fillRect(s * 0.04, -s * 0.22, s * 0.14, s * 0.14);
    ctx.fillStyle = 'rgba(180,220,255,0.95)';
    ctx.beginPath();
    ctx.arc(-s * 0.2, s * 0.2, s * 0.05, 0, Math.PI * 2);
    ctx.arc(s * 0.18, s * 0.05, s * 0.05, 0, Math.PI * 2);
    ctx.arc(0, s * 0.28, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,230,255,0.4)';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.44, s * 0.3, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (st === 'chopped') {
    ctx.strokeStyle = '#33241a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.3); ctx.lineTo(s * 0.3, s * 0.3); ctx.moveTo(s * 0.3, -s * 0.3); ctx.lineTo(-s * 0.3, s * 0.3); ctx.stroke();
  } else if (st === 'cooked') {
    ctx.strokeStyle = '#f2b234'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.52, 0, Math.PI * 2); ctx.stroke();
  }
  // 2.5D gloss: a soft highlight so food reads as lit from above.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(-s * 0.16, -s * 0.2, s * 0.2, s * 0.11, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.1, y, x - s * 0.5, y - s * 0.9, x, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.9, x + s * 1.1, y, x, y + s * 0.9);
  ctx.fill();
}

// A customer face for a mood: haus, lapar, tidak selera, lesu, marah,
// puas, kenyang, kuntilanak, netral. Drawn on tickets and in the etalase
// window, so the customer's state is visible at a glance.
function drawMoodFace(ctx, mood, x, y, r) {
  ctx.fillStyle = mood === 'marah' ? '#e88a7a' : mood === 'kuntilanak' ? '#f4f0e8' : '#f2c79b';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#33241a';
  const e = r * 0.36;
  const ey = y - r * 0.12;
  const lw = Math.max(2, r * 0.1);
  if (mood === 'kuntilanak') {
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 1.02, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - r, y - r * 0.15, r * 0.28, r * 1.1);
    ctx.fillRect(x + r * 0.72, y - r * 0.15, r * 0.28, r * 1.1);
    ctx.beginPath(); ctx.arc(x - e, ey, r * 0.11, 0, Math.PI * 2); ctx.arc(x + e, ey, r * 0.11, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (mood === 'marah') {
    ctx.strokeStyle = '#33241a'; ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - e - r * 0.18, ey - r * 0.34); ctx.lineTo(x - e + r * 0.18, ey - r * 0.14);
    ctx.moveTo(x + e + r * 0.18, ey - r * 0.34); ctx.lineTo(x + e - r * 0.18, ey - r * 0.14);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x - e, ey, r * 0.1, 0, Math.PI * 2); ctx.arc(x + e, ey, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + r * 0.62, r * 0.34, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    return;
  }
  if (mood === 'puas') {
    ctx.strokeStyle = '#33241a'; ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(x - e, ey, r * 0.2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.arc(x + e, ey, r * 0.2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.5, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.fillStyle = '#f2b234';
    drawStar(ctx, x, y - r * 0.85, r * 0.32);
    return;
  }
  if (mood === 'kenyang') {
    ctx.beginPath(); ctx.arc(x - e, ey, r * 0.1, 0, Math.PI * 2); ctx.arc(x + e, ey, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#33241a'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(x, y + r * 0.08, r * 0.42, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    drawHeart(ctx, x + r * 0.85, y - r * 0.7, r * 0.3, '#d64533');
    return;
  }
  if (mood === 'haus') {
    ctx.beginPath(); ctx.arc(x - e, ey, r * 0.1, 0, Math.PI * 2); ctx.arc(x + e, ey, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.34, r * 0.18, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a86d6';
    ctx.beginPath(); ctx.arc(x + r * 0.62, y - r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + r * 0.62, y - r * 0.62);
    ctx.lineTo(x + r * 0.42, y - r * 0.28);
    ctx.lineTo(x + r * 0.82, y - r * 0.28);
    ctx.closePath(); ctx.fill();
    return;
  }
  if (mood === 'lapar') {
    ctx.beginPath(); ctx.arc(x - e, ey, r * 0.14, 0, Math.PI * 2); ctx.arc(x + e, ey, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.36, r * 0.3, r * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (mood === 'tidak selera') {
    ctx.strokeStyle = '#33241a'; ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x - e - r * 0.14, ey); ctx.lineTo(x - e + r * 0.14, ey);
    ctx.moveTo(x + e - r * 0.14, ey); ctx.lineTo(x + e + r * 0.14, ey);
    ctx.moveTo(x - r * 0.3, y + r * 0.34); ctx.lineTo(x + r * 0.3, y + r * 0.34);
    ctx.stroke();
    return;
  }
  if (mood === 'lesu') {
    ctx.strokeStyle = '#33241a'; ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x - e - r * 0.16, ey - r * 0.1); ctx.lineTo(x - e + r * 0.16, ey + r * 0.06);
    ctx.moveTo(x + e + r * 0.16, ey - r * 0.1); ctx.lineTo(x + e - r * 0.16, ey + r * 0.06);
    ctx.moveTo(x - r * 0.22, y + r * 0.36); ctx.lineTo(x + r * 0.22, y + r * 0.36);
    ctx.stroke();
    return;
  }
  // Neutral: plain smile.
  ctx.beginPath(); ctx.arc(x - e, ey, r * 0.1, 0, Math.PI * 2); ctx.arc(x + e, ey, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#33241a'; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.36, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
}

function drawTicket(ctx, ticket, x, y, w, h) {
  const frac = Math.max(0, ticket.patience / ticket.max);
  const urgent = frac < 0.25;
  const flash = urgent && Math.floor(performance.now() / 300) % 2 === 0;
  const ghost = !!ticket.kuntilanak;
  ctx.save();
  rr(ctx, x, y, w, h, 10);
  // Her ticket is blood-red on near-black, not the violet of a normal one.
  ctx.fillStyle = ghost ? '#14090c' : flash ? '#ffe1dc' : '#fff6e3';
  ctx.fill();
  ctx.lineWidth = ghost ? 4 : urgent ? 4 : 2;
  ctx.strokeStyle = ghost ? '#8f1d1d' : urgent ? '#d64533' : '#c98a4b';
  ctx.stroke();
  // Dish icon + name.
  drawFood(ctx, ticket.needs[0], x + 34, y + 30, 44);
  text(ctx, ticket.name, x + 66, y + 22, 19, ghost ? '#ff6b5e' : PALETTE.ink);
  // Customer mood, visible on the ticket: HAUS / LAPAR / TIDAK SELERA /
  // LESU, and MARAH once the patience bar drops under a quarter (the bar
  // is red then too). The face sits top-right; the label joins the coins.
  const faceMood = ghost ? 'kuntilanak' : urgent ? 'marah' : (ticket.mood || null);
  if (faceMood) drawMoodFace(ctx, faceMood, x + w - 26, y + 22, 13);
  const moodLabel = ghost ? null : urgent ? 'MARAH' : (ticket.mood ? ticket.mood.toUpperCase() : null);
  if (ghost) {
    text(ctx, `Sate: ${ticket.servedCount}/3 · puas +40`, x + 66, y + 48, 14, '#e8a0a0');
  } else {
    text(ctx, moodLabel ? `+${ticket.coins} koin · ${moodLabel}` : `+${ticket.coins} koin`, x + 66, y + 48, 15, urgent ? '#d64533' : '#8a6a2f');
  }
  // Needs chips.
  let cx = x + 14;
  for (const need of ticket.needs) {
    ctx.fillStyle = '#f3e2c2';
    rr(ctx, cx, y + 58, 78, 20, 6); ctx.fill();
    drawFood(ctx, need, cx + 13, y + 68, 18);
    const label = need.endsWith(':ready') ? itemName(need) : itemName(need).split(' ')[0];
    text(ctx, label, cx + 26, y + 68, 11, PALETTE.ink);
    cx += 84;
  }
  // Patience bar — blood red for her ticket, always.
  ctx.fillStyle = '#e5d3ae';
  rr(ctx, x + 14, y + h - 10, w - 28, 7, 3); ctx.fill();
  ctx.fillStyle = ghost ? '#a31621' : frac > 0.5 ? '#3f9e4d' : frac > 0.25 ? '#f2b234' : '#d64533';
  if (frac > 0.01) { rr(ctx, x + 14, y + h - 10, (w - 28) * frac, 7, 3); ctx.fill(); }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  // Soft drop shadow under a station rect: the cheapest 2.5D there is.
  function shadowRect(x, y, w, h) {
    ctx.fillStyle = 'rgba(60,30,10,0.22)';
    rr(ctx, x + 5, y + 9, w, h, 10); ctx.fill();
  }

  function drawFloor(state) {
    const fl = state.flicker ?? 1;
    // Warm floor with perspective: tiles shrink toward the back wall,
    // verticals converge on a vanishing point — the 2.5D floor.
    const g = ctx.createLinearGradient(0, 176, 0, H);
    g.addColorStop(0, '#e6c795');
    g.addColorStop(1, PALETTE.floor);
    ctx.fillStyle = g;
    ctx.fillRect(0, 176, W, H);
    ctx.strokeStyle = 'rgba(169,111,54,0.28)';
    ctx.lineWidth = 2;
    for (const y of [186, 205, 232, 268, 314, 372, 444, 532, 638, 720]) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let i = -6; i <= 6; i += 1) {
      ctx.beginPath(); ctx.moveTo(640 + i * 24, 186); ctx.lineTo(640 + i * 190, H); ctx.stroke();
    }
    // Wall band + hanging lamps.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 168, W, 10);
    ctx.fillStyle = PALETTE.wallDark;
    ctx.fillRect(0, 168, W, 3);
    for (const lx of [240, 640, 1040]) {
      ctx.strokeStyle = '#33241a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 34); ctx.stroke();
      ctx.fillStyle = '#f2b234';
      ctx.beginPath(); ctx.moveTo(lx - 16, 34); ctx.lineTo(lx + 16, 34); ctx.lineTo(lx + 8, 52); ctx.lineTo(lx - 8, 52); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(242,178,52,${(0.18 * fl).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(lx, 56, 34, 0, Math.PI * 2); ctx.fill();
    }
    // Warm light pools under the lamps — they dim and flicker when she is.
    for (const lx of [240, 640, 1040]) {
      const lg = ctx.createRadialGradient(lx, 200, 10, lx, 200, 280);
      lg.addColorStop(0, `rgba(242,178,52,${(0.20 * fl).toFixed(3)})`);
      lg.addColorStop(1, 'rgba(242,178,52,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 280, 0, 560, 480);
    }
  }

  function drawCrates(state) {
    for (const c of STATIONS.crates) {
      shadowRect(c.x, c.y, c.w, c.h);
      const ing = INGREDIENTS[c.id];
      rr(ctx, c.x, c.y, c.w, c.h, 8);
      ctx.fillStyle = '#e8d3a8'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#a96f36'; ctx.stroke();
      drawFood(ctx, `${c.id}:${ing.prep === 'none' ? 'ready' : 'raw'}`, c.x + c.w / 2, c.y + 24, 34);
      text(ctx, ing.name, c.x + c.w / 2, c.y + c.h - 10, 12, PALETTE.ink, 'center');
    }
    text(ctx, 'BAHAN', 121, 486, 15, '#8a6a2f', 'center');
  }

  function drawChop(state) {
    const r = STATIONS.chop;
    shadowRect(r.x, r.y, r.w, r.h);
    rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = '#d9a05b'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#8a5a28'; ctx.stroke();
    text(ctx, 'TALENAN  ·  tahan E untuk iris', r.x + r.w / 2, r.y + 16, 14, '#5c3a16', 'center');
    // Knife, low on the board so it never covers the hint line.
    ctx.fillStyle = '#dfe6ea';
    ctx.beginPath(); ctx.moveTo(r.x + 40, r.y + 62); ctx.lineTo(r.x + 96, r.y + 62); ctx.lineTo(r.x + 104, r.y + 70); ctx.lineTo(r.x + 40, r.y + 70); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#33241a';
    ctx.fillRect(r.x + 18, r.y + 64, 24, 8);
    if (state.chopping) {
      drawFood(ctx, state.chopTarget || 'SAYUR:raw', r.x + 150, r.y + 50, 44);
      ctx.fillStyle = '#e5d3ae';
      rr(ctx, r.x + 180, r.y + 42, 48, 14, 7); ctx.fill();
      ctx.fillStyle = '#d64533';
      rr(ctx, r.x + 180, r.y + 42, 48 * Math.min(1, state.chopProgress), 14, 7); ctx.fill();
    } else {
      text(ctx, 'Daging · Ayam · Sayur · Cabai', r.x + 150, r.y + 50, 13, '#5c3a16', 'center');
    }
  }

  function drawStove(state) {
    STATIONS.stove.forEach((r, i) => {
      shadowRect(r.x, r.y, r.w, r.h);
      const pot = state.pots[i];
      rr(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fillStyle = '#3a3f46'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#1f7a6d'; ctx.stroke();
      text(ctx, i === 0 ? 'KOMPOR 1' : 'KOMPOR 2', r.x + 12, r.y + 14, 13, '#fff6e3');
      // Pot.
      ctx.fillStyle = '#22252b';
      ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + 52, 52, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a5058';
      ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + 48, 52, 18, 0, 0, Math.PI * 2); ctx.fill();
      if (pot.item) {
        ctx.fillStyle = pot.done ? '#ffb51e' : '#7a5a34';
        ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + 48, 40, 12, 0, 0, Math.PI * 2); ctx.fill();
        if (!pot.done) {
          ctx.fillStyle = '#e5d3ae';
          rr(ctx, r.x + 18, r.y + 68, r.w - 36, 8, 4); ctx.fill();
          ctx.fillStyle = '#f2b234';
          rr(ctx, r.x + 18, r.y + 68, (r.w - 36) * Math.min(1, pot.progress), 8, 4); ctx.fill();
        } else {
          text(ctx, 'MATANG!  E: ambil', r.x + r.w / 2, r.y + 72, 13, '#ffd94d', 'center');
        }
      } else {
        text(ctx, 'E: masak di kompor', r.x + r.w / 2, r.y + 68, 12, '#cfd6dd', 'center');
      }
    });
  }

  // Steam + serve bursts: drawn after the stations (and after the chef),
  // so a wisp rising from a finished dish on the etalase is not hidden
  // behind the etalase itself.
  function drawParticles(state) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const pt of state.particles) {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.max), 0, Math.PI * 2); ctx.fill();
    }
  }

  // The customer in the etalase window: the oldest ticket's mood live,
  // briefly replaced by what just happened (PUAS / KENYANG / MARAH).
  function drawCustomerWindow(state) {
    const x = 1192;
    const y = 560;
    const r = 30;
    let mood = null;
    let label = 'MENUNGGU';
    if (state.customerFace.until > state.elapsed && state.customerFace.mood) {
      mood = state.customerFace.mood;
      label = mood.toUpperCase();
    } else if (state.tickets.length > 0) {
      const t = state.tickets[0];
      const frac = t.patience / t.max;
      mood = t.kuntilanak ? 'kuntilanak' : frac < 0.25 ? 'marah' : (t.mood || null);
      label = mood ? mood.toUpperCase() : 'MENUNGGU';
    }
    ctx.fillStyle = '#8a5a28';
    ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6e3';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    drawMoodFace(ctx, mood || 'netral', x, y, r - 4);
    ctx.restore();
    text(ctx, label, x, y + r + 16, 13, '#33241a', 'center');
  }

  // Seating queue: the door, three chairs, and the customers waiting,
  // sitting, eating, or storming out. A queuing customer carries a timer
  // bar over their head; an angry one carries a red "!".
  function drawQueue(state) {
    ctx.fillStyle = '#6b4423';
    rr(ctx, 1248, 570, 32, 100, 6); ctx.fill();
    ctx.fillStyle = '#3a2a18';
    rr(ctx, 1254, 578, 20, 84, 4); ctx.fill();
    text(ctx, 'PINTU', 1252, 560, 12, '#5c3a16', 'center');
    for (const s of SEATS) {
      ctx.fillStyle = 'rgba(60,30,10,0.22)';
      rr(ctx, s.x - 17, s.y + 1, 44, 34, 8); ctx.fill();
      ctx.fillStyle = '#8a5a28';
      rr(ctx, s.x - 22, s.y - 8, 44, 26, 8); ctx.fill();
      ctx.fillStyle = '#a86f3a';
      rr(ctx, s.x - 22, s.y - 8, 44, 10, 8); ctx.fill();
    }
    for (const c of state.customers) {
      const mood = c.angry ? 'marah' : c.state === 'eating' ? 'kenyang' : (c.mood || 'netral');
      ctx.fillStyle = c.angry ? '#a31621' : '#3f9e4d';
      ctx.beginPath(); ctx.arc(c.x, c.y + 6, 12, 0, Math.PI * 2); ctx.fill();
      drawMoodFace(ctx, mood, c.x, c.y - 12, 11);
      if (c.state === 'queue') {
        const frac = Math.max(0, c.queueLeft / c.queueMax);
        ctx.fillStyle = '#e5d3ae';
        rr(ctx, c.x - 16, c.y - 34, 32, 6, 3); ctx.fill();
        ctx.fillStyle = frac > 0.5 ? '#3f9e4d' : frac > 0.25 ? '#f2b234' : '#d64533';
        if (frac > 0.01) { rr(ctx, c.x - 16, c.y - 34, 32 * frac, 6, 3); ctx.fill(); }
      }
      if (c.angry) text(ctx, '!', c.x, c.y - 38, 20, '#d64533', 'center');
      if (c.state === 'eating') {
        ctx.fillStyle = '#fff6e3';
        ctx.beginPath(); ctx.ellipse(c.x, c.y - 32, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c98a4b'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }

  function drawAssembly(state) {
    const r = STATIONS.assembly;
    shadowRect(r.x, r.y, r.w, r.h);
    rr(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = PALETTE.teal; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = PALETTE.tealDark; ctx.stroke();
    text(ctx, 'MEJA RACIK  ·  E: taruh bahan', r.x + r.w / 2, r.y + 16, 14, '#dff3ee', 'center');
    // Plate.
    const px = r.x + 52;
    const py = r.y + 56;
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath(); ctx.ellipse(px, py, 44, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a35e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(px, py, 44, 26, 0, 0, Math.PI * 2); ctx.stroke();
    state.plate.forEach((key, i) => drawFood(ctx, key, px - 24 + i * 24, py - 4, 30));
    const done = state.plate.length > 0 && RECIPES.some((rc) => rc.needs.length === state.plate.length && rc.needs.every((n) => state.plate.includes(n)));
    if (done) {
      const recipe = RECIPES.find((rc) => rc.needs.length === state.plate.length && rc.needs.every((n) => state.plate.includes(n)));
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath(); ctx.arc(px, py, 50 + Math.sin(performance.now() / 200) * 3, 0, Math.PI * 2); ctx.stroke();
      text(ctx, `${recipe.name} — E: ke pass`, r.x + 130, r.y + 46, 17, '#fff6e3');
      text(ctx, 'Piring lengkap!', r.x + 130, r.y + 70, 14, '#ffd94d');
    } else if (state.plate.length > 0) {
      text(ctx, `${state.plate.length}/3 bahan di piring`, r.x + 130, r.y + 46, 16, '#fff6e3');
      text(ctx, 'Lihat tiket di atas', r.x + 130, r.y + 70, 13, '#bfe3d8');
    } else {
      text(ctx, 'Bawa bahan ke sini', r.x + 130, r.y + 56, 15, '#bfe3d8');
    }
  }

  function drawPass(state) {
    const r = STATIONS.pass;
    shadowRect(r.x, r.y, r.w, r.h);
    rr(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = '#fff6e3'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#c98a4b'; ctx.stroke();
    // Etalase shine: a diagonal gloss stripe across the glass.
    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.beginPath();
    ctx.moveTo(r.x + 18, r.y + r.h);
    ctx.lineTo(r.x + 62, r.y);
    ctx.lineTo(r.x + 92, r.y);
    ctx.lineTo(r.x + 48, r.y + r.h);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // Batik trim: terracotta band with diamond motif.
    ctx.fillStyle = PALETTE.batik;
    ctx.fillRect(r.x, r.y, r.w, 26);
    ctx.fillStyle = '#f2b234';
    for (let x = r.x + 12; x < r.x + r.w - 6; x += 22) {
      ctx.beginPath(); ctx.moveTo(x, r.y + 13); ctx.lineTo(x + 7, r.y + 5); ctx.lineTo(x + 14, r.y + 13); ctx.lineTo(x + 7, r.y + 21); ctx.closePath(); ctx.fill();
    }
    text(ctx, 'ETALASE · SAJI', r.x + r.w / 2, r.y + 46, 16, PALETTE.ink, 'center');
    if (state.passDish) {
      const recipe = recipeById(state.passDish);
      const glow = 6 + Math.sin(performance.now() / 180) * 3;
      ctx.save();
      ctx.shadowColor = '#f2b234'; ctx.shadowBlur = glow;
      ctx.fillStyle = '#fffdf4';
      ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + 120, 56, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      recipe.needs.forEach((need, i) => drawFood(ctx, need, r.x + r.w / 2 - 34 + i * 34, r.y + 116, 36));
      text(ctx, recipe.name, r.x + r.w / 2, r.y + 160, 15, PALETTE.ink, 'center');
      text(ctx, 'SIAP DISAJIKAN — E', r.x + r.w / 2, r.y + 178, 13, '#1f7a6d', 'center');
    } else {
      // Etalase: stacked plates waiting for the next dish.
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = '#fffdf4';
        ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + 96 + i * 18, 40 - i * 4, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c9a35e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + 96 + i * 18, 40 - i * 4, 10, 0, 0, Math.PI * 2); ctx.stroke();
      }
      text(ctx, 'Etalase siap —', r.x + r.w / 2, r.y + 168, 15, '#a98f68', 'center');
      text(ctx, 'antar hidangan', r.x + r.w / 2, r.y + 190, 15, '#a98f68', 'center');
    }
  }

  function drawBin() {
    const r = STATIONS.bin;
    shadowRect(r.x, r.y, r.w, r.h);
    rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = '#5b6470'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#39404a'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(r.x + r.w / 2 - 14, r.y + 16, 28, 6); ctx.fillRect(r.x + r.w / 2 - 11, r.y + 24, 22, 16);
    text(ctx, 'BUANG (E)', r.x + r.w / 2, r.y + 56, 13, '#fff', 'center');
  }

  function drawChef(state, world) {
    const p = state.player;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 20, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
    const bob = p.moving ? Math.sin(performance.now() / 90) * 2 : 0;
    // Body + apron.
    ctx.fillStyle = '#fff6e3';
    rr(ctx, p.x - 17, p.y - 6 + bob, 34, 30, 10); ctx.fill();
    ctx.fillStyle = PALETTE.teal;
    rr(ctx, p.x - 13, p.y + 4 + bob, 26, 20, 6); ctx.fill();
    // Head + hat.
    ctx.fillStyle = '#f2c79b';
    ctx.beginPath(); ctx.arc(p.x, p.y - 18 + bob, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 30 + bob, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (state.scared > 0) {
      // Scared face, unmistakable: wide eyes, open mouth, pale skin, a
      // sweat drop, and "!!!" over the head — the kuntilanak just left angry.
      ctx.fillStyle = '#f7ead6';
      ctx.beginPath(); ctx.arc(p.x, p.y - 18 + bob, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x - 5, p.y - 19 + bob, 4, 0, Math.PI * 2); ctx.arc(p.x + 5, p.y - 19 + bob, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#33241a';
      ctx.beginPath(); ctx.arc(p.x - 5, p.y - 19 + bob, 2, 0, Math.PI * 2); ctx.arc(p.x + 5, p.y - 19 + bob, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 11 + bob, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a86d6';
      ctx.beginPath(); ctx.arc(p.x + 13, p.y - 28 + bob, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x + 13, p.y - 34 + bob); ctx.lineTo(p.x + 10, p.y - 28 + bob); ctx.lineTo(p.x + 16, p.y - 28 + bob); ctx.closePath(); ctx.fill();
      text(ctx, '!!!', p.x, p.y - 44 + bob, 18, '#d64533', 'center');
    } else {
      ctx.fillStyle = '#33241a';
      ctx.beginPath(); ctx.arc(p.x + p.face * 5, p.y - 19 + bob, 2, 0, Math.PI * 2); ctx.fill();
    }
    // Knife swing while chopping: the blade arcs up and down with the chop.
    if (state.chopping) {
      const swing = Math.sin(performance.now() / 70) * 0.9 - 0.4;
      ctx.save();
      ctx.translate(p.x + p.face * 20, p.y - 2 + bob);
      ctx.rotate(swing * p.face);
      ctx.fillStyle = '#dfe6ea';
      ctx.fillRect(0, -3, 26, 6);
      ctx.fillStyle = '#33241a';
      ctx.fillRect(-8, -3, 8, 6);
      ctx.restore();
    }
    // Tray items above the chef.
    state.tray.forEach((key, i) => {
      const tx = p.x - (state.tray.length - 1) * 16 + i * 32;
      ctx.fillStyle = 'rgba(255,246,227,0.92)';
      ctx.beginPath(); ctx.arc(tx, p.y - 52 + bob, 15, 0, Math.PI * 2); ctx.fill();
      drawFood(ctx, key, tx, p.y - 52 + bob, 22);
    });
    // Nearest-station hint.
    const stn = world.nearestStation();
    if (stn) {
      const label = stationHint(stn, state);
      if (label) {
        ctx.font = 'bold 15px system-ui, sans-serif';
        const wdt = ctx.measureText(label).width + 18;
        ctx.fillStyle = 'rgba(51,36,26,0.88)';
        rr(ctx, p.x - wdt / 2, p.y + 34, wdt, 26, 8); ctx.fill();
        text(ctx, label, p.x, p.y + 47, 15, '#fff6e3', 'center');
      }
    }
  }

  function stationHint(stn, state) {
    if (stn.name.startsWith('crate:')) return `E: ambil ${INGREDIENTS[stn.ingredient].name}`;
    if (stn.name === 'chop') return 'Tahan E: iris';
    if (stn.name.startsWith('stove:')) {
      const pot = state.pots[stn.pot];
      if (pot.item && pot.done) return 'E: ambil masakan';
      if (!pot.item) return 'E: masak di kompor';
      return 'Sedang dimasak…';
    }
    if (stn.name === 'assembly') return 'E: racik / ambil piring';
    if (stn.name === 'pass') return state.passDish ? 'E: SAJIKAN!' : 'Pass kosong';
    if (stn.name === 'bin') return 'E: buang';
    return null;
  }

  // The kuntilanak: white dress, long black hair, floating above the
  // etalase. She only appears in MALAM, when the kitchen has gone quiet.
  function drawKuntilanak(state) {
    if (state.kuntilanak.status !== 'active') return;
    const r = STATIONS.pass;
    const x = r.x + r.w / 2;
    const bob = Math.sin(performance.now() / 500) * 8;
    const y = r.y - 34 + bob;
    ctx.save();
    ctx.globalAlpha = 0.92;
    // Ghostly glow.
    ctx.strokeStyle = 'rgba(190,190,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y + 42, 36, 60, 0, 0, Math.PI * 2); ctx.stroke();
    // Long black hair.
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath(); ctx.ellipse(x, y + 32, 26, 52, 0, 0, Math.PI * 2); ctx.fill();
    // White dress, floating — no feet.
    ctx.fillStyle = 'rgba(240,240,248,0.96)';
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 8);
    ctx.quadraticCurveTo(x - 30, y + 70, x - 14, y + 90);
    ctx.lineTo(x + 14, y + 90);
    ctx.quadraticCurveTo(x + 30, y + 70, x + 22, y + 8);
    ctx.closePath(); ctx.fill();
    // Pale face, hair falling over it, dark eyes.
    ctx.fillStyle = '#f4f0e8';
    ctx.beginPath(); ctx.ellipse(x, y, 15, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath(); ctx.ellipse(x, y - 7, 15, 10, 0, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 5, y + 1, 2.4, 0, Math.PI * 2); ctx.arc(x + 5, y + 1, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    text(ctx, 'KUNTILANAK', x, y - 26, 15, '#c9b8ff', 'center');
  }

  // Flying plate easter egg: a haunted plate crossing the screen. Click it.
  function drawFlyingPlate(state) {
    const fp = state.flyingPlate;
    if (!fp.active) return;
    const wob = Math.sin(fp.t * 6) * 8;
    ctx.save();
    ctx.translate(fp.x, fp.y + wob);
    ctx.rotate(Math.sin(fp.t * 3) * 0.2);
    ctx.fillStyle = 'rgba(242,178,52,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a35e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 10, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#6e3b1f';
    ctx.beginPath(); ctx.ellipse(0, -2, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    text(ctx, 'KLIK! +25', fp.x, fp.y + wob - 28, 15, '#f2b234', 'center');
  }

  function drawTransition(state) {
    if (state.transition <= 0) return;
    const stage = STAGES[state.stageIndex];
    ctx.fillStyle = 'rgba(20,12,6,0.74)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, stage.name, W / 2, 290, 76, '#f2b234', 'center');
    text(ctx, stage.subtitle, W / 2, 366, 32, '#fff6e3', 'center');
    text(ctx, `Target kumulatif: ${stage.target} koin  ·  ${stage.seconds} detik  ·  3 gagal = shift berakhir`, W / 2, 420, 20, '#ffd94d', 'center');
    text(ctx, `Koin sejauh ini: ${state.coins}`, W / 2, 462, 20, '#fff6e3', 'center');
    if (state.stageIndex === 2) {
      text(ctx, 'Malam hari… kalau dapur sepi, hati-hati siapa yang datang.', W / 2, 500, 18, '#c9b8ff', 'center');
    }
  }

  function drawHUD(state) {
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, W, 64);
    text(ctx, 'PADANG KILAT', 20, 34, 26, '#f2b234');
    text(ctx, 'rumah makan padang', 220, 38, 14, '#e8d3a8');
    // Stage.
    const stage = STAGES[state.stageIndex];
    text(ctx, `${stage.name} ${state.stageIndex + 1}/3`, 420, 26, 19, '#fff6e3');
    text(ctx, stage.subtitle, 420, 48, 13, '#c9b48a');
    // Coins.
    ctx.fillStyle = '#f2b234';
    ctx.beginPath(); ctx.arc(560, 32, 15, 0, Math.PI * 2); ctx.fill();
    text(ctx, '¢', 560, 33, 18, '#33241a', 'center');
    text(ctx, `${state.coins}`, 582, 34, 30, '#fff6e3');
    text(ctx, `/ ${TARGET_COINS}`, 640, 38, 16, '#c9b48a');
    // Stage timer.
    const left = Math.max(0, stage.seconds - state.stageElapsed);
    const mm = Math.floor(left / 60);
    const ss = Math.floor(left % 60).toString().padStart(2, '0');
    const rush = state.rush;
    text(ctx, `${mm}:${ss}`, 760, 34, 30, rush ? '#ff6b57' : '#fff6e3');
    if (rush) text(ctx, 'RUSH!', 850, 34, 18, '#ff6b57');
    // Combo + fails + badges.
    const badge = state.badges.length > 0 ? `  ·  ${state.badges.join(' ')}` : '';
    text(ctx, state.streak >= 2 ? `KOMBO x${(1 + 0.15 * Math.min(state.streak, 6)).toFixed(1)} · ${state.streak} beruntun${badge}` : `Sajikan beruntun = bonus${badge}`, 980, 26, 15, '#ffd94d');
    text(ctx, `Gagal: ${'✗'.repeat(state.fails)}${'·'.repeat(Math.max(0, 3 - state.fails))}  (3 = shift berakhir)`, 980, 48, 15, state.fails > 0 ? '#ff8a75' : '#bfe3d8');
  }

  function drawBoard(state) {
    ctx.fillStyle = '#e8d3a8';
    ctx.fillRect(0, 64, W, 104);
    text(ctx, 'PESANAN', 20, 84, 15, '#8a6a2f');
    if (state.tickets.length === 0) {
      text(ctx, 'Belum ada pesanan — ambil napas…', 120, 120, 18, '#8a6a2f');
    }
    state.tickets.forEach((t, i) => drawTicket(ctx, t, 110 + i * 300, 74, 284, 88));
  }

  function drawFloats(state) {
    for (const f of state.floats) {
      ctx.globalAlpha = Math.min(1, f.life);
      text(ctx, f.text, f.x, f.y, 20, f.color, 'center');
      ctx.globalAlpha = 1;
    }
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(20,12,6,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,246,227,0.96)';
    rr(ctx, W / 2 - 330, H / 2 - 170, 660, 340, 18); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = accent; ctx.stroke();
    text(ctx, title, W / 2, H / 2 - 118, 40, PALETTE.ink, 'center');
    lines.forEach((ln, i) => text(ctx, ln, W / 2, H / 2 - 58 + i * 36, 19, PALETTE.ink, 'center'));
  }

  // Horror overlay, drawn over the whole room (after the shake transform):
  // the room dims, fog drifts in low, and a dark vignette closes in from
  // the edges. Visible in a screenshot, not only in sound.
  function drawHorror(state) {
    const h = state.horror || 0;
    if (h <= 0.01) return;
    ctx.fillStyle = `rgba(8,4,12,${(0.28 * h).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(200,200,215,${(0.10 * h).toFixed(3)})`;
    const fx = ((state.elapsed * 12) % 1400) - 60;
    ctx.beginPath(); ctx.ellipse(fx, 640, 420, 70, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1280 - fx, 600, 380, 60, 0, 0, Math.PI * 2); ctx.fill();
    const vg = ctx.createRadialGradient(640, 360, 240, 640, 360, 760);
    vg.addColorStop(0, 'rgba(5,2,8,0)');
    vg.addColorStop(1, `rgba(5,2,8,${(0.62 * h).toFixed(3)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function draw(state, world, screen, best) {
    ctx.clearRect(0, 0, W, H);
    // Screen shake: a failed ticket (and an angry kuntilanak) rattles the
    // room. While she is here the floor also sways slowly, side to side.
    ctx.save();
    if (state.shake > 0) {
      const m = state.shake * 10;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    if ((state.horror || 0) > 0) ctx.translate(Math.sin(state.elapsed * 1.5) * 4 * state.horror, 0);
    drawFloor(state);
    drawCrates(state);
    drawChop(state);
    drawStove(state);
    drawAssembly(state);
    drawPass(state);
    drawBin();
    drawKuntilanak(state);
    drawFlyingPlate(state);
    drawChef(state, world);
    drawParticles(state);
    drawCustomerWindow(state);
    drawQueue(state);
    drawBoard(state);
    drawHUD(state);
    drawFloats(state);
    ctx.restore();
    drawHorror(state);
    drawTransition(state);

    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(20,12,6,0.45)';
      ctx.fillRect(0, 0, W, H);
      text(ctx, 'PADANG KILAT', W / 2, 180, 64, '#f2b234', 'center');
      text(ctx, 'Rumah makan padang — hidangkan rendang, sate & gulai sebelum pelanggan kabur!', W / 2, 238, 22, '#fff6e3', 'center');
      text(ctx, 'WASD / panah: gerak   ·   E: ambil, masak, racik, sajikan   ·   tahan E: iris di talenan', W / 2, 290, 18, '#fff6e3', 'center');
      text(ctx, 'Klik stasiun juga bisa — koki jalan sendiri ke sana.   ·   M: bisu   ·   P: jeda', W / 2, 320, 18, '#fff6e3', 'center');
      text(ctx, '3 shift: PAGI 120 dtk (pelan)  ·  SIANG 150 dtk (rush)  ·  MALAM 180 dtk (paling cepat)', W / 2, 362, 18, '#ffd94d', 'center');
      text(ctx, 'Kumpulkan 100 koin sampai akhir MALAM. 3 gagal dalam satu shift = shift itu berakhir.', W / 2, 392, 18, '#ffd94d', 'center');
      text(ctx, 'Malam hari, kalau dapur sepi… hati-hati siapa yang datang. Ada menu rahasia juga.', W / 2, 422, 18, '#c9b8ff', 'center');
      const pulse = 0.7 + Math.sin(performance.now() / 300) * 0.3;
      ctx.globalAlpha = pulse;
      text(ctx, 'Tekan SPASI atau KLIK untuk mulai', W / 2, 480, 26, '#fff6e3', 'center');
      ctx.globalAlpha = 1;
      if (best > 0) text(ctx, `Koin terbaik: ${best}`, W / 2, 526, 18, '#ffd94d', 'center');
      text(ctx, '12 bahan, 8 menu + 1 rahasia — Rendang, Indomie Rendang, Sate Padang, dan lainnya', W / 2, 566, 16, '#e8d3a8', 'center');
    } else if (screen === SCREEN_PAUSED) {
      overlay('JEDA', ['Shift dijeda — tarik napas sebentar.', 'Tekan P atau Spasi untuk lanjut.'], '#1f7a6d');
    } else if (screen === SCREEN_OVER) {
      const win = state.won;
      const badgeLine = state.badges.length > 0 ? `Lencana: ${state.badges.join(', ')}  ·  ` : '';
      overlay(
        win ? 'MENANG! WARUNG TUTUP DENGAN SENYUM' : 'WARUNG TUTUP',
        win
          ? [`Koin: ${state.coins} / ${TARGET_COINS} — target tercapai!`, `${badgeLine}Hidangan disajikan: ${state.served}  ·  Gagal: ${state.failed}`, 'Tekan R atau klik untuk shift berikutnya.']
          : [`Malam berakhir — koin ${state.coins} / ${TARGET_COINS}, target belum tercapai.`, `${badgeLine}Hidangan disajikan: ${state.served}  ·  Gagal: ${state.failed}`, 'Tekan R atau klik untuk coba lagi.'],
        win ? '#3f9e4d' : '#d64533',
      );
    }
  }

  return { draw, drawFood };
}
