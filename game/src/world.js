// Padang Kilat — world.js
// The whole game state and its rules. No drawing, no sound, no DOM: given a
// world, a dt and an input, updateWorld steps the simulation one frame. That
// makes it testable headlessly — a sim can drive it with fixed steps and no
// browser at all, and the same code runs the game a human plays.
//
// A plate is built at the assembly counter from prepared ingredients. It
// matches a ticket only when its contents equal the ticket's needs exactly,
// so a wrong item simply bounces back to the hand instead of ruining a
// plate. The chef carries one ingredient in hand and up to three finished
// plates on the tray.
//
// State shape (everything render.js reads lives here, plain data):
//   phase 'play' | 'over'; stageIndex 0..2; coins; fails (this stage)
//   chef { x, y, dir, holding, tray[], target, scared, startle }
//   board { item, progress } — the chopping board
//   stoves [{ item, progress }, { item, progress }]
//   assembly { plate { items[] } } — the one plate being built
//   tickets[] — open orders; queue[] — customers waiting at the door
//   seats[] — the three chairs, each holding a ticket or an eating customer
//   kuntilanak { status, timer, served } — the MALAM mystery
//   flyingPlate, condiment, floats[], particles[], shake, stats

import {
  W, H, WALL_H, TRAY_MAX, CHEF_SPEED, CHEF_R, WIN_COINS, FAILS_PER_STAGE,
  QUEUE_WAIT, EAT_TIME, INGREDIENTS, ING_BY_ID, DRINKS, RECIPES,
  SECRET_RECIPE, RECIPE_BY_ID, MOODS, MOOD_TABLE, STAGES, STATIONS,
  crateRect, TABLES, SEATS, DOOR, CHEF_START, KUNTI, FLYING_PLATE_COINS,
  KAPAU_STREAK, CONDIMENT, KILAT_TIP, WALKOUT_COST, COMBO_STEP,
} from './config.js';

// ---------------------------------------------------------------- tiny utils
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
// A small seeded PRNG (mulberry32): the same seed always deals the same
// tickets, so a sim can replay a run exactly.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickWeighted(rng, table) {
  let r = rng();
  for (const [v, w] of table) {
    if (r < w) return v;
    r -= w;
  }
  return table[table.length - 1][0];
}
// Distance from a point to a rect (0 when inside).
function distToRect(x, y, r) {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}
// Push a circle out of a rect; returns true when a push happened.
function pushOutCircleRect(p, r, rad) {
  const cx = clamp(p.x, r.x, r.x + r.w);
  const cy = clamp(p.y, r.y, r.y + r.h);
  const dx = p.x - cx;
  const dy = p.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rad * rad) return false;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    p.x = cx + (dx / d) * rad;
    p.y = cy + (dy / d) * rad;
  } else {
    // Dead centre: push out through the nearest edge.
    const left = p.x - r.x;
    const right = r.x + r.w - p.x;
    const top = p.y - r.y;
    const bottom = r.y + r.h - p.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) p.x = r.x - rad;
    else if (m === right) p.x = r.x + r.w + rad;
    else if (m === top) p.y = r.y - rad;
    else p.y = r.y + r.h + rad;
  }
  return true;
}
// The obstacles the chef cannot walk through: every station and table.
function obstacles() {
  return [
    STATIONS.crates, STATIONS.board, STATIONS.stove1, STATIONS.stove2,
    STATIONS.assembly, STATIONS.pass, STATIONS.bin, ...TABLES,
  ];
}

// ---------------------------------------------------------------- plates
// A plate is { items: [{ ing, state }] }. Two item lists match when they
// hold the same ingredient+state pairs, order ignored.
function itemsKey(items) {
  return items.map((i) => `${i.ing}:${i.state}`).sort().join('|');
}
function plateMatchesTicket(plate, ticket) {
  return itemsKey(plate.items) === itemsKey(ticket.needs);
}
function plateIsSubsetOf(plate, needs) {
  const have = plate.items.map((i) => `${i.ing}:${i.state}`);
  const want = needs.map((n) => `${n.ing}:${n.state}`);
  const copy = [...want];
  for (const h of have) {
    const at = copy.indexOf(h);
    if (at < 0) return false;
    copy.splice(at, 1);
  }
  return true;
}
// What a ticket still needs that the plate does not yet hold, in recipe order.
// Deliberately plate-only: the pipeline (hand, board, stoves) is handled by
// its own branches (3a2/3a3/3c), not by pretending the need is met. An
// earlier pipeline-aware version broke the cook: a hand holding telur:raw
// for a covered need was read as "wrong" by 3d and thrown away, and the
// cook fetched the same ingredient in a loop.
function missingNeeds(plate, ticket) {
  const have = plate.items.map((i) => `${i.ing}:${i.state}`);
  const missing = [];
  for (const n of ticket.needs) {
    const key = `${n.ing}:${n.state}`;
    const at = have.indexOf(key);
    if (at < 0) missing.push(n);
    else have.splice(at, 1);
  }
  return missing;
}

