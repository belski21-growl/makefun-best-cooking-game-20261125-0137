// Padang Kilat — config.js
// All of the game's data in one place: what the restaurant serves, how long
// each shift runs, where everything in the room stands. No logic lives here —
// world.js reads these tables, render.js draws from them. Nothing here is
// copied from anywhere; every number below is my own choice for this game.
//
// The room is a 1280x720 canvas. The top band (y 0..168) is the wall + the
// ticket board; the floor (y 168..720) is where the chef walks. Stations sit
// along the top of the floor, customer tables along the bottom, and a wide
// open corridor runs between them so the chef never gets wedged.

export const W = 1280;
export const H = 720;
export const HUD_H = 64; // top bar: title, stage, coins, clock, combo
export const BOARD_H = 104; // ticket board band under the HUD (y 64..168)
export const WALL_H = 168; // whole top band; the floor starts below it

export const TRAY_MAX = 3; // finished plates the chef can carry at once
export const CHEF_SPEED = 265; // pixels per second
export const CHEF_R = 16; // chef collision radius
export const WIN_COINS = 100; // coins needed by the end of MALAM to win
export const FAILS_PER_STAGE = 3; // failed tickets that end a stage early
export const QUEUE_WAIT = 25; // seconds a customer waits at the door
export const EAT_TIME = 5; // seconds a served customer eats before freeing a seat

// ---------------------------------------------------------------- ingredients
// prep: 'none' (ready as-is), 'chop', 'cook', 'chopcook' (chop, then cook).
// chop/cook are the seconds the step takes. cold drinks get ice + mist.
// state names on a plate: 'raw' -> 'chopped' -> 'cooked'; 'ready' for prep 'none'.
export const INGREDIENTS = [
  { id: 'nasi', name: 'Nasi', color: '#f7f2e2', dark: '#d3c49b', prep: 'cook', cook: 4 },
  { id: 'daging', name: 'Daging', color: '#b4552d', dark: '#7e3418', prep: 'chopcook', chop: 2, cook: 5 },
  { id: 'ayam', name: 'Ayam', color: '#e8b25a', dark: '#a87a2e', prep: 'chopcook', chop: 2, cook: 5 },
  { id: 'telur', name: 'Telur', color: '#fdf6d8', dark: '#d9c98f', prep: 'cook', cook: 4 },
  { id: 'daunUbi', name: 'Daun Ubi', color: '#3f7a3a', dark: '#24511f', prep: 'chop', chop: 2 },
  { id: 'cabai', name: 'Cabai', color: '#c22e2e', dark: '#7e1a1a', prep: 'chop', chop: 1.5 },
  { id: 'indomie', name: 'Indomie', color: '#f2c14e', dark: '#b98a1e', prep: 'cook', cook: 3 },
  { id: 'ketupat', name: 'Ketupat', color: '#cfe3b8', dark: '#8aa86a', prep: 'none' },
  { id: 'sambalIjo', name: 'Sambal Ijo', color: '#5da24a', dark: '#35702a', prep: 'none' },
  { id: 'esTeh', name: 'Es Teh', color: '#a8642e', dark: '#6e3f1a', prep: 'none', cold: true },
  { id: 'tehTalua', name: 'Teh Talua', color: '#e8c96a', dark: '#a8842e', prep: 'none' },
  { id: 'esJeruk', name: 'Es Jeruk', color: '#f2a541', dark: '#b97a1e', prep: 'none', cold: true },
];
export const ING_BY_ID = Object.fromEntries(INGREDIENTS.map((g) => [g.id, g]));
export const DRINKS = ['esTeh', 'tehTalua', 'esJeruk'];

