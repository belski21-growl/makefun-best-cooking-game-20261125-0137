// Padang Kilat — render.js
// Everything the eye sees, drawn from world state on a 1280x720 canvas.
// Pure drawing: no game rules here (those live in world.js), so a screenshot
// is just drawGame on a staged world. Text that matters stays big enough to
// read at 768x432, and nothing important is ever clipped by the frame edge.
import {
  W, H, HUD_H, BOARD_H, WALL_H, ING_BY_ID, RECIPES, RECIPE_BY_ID, MOODS,
  STAGES, STATIONS, crateRect, TABLES, SEATS, DOOR, PALETTE, INGREDIENTS,
  CONDIMENT, KUNTI,
} from './config.js';

// ---------------------------------------------------------------- helpers
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(ctx, s, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}
function shortLabel(name) {
  // Ticket chips must never overflow: long names keep their first word.
  return name.length > 9 ? name.split(' ')[0] : name;
}
// A gonjong (rumah gadang roof): layered horns sweeping up at both ends.
function drawGonjong(ctx, x, y, w, h, color = '#2b1d12') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.55);
  ctx.quadraticCurveTo(x + w * 0.14, y - h * 0.55, x + w * 0.3, y + h * 0.28);
  ctx.quadraticCurveTo(x + w * 0.5, y - h * 0.1, x + w * 0.7, y + h * 0.28);
  ctx.quadraticCurveTo(x + w * 0.86, y - h * 0.55, x + w, y + h * 0.55);
  ctx.quadraticCurveTo(x + w * 0.7, y + h * 0.95, x + w * 0.5, y + h * 0.7);
  ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.95, x, y + h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(232,177,60,0.85)';
  ctx.fillRect(x + w * 0.3, y + h * 0.62, w * 0.4, 3);
}
// One ingredient as a small readable glyph: a coloured disc + a shape.
function drawIngredient(ctx, id, x, y, r) {
  const g = ING_BY_ID[id];
  ctx.fillStyle = g.color;
  ctx.strokeStyle = g.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = g.dark;
  if (id === 'nasi' || id === 'telur') {
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.2, r * 0.55, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'cabai') {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.2, r * 0.45, Math.PI, 0);
    ctx.fill();
  } else if (id === 'daunUbi' || id === 'sambalIjo') {
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.5, r * 0.28, -0.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'ketupat') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-r * 0.4, -r * 0.4, r * 0.8, r * 0.8);
    ctx.restore();
  } else if (id === 'indomie') {
    ctx.strokeStyle = g.dark;
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y + i * r * 0.35);
      ctx.quadraticCurveTo(x, y + i * r * 0.35 - r * 0.3, x + r * 0.6, y + i * r * 0.35);
      ctx.stroke();
    }
  } else if (g.cold) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(x - r * 0.45, y - r * 0.5, r * 0.9, r * 0.5);
  } else {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
// A face: skin circle, eyes, a mouth that follows the mood. Hijab optional.
function drawFace(ctx, x, y, r, mood, hijab = false, scared = false) {
  if (hijab) {
    ctx.fillStyle = '#a31621';
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a5a2e';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const angry = mood === 'MARAH' || mood === 'LAPAR';
  const tired = mood === 'LESU' || mood === 'TIDAK SELERA';
  ctx.fillStyle = '#2b1d12';
  if (scared) {
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.16, 0, Math.PI * 2);
    ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y + r * 0.35, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (tired) {
    ctx.fillRect(x - r * 0.55, y - r * 0.15, r * 0.4, 2);
    ctx.fillRect(x + r * 0.15, y - r * 0.15, r * 0.4, 2);
  } else {
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.11, 0, Math.PI * 2);
    ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }
  if (angry) {
    ctx.strokeStyle = '#2b1d12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y - r * 0.45);
    ctx.lineTo(x - r * 0.15, y - r * 0.25);
    ctx.moveTo(x + r * 0.55, y - r * 0.45);
    ctx.lineTo(x + r * 0.15, y - r * 0.25);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2b1d12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (mood === 'PUAS' || mood === 'KENYANG' || mood === 'HAUS') {
    ctx.arc(x, y + r * 0.15, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
  } else if (angry) {
    ctx.arc(x, y + r * 0.6, r * 0.4, 1.15 * Math.PI, 1.85 * Math.PI);
  } else {
    ctx.moveTo(x - r * 0.3, y + r * 0.35);
    ctx.lineTo(x + r * 0.3, y + r * 0.35);
  }
  ctx.stroke();
}
// A white plate with shaded rim, carrying ingredient glyphs.
function drawPlate(ctx, x, y, r, items) {
  ctx.fillStyle = '#fffdf4';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a35e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(201,163,94,0.35)';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  if (items && items.length > 0) {
    const n = items.length;
    items.forEach((it, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      drawIngredient(ctx, it.ing, x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.3);
    });
  }
}
// ---------------------------------------------------------------- floor + wall
function drawFloor(ctx, world) {
  // Warm tiles in perspective rows + marawa diamonds (red/gold on cream).
  for (let row = 0; row < 9; row++) {
    const y0 = WALL_H + row * 62;
    const y1 = y0 + 62;
    for (let col = 0; col < 8; col++) {
      const x0 = col * 160;
      ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x0, y0, 160, 62);
      // A marawa diamond in every other tile.
      if ((row + col) % 2 === 0) {
        const cx = x0 + 80;
        const cy = y0 + 31;
        ctx.fillStyle = row % 2 === 0 ? 'rgba(163,22,33,0.35)' : 'rgba(232,177,60,0.4)';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 16);
        ctx.lineTo(cx + 16, cy);
        ctx.lineTo(cx, cy + 16);
        ctx.lineTo(cx - 16, cy);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(90,60,20,0.25)';
    ctx.fillRect(0, y1 - 1, W, 1);
  }
}
function drawWall(ctx, world) {
  // The wall above the floor: warm plaster, then the songket band.
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, W, WALL_H);
  // Songket band: marawa red with a gold diamond run.
  ctx.fillStyle = PALETTE.songket;
  ctx.fillRect(0, 168, W, 22);
  ctx.fillStyle = PALETTE.songketGold;
  for (let x = 20; x < W; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, 179);
    ctx.lineTo(x + 8, 172);
    ctx.lineTo(x + 16, 179);
    ctx.lineTo(x + 8, 186);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.songket;
  ctx.fillRect(0, 164, W, 4);
  // Gonjong silhouettes: one BIG one on the right of the ticket board, two
  // smaller ones flanking the band, all dark against the wall.
  drawGonjong(ctx, 872, 96, 210, 62);
  drawGonjong(ctx, 60, 138, 120, 34);
  drawGonjong(ctx, 1140, 138, 110, 30);
  // A round wall clock with roman numerals.
  const cx = 1120;
  const cy = 118;
  ctx.fillStyle = '#fffdf4';
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b1d12';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'XII', cx, cy - 12, 9, '#2b1d12', 'center');
  text(ctx, 'VI', cx, cy + 16, 9, '#2b1d12', 'center');
  const ang = (world.time % 60) / 60 * Math.PI * 2;
  ctx.strokeStyle = '#2b1d12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ang - Math.PI / 2) * 16, cy + Math.sin(ang - Math.PI / 2) * 16);
  ctx.stroke();
  // A ceiling fan, slowly turning.
  const fx = 1200;
  const fy = 118;
  const fa = world.time * 1.5;
  ctx.strokeStyle = '#5f3a1a';
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    const a = fa + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(a) * 26, fy + Math.sin(a) * 26);
    ctx.stroke();
  }
  ctx.fillStyle = '#5f3a1a';
  ctx.beginPath();
  ctx.arc(fx, fy, 6, 0, Math.PI * 2);
  ctx.fill();
  // The wall menu: all eight recipes + prices, on a dark board. It hangs
  // on the wall below the crates row, clear of the board and stoves.
  const mx = 236;
  const my = 280;
  ctx.fillStyle = 'rgba(43,29,18,0.92)';
  rr(ctx, mx, my, 320, 92, 8);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'MENU · PADANG KILAT', mx + 160, my + 20, 15, PALETTE.gold, 'center');
  RECIPES.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = mx + 12 + col * 160;
    const y = my + 40 + row * 14;
    text(ctx, r.name, x, y, 11, '#fff6e3', 'left', 'normal');
    text(ctx, String(r.coins), x + 132, y, 11, PALETTE.gold, 'right');
  });
  // Three warm hanging lamps over the corridor, below the crates row and
  // clear of the board and stoves.
  for (const lx of [300, 500, 1150]) {
    ctx.strokeStyle = '#5f3a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, 264);
    ctx.lineTo(lx, 280);
    ctx.stroke();
    ctx.fillStyle = '#e8b13c';
    ctx.beginPath();
    ctx.moveTo(lx - 14, 280);
    ctx.lineTo(lx + 14, 280);
    ctx.lineTo(lx + 8, 294);
    ctx.lineTo(lx - 8, 294);
    ctx.closePath();
    ctx.fill();
    const glow = ctx.createRadialGradient(lx, 310, 4, lx, 310, 90);
    glow.addColorStop(0, 'rgba(242,178,52,0.20)');
    glow.addColorStop(1, 'rgba(242,178,52,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, 310, 90, 0, Math.PI * 2);
    ctx.fill();
  }
}
// ---------------------------------------------------------------- HUD
function drawHUD(ctx, world) {
  ctx.fillStyle = '#241407';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(0, HUD_H - 3, W, 3);
  text(ctx, 'PADANG KILAT', 16, 42, 28, PALETTE.gold, 'left');
  text(ctx, 'rumah makan padang', 232, 42, 15, '#d8c49a', 'left', 'normal');
  const stage = STAGES[world.stageIndex];
  text(ctx, `${stage.name} ${world.stageIndex + 1}/3`, 470, 30, 20, '#fff6e3', 'left');
  text(ctx, stage.subtitle, 470, 52, 13, '#d8c49a', 'left', 'normal');
  // Coins, big.
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(700, 32, 17, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '¢', 700, 39, 20, '#241407', 'center');
  text(ctx, String(world.coins), 724, 42, 36, '#fff6e3', 'left');
  text(ctx, `/ ${stage.target}`, 800, 42, 20, '#d8c49a', 'left', 'normal');
  // Clock, big.
  const t = Math.max(0, Math.ceil(world.stageTimeLeft));
  const mm = Math.floor(t / 60);
  const ss = String(t % 60).padStart(2, '0');
  text(ctx, `${mm}:${ss}`, 920, 42, 36, world.stageTimeLeft < 30 ? '#ff6b5e' : '#fff6e3', 'left');
  // Combo + fails. Kept short: the condiment button starts at x=1150, so
  // a long line runs under it. Fails as a number, not dots (dots read as
  // an ellipsis, not a count).
  const mult = Math.min(2, 1 + 0.15 * world.streak).toFixed(2).replace(/0$/, '');
  text(ctx, `x${mult} (${world.streak}x)`, 1030, 30, 16, '#ffd94d', 'left');
  text(ctx, `Gagal: ${world.fails}/3`, 1030, 52, 14, '#ff9a8a', 'left', 'normal');
  // Condiment button, top-right.
  const bx = 1150;
  const by = 10;
  ctx.fillStyle = world.condiment.unlocked ? '#1f6f6b' : '#e8b13c';
  rr(ctx, bx, by, 116, 44, 8);
  ctx.fill();
  ctx.strokeStyle = '#fff6e3';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (world.condiment.unlocked) {
    text(ctx, 'KERUPUK', bx + 58, by + 19, 13, '#fff6e3', 'center');
    text(ctx, 'BUKA ✓', bx + 58, by + 36, 13, '#fff6e3', 'center');
  } else {
    text(ctx, 'Buka Kerupuk', bx + 58, by + 19, 13, '#241407', 'center');
    text(ctx, '30 koin · B', bx + 58, by + 36, 13, '#241407', 'center');
  }
}
// ---------------------------------------------------------------- tickets
function drawTicket(ctx, t, x, y, w) {
  const angry = t.patience / t.patienceMax < 0.25;
  ctx.fillStyle = '#fff6e3';
  rr(ctx, x, y, w, 88, 10);
  ctx.fill();
  ctx.strokeStyle = angry ? '#c22e2e' : '#c9a35e';
  ctx.lineWidth = angry ? 3 : 2;
  ctx.stroke();
  // Dish icon on a shaded plate.
  drawPlate(ctx, x + 34, y + 36, 26, t.needs);
  text(ctx, t.name, x + 68, y + 26, 19, '#2b1d12', 'left');
  text(ctx, `+${t.coins} koin`, x + 68, y + 48, 14, '#8a5a2e', 'left', 'normal');
  if (t.secret) text(ctx, 'RAHASIA', x + w - 12, y + 22, 12, '#a31621', 'right');
  if (t.mood && t.mood !== 'normal') {
    const m = MOODS[t.mood];
    ctx.fillStyle = m.color;
    rr(ctx, x + w - 92, y + 30, 80, 20, 10);
    ctx.fill();
    text(ctx, m.label, x + w - 52, y + 44, 12, '#fff6e3', 'center');
  }
  // Needs chips.
  let cx = x + 68;
  for (const n of t.needs) {
    const label = shortLabel(ING_BY_ID[n.ing].name);
    const cw = 12 + label.length * 7;
    ctx.fillStyle = '#efe3c2';
    rr(ctx, cx, y + 56, cw, 18, 9);
    ctx.fill();
    text(ctx, label, cx + cw / 2, y + 69, 11, '#5f3a1a', 'center', 'normal');
    cx += cw + 5;
  }
  // Patience bar.
  const frac = Math.max(0, t.patience / t.patienceMax);
  ctx.fillStyle = '#e0d3b0';
  rr(ctx, x + 12, y + 80, w - 24, 6, 3);
  ctx.fill();
  ctx.fillStyle = frac < 0.25 ? '#c22e2e' : frac < 0.5 ? '#e8b13c' : '#5da24a';
  if (frac > 0) {
    rr(ctx, x + 12, y + 80, (w - 24) * frac, 6, 3);
    ctx.fill();
  }
  // Mood face, top-right of the plate.
  drawFace(ctx, x + 34, y + 8, 11, t.mood === 'normal' ? 'PUAS' : t.mood, t.hijab, false);
}
function drawTickets(ctx, world) {
  const cards = world.tickets.slice(0, 3);
  cards.forEach((t, i) => drawTicket(ctx, t, 16 + i * 280, 72, 264));
  // Her ticket: blood-red on black, always on top when she is here.
  const k = world.kuntilanak;
  if (k.status === 'active') {
    const x = 856;
    const y = 72;
    ctx.fillStyle = '#1a0505';
    rr(ctx, x, y, 264, 88, 10);
    ctx.fill();
    ctx.strokeStyle = '#ff2e2e';
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, 'Sate Padang ×3', x + 16, y + 30, 20, '#ff8a7a', 'left');
    text(ctx, `Sate: ${k.served}/3 · puas +40`, x + 16, y + 54, 14, '#ffb3a7', 'left', 'normal');
    const frac = Math.max(0, k.timer / KUNTI.time);
    ctx.fillStyle = '#4a0d0d';
    rr(ctx, x + 12, y + 66, 240, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#ff2e2e';
    rr(ctx, x + 12, y + 66, 240 * frac, 8, 4);
    ctx.fill();
    text(ctx, `KUNTILANAK ${Math.ceil(k.timer)} dtk`, x + 16, y + 84, 12, '#c9b8ff', 'left');
  }
}