// ---------------------------------------------------------------- world
export function createWorld(seed = 20261125) {
  const rng = makeRng(seed);
  const world = {
    seed,
    rng,
    time: 0,
    stageIndex: 0,
    stageTime: 0,
    stageTimeLeft: STAGES[0].seconds,
    coins: 0,
    fails: 0,
    served: 0,
    streak: 0,
    consecutiveServes: 0,
    kapauArmed: false,
    phase: 'play',
    won: null,
    overReason: '',
    chef: {
      x: CHEF_START.x, y: CHEF_START.y, dir: -Math.PI / 2, moving: false,
      scared: 0, startle: 0, holding: null, tray: [], target: null,
    },
    board: { item: null, progress: 0 },
    stoves: [{ item: null, progress: 0 }, { item: null, progress: 0 }],
    assembly: { plate: { items: [] } },
    tickets: [],
    queue: [],
    seats: SEATS.map((s) => ({ x: s.x, y: s.y, ticket: null, eatTimer: 0 })),
    spawnTimer: 4,
    flyingSpawns: [],
    flyingPlate: { active: false, x: 0, y: 0, vx: 0, t: 0, life: 0 },
    condiment: { unlocked: false, takes: 0 },
    kuntilanak: { status: 'none', timer: 0, served: 0, quiet: 0 },
    floats: [],
    particles: [],
    shake: 0,
    dim: 0,
    badge: '',
    sfx: [], // sound names this frame; main.js drains it into audio.js
    // Five ambient diners who just eat and watch: they make the room feel
    // full, and they help themselves to kerupuk once it is unlocked.
    ambient: [],
    stats: {
      served: 0, failed: 0, walkouts: 0, kuntiSeen: false, kuntiWon: false,
      condimentTakes: 0, flyingTaken: 0, kapauServed: 0,
    },
  };
  const moods = ['PUAS', 'KENYANG', 'LAPAR', 'HAUS', 'LESU'];
  const spots = [
    { x: 300, y: 600 }, { x: 352, y: 600 }, { x: 600, y: 600 },
    { x: 664, y: 600 }, { x: 880, y: 632 },
  ];
  for (let i = 0; i < 5; i++) {
    world.ambient.push({
      x: spots[i].x, y: spots[i].y,
      mood: moods[Math.floor(rng() * moods.length)],
      hue: Math.floor(rng() * 360), hijab: i === 2,
      takeTimer: 2 + rng() * 4, takes: 0,
    });
  }
  scheduleFlying(world);
  return world;
}
// Two haunted-plate visits per stage, at random moments.
function scheduleFlying(world) {
  const stage = STAGES[world.stageIndex];
  const a = stage.seconds * (0.25 + world.rng() * 0.3);
  const b = stage.seconds * (0.6 + world.rng() * 0.3);
  world.flyingSpawns = [a, b];
}
function addFloat(world, text, x, y, color = '#fff6e3') {
  world.floats.push({ text, x, y, life: 1.4, color });
}
function burst(world, x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = world.rng() * Math.PI * 2;
    const s = 30 + world.rng() * 70;
    world.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30,
      life: 0.6 + world.rng() * 0.5, color, r: 2 + world.rng() * 3,
    });
  }
}

// ---------------------------------------------------------------- tickets
let ticketSeq = 0;
function spawnTicket(world) {
  const stage = STAGES[world.stageIndex];
  let recipe;
  if (world.kapauArmed) {
    recipe = SECRET_RECIPE;
    world.kapauArmed = false;
  } else {
    recipe = RECIPES[Math.floor(world.rng() * RECIPES.length)];
  }
  const mood = pickWeighted(world.rng, MOOD_TABLE);
  const needs = recipe.needs.map((n) => ({ ...n }));
  if (MOODS[mood].drink) {
    needs.push({ ing: DRINKS[Math.floor(world.rng() * DRINKS.length)], state: 'ready' });
  }
  const ticket = {
    id: ++ticketSeq,
    recipeId: recipe.id,
    name: recipe.name,
    coins: recipe.coins,
    secret: !!recipe.secret,
    mood,
    needs,
    patienceMax: stage.patience * MOODS[mood].patience,
    patience: stage.patience * MOODS[mood].patience,
    state: 'queued', // queued -> seated -> served | failed | walked
    queueTimer: QUEUE_WAIT,
    seatIndex: -1,
    hue: Math.floor(world.rng() * 360),
    hijab: world.rng() < 0.2,
  };
  world.queue.push(ticket);
  return ticket;
}
function seatCustomers(world) {
  for (let i = 0; i < world.seats.length; i++) {
    const seat = world.seats[i];
    if (seat.ticket || seat.eatTimer > 0) continue;
    const next = world.queue.shift();
    if (!next) break;
    next.state = 'seated';
    next.seatIndex = i;
    seat.ticket = next;
    world.tickets.push(next);
  }
}
// ---------------------------------------------------------------- serving
function comboMult(world) {
  return Math.min(2, 1 + COMBO_STEP * world.streak);
}
function serveTicket(world, ticket, plate) {
  const base = ticket.coins;
  const mult = comboMult(world);
  const moodMult = MOODS[ticket.mood].coins;
  let earned = Math.round(base * mult * moodMult);
  let tip = 0;
  if (ticket.patience / ticket.patienceMax > 0.5) {
    tip = KILAT_TIP;
    earned += tip;
  }
  world.coins += earned;
  world.served++;
  world.stats.served++;
  world.streak++;
  world.consecutiveServes++;
  if (ticket.secret) world.stats.kapauServed++;
  if (world.consecutiveServes % KAPAU_STREAK === 0) world.kapauArmed = true;
  const seat = world.seats[ticket.seatIndex];
  if (seat) {
    seat.ticket = null;
    seat.eatTimer = EAT_TIME;
  }
  ticket.state = 'served';
  world.tickets = world.tickets.filter((t) => t !== ticket);
  const sx = seat ? seat.x : 1180;
  const sy = seat ? seat.y - 40 : 420;
  addFloat(world, `+${earned}${tip ? ' ⚡' : ''}`, sx, sy, '#ffd94d');
  burst(world, 1190, 380, '#ffd94d', 12);
  return earned;
}
function failTicket(world, ticket) {
  ticket.state = 'failed';
  world.tickets = world.tickets.filter((t) => t !== ticket);
  world.fails++;
  world.stats.failed++;
  world.streak = 0;
  world.consecutiveServes = 0;
  world.shake = Math.max(world.shake, 0.5);
  const seat = world.seats[ticket.seatIndex];
  if (seat) seat.ticket = null;
  addFloat(world, 'GAGAL', seat ? seat.x : 640, seat ? seat.y - 40 : 300, '#ff6b5e');
}
function unlockCondiment(world) {
  if (world.condiment.unlocked || world.coins < CONDIMENT.cost) return false;
  world.coins -= CONDIMENT.cost;
  world.condiment.unlocked = true;
  addFloat(world, 'KERUPUK BUKA!', 640, 300, '#ffd94d');
  return true;
}

