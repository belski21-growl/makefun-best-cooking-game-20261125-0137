// Padang Kilat — boot and the one loop: input every frame, the world in fixed
// 1/60 s steps, the renderer paints what is there. Screens: title, play, paused,
// game over. ?seed=N fixes the shift. ?shot=start|play|chop|serve stages a
// screenshot scene instead of running the loop. ?auto=win runs a scripted
// autopilot through the real controls (used to prove the game is winnable);
// ?auto=lose stands still (used to prove it is losable).
import { BEST_KEY, INGREDIENTS, INTERACT_RADIUS, RECIPES, STATIONS, STEP, recipeById } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CHOP, EVENT_DING, EVENT_DROP, EVENT_FAILED, EVENT_KUNTILANAK, EVENT_KUNTILANAK_FAIL, EVENT_KUNTILANAK_WIN, EVENT_LOSE, EVENT_NO_ORDER, EVENT_PICKUP, EVENT_PLATE, EVENT_RUSH, EVENT_SERVED, EVENT_STAGE, EVENT_WIN } from './kitchen.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const autoMode = params.get('auto');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage off: best lasts this visit only */ }
}

function rectCentre(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
function stationCentre(name) {
  if (name.startsWith('crate:')) {
    const c = STATIONS.crates.find((cc) => cc.id === name.slice(6));
    return rectCentre(c);
  }
  if (name === 'chop') return rectCentre(STATIONS.chop);
  if (name.startsWith('stove:')) return rectCentre(STATIONS.stove[Number(name.slice(6))]);
  if (name === 'assembly') return rectCentre(STATIONS.assembly);
  if (name === 'pass') return rectCentre(STATIONS.pass);
  if (name === 'bin') return rectCentre(STATIONS.bin);
  return { x: 640, y: 430 };
}
function stationRect(name) {
  if (name.startsWith('crate:')) return STATIONS.crates.find((cc) => cc.id === name.slice(6));
  if (name === 'chop') return STATIONS.chop;
  if (name.startsWith('stove:')) return STATIONS.stove[Number(name.slice(6))];
  if (name === 'assembly') return STATIONS.assembly;
  if (name === 'pass') return STATIONS.pass;
  if (name === 'bin') return STATIONS.bin;
  return null;
}
function nearStation(worldState, name) {
  const r = stationRect(name);
  if (!r) return false;
  // Near a station means near its edge, not its centre (see kitchen.js):
  // the chopping board's centre is 142px from its left edge.
  const cx = Math.max(r.x, Math.min(worldState.player.x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(worldState.player.y, r.y + r.h));
  return Math.hypot(worldState.player.x - cx, worldState.player.y - cy) < INTERACT_RADIUS;
}
// The autopilot must stand where its target is the NEAREST station, not
// merely within reach: the crates sit 74px apart inside a 110px reach, so
// "near" alone grabs the neighbour's ingredient and the run stalls between
// the crates and the bin. Mouse play keeps the generous nearStation above.
function atStation(worldState, name) {
  const stn = world.nearestStation();
  return stn !== null && stn.name === name;
}
function segmentHitsRect(ax, ay, bx, by, r) {
  const dx = bx - ax;
  const dy = by - ay;
  let tmin = 0;
  let tmax = 1;
  const slabs = [[-dx, ax - r.x], [dx, r.x + r.w - ax], [-dy, ay - r.y], [dy, r.y + r.h - ay]];
  for (const [p, q] of slabs) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > tmax) return false; if (t > tmin) tmin = t; }
    else { if (t < tmin) return false; if (t < tmax) tmax = t; }
  }
  return true;
}
function moveToward(worldState, target) {
  const p = worldState.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 12) return { dx: 0, dy: 0 };
  // Route around the solid counters in two phases. A straight line into a
  // stove from the crates crosses the chopping board, and the player just
  // pushes against its face forever (the board is solid and the line has
  // no sideways component to slide along it); a diagonal line at the
  // board's corner wedges the same way. Going OVER the top is impossible
  // — the y=180 clamp sits 6px above the counters' top edge, so there is
  // no lane above them. So: first get clear BELOW the blocking counter,
  // then travel past its far edge, then head for the target. The rect
  // holding the target itself never blocks, and neither does a rect the
  // player already stands inside (it cannot — push-out forbids it — but
  // the guard keeps a segment starting inside a rect from detouring).
  const solids = [STATIONS.chop, ...STATIONS.stove, STATIONS.assembly, STATIONS.pass];
  for (const r of solids) {
    if (target.x >= r.x && target.x <= r.x + r.w && target.y >= r.y && target.y <= r.y + r.h) continue;
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) continue;
    if (!segmentHitsRect(p.x, p.y, target.x, target.y, r)) continue;
    const belowLine = Math.min(r.y + r.h + 34, H - 17);
    const withinSpan = p.x > r.x - 10 && p.x < r.x + r.w + 10;
    // Sideways first ONLY while the player is still in the rect's vertical
    // band (between its face and the clear lane): once it is already below
    // belowLine, stepping sideways is pointless and fights phase 2 — the
    // player bounces on the span boundary forever (proven 25 Nov: the
    // autopilot oscillated +1/-1 at x=910 for 55s).
    if (withinSpan && ((p.y < r.y && p.y > r.y - 34) || (p.y > r.y + r.h && p.y < belowLine))) {
      // Under the counter's span, above or below it: step sideways out
      // first — straight down from here would push against its face.
      const left = Math.abs(p.x - (r.x - 34));
      const right = Math.abs(p.x - (r.x + r.w + 34));
      return { dx: left <= right ? -1 : 1, dy: 0 };
    }
    if (p.y < belowLine) return { dx: 0, dy: 1 };
    const farX = target.x > p.x ? r.x + r.w + 34 : r.x - 34;
    if (Math.abs(p.x - farX) > 12) return { dx: Math.sign(farX - p.x), dy: 0 };
    break;
  }
  return { dx: dx / d, dy: dy / d };
}

