// Padang Kilat — main.js
// The wiring: canvas, loop, screens, URL params, sim + screenshot hooks.
// Rules live in world.js, drawing in render.js, sound in audio.js — this
// file only connects them. A sim run (?sim=1) never starts the animation
// loop and never touches audio; the harness drives step() itself through
// window.__padang.
import { createWorld, updateWorld, autoInput, snapshot } from './world.js';
import { drawGame } from './render.js';
import { createAudio } from './audio.js';
import { attachInput } from './input.js';
import { W, H, STAGES, RECIPE_BY_ID, KUNTI } from './config.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 20261125) || 20261125;
const autoMode = params.get('auto'); // 'win' | 'lose' | null
const shot = params.get('shot'); // 'play' | 'start' | 'chop' | 'serve' | null
const simMode = params.has('sim');

const canvas = document.getElementById('game');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');
const audio = createAudio();
const input = attachInput(canvas);

let world = createWorld(seed);
let screen = 'title'; // 'title' | 'play' | 'pause' | 'over'
let frozen = false; // shot staging: draw one frame, never simulate
let moveTarget = null;
let last = performance.now();
let raf = null;

function reset(s) {
  world = createWorld(s || seed);
  screen = simMode ? 'play' : 'title';
  frozen = false;
  moveTarget = null;
  audio.setHorror(false);
}
function startGame() {
  if (screen !== 'title') return;
  screen = 'play';
  audio.start();
}
// ---------------------------------------------------------------- input
function readPlayerInput() {
  const k = input.keys;
  let dx = 0;
  let dy = 0;
  if (k.w || k.arrowup) dy -= 1;
  if (k.s || k.arrowdown) dy += 1;
  if (k.a || k.arrowleft) dx -= 1;
  if (k.d || k.arrowright) dx += 1;
  // The condiment button (top-right of the HUD) is a click, not a move.
  let unlock = input.unlock;
  if (input.click) {
    const c = input.click;
    if (c.x >= 1150 && c.x <= 1266 && c.y >= 10 && c.y <= 54) unlock = true;
    else moveTarget = { x: c.x, y: c.y };
  }
  let mx;
  let my;
  if (dx !== 0 || dy !== 0) {
    moveTarget = null;
    const len = Math.hypot(dx, dy);
    mx = world.chef.x + (dx / len) * 60;
    my = world.chef.y + (dy / len) * 60;
  } else if (moveTarget) {
    mx = moveTarget.x;
    my = moveTarget.y;
    if (Math.hypot(moveTarget.x - world.chef.x, moveTarget.y - world.chef.y) < 14) {
      moveTarget = null;
    }
  } else {
    mx = world.chef.x;
    my = world.chef.y;
  }
  return {
    mx, my,
    interact: input.interact,
    interactHeld: input.interactHeld,
    unlock,
    click: input.click,
  };
}
// ---------------------------------------------------------------- step
function step(dt, rawInput) {
  if (frozen || screen !== 'play') return;
  let inp;
  if (rawInput) inp = rawInput;
  else if (autoMode === 'win') inp = autoInput(world);
  else if (autoMode === 'lose') inp = { mx: world.chef.x, my: world.chef.y, interact: false, interactHeld: false, unlock: false, click: null };
  else inp = readPlayerInput();
  updateWorld(world, dt, inp);
  // Drain the sound queue the world filled this frame.
  for (const name of world.sfx) {
    const fn = audio.sfx[name];
    if (fn) fn();
  }
  world.sfx.length = 0;
  audio.setHorror(world.kuntilanak.status === 'active');
  if (world.phase === 'over') {
    screen = 'over';
    audio.stop();
  }
}
// ---------------------------------------------------------------- shots
// A staged frame for screenshots: a fixed world, frozen, so the shot is
// reproducible. Tickets are built by hand here (never by reading game code).
function seatTicket(t, seatIndex) {
  t.state = 'seated';
  t.seat = seatIndex;
  world.seats[seatIndex].ticket = t;
  world.tickets.push(t);
}
function stageShot(name) {
  frozen = true;
  screen = 'play';
  if (name === 'start') {
    screen = 'title';
    seatTicket({
      id: 901, name: 'Nasi Rendang', needs: RECIPE_BY_ID['nasi-rendang'].needs,
      coins: 20, mood: 'HAUS', hijab: true, patience: 52, patienceMax: 60,
      queueTimer: 0, state: 'seated', seat: 0,
    }, 0);
    seatTicket({
      id: 902, name: 'Ayam Pop', needs: RECIPE_BY_ID['ayam-pop'].needs,
      coins: 16, mood: 'normal', hijab: false, patience: 44, patienceMax: 50,
      queueTimer: 0, state: 'seated', seat: 1,
    }, 1);
    return;
  }
  if (name === 'chop') {
    world.stageIndex = 0;
    world.stageTime = 40;
    world.stageTimeLeft = 80;
    world.coins = 12;
    world.chef.x = 660;
    world.chef.y = 380;
    world.board.item = { ing: 'daging', state: 'raw' };
    world.board.progress = 1.3;
    world.board.chopping = true;
    seatTicket({
      id: 903, name: 'Nasi Rendang', needs: RECIPE_BY_ID['nasi-rendang'].needs,
      coins: 20, mood: 'LAPAR', hijab: false, patience: 38, patienceMax: 60,
      queueTimer: 0, state: 'seated', seat: 0,
    }, 0);
    return;
  }
  if (name === 'serve') {
    world.stageIndex = 2;
    world.stageTime = 70;
    world.stageTimeLeft = 110;
    world.coins = 88;
    world.chef.x = 1100;
    world.chef.y = 420;
    world.chef.startle = 2.0;
    world.chef.scared = 1.6;
    world.shake = 0.7;
    world.dim = 1;
    world.kuntilanak = { status: 'active', timer: 30, served: 0, quiet: 0 };
    world.chef.tray = [{ items: RECIPE_BY_ID['sate-padang'].needs.map((n) => ({ ...n })) }];
    seatTicket({
      id: 904, name: 'Sate Padang', needs: RECIPE_BY_ID['sate-padang'].needs,
      coins: 16, mood: 'MARAH', hijab: false, patience: 12, patienceMax: 42,
      queueTimer: 0, state: 'seated', seat: 1,
    }, 1);
    return;
  }
  // 'play': a busy lunch rush, frozen mid-service.
  world.stageIndex = 1;
  world.stageTime = 56;
  world.stageTimeLeft = 94;
  world.coins = 42;
  world.streak = 3;
  world.chef.x = 640;
  world.chef.y = 400;
  world.chef.tray = [{ items: RECIPE_BY_ID['gulai-ayam'].needs.map((n) => ({ ...n })) }];
  world.assembly.plate.items = [{ ing: 'nasi', state: 'cooked' }, { ing: 'ayam', state: 'cooked' }];
  seatTicket({
    id: 905, name: 'Nasi Rendang', needs: RECIPE_BY_ID['nasi-rendang'].needs,
    coins: 20, mood: 'LAPAR', hijab: true, patience: 40, patienceMax: 60,
    queueTimer: 0, state: 'seated', seat: 0,
  }, 0);
  seatTicket({
    id: 906, name: 'Sate Padang', needs: RECIPE_BY_ID['sate-padang'].needs,
    coins: 16, mood: 'HAUS', hijab: false, patience: 22, patienceMax: 42,
    queueTimer: 0, state: 'seated', seat: 1,
  }, 1);
  seatTicket({
    id: 907, name: 'Gulai Ayam', needs: RECIPE_BY_ID['gulai-ayam'].needs,
    coins: 14, mood: 'MARAH', hijab: false, patience: 9, patienceMax: 50,
    queueTimer: 0, state: 'seated', seat: 2,
  }, 2);
}
// ---------------------------------------------------------------- loop
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (input.startPressed && screen === 'title') startGame();
  if (input.pausePressed && (screen === 'play' || screen === 'pause')) {
    screen = screen === 'play' ? 'pause' : 'play';
  }
  if (input.mutePressed) audio.toggleMute();
  if (input.restartPressed && (screen === 'over' || screen === 'pause')) reset();
  step(dt);
  drawGame(ctx, world, screen);
  input.endFrame();
  raf = requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'play') screen = 'pause';
});
// ---------------------------------------------------------------- boot
if (shot) stageShot(shot);
if (simMode) {
  screen = 'play';
  frozen = false;
} else if (!shot) {
  screen = 'title';
}
// The sim + probe harness: no rAF loop, no audio, the caller drives step().
window.__padang = {
  get world() { return world; },
  get screen() { return screen; },
  step(dt, rawInput) { step(dt, rawInput); },
  autoInput() { return autoInput(world); },
  snapshot() { return snapshot(world); },
  start: startGame,
  reset,
};
if (!simMode) raf = requestAnimationFrame(frame);