// ---------------------------------------------------------------- interaction
function sfx(world, name) {
  world.sfx.push(name);
}
// The nearest station to the chef, within reach, or null.
function nearestStation(world) {
  const c = world.chef;
  let best = null;
  let bestD = 52;
  for (const [key, r] of Object.entries(STATIONS)) {
    const d = distToRect(c.x, c.y, r);
    if (d < bestD) {
      bestD = d;
      best = key;
    }
  }
  return best;
}
function nearestCrate(world) {
  const c = world.chef;
  // Single row: the cell directly above the chef decides. A plain
  // nearest-by-distance rule takes the NEIGHBOUR's ingredient while the chef
  // walks in from the side (the neighbour is straight above, the target is
  // diagonal) — that made the autopilot fetch daunUbi and ayam for a
  // Telur Balado ticket and throw them away, forever.
  for (let i = 0; i < INGREDIENTS.length; i++) {
    const r = crateRect(i);
    if (c.x >= r.x && c.x <= r.x + r.w && c.y - (r.y + r.h) < 48) return i;
  }
  // Fallback: nearest cell by distance.
  let best = -1;
  let bestD = 48;
  for (let i = 0; i < INGREDIENTS.length; i++) {
    const d = distToRect(c.x, c.y, crateRect(i));
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
// Can this item go on a stove right now? Raw for cook-only, chopped for chopcook.
function cookable(item) {
  if (!item) return false;
  const g = ING_BY_ID[item.ing];
  if (g.prep === 'cook') return item.state === 'raw';
  if (g.prep === 'chopcook') return item.state === 'chopped';
  return false;
}
function choppable(item) {
  if (!item) return false;
  const g = ING_BY_ID[item.ing];
  return (g.prep === 'chop' || g.prep === 'chopcook') && item.state === 'raw';
}
// Is this plate an order someone is waiting for (a ticket, or her sate)?
function plateReady(world, plate) {
  if (plate.items.length === 0) return false;
  if (world.kuntilanak.status === 'active') {
    const sate = RECIPE_BY_ID['sate-padang'];
    if (itemsKey(plate.items) === itemsKey(sate.needs)) return true;
  }
  return world.tickets.some((t) => plateMatchesTicket(plate, t));
}
// Could this plate ever become an order? (Its items are a subset of some
// open ticket's needs, or of her sate.) Wrong items bounce back to the hand.
function plateCouldBe(plate, world) {
  if (world.kuntilanak.status === 'active') {
    if (plateIsSubsetOf(plate, RECIPE_BY_ID['sate-padang'].needs)) return true;
  }
  return world.tickets.some((t) => plateIsSubsetOf(plate, t.needs));
}
function doInteract(world) {
  const chef = world.chef;
  const key = nearestStation(world);
  if (!key) return;
  if (key === 'crates') {
    const i = nearestCrate(world);
    if (i < 0 || chef.holding) return;
    const g = INGREDIENTS[i];
    chef.holding = { ing: g.id, state: g.prep === 'none' ? 'ready' : 'raw', chopProgress: 0 };
    sfx(world, 'pick');
    return;
  }
  if (key === 'board') {
    if (!world.board.item && choppable(chef.holding)) {
      world.board.item = chef.holding;
      world.board.progress = 0;
      chef.holding = null;
      sfx(world, 'pick');
    } else if (world.board.item && !chef.holding) {
      chef.holding = world.board.item;
      world.board.item = null;
      world.board.progress = 0;
    }
    return;
  }
  if (key === 'stove1' || key === 'stove2') {
    const stove = world.stoves[key === 'stove1' ? 0 : 1];
    if (!stove.item && cookable(chef.holding)) {
      stove.item = chef.holding;
      stove.progress = 0;
      chef.holding = null;
      sfx(world, 'pick');
    } else if (stove.item && !chef.holding) {
      const g = ING_BY_ID[stove.item.ing];
      const done = stove.progress >= (g.cook || 0);
      if (done) {
        chef.holding = { ing: stove.item.ing, state: 'cooked', chopProgress: 0 };
        stove.item = null;
        stove.progress = 0;
        sfx(world, 'ding');
      }
    }
    return;
  }
  if (key === 'assembly') {
    const plate = world.assembly.plate;
    if (chef.holding) {
      const trial = { items: [...plate.items, chef.holding] };
      if (plateCouldBe(trial, world)) {
        plate.items.push(chef.holding);
        chef.holding = null;
        sfx(world, 'plate');
      } else {
        addFloat(world, 'tidak cocok', chef.x, chef.y - 34, '#ff9a8a');
      }
    } else if (plate.items.length > 0) {
      if (plateReady(world, plate)) {
        if (chef.tray.length >= TRAY_MAX) {
          addFloat(world, 'nampan penuh', chef.x, chef.y - 34, '#ff9a8a');
        } else {
          chef.tray.push(plate);
          world.assembly.plate = { items: [] };
          sfx(world, 'ding');
        }
      } else {
        // Not an order yet: take the last item back into the hand.
        chef.holding = plate.items.pop();
      }
    }
    return;
  }
  if (key === 'pass') {
    if (chef.tray.length === 0) return;
    // Her order comes first: a sate plate feeds the kuntilanak.
    if (world.kuntilanak.status === 'active') {
      const sateKey = itemsKey(RECIPE_BY_ID['sate-padang'].needs);
      const at = chef.tray.findIndex((p) => itemsKey(p.items) === sateKey);
      if (at >= 0) {
        chef.tray.splice(at, 1);
        world.kuntilanak.served++;
        world.streak++;
        addFloat(world, `SATE ${world.kuntilanak.served}/3`, 1180, 330, '#ff8a7a');
        burst(world, 1190, 380, '#ff8a7a', 10);
        sfx(world, 'serve');
        return;
      }
    }
    const at = chef.tray.findIndex((p) => world.tickets.some((t) => plateMatchesTicket(p, t)));
    if (at < 0) {
      addFloat(world, 'belum ada yang pesan', chef.x, chef.y - 34, '#ff9a8a');
      return;
    }
    const plate = chef.tray[at];
    const ticket = world.tickets.find((t) => plateMatchesTicket(plate, t));
    chef.tray.splice(at, 1);
    serveTicket(world, ticket, plate);
    sfx(world, 'serve');
    return;
  }
  if (key === 'bin') {
    if (chef.holding) {
      chef.holding = null;
    } else if (chef.tray.length > 0) {
      chef.tray.shift();
      addFloat(world, 'dibuang', chef.x, chef.y - 34, '#ff9a8a');
    }
  }
}
// ---------------------------------------------------------------- update
export function updateWorld(world, dt, input = {}) {
  if (world.phase !== 'play') return;
  world.time += dt;
  world.stageTime += dt;
  world.stageTimeLeft -= dt;
  const chef = world.chef;
  chef.scared = Math.max(0, chef.scared - dt * 0.5);
  chef.startle = Math.max(0, chef.startle - dt * 0.8);
  world.shake = Math.max(0, world.shake - dt * 0.9);
  world.dim = world.kuntilanak.status === 'active'
    ? Math.min(1, world.dim + dt * 2)
    : Math.max(0, world.dim - dt * 1.5);

  // ---- unlock kerupuk (B)
  if (input.unlock) unlockCondiment(world);
  // ---- mouse click: the haunted plate first, else walk there
  if (input.click) {
    const fp = world.flyingPlate;
    if (fp.active && dist(input.click.x, input.click.y, fp.x, fp.y) < 46) {
      fp.active = false;
      world.coins += FLYING_PLATE_COINS;
      world.stats.flyingTaken++;
      addFloat(world, `+${FLYING_PLATE_COINS} Piring Terbang!`, fp.x, fp.y - 20, '#ffd94d');
      burst(world, fp.x, fp.y, '#ffd94d', 14);
      sfx(world, 'coin');
    } else {
      chef.target = {
        x: clamp(input.click.x, 12, W - 12),
        y: clamp(input.click.y, WALL_H + 8, H - 12),
      };
    }
  }
  // ---- movement: (mx, my) is a TARGET POINT in world coordinates.
  // The autopilot returns waypoints, the keyboard returns a point 60px
  // ahead of the chef, and a mouse click sets chef.target instead. All
  // three agree on "point", never on "direction": an earlier version mixed
  // the two and the chef walked into the top-left corner.
  const hasTarget = input.mx !== undefined && input.my !== undefined;
  if (hasTarget) {
    const dx = input.mx - chef.x;
    const dy = input.my - chef.y;
    const d = Math.hypot(dx, dy);
    if (d > 4) {
      chef.target = null;
      chef.x += (dx / d) * CHEF_SPEED * dt;
      chef.y += (dy / d) * CHEF_SPEED * dt;
      chef.dir = Math.atan2(dy, dx);
      chef.moving = true;
    } else if (chef.target) {
      const tx = chef.target.x - chef.x;
      const ty = chef.target.y - chef.y;
      const td = Math.hypot(tx, ty);
      if (td < 8) {
        chef.target = null;
        chef.moving = false;
      } else {
        chef.x += (tx / td) * CHEF_SPEED * dt;
        chef.y += (ty / td) * CHEF_SPEED * dt;
        chef.dir = Math.atan2(ty, tx);
        chef.moving = true;
      }
    } else {
      chef.moving = false;
    }
  } else if (chef.target) {
    const dx = chef.target.x - chef.x;
    const dy = chef.target.y - chef.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      chef.target = null;
      chef.moving = false;
    } else {
      chef.x += (dx / d) * CHEF_SPEED * dt;
      chef.y += (dy / d) * CHEF_SPEED * dt;
      chef.dir = Math.atan2(dy, dx);
      chef.moving = true;
    }
  } else {
    chef.moving = false;
  }
  // Stay inside the floor and out of every station and table.
  chef.x = clamp(chef.x, 12, W - 12);
  chef.y = clamp(chef.y, WALL_H + 8, H - 12);
  for (const r of obstacles()) pushOutCircleRect(chef, r, CHEF_R + 2);
  // ---- E: use the nearest station
  if (input.interact) doInteract(world);
  // ---- hold E at the board: chop
  if (input.interactHeld && world.board.item) {
    const near = distToRect(chef.x, chef.y, STATIONS.board) < 52;
    const item = world.board.item;
    if (near && item.state === 'raw' && choppable(item)) {
      world.board.progress += dt;
      const g = ING_BY_ID[item.ing];
      if (world.board.progress >= (g.chop || 2)) {
        item.state = 'chopped';
        item.chopProgress = 0;
        world.board.progress = 0;
        if (!chef.holding) {
          chef.holding = item;
          world.board.item = null;
        }
        sfx(world, 'chop');
      }
    }
  }
  // ---- stoves cook on their own once loaded
  for (const stove of world.stoves) {
    if (!stove.item) continue;
    const g = ING_BY_ID[stove.item.ing];
    if (stove.item.state !== 'cooked') {
      stove.progress += dt;
      if (stove.progress >= (g.cook || 4)) {
        stove.item.state = 'cooked';
        stove.progress = g.cook || 4;
        sfx(world, 'ding');
      }
    }
  }
  // ---- spawn tickets (not while she owns the kitchen)
  const open = world.tickets.length + world.queue.length;
  if (world.kuntilanak.status !== 'active') {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0 && open < 3) {
      spawnTicket(world);
      const stage = STAGES[world.stageIndex];
      world.spawnTimer = stage.spawnEvery * (0.9 + world.rng() * 0.2);
    }
  }
  seatCustomers(world);
  // ---- seated tickets drain patience; empty ones fail
  for (const t of [...world.tickets]) {
    if (t.state !== 'seated') continue;
    t.patience -= dt;
    if (t.patience <= 0) failTicket(world, t);
  }
  // ---- the queue: wait too long and they walk out angry (-10, not a fail)
  for (const t of [...world.queue]) {
    t.queueTimer -= dt;
    if (t.queueTimer <= 0) {
      world.queue = world.queue.filter((q) => q !== t);
      world.coins = Math.max(0, world.coins - WALKOUT_COST);
      world.stats.walkouts++;
      addFloat(world, `-${WALKOUT_COST}`, DOOR.x + 40, DOOR.y - 16, '#ff6b5e');
    }
  }
  // ---- served customers finish eating and free their seat
  for (const seat of world.seats) {
    if (seat.eatTimer > 0) {
      seat.eatTimer -= dt;
      if (seat.eatTimer <= 0) seat.eatTimer = 0;
    }
  }
  // ---- the kuntilanak (MALAM only)
  const kunti = world.kuntilanak;
  if (world.stageIndex === 2 && kunti.status === 'none') {
    if (world.stageTime > KUNTI.earliest) {
      if (world.tickets.length === 0 && world.queue.length === 0) {
        kunti.quiet += dt;
        if (kunti.quiet >= KUNTI.quiet) {
          kunti.status = 'active';
          kunti.timer = KUNTI.time;
          kunti.served = 0;
          chef.startle = 2.0;
          chef.scared = 1.6;
          world.shake = 0.7;
          world.stats.kuntiSeen = true;
          addFloat(world, 'DIA DATANG...', 1180, 280, '#c9b8ff');
          sfx(world, 'sting');
          sfx(world, 'laugh');
        }
      } else {
        kunti.quiet = 0;
      }
    }
  } else if (kunti.status === 'active') {
    kunti.timer -= dt;
    if (kunti.served >= KUNTI.sateNeed) {
      kunti.status = 'done';
      world.coins += KUNTI.reward;
      world.badge = 'Berani!';
      addFloat(world, `+${KUNTI.reward} Berani!`, 1180, 300, '#ffd94d');
      burst(world, 1190, 380, '#ffd94d', 16);
      world.stats.kuntiWon = true;
      sfx(world, 'coin');
    } else if (kunti.timer <= 0) {
      kunti.status = 'done';
      world.coins = Math.max(0, world.coins + KUNTI.fail);
      world.stageTimeLeft = Math.max(10, world.stageTimeLeft / 2);
      chef.scared = 1.6;
      world.shake = 0.8;
      addFloat(world, `${KUNTI.fail} ...dia pergi`, 1180, 300, '#ff6b5e');
      sfx(world, 'sting');
    }
  }
  // ---- the haunted plate
  const fp = world.flyingPlate;
  if (!fp.active && world.flyingSpawns.length > 0 && world.stageTime >= world.flyingSpawns[0]) {
    world.flyingSpawns.shift();
    fp.active = true;
    fp.t = 0;
    fp.life = 9;
    fp.x = world.rng() < 0.5 ? -40 : W + 40;
    fp.vx = (fp.x < 0 ? 1 : -1) * (90 + world.rng() * 60);
    fp.y = 300 + world.rng() * 180;
  }
  if (fp.active) {
    fp.t += dt;
    fp.life -= dt;
    fp.x += fp.vx * dt;
    if (fp.life <= 0 || fp.x < -60 || fp.x > W + 60) fp.active = false;
  }
  // ---- kerupuk: seated customers help themselves
  if (world.condiment.unlocked) {
    const takers = [];
    for (const seat of world.seats) {
      if (seat.ticket) takers.push({ x: seat.x, y: seat.y - 30, o: seat.ticket });
      else if (seat.eatTimer > 0) takers.push({ x: seat.x, y: seat.y - 30, o: seat });
    }
    for (const a of world.ambient) takers.push({ x: a.x, y: a.y - 26, o: a });
    for (const tk of takers) {
      const o = tk.o;
      if (o.takes === undefined) o.takes = 0;
      if (o.takeTimer === undefined) o.takeTimer = 1 + world.rng() * 3;
      if (o.takes >= CONDIMENT.cap) continue;
      o.takeTimer -= dt;
      if (o.takeTimer <= 0) {
        o.takes++;
        o.takeTimer = CONDIMENT.every * (0.8 + world.rng() * 0.4);
        world.coins += CONDIMENT.coins;
        world.condiment.takes++;
        world.stats.condimentTakes++;
        addFloat(world, `+${CONDIMENT.coins} kerupuk`, tk.x, tk.y, '#ffd94d');
      }
    }
  }
  // ---- floats, particles, timers
  for (const f of world.floats) {
    f.life -= dt;
    f.y -= 26 * dt;
  }
  world.floats = world.floats.filter((f) => f.life > 0);
  for (const p of world.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 140 * dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  // ---- stage ends
  if (world.fails >= FAILS_PER_STAGE || world.stageTimeLeft <= 0) {
    advanceStage(world);
  }
}
function advanceStage(world) {
  if (world.stageIndex >= 2) {
    world.phase = 'over';
    world.won = world.coins >= WIN_COINS;
    world.overReason = world.fails >= FAILS_PER_STAGE ? 'fails' : world.won ? 'target' : 'time';
    return;
  }
  world.stageIndex++;
  world.stageTime = 0;
  world.stageTimeLeft = STAGES[world.stageIndex].seconds;
  world.fails = 0;
  world.tickets = [];
  world.queue = [];
  for (const seat of world.seats) {
    seat.ticket = null;
    seat.eatTimer = 0;
  }
  world.board.item = null;
  world.board.progress = 0;
  for (const stove of world.stoves) {
    stove.item = null;
    stove.progress = 0;
  }
  world.assembly.plate = { items: [] };
  world.chef.tray = [];
  world.chef.holding = null;
  world.chef.x = CHEF_START.x;
  world.chef.y = CHEF_START.y;
  world.chef.target = null;
  world.spawnTimer = 3;
  world.kuntilanak = { status: 'none', timer: 0, served: 0, quiet: 0 };
  world.flyingPlate.active = false;
  scheduleFlying(world);
  addFloat(world, `${STAGES[world.stageIndex].name} — ${STAGES[world.stageIndex].subtitle}`, 640, 300, '#ffd94d');
}
// ---------------------------------------------------------------- autopilot
// Drives the game the way a careful cook would: oldest ticket first, one
// dish at a time, never carrying the wrong thing. It never clicks the
// haunted plate (that bonus is for humans).
function approachPoint(world, rect) {
  const c = world.chef;
  const cx = clamp(c.x, rect.x, rect.x + rect.w);
  const cy = clamp(c.y, rect.y, rect.y + rect.h);
  return { x: cx, y: cy };
}
function segHitsRect(ax, ay, bx, by, r) {
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minY = Math.min(ay, by);
  const maxY = Math.max(ay, by);
  if (maxX < r.x || minX > r.x + r.w || maxY < r.y || minY > r.y + r.h) return false;
  if (ax >= r.x && ax <= r.x + r.w && ay >= r.y && ay <= r.y + r.h) return true;
  if (bx >= r.x && bx <= r.x + r.w && by >= r.y && by <= r.y + r.h) return true;
  const dx = bx - ax;
  const dy = by - ay;
  const check = (t) => {
    if (t < 0 || t > 1) return false;
    const x = ax + dx * t;
    const y = ay + dy * t;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  };
  if (dx !== 0) {
    if (check((r.x - ax) / dx) || check((r.x + r.w - ax) / dx)) return true;
  }
  if (dy !== 0) {
    if (check((r.y - ay) / dy) || check((r.y + r.h - ay) / dy)) return true;
  }
  return false;
}
// Walk toward a point, routing around the assembly counter when the straight
// line is blocked. A waypoint is the nearest corner of the counter's
// expanded rect; from a corner the path to the target runs along the
// counter's edge, so the chef slides around it instead of pressing straight
// into the wall and freezing. (A straight-line press into a wall has no
// tangential component, so the push-out cancels it entirely — that froze
// the chef for 92s at (230,324).) NOTE: only the assembly is routed around.
// Routing around EVERY station flip-flopped: the chef vibrates in a 4px
// band at the 26px corner threshold and never progresses (proven: the
// all-stations version dropped the win sim from 390 coins to 0). The
// crates bar is not routed either — it sits against the top wall and is
// approached from the front. KNOWN GAP: the autopilot can freeze under a
// stove on the way to a top-row crate (the kunti's sambalIjo run) — a human
// walks around it; the autopilot loses that kunti (-20) but still wins.
function steerTo(world, tx, ty) {
  const c = world.chef;
  const b = { ...STATIONS.assembly, x: STATIONS.assembly.x - 20, y: STATIONS.assembly.y - 20, w: STATIONS.assembly.w + 40, h: STATIONS.assembly.h + 40 };
  if (segHitsRect(c.x, c.y, tx, ty, b)) {
    const corners = [
      { x: b.x, y: b.y }, { x: b.x + b.w, y: b.y },
      { x: b.x, y: b.y + b.h }, { x: b.x + b.w, y: b.y + b.h },
    ];
    let best = corners[0];
    let bd = Infinity;
    for (const cn of corners) {
      const d = dist(c.x, c.y, cn.x, cn.y);
      if (d < bd) { bd = d; best = cn; }
    }
    if (bd > 26) return { mx: best.x, my: best.y, close: false };
    // Close to the corner: go direct; the corner sits outside the counter,
    // so the path from here to the target runs along its edge.
  }
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.hypot(dx, dy);
  if (d < 10) return { mx: c.x, my: c.y, close: true };
  return { mx: tx, my: ty, close: false };
}
export function autoInput(world) {
  const chef = world.chef;
  // Stand still by default: the target point is the chef's own position.
  const inp = { mx: chef.x, my: chef.y, interact: false, interactHeld: false, unlock: false, click: null };
  if (world.phase !== 'play') return inp;
  // Kerupuk pays for itself: unlock as soon as it is affordable.
  if (!world.condiment.unlocked && world.coins >= CONDIMENT.cost) inp.unlock = true;
  // Her order outranks every ticket: three sate, nothing else matters.
  let target = null;
  let kuntiMode = false;
  if (world.kuntilanak.status === 'active') {
    kuntiMode = true;
    target = { recipeId: 'sate-padang', needs: RECIPE_BY_ID['sate-padang'].needs, kunti: true };
  } else {
    const seated = world.tickets.filter((t) => t.state === 'seated');
    if (seated.length === 0) {
      // Nothing to serve: wait by the assembly counter, out of the way.
      const s = steerTo(world, 640, 380);
      inp.mx = s.mx;
      inp.my = s.my;
      return inp;
    }
    seated.sort((a, b) => a.patience - b.patience);
    target = seated[0];
  }
  const plate = world.assembly.plate;
  // 1. A finished plate for the target is on the tray: take it to the pass.
  const trayAt = chef.tray.findIndex((p) => {
    if (kuntiMode) return itemsKey(p.items) === itemsKey(target.needs);
    return plateMatchesTicket(p, target);
  });
  if (trayAt >= 0) {
    const p = approachPoint(world, STATIONS.pass);
    const s = steerTo(world, p.x, p.y);
    inp.mx = s.mx;
    inp.my = s.my;
    if (distToRect(chef.x, chef.y, STATIONS.pass) < 52) inp.interact = true;
    return inp;
  }
  // 2. The plate on the counter is finished: pick it up.
  const ready = kuntiMode
    ? itemsKey(plate.items) === itemsKey(target.needs)
    : plateMatchesTicket(plate, target);
  if (ready && plate.items.length > 0) {
    const p = approachPoint(world, STATIONS.assembly);
    const s = steerTo(world, p.x, p.y);
    inp.mx = s.mx;
    inp.my = s.my;
    if (distToRect(chef.x, chef.y, STATIONS.assembly) < 52) inp.interact = true;
    return inp;
  }
  // 3. Build the plate: the first need not yet on it.
  const missing = missingNeeds(plate, target);
  if (missing.length === 0) return inp; // should not happen; plate is ready
  const next = missing[0];
  const hand = chef.holding;
  // 3a. The hand already holds exactly what is needed: put it on the plate.
  if (hand && hand.ing === next.ing && hand.state === next.state) {
    const p = approachPoint(world, STATIONS.assembly);
    const s = steerTo(world, p.x, p.y);
    inp.mx = s.mx;
    inp.my = s.my;
    if (distToRect(chef.x, chef.y, STATIONS.assembly) < 52) inp.interact = true;
    return inp;
  }
  // 3a2. The board holds a finished prep and the hand is empty: take it
  // before starting anything new, or the chef would chop on top of it.
  if (!hand && world.board.item && world.board.item.state === 'chopped') {
    const p = approachPoint(world, STATIONS.board);
    const s = steerTo(world, p.x, p.y);
    inp.mx = s.mx;
    inp.my = s.my;
    if (distToRect(chef.x, chef.y, STATIONS.board) < 52) inp.interact = true;
    return inp;
  }
  // 3a3. The board holds a raw item for this ticket and the hand is empty:
  // stand there and hold E to chop it. (Without this, the cook fetches the
  // next need while the board item waits unchopped — nobody ever chops it.)
  if (!hand && world.board.item && world.board.item.state === 'raw' && choppable(world.board.item) && target.needs.some((n) => n.ing === world.board.item.ing)) {
    const p = approachPoint(world, STATIONS.board);
    const s = steerTo(world, p.x, p.y);
    inp.mx = s.mx;
    inp.my = s.my;
    if (distToRect(chef.x, chef.y, STATIONS.board) < 52) inp.interactHeld = true;
    return inp;
  }
  // 3b. The hand holds the right ingredient in an earlier state: prep it.
  if (hand && hand.ing === next.ing) {
    const g = ING_BY_ID[hand.ing];
    if (hand.state === 'raw' && (g.prep === 'chop' || g.prep === 'chopcook')) {
      // Chop it: place on the board, then hold E.
      if (!world.board.item) {
        const p = approachPoint(world, STATIONS.board);
        const s = steerTo(world, p.x, p.y);
        inp.mx = s.mx;
        inp.my = s.my;
        if (distToRect(chef.x, chef.y, STATIONS.board) < 52) inp.interact = true;
        return inp;
      }
      const p = approachPoint(world, STATIONS.board);
      const s = steerTo(world, p.x, p.y);
      inp.mx = s.mx;
      inp.my = s.my;
      if (distToRect(chef.x, chef.y, STATIONS.board) < 52) inp.interactHeld = true;
      return inp;
    }
    if (cookable(hand)) {
      const rect = world.stoves[0].item ? STATIONS.stove2 : STATIONS.stove1;
      const p = approachPoint(world, rect);
      const s = steerTo(world, p.x, p.y);
      inp.mx = s.mx;
      inp.my = s.my;
      if (distToRect(chef.x, chef.y, rect) < 52) inp.interact = true;
      return inp;
    }
  }
  // 3c. Something is cooking for us: wait by the stove until it is done.
  for (let i = 0; i < 2; i++) {
    const stove = world.stoves[i];
    if (stove.item && stove.item.ing === next.ing) {
      const g = ING_BY_ID[stove.item.ing];
      if (stove.progress < (g.cook || 4)) {
        const rect = i === 0 ? STATIONS.stove1 : STATIONS.stove2;
        const p = approachPoint(world, rect);
        const s = steerTo(world, p.x, p.y);
        inp.mx = s.mx;
        inp.my = s.my;
        return inp;
      }
      // Done: pick it up.
      const rect = i === 0 ? STATIONS.stove1 : STATIONS.stove2;
      const p = approachPoint(world, rect);
      const s = steerTo(world, p.x, p.y);
      inp.mx = s.mx;
      inp.my = s.my;
      if (distToRect(chef.x, chef.y, rect) < 52) inp.interact = true;
      return inp;
    }
  }
  // 3d. The hand holds the wrong thing: throw it away.
  if (hand) {
    const p = approachPoint(world, STATIONS.bin);
    const s = steerTo(world, p.x, p.y);
    inp.mx = s.mx;
    inp.my = s.my;
    if (distToRect(chef.x, chef.y, STATIONS.bin) < 52) inp.interact = true;
    return inp;
  }
  // 3e. Empty hand: fetch the raw ingredient from its crate. The crates
  // are one row along the top: steer to the point directly BELOW the target
  // cell's centre, at the push-out boundary (cell bottom + 18), and only
  // press E once the chef is within 12px of that point. E acts on the
  // NEAREST station, and the board sits 22px from a chef standing under
  // the cabai cell — pressing E from a sloppy spot hits the board instead
  // of the crates, and the chef waits there forever holding nothing.
  const idx = INGREDIENTS.findIndex((g) => g.id === next.ing);
  const cr = crateRect(idx);
  const ax = cr.x + cr.w / 2;
  const ay = cr.y + cr.h + 18;
  const s = steerTo(world, ax, ay);
  inp.mx = s.mx;
  inp.my = s.my;
  if (dist(chef.x, chef.y, ax, ay) < 12) inp.interact = true;
  return inp;
}
// ---------------------------------------------------------------- snapshot
export function snapshot(world) {
  return {
    phase: world.phase,
    won: world.won,
    overReason: world.overReason,
    coins: world.coins,
    served: world.served,
    failed: world.stats.failed,
    stage: STAGES[world.stageIndex].name,
    stageIndex: world.stageIndex,
    timeLeft: Math.max(0, Math.round(world.stageTimeLeft)),
    kuntiSeen: world.stats.kuntiSeen,
    kuntiWon: world.stats.kuntiWon,
    condimentTakes: world.stats.condimentTakes,
    flyingTaken: world.stats.flyingTaken,
    kapauServed: world.stats.kapauServed,
    walkouts: world.stats.walkouts,
    ticketsOpen: world.tickets.length + world.queue.length,
  };
}
