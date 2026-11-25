# Top-10 analysis — best-cooking-game-20261125-0137 ("Make the best cooking game")

Written 25 Nov 2026 ~14:25 WIB, pre-build (½ window). Competition: opens 25 Nov
08:37 WIB, deadline 25 Nov 20:37 WIB (12-hour window), $250 (10 places:
$60/$40/$30/$25/$20/$15×5), sponsor make.fun (verified). Blind rounds
11:37 / 14:37 / 17:37 / 20:37 WIB. Result due 10 Des 01:37 UTC.
Pivot 25 Nov ~15:00 WIB (user's call): generic street-kitchen → Rumah Makan
Padang; menu + analysis updated, mechanics unchanged.
New direction 25 Nov ~15:08–15:32 WIB (user's calls, in priority order):
(1) 3 stages PAGI (120s, slow) — SIANG (150s, rush) — MALAM (180s, fastest +
kuntilanak), each with its own coin target, 3 fails in one stage ends THAT
stage (next stage still runs; MALAM ends the game), total coins decide the
win (target 100). (2) KUNTILANAK mystery in MALAM when the kitchen is quiet
(no tickets for ~8s after 60s): she orders 3× Sate Padang; her timer is 45s
(NOT the 25s first suggested — 25s is unwinnable: one sate alone needs ~20s
of chop+cook+walk, three need ~45s even played well); success +40 coins +
"Berani!" badge, fail −20 coins + the rest of the night halved + scared chef
+ screen shake + horror sting + her laugh. (3) Visual WOW: full 3D rewrite
NOT feasible in the remaining time (would risk the game not finishing) —
"2.5D" on the existing canvas instead: drop shadows, food highlight/shading,
perspective floor, warm lamp glow, steam from hot dishes, cold-mist + ice on
cold drinks, shine on the etalase, serve particles + floating "+20" coin text,
screen shake on fail, chef walk + knife-swing animation, bigger higher-contrast
HUD. (4) Easter eggs, 2 of 3 built: (a) flying plate (1–2× per stage, click
= +25 "Piring Hantu"), (b) secret Nasi Kapau (9th recipe, only as a ticket
after 5 straight serves, 25 coins); (c) flickering lamp is NOT a standalone
egg — its flicker/dim is now part of the kuntilanak horror. (5) Customer
status, visible on tickets + a face in the etalase window: HAUS (ticket always
carries a drink), LAPAR (double portion, +25% coins), TIDAK SELERA (small
order, patience ×1.5), LESU (patience ×1.25), MARAH (patience under a quarter
— red face, red bar), PUAS/KENYANG after a serve (Pelayanan Kilat: serve
before half the patience runs out = +3 coin tip + happy face). (6) Seating
queue (user 25 Nov ~15:30, CORRECTED 15:32): customers arrive and queue at the
door for one of 3 chairs; a visible timer hangs over each queuing customer;
their ticket's patience only runs once they are seated; a customer who waits
too long leaves angry with a red "!" and costs −10 coins (floating "-10") —
NOT a failed ticket, NOT counted in the 3 fails (the earlier "counts as a
fail" instruction was corrected by the user). A served customer eats ~5s then
frees the seat. (7) Horror when she appears (user 25 Nov ~15:29): the room
dims + a dark vignette closes in, the lamps flicker/dim, thin fog drifts in,
the screen sways slowly, her ticket runs blood-red on black, the sizzle
ambience stops (silence — there is no background music track in this game, the
sizzle IS the ambience) + sting + her laugh. All of it is drawn, so it reads
in a screenshot, not only in sound.
Classification: BERAT (game lengkap multi-sistem + art + screenshot + dossier).
half_at 2026-11-25T14:37:00+07:00. Target submit: blind round 17:37 WIB;
latest final 20:37 WIB.

## What could actually be observed (honest limitation)

The leaderboard is BLIND: `GET /api/competitions/<slug>/leaderboard` returns
`entries: []`, `metrics_withheld: true`, `scores_visible: false`. `GET .../rounds`
returns `judged: 1` (round 11:37 done), `ranked: [648, null, null, null]`,
`board: "hidden"` — no own entry yet, so the ±5 board is unavailable. The
bounty page's Feed (judged entries' screenshots) is JS-rendered and not
reachable through any public API route (`/api/activity/entries` ignores the
competition filter; `/feed` route does not exist). **No live top-10 entry,
screenshot, or playable top-10 game could be seen.** This analysis is therefore
built on (a) the judge's five published criteria, verbatim from
competition.yaml, (b) the known house baseline — the kit starter, whose
dossier is byte-for-byte a house game — and (c) field facts (648 ranked in
round 1; submissionCount 4,507).

## The judge (verbatim criteria, most important first)

1. **Complete cooking game, shown in screenshots of the game itself:** a
   kitchen and an order board, ingredients on the counter, one dish
   mid-assembly, a timer and a plate ready to serve. An entry that is not a
   playable game loses to one that is.
2. **Fun and depth:** orders that push you to plan a route through the
   kitchen, recipes that combine in different ways, and pressure that grows
   without adding chores.
3. **Feel and polish:** chopping and plating that answer at once, a timer you
   can feel, and a service rush that reads in a glance.
4. **Look and originality:** food drawn so it looks worth serving, counters
   you can read at a glance, and a kitchen with a look of its own. An entry
   copying an existing commercial game's names, characters, art, music or
   levels loses to an original one.
5. **Structure:** the outline shows the game's own source split into files
   with one clear job each, named for what they do.

Mechanics that decide: pairwise, no ties, margin 1–5 (a decisive win counts
for a full win, a close call for little); first criterion on which entries
differ decides unless a later one differs by much more. The judge sees mostly
screenshots — one JPEG contact sheet (cover 768×480 on top, others smaller
beneath) plus a short source outline (≤1,536 tokens/entry). **Screenshots must
read at a glance when shrunk.** Final heat: top 40 dev-board entries → 3 Swiss
rounds → playoff top 12; playoff entries place above non-playoff. Copy rule:
a screenshot byte-identical to another account's earlier entry takes no place.

## The known baseline: kit starter "Block Dodger" (house game)

- 623 lines, 4 screens (title/play/paused/game over), one mechanic: dodge
  falling blocks, catch coins. NOT a cooking game at all.
- It fails judge criterion 1 outright and scores ~zero on criteria 2–4. Any
  complete cooking game beats it by a wide margin; it is the floor, not the
  bar. The real bar is the other complete entries. Four fixed house games are
  judged alongside every heat; their strength was measured pre-contest.

## Field reading

- 648 entries ranked in round 1 (submitted before 11:37 WIB and graded);
  submissionCount 4,507. A field this large is mostly thin (starter clones,
  incomplete games, single-mechanic toys): the gate + criterion 1 cut most of
  them. A complete, winnable, demonstrably playable game with all five
  criterion-1 elements in ONE frame should clear the top-40 dev-board cut for
  the final heat.
- The top-10 prize line is a different fight: it needs beating the other
  complete, polished cooking games, where criterion 2 (depth: route-planning
  orders + combining recipes + rising pressure) and criterion 4 (look: food
  worth serving + a kitchen with its own look) decide. Sharpest edge:
  completeness + proven playability; softest spot: generic tile-kitchen look
  (the judge warns the kitchen must have "a look of its own" — a plain
  top-down tile set is the equivalent of heist's generic checkerboard floor).

## ATM plan — what our build must show (amati, tiru, modifikasi)

Concept (ORIGINAL, no commercial copy): a Rumah Makan Padang — working title
"Padang Kilat" (name/art/sounds our own; no real chain names — "Sederhana" and
other existing chains NOT used; no Overcooked, Cooking Mama, or other
commercial names, characters, art, music, or levels). Menus picked for what
foreign visitors know best (sources: travel guides + Wikipedia's Padang
cuisine): Rendang is the signature (the most famous Indonesian dish abroad,
the one foreigners know first), Indomie Rendang pairs the world's most famous
instant noodle with rendang flavour, Ayam Pop / Sate Padang / Gulai Ayam /
Dendeng Balado / Sayur Singkong / Telur Balado are the classic hidang dishes,
Es Teh Manis / Teh Talua / Es Jeruk the familiar drinks, Sambal Ijo the
signature condiment.

- **Criterion 1 — all five elements in the COVER frame (1-play):** kitchen
  (stove, chopping board, sink, fridge, etalase), order board (3+ tickets with
  dish icons + patience bars), ingredients on the counter (visible, labelled,
  distinct colours/shapes), ONE dish mid-assembly (plate half-built on the
  assembly counter, progress visible), a timer (shift clock + per-ticket patience, big
  and readable), a plate ready to serve (finished dish glowing on the etalase).
  4 screenshots total: 1-play (cover, mid-service), 2-start (title over a
  live kitchen), 3-chop/assembly (action close-up), 4-serve/rush (serve moment
  or end-of-shift result). All real renders of the game's own code.
- **Criterion 2 — depth:** 8 Padang menus that combine the same 12 ingredients
  in different ways (e.g. nasi + daging rendang vs mie + daging rendang vs
  daging + ketupat + sambal ijo); orders
  force route planning (chop station → stove → assembly → pass, stations far
  apart, carrying one item at a time); pressure grows via ticket rate +
  patience shrink, NOT via extra chores; combos/streak bonus; 3 stages with
  different pace + targets (PAGI slow for learning, SIANG rush, MALAM fastest
  + kuntilanak); customer moods change the economics (HAUS always has a drink,
  LAPAR pays +25%, TIDAK SELERA is patient, Pelayanan Kilat tips +3); a
  seating queue (3 chairs, visible queue timer, −10 for a walk-out) adds a
  second pressure axis — seats, not just tickets; winnable AND
  losable (shift ends: win on target coins, lose on too many failed tickets)
  — both proven by an autopilot or scripted play-test.
- **Criterion 3 — feel:** chopping/plating respond instantly (visible chop
  progress + sound at once); timer felt (patience bars drain, ticket flashes
  red under 25%, rush bell + music tempo up in the last 60s); service rush
  readable in one glance (order board always on top, colour-coded urgency).
  Synthesised WebAudio (chop, sizzle, ding, serve chime, rush sting); pause
  on tab-hide; keyboard (WASD/arrows + E interact, Space chop) + mouse
  (click stations) both work. The kuntilanak arrival is a feel event in itself:
  sting + laugh, the sizzle ambience cuts to silence, the room dims and sways,
  her ticket turns blood-red — and the scared chef's face + "!!!" sells the fail.
- **Criterion 4 — look:** warm Padang palette (terracotta/teal/cream, NOT
  generic grey tile); food drawn chunky and appetising (each ingredient a
  distinct silhouette + colour); counters readable at a glance (icons +
  labels, no tiny text); kitchen identity (batik-trim etalase with stacked
  plates, hanging lamps, steam). 2.5D: drop shadows under every station,
  perspective floor tiles converging on a vanishing point, warm lamp pools,
  steam from hot dishes and pots, ice + dew + cold mist on cold drinks, gloss
  on the etalase, serve particles + floating coin text. The dining room reads
  too: a door, three chairs, queuing customers with timer bars and mood faces,
  an etalase-window face that mirrors the oldest ticket's mood. Cover must survive shrinking to 768×480 in the judge's contact
  sheet: big HUD, high contrast, no text under ~14px logical.
- **Criterion 5 — structure:** modules with one clear job each, named for
  what they do (config, random, input, kitchen/level, orders, recipes,
  world, render, audio, shots, main) + main.ts hand-in per starter +
  serve.ts; vendor/makefun-game.ts unchanged (kit sha256 per kit.json);
  dossier < 1.5 MiB; game/index.html ≤ 1 MiB; game/ ≤ 993 files, ≤ 48 MiB;
  screenshots 3–4, each ≤ 256 KiB, long side ≤ 1280, short side ≥ 480.

## Chase-top-10 targets (user rule 22 Nov, binding)

- Target: estimated rank TOP 10. Floor: rank 25. Estimated top-50 chance
  ≥30% (target 50%+). If the post-build estimate is still ≥50, the build is
  NOT useful — do one more highest-impact improvement round + Goldfish
  re-review. Numbers must rise through real improvements, never inflated.
- Focus is NOT limited to one area: chase whatever is weakest (art,
  structure, gameplay, facts, layout — anything).
- After submitting before 17:37 WIB, round 3 gives our rank + ±5 board: that
  is the ⅓–½ checkpoint — if outside top 25 / prize zone, analyse the
  neighbours, improve, and resubmit before the final 20:37 WIB (if rounds
  remain + after user approval).

## Verdict sought from Goldfish

Score per criterion (/25 total), verdict LAYAK SUBMIT / LAYAK LANJUT BELUM
LAYAK SUBMIT / TIDAK LAYAK + blocker + major, estimated rank + top-50 chance,
with evidence from the 4 screenshots (read as images) + build-log + code diff.