// ---------------------------------------------------------------- recipes
// needs: the exact items a finished plate must hold (ingredient + state).
// A plate matches a ticket only when its contents equal the recipe exactly.
// Rendang is the signature: the most coins in the house.
export const RECIPES = [
  { id: 'nasi-rendang', name: 'Nasi Rendang', coins: 20, signature: true,
    needs: [{ ing: 'nasi', state: 'cooked' }, { ing: 'daging', state: 'cooked' }] },
  { id: 'indomie-rendang', name: 'Indomie Rendang', coins: 18,
    needs: [{ ing: 'indomie', state: 'cooked' }, { ing: 'daging', state: 'cooked' }] },
  { id: 'ayam-pop', name: 'Ayam Pop', coins: 16,
    needs: [{ ing: 'ayam', state: 'cooked' }, { ing: 'nasi', state: 'cooked' }] },
  { id: 'sate-padang', name: 'Sate Padang', coins: 16,
    needs: [{ ing: 'daging', state: 'cooked' }, { ing: 'ketupat', state: 'ready' }, { ing: 'sambalIjo', state: 'ready' }] },
  { id: 'gulai-ayam', name: 'Gulai Ayam', coins: 14,
    needs: [{ ing: 'ayam', state: 'cooked' }, { ing: 'cabai', state: 'chopped' }] },
  { id: 'dendeng-balado', name: 'Dendeng Balado', coins: 14,
    needs: [{ ing: 'daging', state: 'cooked' }, { ing: 'cabai', state: 'chopped' }] },
  { id: 'nasi-sayur', name: 'Nasi Sayur Singkong', coins: 14,
    needs: [{ ing: 'nasi', state: 'cooked' }, { ing: 'daunUbi', state: 'chopped' }] },
  { id: 'telur-balado', name: 'Telur Balado', coins: 14,
    needs: [{ ing: 'telur', state: 'cooked' }, { ing: 'cabai', state: 'chopped' }] },
];
// The secret ninth recipe: only ever offered as a ticket after five straight
// serves. It is the richest plate on the menu.
export const SECRET_RECIPE = {
  id: 'nasi-kapau', name: 'Nasi Kapau', coins: 25, secret: true,
  needs: [
    { ing: 'nasi', state: 'cooked' },
    { ing: 'daging', state: 'cooked' },
    { ing: 'telur', state: 'cooked' },
    { ing: 'sambalIjo', state: 'ready' },
  ],
};
export const RECIPE_BY_ID = Object.fromEntries(
  [...RECIPES, SECRET_RECIPE].map((r) => [r.id, r]),
);

// ---------------------------------------------------------------- moods
// A ticket's mood changes its economics. HAUS always adds a drink to the
// order; LAPAR pays a quarter more; TIDAK SELERA and LESU are patient.
export const MOODS = {
  normal: { label: '', color: '#fff6e3', patience: 1, coins: 1, drink: false },
  HAUS: { label: 'HAUS', color: '#3a86d8', patience: 1, coins: 1, drink: true },
  LAPAR: { label: 'LAPAR', color: '#c22e2e', patience: 1, coins: 1.25, drink: false },
  'TIDAK SELERA': { label: 'TIDAK SELERA', color: '#8a8a8a', patience: 1.5, coins: 1, drink: false },
  LESU: { label: 'LESU', color: '#b98a1e', patience: 1.25, coins: 1, drink: false },
  // MARAH is not rolled at spawn — a ticket turns MARAH when its patience
  // drops under 25% — but the ticket card reads MOODS[t.mood] too, so the
  // entry must exist here or the card crashes.
  MARAH: { label: 'MARAH', color: '#c22e2e', patience: 1, coins: 1, drink: false },
  PUAS: { label: 'PUAS', color: '#5da24a', patience: 1, coins: 1, drink: false },
  KENYANG: { label: 'KENYANG', color: '#5da24a', patience: 1, coins: 1, drink: false },
};
export const MOOD_TABLE = [
  ['normal', 0.45],
  ['HAUS', 0.18],
  ['LAPAR', 0.15],
  ['TIDAK SELERA', 0.12],
  ['LESU', 0.10],
];

// ---------------------------------------------------------------- stages
// target is cumulative coins by the end of the stage. Three failed tickets
// end a stage early (PAGI/SIANG roll on; MALAM ends the game). The win is
// decided on total coins at the end of MALAM.
export const STAGES = [
  { name: 'PAGI', subtitle: 'Jam Buka', seconds: 120, target: 25, spawnEvery: 20, patience: 60 },
  { name: 'SIANG', subtitle: 'Jam Makan', seconds: 150, target: 60, spawnEvery: 15, patience: 50 },
  { name: 'MALAM', subtitle: 'Jam Ramai', seconds: 180, target: 100, spawnEvery: 12, patience: 42 },
];