// The autopilot drives the same inputs a player uses: a direction and an
// interact hold. It plans one dish at a time from the oldest ticket.
function autopilotInput() {
  const s = world.state;
  const none = { dx: 0, dy: 0, interact: false };
  const ticket = s.tickets[0];
  if (!ticket) return { dx: 0, dy: 0, interact: false };
  const recipe = recipeById(ticket.recipeId);

  // If a finished dish waits on the pass, serve it first.
  if (s.passDish) {
    if (atStation(s, 'pass')) return { dx: 0, dy: 0, interact: true };
    return { ...moveToward(s, stationCentre('pass')), interact: false };
  }
  // Plate holds something the current ticket does not need (a ticket
  // expired mid-assembly): take it off at the assembly before it jams
  // the plate full. The kitchen only takes the wrong item off, never a
  // good one, so this cannot loop.
  const plateStray = s.plate.find((k) => !recipe.needs.includes(k));
  if (plateStray) {
    if (atStation(s, 'assembly')) return { dx: 0, dy: 0, interact: true };
    return { ...moveToward(s, stationCentre('assembly')), interact: false };
  }
  // Plate complete: carry it to the pass.
  if (s.plate.length > 0 && recipe.needs.length === s.plate.length && recipe.needs.every((n) => s.plate.includes(n))) {
    if (atStation(s, 'assembly')) return { dx: 0, dy: 0, interact: true };
    return { ...moveToward(s, stationCentre('assembly')), interact: false };
  }
  // Tray holds something the current ticket does not need: bin it.
  const stray = s.tray.find((k) => !recipe.needs.includes(k) && !recipe.needs.some((n) => n.split(':')[0] === k.split(':')[0]));
  if (stray && s.plate.length === 0) {
    if (atStation(s, 'bin')) return { dx: 0, dy: 0, interact: true };
    return { ...moveToward(s, stationCentre('bin')), interact: false };
  }

  // First need not yet on the plate.
  const need = recipe.needs.find((n) => !s.plate.includes(n));
  if (!need) return none;
  const [needId, needState] = need.split(':');
  const inTray = s.tray.indexOf(need);
  if (inTray >= 0) {
    if (atStation(s, 'assembly')) return { dx: 0, dy: 0, interact: true };
    return { ...moveToward(s, stationCentre('assembly')), interact: false };
  }
  // Cooking in a pot already?
  const potIdx = s.pots.findIndex((p) => p.item && p.item.split(':')[0] === needId);
  if (potIdx >= 0) {
    const pot = s.pots[potIdx];
    if (pot.done) {
      if (atStation(s, `stove:${potIdx}`)) return { dx: 0, dy: 0, interact: true };
      return { ...moveToward(s, stationCentre(`stove:${potIdx}`)), interact: false };
    }
    // While it cooks, fetch another need if the tray has room.
    // While it cooks, fetch another need — but only if the tray does not
    // already hold that ingredient in ANY form: comparing the full need
    // key ('NASI:cooked') against a tray holding 'NASI:raw' missed, and
    // the autopilot filled the tray with 3× the same raw ingredient, then
    // sat at a full tray in front of a done pot forever (proven 25 Nov).
    const other = recipe.needs.find((n) => !s.plate.includes(n) && !s.tray.some((k) => k.split(':')[0] === n.split(':')[0]) && n !== need && !s.pots.some((p) => p.item && p.item.split(':')[0] === n.split(':')[0]));
    if (other && s.tray.length < 3) return fetchInput(s, other);
    return { ...moveToward(s, stationCentre(`stove:${potIdx}`)), interact: false };
  }
  // Raw (or chopped) ingredient already in the tray, needing prep?
  const ing = INGREDIENTS[needId];
  if (needState === 'chopped') {
    const rawIdx = s.tray.indexOf(`${needId}:raw`);
    if (rawIdx >= 0) {
      if (atStation(s, 'chop')) return { dx: 0, dy: 0, interact: true };
      return { ...moveToward(s, stationCentre('chop')), interact: false };
    }
  }
  if (needState === 'cooked') {
    if (ing.prep === 'chopcook') {
      const choppedIdx = s.tray.indexOf(`${needId}:chopped`);
      if (choppedIdx >= 0) {
        const freePot = s.pots.findIndex((p) => !p.item);
        if (freePot >= 0) {
          if (atStation(s, `stove:${freePot}`)) return { dx: 0, dy: 0, interact: true };
          return { ...moveToward(s, stationCentre(`stove:${freePot}`)), interact: false };
        }
        return { ...moveToward(s, stationCentre('stove:0')), interact: false };
      }
      const rawIdx = s.tray.indexOf(`${needId}:raw`);
      if (rawIdx >= 0) {
        if (atStation(s, 'chop')) return { dx: 0, dy: 0, interact: true };
        return { ...moveToward(s, stationCentre('chop')), interact: false };
      }
    } else {
      const rawIdx = s.tray.indexOf(`${needId}:raw`);
      if (rawIdx >= 0) {
        const freePot = s.pots.findIndex((p) => !p.item);
        if (freePot >= 0) {
          if (atStation(s, `stove:${freePot}`)) return { dx: 0, dy: 0, interact: true };
          return { ...moveToward(s, stationCentre(`stove:${freePot}`)), interact: false };
        }
        return { ...moveToward(s, stationCentre('stove:0')), interact: false };
      }
    }
  }
  return fetchInput(s, need);
}

