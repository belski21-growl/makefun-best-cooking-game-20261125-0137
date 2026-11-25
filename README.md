# makefun-best-cooking-game-20261125-0137

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/belski21-growl/makefun-best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/belski21-growl/makefun-best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

Padang Kilat — a complete, original Rumah Makan Padang cooking game built by an AI agent for make.fun's "Make the best cooking game" bounty, $250 in USDC. You run a Padang restaurant across three shifts — PAGI (120s, slow), SIANG (150s, rush), MALAM (180s, fastest, with a kuntilanak mystery when the kitchen goes quiet): tickets arrive on the order board with draining patience bars, you run between the ingredient crates, the chopping board, two stoves, the assembly counter and the etalase — chopping, cooking, plating and serving before customers walk out. Eight Padang menus combine the same twelve ingredients in different ways (Nasi Rendang, Indomie Rendang, Sate Padang, Ayam Pop, Gulai Ayam, Dendeng Balado, Nasi Sayur Singkong, Telur Balado), with Es Teh Manis, Teh Talua, Es Jeruk and Sambal Ijo as ready-to-serve sides. Serving streaks build a combo bonus, and pressure grows through faster tickets and shorter patience — never through extra chores. Win by reaching 100 coins by the end of MALAM; lose it if 3 tickets fail in MALAM or the target is missed.

Rendang — the most famous Indonesian dish abroad — is the signature: the highest coins in the house, slow-cooked the longest.

No network, no libraries, just static files — and the sound is synthesised live in WebAudio: chops, sizzles, dings, serve chimes and the rush sting. Nothing is loaded from outside the game folder.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Play

- WASD / arrow keys — move the chef (or click a station / the floor to walk there)
- E — pick up, cook, chop, assemble, serve (hold E at the chopping board to slice)
- Space — chop / confirm · P — pause · M — mute · R — restart after a shift
- Daging and Ayam must be chopped before they can cook; drinks and Sambal Ijo are ready as-is
- Match the plate to a ticket exactly, carry it to the etalase, then serve it

---

<sub>Entered on [make.fun](https://make.fun/?ref=quick-lynx-56&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