// ---------------------------------------------------------------- the room
// Stations the chef works at (rects in floor space). The crates hold all
// twelve ingredients in ONE ROW along the top; the board is where chopping
// happens; the two stoves cook; the assembly counter builds plates; the
// etalase is where finished plates are served; the bin throws a held item
// away. (An earlier 3x4 crates block walled its left column in — the
// passages around it were 4-10px, narrower than the chef's 32px body, so
// the left column could never be reached and the autopilot froze.)
export const STATIONS = {
  crates: { x: 16, y: 192, w: 1248, h: 72, label: 'BAHAN' },
  board: { x: 596, y: 312, w: 168, h: 66, label: 'TALENAN' },
  stove1: { x: 812, y: 312, w: 124, h: 82, label: 'KOMPOR 1' },
  stove2: { x: 972, y: 312, w: 124, h: 82, label: 'KOMPOR 2' },
  assembly: { x: 470, y: 440, w: 340, h: 66, label: 'MEJA RACIK' },
  pass: { x: 1124, y: 300, w: 140, h: 216, label: 'ETALASE · SAJI' },
  bin: { x: 16, y: 644, w: 112, h: 60, label: 'BUANG' },
};
// Crate of ingredient i (0..11): one row of 12 cells inside STATIONS.crates.
export function crateRect(i) {
  const c = STATIONS.crates;
  const cw = c.w / 12;
  return { x: c.x + i * cw + 4, y: c.y + 4, w: cw - 8, h: c.h - 8 };
}
// The three customer tables: three different shapes on purpose — round, a
// square under a white cloth, and one long bench. They are solid obstacles.
export const TABLES = [
  { x: 252, y: 566, w: 132, h: 88, shape: 'round', label: 'Meja Bundar' },
  { x: 556, y: 566, w: 152, h: 88, shape: 'square', label: 'Meja Taplak' },
  { x: 828, y: 606, w: 224, h: 56, shape: 'bench', label: 'Bangku Panjang' },
];
// The three seats tickets sit in (one per table, at the table's front edge).
export const SEATS = [
  { x: 318, y: 668 },
  { x: 632, y: 668 },
  { x: 940, y: 676 },
];
// The door, bottom-right: the queue forms here. The BUKA sign hangs beside
// it, fully inside the frame.
export const DOOR = { x: 1088, y: 648, w: 116, h: 72 };
export const CHEF_START = { x: 640, y: 390 };

// ---------------------------------------------------------------- kuntilanak
// She only comes at night. After 60s of MALAM, if the kitchen has been quiet
// (no open ticket) for ~8s, she drifts in above the etalase and orders three
// Sate Padang in 45s. Win her order: +40 coins and the Berani! badge. Fail
// it: -20 coins and the rest of the night is cut in half.
export const KUNTI = {
  earliest: 60, quiet: 8, time: 45, reward: 40, fail: -20, sateNeed: 3,
};
// ---------------------------------------------------------------- easter eggs
export const FLYING_PLATE_COINS = 25; // click the haunted plate, 1-2x a stage
export const KAPAU_STREAK = 5; // straight serves that arm the secret recipe
// ---------------------------------------------------------------- condiments
// Kerupuk (kulit, peyek udang, kerupuk udang) starts locked. Unlock once a
// game for 30 coins; seated customers then help themselves every ~2.5s,
// +2 coins a take, at most 3 takes per customer.
export const CONDIMENT = { cost: 30, coins: 2, cap: 3, every: 2.5 };
// ---------------------------------------------------------------- scoring
export const KILAT_TIP = 3; // serve before half the patience runs out
export const WALKOUT_COST = 10; // a customer who leaves angry costs this
export const COMBO_STEP = 0.15; // multiplier grows 0.15 per streak, cap 2x

// ---------------------------------------------------------------- palette
export const PALETTE = {
  cream: '#f6ead0',
  floorA: '#e9d9b8',
  floorB: '#dfc79a',
  wall: '#f3e2bd',
  songket: '#a31621',
  songketGold: '#e8b13c',
  wood: '#8a5a2e',
  woodDark: '#5f3a1a',
  teal: '#1f6f6b',
  ink: '#2b1d12',
  paper: '#fff6e3',
  gold: '#f2b234',
  red: '#c22e2e',
};