function fetchInput(s, need) {
  const [needId] = need.split(':');
  if (s.tray.length >= 3) return { dx: 0, dy: 0, interact: false };
  const crate = `crate:${needId}`;
  if (atStation(s, crate)) return { dx: 0, dy: 0, interact: true };
  return { ...moveToward(s, stationCentre(crate)), interact: false };
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function exposeState(screen) {
  const s = world.state;
  window.__dk = {
    screen, coins: s.coins, served: s.served, failed: s.failed, fails: s.fails,
    streak: s.streak, elapsed: Math.round(s.elapsed * 10) / 10, over: s.over, won: s.won,
    tickets: s.tickets.length, tray: [...s.tray], plate: [...s.plate], passDish: s.passDish,
    stageIndex: s.stageIndex, stageElapsed: Math.round(s.stageElapsed * 10) / 10,
    transition: Math.round(s.transition * 10) / 10, kuntilanak: s.kuntilanak.status,
    badges: [...s.badges], flyingPlate: s.flyingPlate.active, kapauDue: s.kapauDue,
  };
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let autoStarted = false;
  let mouseStation = null;
  let mouseStationSince = 0;

  function announce(message) { status.textContent = message; }

  function handleEvents(events) {
    if (events & EVENT_SERVED) audio.serve();
    if (events & EVENT_FAILED) audio.fail();
    if (events & EVENT_DING) { audio.ding(); }
    if (events & EVENT_CHOP) audio.chop();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_DROP) audio.drop();
    if (events & EVENT_NO_ORDER) audio.fail();
    if (events & EVENT_RUSH) audio.rush();
    if (events & EVENT_STAGE) audio.stage();
    if (events & EVENT_KUNTILANAK) { audio.sting(); audio.laugh(); }
    if (events & EVENT_KUNTILANAK_WIN) { audio.serve(); audio.laugh(); }
    if (events & EVENT_KUNTILANAK_FAIL) { audio.sting(); audio.fail(); }
    if (events & EVENT_PLATE) audio.plate();
    const cooking = world.state.pots.some((p) => p.item && !p.done);
    // While she is here the room goes silent: the sizzle ambience stops
    // even if a pot is cooking, and only returns once she is gone.
    const horror = world.state.kuntilanak.status === 'active';
    if (cooking && !horror) audio.startSizzle();
    else audio.stopSizzle();
  }

  function startGame() {
    audio.unlock();
    audio.click();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Serve the tickets before their patience runs out.');
  }

  function endGame(events) {
    screen = SCREEN_OVER;
    audio.stopSizzle();
    if (world.state.coins > best) { best = world.state.coins; saveBest(best); }
    announce(world.state.won
      ? `Shift complete, you win. ${world.state.coins} coins.`
      : `Shift over. ${world.state.coins} coins.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.toggleMute();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stopSizzle();
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    // R restarts from the game-over screen.
    if (screen === SCREEN_OVER) {
      // handled by confirm above; R is a convenience alias via keydown listener below.
    }
  }

  window.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && screen === SCREEN_OVER) startGame();
  });

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, dy: 0, interact: false }, true);
      return;
    }
    let dir = input.direction();
    let interact = input.interactHeld();
    // Mouse: click a station to walk there and use it; click empty floor to walk.
    // A flying plate is caught first — it is worth 25 coins and it will not wait.
    const click = input.takeClick();
    if (click) {
      audio.unlock();
      const plateEvents = world.tryCatchPlate(click.x, click.y);
      if (plateEvents) {
        handleEvents(plateEvents);
        mouseStation = null;
      } else {
        const hit = hitStation(click.x, click.y);
        if (hit) {
          world.state.moveTarget = stationCentre(hit);
          mouseStation = hit;
          mouseStationSince = performance.now();
        } else {
          world.state.moveTarget = { x: click.x, y: click.y };
          mouseStation = null;
        }
      }
    }
    // Mouse-held station: keep interacting while close; chop holds until done,
    // other stations get one short pulse so assembly never toggles back.
    if (mouseStation) {
      if (nearStation(world.state, mouseStation)) {
        interact = true;
        if (mouseStation === 'chop') {
          const stillRaw = world.state.tray.some((k) => {
            const [id, st] = k.split(':');
            const ing = INGREDIENTS[id];
            return st === 'raw' && ing && (ing.prep === 'chop' || ing.prep === 'chopcook');
          });
          if (!stillRaw && !world.state.chopping) mouseStation = null;
        } else if (performance.now() - mouseStationSince > 250) {
          mouseStation = null;
        }
      } else if (dir.dx !== 0 || dir.dy !== 0) {
        mouseStation = null; // keyboard movement cancels the mouse walk
      }
    }
    if (autoMode === 'win') {
      const ai = autopilotInput();
      dir = ai;
      interact = ai.interact;
      world.state.moveTarget = null;
    } else if (autoMode === 'lose') {
      dir = { dx: 0, dy: 0 };
      interact = false;
    }
    const events = world.step(STEP, { dx: dir.dx, dy: dir.dy, interact }, false);
    handleEvents(events);
    if (events & (EVENT_WIN | EVENT_LOSE)) endGame(events);
  }

  function hitStation(x, y) {
    for (const c of STATIONS.crates) {
      if (x >= c.x - 8 && x <= c.x + c.w + 8 && y >= c.y - 8 && y <= c.y + c.h + 8) return `crate:${c.id}`;
    }
    const inRect = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (inRect(STATIONS.chop)) return 'chop';
    if (STATIONS.stove.some((s, i) => inRect(s))) return `stove:${STATIONS.stove.findIndex((s) => inRect(s))}`;
    if (inRect(STATIONS.assembly)) return 'assembly';
    if (inRect(STATIONS.pass)) return 'pass';
    if (inRect(STATIONS.bin)) return 'bin';
    return null;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    if (autoMode === 'win' && !autoStarted && screen === SCREEN_TITLE) {
      autoStarted = true;
      startGame();
    }
    if (autoMode === 'lose' && !autoStarted && screen === SCREEN_TITLE) {
      autoStarted = true;
      startGame();
    }
    renderer.draw(world.state, world, screen, best);
    exposeState(screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stopSizzle();
      announce('Paused.');
    }
  });

  announce('Padang Kilat. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