// ---------------------------------------------------------------- stations
function plateKey(items) {
  return items.map((i) => `${i.ing}:${i.state}`).sort().join('|');
}
function stationHint(world) {
  const c = world.chef;
  const near = (r, d = 52) => {
    const dx = Math.max(r.x - c.x, 0, c.x - (r.x + r.w));
    const dy = Math.max(r.y - c.y, 0, c.y - (r.y + r.h));
    return Math.hypot(dx, dy) < d;
  };
  if (near(STATIONS.crates, 48)) return 'E: ambil bahan';
  if (near(STATIONS.board)) {
    if (world.board.item) return 'Tahan E: iris';
    if (c.holding) return 'E: taruh di talenan';
    return 'Talenan';
  }
  if (near(STATIONS.stove1) || near(STATIONS.stove2)) return 'E: masak / ambil';
  if (near(STATIONS.assembly)) {
    if (c.holding) return 'E: racik ke piring';
    if (world.assembly.plate.items.length > 0) return 'E: ambil piring';
    return 'Meja Racik';
  }
  if (near(STATIONS.pass)) {
    if (c.tray.length > 0) return 'E: SAJIKAN!';
    return 'Etalase kosong';
  }
  if (near(STATIONS.bin)) return 'E: buang';
  return null;
}
function drawStations(ctx, world) {
  // ---- crates: twelve ingredients in a 3x4 grid
  const cr = STATIONS.crates;
  ctx.fillStyle = PALETTE.wood;
  rr(ctx, cr.x - 4, cr.y - 4, cr.w + 8, cr.h + 8, 8);
  ctx.fill();
  INGREDIENTS.forEach((g, i) => {
    const r = crateRect(i);
    ctx.fillStyle = '#e8dcc0';
    rr(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.fill();
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawIngredient(ctx, g.id, r.x + r.w / 2, r.y + r.h / 2 - 10, 15);
    text(ctx, g.name, r.x + r.w / 2, r.y + r.h - 8, 10, '#2b1d12', 'center', 'normal');
  });
  text(ctx, 'BAHAN', cr.x + cr.w / 2, cr.y + cr.h + 16, 12, '#5f3a1a', 'center');
  // ---- chopping board
  const b = STATIONS.board;
  ctx.fillStyle = '#c89a5e';
  rr(ctx, b.x, b.y, b.w, b.h, 8);
  ctx.fill();
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (world.board.item) {
    drawIngredient(ctx, world.board.item.ing, b.x + 40, b.y + 30, 16);
    const g = ING_BY_ID[world.board.item.ing];
    const frac = Math.min(1, world.board.progress / (g.chop || 2));
    ctx.fillStyle = '#fff6e3';
    rr(ctx, b.x + 70, b.y + 24, 84, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#e8b13c';
    rr(ctx, b.x + 70, b.y + 24, 84 * frac, 12, 6);
    ctx.fill();
    ctx.strokeStyle = '#fff6e3';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, 'iris...', b.x + 112, b.y + 52, 11, '#5f3a1a', 'center', 'normal');
  } else {
    text(ctx, 'TALENAN · tahan E untuk iris', b.x + b.w / 2, b.y + 30, 12, '#5f3a1a', 'center');
  }
  text(ctx, 'TALENAN', b.x + b.w / 2, b.y + b.h + 16, 12, '#5f3a1a', 'center');
  // ---- stoves
  [STATIONS.stove1, STATIONS.stove2].forEach((s, i) => {
    const stove = world.stoves[i];
    ctx.fillStyle = '#3a3a3a';
    rr(ctx, s.x, s.y, s.w, s.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Pot.
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + 34, 42, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e2e2e';
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + 30, 34, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    if (stove.item) {
      const g = ING_BY_ID[stove.item.ing];
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.ellipse(s.x + s.w / 2, s.y + 30, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Steam.
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      const wob = Math.sin(world.time * 3 + i * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(s.x + s.w / 2 + wob, s.y + 18);
      ctx.quadraticCurveTo(s.x + s.w / 2 - wob, s.y + 4, s.x + s.w / 2 + wob, s.y - 8);
      ctx.stroke();
      const frac = Math.min(1, stove.progress / (g.cook || 4));
      ctx.fillStyle = '#fff6e3';
      rr(ctx, s.x + 12, s.y + s.h - 18, s.w - 24, 10, 5);
      ctx.fill();
      ctx.fillStyle = stove.item.state === 'cooked' ? '#5da24a' : '#e8b13c';
      rr(ctx, s.x + 12, s.y + s.h - 18, (s.w - 24) * frac, 10, 5);
      ctx.fill();
      ctx.strokeStyle = '#fff6e3';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (stove.item.state === 'cooked') text(ctx, 'MATANG! E: ambil', s.x + s.w / 2, s.y - 6, 12, '#5da24a', 'center');
    }
    text(ctx, s.label, s.x + s.w / 2, s.y + s.h + 16, 12, '#5f3a1a', 'center');
  });
  // ---- assembly counter: the one plate being built
  const a = STATIONS.assembly;
  ctx.fillStyle = '#1f6f6b';
  rr(ctx, a.x, a.y, a.w, a.h, 10);
  ctx.fill();
  ctx.strokeStyle = '#155e5a';
  ctx.lineWidth = 2;
  ctx.stroke();
  const plate = world.assembly.plate;
  const ready = plate.items.length > 0 && (
    world.tickets.some((t) => plateKey(plate.items) === plateKey(t.needs)) ||
    (world.kuntilanak.status === 'active' && plateKey(plate.items) === plateKey(RECIPE_BY_ID['sate-padang'].needs))
  );
  if (ready) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    rr(ctx, a.x - 4, a.y - 4, a.w + 8, a.h + 8, 12);
    ctx.stroke();
  }
  drawPlate(ctx, a.x + 46, a.y + a.h / 2, 24, plate.items);
  text(ctx, `${plate.items.length}/3 bahan di piring`, a.x + 84, a.y + 28, 14, '#fff6e3', 'left');
  text(ctx, ready ? 'SIAP — E: ambil piring' : 'Lihat tiket di atas', a.x + 84, a.y + 48, 12, '#cfe8e4', 'left', 'normal');
  text(ctx, 'MEJA RACIK · E: taruh bahan', a.x + a.w / 2, a.y + a.h + 16, 12, '#5f3a1a', 'center');
  // ---- etalase: the glass case where dishes are served
  const p = STATIONS.pass;
  ctx.fillStyle = '#8a5a2e';
  rr(ctx, p.x - 4, p.y - 4, p.w + 8, p.h + 8, 8);
  ctx.fill();
  ctx.fillStyle = '#fdf6e3';
  rr(ctx, p.x, p.y, p.w, p.h, 6);
  ctx.fill();
  text(ctx, 'ETALASE · SAJI', p.x + p.w / 2, p.y + 18, 12, '#2b1d12', 'center');
  // Top rack: three stacks of white plates, labelled.
  const labels = ['SAYUR', 'AYAM', 'GULAI'];
  labels.forEach((lb, i) => {
    const px = p.x + 28 + i * 44;
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = '#fffdf4';
      ctx.beginPath();
      ctx.ellipse(px, p.y + 52 - s * 7, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9a35e';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    text(ctx, lb, px, p.y + 66, 8, '#5f3a1a', 'center', 'normal');
  });
  // Bottom rack: three clay bowls of soup.
  for (let i = 0; i < 3; i++) {
    const bx = p.x + 28 + i * 44;
    ctx.fillStyle = '#a8642e';
    ctx.beginPath();
    ctx.ellipse(bx, p.y + 96, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i === 0 ? '#5da24a' : i === 1 ? '#e8b25a' : '#b4552d';
    ctx.beginPath();
    ctx.ellipse(bx, p.y + 93, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The dish ready to serve (the first tray plate that matches an order).
  const trayReady = world.chef.tray.find((pl) => world.tickets.some((t) => plateKey(pl.items) === plateKey(t.needs)));
  if (trayReady) {
    const match = world.tickets.find((t) => plateKey(trayReady.items) === plateKey(t.needs));
    drawPlate(ctx, p.x + p.w / 2, p.y + 150, 26, trayReady.items);
    text(ctx, match.name, p.x + p.w / 2, p.y + 186, 13, '#2b1d12', 'center');
    text(ctx, 'SIAP DISAJIKAN — E', p.x + p.w / 2, p.y + 204, 12, '#1f6f6b', 'center');
  } else {
    text(ctx, 'Etalase siap', p.x + p.w / 2, p.y + 150, 13, '#8a8a8a', 'center', 'normal');
    text(ctx, 'antar hidangan ke sini', p.x + p.w / 2, p.y + 170, 11, '#8a8a8a', 'center', 'normal');
  }
  // Glass shine.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(p.x + 18, p.y + 8);
  ctx.lineTo(p.x + 48, p.y + 8);
  ctx.lineTo(p.x + 22, p.y + p.h - 8);
  ctx.lineTo(p.x + 6, p.y + p.h - 8);
  ctx.closePath();
  ctx.fill();
  // ---- bin
  const bn = STATIONS.bin;
  ctx.fillStyle = '#5a5a5a';
  rr(ctx, bn.x, bn.y, bn.w, bn.h, 8);
  ctx.fill();
  ctx.fillStyle = '#fff6e3';
  ctx.fillRect(bn.x + bn.w / 2 - 14, bn.y + 12, 28, 6);
  ctx.fillRect(bn.x + bn.w / 2 - 10, bn.y + 20, 20, 22);
  text(ctx, 'BUANG (E)', bn.x + bn.w / 2, bn.y + bn.h - 8, 11, '#fff6e3', 'center');
}
// ---------------------------------------------------------------- tables + people
function drawTables(ctx, world) {
  // The door, bottom-right, with the BUKA sign fully inside the frame.
  ctx.fillStyle = '#5f3a1a';
  rr(ctx, DOOR.x - 4, DOOR.y - 4, DOOR.w + 8, DOOR.h + 8, 8);
  ctx.fill();
  ctx.fillStyle = '#2b1d12';
  rr(ctx, DOOR.x, DOOR.y, DOOR.w, DOOR.h, 6);
  ctx.fill();
  ctx.fillStyle = '#e8b13c';
  ctx.beginPath();
  ctx.arc(DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'PINTU', DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h + 14, 11, '#5f3a1a', 'center');
  ctx.fillStyle = '#2e7d32';
  rr(ctx, 1096, 626, 52, 22, 11);
  ctx.fill();
  text(ctx, 'BUKA', 1122, 641, 12, '#fff6e3', 'center');
  // The three tables, each a different shape, each with hidang plates +
  // three little kerupuk bowls.
  for (const t of TABLES) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(t.x + t.w / 2, t.y + t.h + 4, t.w / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (t.shape === 'round') {
      ctx.fillStyle = '#8a5a2e';
      ctx.beginPath();
      ctx.ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2, t.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.shape === 'square') {
      ctx.fillStyle = '#fffdf4';
      rr(ctx, t.x, t.y, t.w, t.h, 6);
      ctx.fill();
      ctx.strokeStyle = '#c22e2e';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#a8642e';
      rr(ctx, t.x, t.y, t.w, t.h, 6);
      ctx.fill();
    }
    // Hidang: little plates in a row, Padang style.
    for (let i = 0; i < 5; i++) {
      const px = t.x + 18 + i * ((t.w - 36) / 4);
      ctx.fillStyle = '#fffdf4';
      ctx.beginPath();
      ctx.ellipse(px, t.y + 22, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9a35e';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Three kerupuk bowls.
    for (let i = 0; i < 3; i++) {
      const bx = t.x + 24 + i * 20;
      ctx.fillStyle = '#d9c98f';
      ctx.beginPath();
      ctx.arc(bx, t.y + t.h - 16, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b98a1e';
      ctx.beginPath();
      ctx.arc(bx, t.y + t.h - 16, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Ambient diners: five regulars, one in a hijab.
  for (const a of world.ambient) {
    drawFace(ctx, a.x, a.y, 15, a.mood, a.hijab);
    text(ctx, a.mood, a.x, a.y + 30, 10, '#5f3a1a', 'center', 'normal');
  }
  // Seated ticket customers: face mirrors the ticket's mood.
  for (const seat of world.seats) {
    if (seat.ticket) {
      const t = seat.ticket;
      const angry = t.patience / t.patienceMax < 0.25;
      drawFace(ctx, seat.x, seat.y, 17, angry ? 'MARAH' : t.mood, t.hijab);
      // Patience bar over the head.
      const frac = Math.max(0, t.patience / t.patienceMax);
      ctx.fillStyle = '#e0d3b0';
      rr(ctx, seat.x - 22, seat.y - 34, 44, 6, 3);
      ctx.fill();
      ctx.fillStyle = frac < 0.25 ? '#c22e2e' : '#5da24a';
      rr(ctx, seat.x - 22, seat.y - 34, 44 * frac, 6, 3);
      ctx.fill();
    } else if (seat.eatTimer > 0) {
      drawFace(ctx, seat.x, seat.y, 17, 'PUAS');
      drawPlate(ctx, seat.x + 26, seat.y + 6, 12, []);
    }
  }
  // The queue at the door, each with a visible wait timer.
  world.queue.forEach((t, i) => {
    const qx = 1108 + i * 44;
    const qy = 610;
    drawFace(ctx, qx, qy, 15, 'LESU', t.hijab);
    const frac = Math.max(0, t.queueTimer / 25);
    ctx.fillStyle = '#e0d3b0';
    rr(ctx, qx - 20, qy - 30, 40, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#e8b13c';
    rr(ctx, qx - 20, qy - 30, 40 * frac, 6, 3);
    ctx.fill();
    text(ctx, t.name.split(' ')[0], qx, qy + 30, 10, '#5f3a1a', 'center', 'normal');
  });
}
// ---------------------------------------------------------------- chef
function drawChef(ctx, world) {
  const c = world.chef;
  const jump = c.startle > 0 ? c.startle * 12 : 0;
  const x = c.x - (c.startle > 0 ? c.startle * 10 : 0);
  const y = c.y - jump;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 18, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: teal apron.
  ctx.fillStyle = '#1f6f6b';
  rr(ctx, x - 15, y - 6, 30, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#fff6e3';
  ctx.fillRect(x - 15, y + 2, 30, 4);
  // Head + tall chef hat.
  drawFace(ctx, x, y - 16, 14, c.scared > 0 ? 'MARAH' : 'PUAS', false, c.scared > 0);
  ctx.fillStyle = '#fffdf4';
  rr(ctx, x - 12, y - 38, 24, 14, 6);
  ctx.fill();
  ctx.fillStyle = '#e8e0cc';
  ctx.fillRect(x - 12, y - 28, 24, 4);
  // The held ingredient, above the hat.
  if (c.holding) drawIngredient(ctx, c.holding.ing, x, y - 50, 11);
  // The tray: finished plates stacked at the chef's side.
  c.tray.forEach((pl, i) => {
    drawPlate(ctx, x + 24, y + 8 - i * 10, 10, pl.items);
  });
  // The startle: a giant "!" in a white disc.
  if (c.startle > 0) {
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath();
    ctx.arc(x + 30, y - 52, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c22e2e';
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, '!', x + 30, y - 38, 30, '#c22e2e', 'center');
  }
  // Interaction hint, right under the chef.
  const hint = stationHint(world);
  if (hint) {
    const w = hint.length * 7 + 16;
    ctx.fillStyle = 'rgba(43,29,18,0.9)';
    rr(ctx, x - w / 2, y + 26, w, 20, 10);
    ctx.fill();
    text(ctx, hint, x, y + 40, 12, '#fff6e3', 'center');
  }
}
// ---------------------------------------------------------------- kuntilanak
function drawKuntilanak(ctx, world) {
  const k = world.kuntilanak;
  if (k.status !== 'active') return;
  const bob = Math.sin(world.time * 2) * 8;
  const x = 1194;
  const y = 252 + bob;
  // A pale glow around her.
  const glow = ctx.createRadialGradient(x, y + 30, 4, x, y + 30, 70);
  glow.addColorStop(0, 'rgba(190,190,255,0.35)');
  glow.addColorStop(1, 'rgba(190,190,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y + 30, 70, 0, Math.PI * 2);
  ctx.fill();
  // Long black hair, then the white dress, then the face.
  ctx.fillStyle = '#1a1a22';
  ctx.beginPath();
  ctx.ellipse(x, y + 26, 26, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(240,240,248,0.96)';
  ctx.beginPath();
  ctx.moveTo(x - 22, y + 8);
  ctx.quadraticCurveTo(x - 30, y + 66, x - 14, y + 88);
  ctx.lineTo(x + 14, y + 88);
  ctx.quadraticCurveTo(x + 30, y + 66, x + 22, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4f0e8';
  ctx.beginPath();
  ctx.ellipse(x, y, 14, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a22';
  ctx.beginPath();
  ctx.ellipse(x, y - 6, 14, 9, 0, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 5, y + 2, 2.4, 0, Math.PI * 2);
  ctx.arc(x + 5, y + 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'KUNTILANAK', x, y - 26, 14, '#c9b8ff', 'center');
}
// ---------------------------------------------------------------- fx
function drawFlyingPlate(ctx, world) {
  const fp = world.flyingPlate;
  if (!fp.active) return;
  const wob = Math.sin(fp.t * 6) * 8;
  ctx.fillStyle = 'rgba(242,178,52,0.35)';
  ctx.beginPath();
  ctx.ellipse(fp.x, fp.y + wob, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffdf4';
  ctx.beginPath();
  ctx.ellipse(fp.x, fp.y + wob, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a35e';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Gold text with a dark outline, so it reads on the cream floor.
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2b1d12';
  ctx.strokeText('KLIK! +25', fp.x, fp.y + wob - 28);
  ctx.fillStyle = '#f2b234';
  ctx.fillText('KLIK! +25', fp.x, fp.y + wob - 28);
}
function drawFx(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of world.floats) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2b1d12';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
// Horror: the room dims, a vignette closes in, thin fog drifts.
function drawHorror(ctx, world) {
  if (world.dim <= 0) return;
  ctx.fillStyle = `rgba(10,4,20,${0.42 * world.dim})`;
  ctx.fillRect(0, WALL_H, W, H - WALL_H);
  const flick = world.kuntilanak.status === 'active' ? 0.85 + Math.sin(world.time * 13) * 0.08 : 1;
  const vg = ctx.createRadialGradient(640, 430, 200, 640, 430, 720);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${0.55 * world.dim * flick})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, WALL_H, W, H - WALL_H);
  ctx.fillStyle = `rgba(200,200,230,${0.05 * world.dim})`;
  for (let i = 0; i < 3; i++) {
    const fx = ((world.time * 12 + i * 420) % 1400) - 60;
    ctx.beginPath();
    ctx.ellipse(fx, 420 + i * 70, 180, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
// ---------------------------------------------------------------- screens
function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(20,12,6,0.72)';
  ctx.fillRect(0, 0, W, H);
  drawGonjong(ctx, 440, 96, 400, 90, '#1a0f08');
  drawGonjong(ctx, 470, 116, 340, 70, '#2b1d12');
  text(ctx, 'PADANG KILAT', 640, 210, 84, PALETTE.gold, 'center');
  text(ctx, 'rumah makan padang — masak cepat, saji kilat', 640, 246, 20, '#fff6e3', 'center', 'normal');
  // The menu panel: eight dishes + prices + the secret.
  ctx.fillStyle = 'rgba(20,12,6,0.9)';
  rr(ctx, 360, 280, 560, 190, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'MENU — 8 HIDANGAN + 1 RAHASIA', 640, 310, 18, PALETTE.gold, 'center');
  RECIPES.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 390 + col * 280;
    const y = 336 + row * 22;
    text(ctx, r.name, x, y, 15, '#fff6e3', 'left', 'normal');
    text(ctx, `${r.coins} koin`, x + 240, y, 15, PALETTE.gold, 'right');
  });
  text(ctx, 'Nasi Kapau — rahasia, 25 koin, setelah 5 sajian beruntun', 640, 440, 14, '#c9b8ff', 'center', 'normal');
  text(ctx, 'PAGI 120 dtk  ·  SIANG 150 dtk  ·  MALAM 180 dtk  ·  target 100 koin', 640, 500, 16, '#fff6e3', 'center');
  text(ctx, 'WASD / panah gerak · E pakai stasiun · Space iris · B kerupuk · M bisu · P jeda', 640, 530, 14, '#d8c49a', 'center', 'normal');
  text(ctx, 'Malam hari… kalau dapur sepi, hati-hati siapa yang datang.', 640, 560, 15, '#c9b8ff', 'center', 'normal');
  const pulse = 0.6 + Math.sin(world.time * 3) * 0.4;
  ctx.globalAlpha = pulse;
  text(ctx, 'Tekan ENTER atau klik untuk mulai', 640, 620, 20, '#ffd94d', 'center');
  ctx.globalAlpha = 1;
}
function drawPause(ctx) {
  ctx.fillStyle = 'rgba(20,12,6,0.6)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'JEDA', 640, 340, 64, '#fff6e3', 'center');
  text(ctx, 'P untuk lanjut · M bisu', 640, 390, 18, '#d8c49a', 'center', 'normal');
}
function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(20,12,6,0.78)';
  ctx.fillRect(0, 0, W, H);
  const won = world.won;
  text(ctx, won ? 'MENANG!' : 'SELESAI', 640, 240, 72, won ? PALETTE.gold : '#ff6b5e', 'center');
  text(ctx, won ? '100 koin tercapai — rumah makan selamat!' : 'Target 100 koin tidak tercapai.', 640, 290, 20, '#fff6e3', 'center', 'normal');
  text(ctx, `Koin: ${world.coins}   ·   Disajikan: ${world.served}   ·   Gagal: ${world.stats.failed}`, 640, 340, 18, '#fff6e3', 'center', 'normal');
  if (world.badge) text(ctx, `Lencana: ${world.badge}`, 640, 380, 20, '#ffd94d', 'center');
  text(ctx, `Kerupuk: +${world.stats.condimentTakes * 2} koin   ·   Piring terbang: ${world.stats.flyingTaken}x`, 640, 420, 16, '#d8c49a', 'center', 'normal');
  text(ctx, 'Tekan R untuk main lagi', 640, 480, 18, '#ffd94d', 'center');
}
// ---------------------------------------------------------------- entry
export function drawGame(ctx, world, screen) {
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake * 8;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawFloor(ctx, world);
  drawWall(ctx, world);
  drawStations(ctx, world);
  drawTables(ctx, world);
  drawChef(ctx, world);
  drawKuntilanak(ctx, world);
  drawFlyingPlate(ctx, world);
  drawFx(ctx, world);
  drawHorror(ctx, world);
  drawTickets(ctx, world);
  drawHUD(ctx, world);
  ctx.restore();
  if (screen === 'title') drawTitle(ctx, world);
  else if (screen === 'pause') drawPause(ctx);
  else if (screen === 'over') drawOver(ctx, world);
}
