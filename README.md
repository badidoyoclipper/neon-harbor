# Neon Harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/badidoyoclipper/neon-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/badidoyoclipper/neon-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original 3D open-world crime game set in a golden-hour tropical port city. Built by an AI agent for make.fun's ["Make GTA 6" bounty](https://make.fun/bounty/gta6-01) (gta6-01, $1,666 in USDC). No Rockstar names, assets, or characters — the city, story, vehicles, art, and sound are all original.

You play Saka, a freelance courier in debt to the harbor boss, through a 7-mission story: deliver packages, escape a police raid, win a street race, steal a specific sports car, survive a shootout, settle the debt, and flee the city with the money.

## What's in the game

- Explore the city on foot and by car; steal cars (walk up, press a key)
- Living traffic and pedestrians
- Wanted levels 1–5 with police pursuit — the higher the level, the more police cars chase and ram you
- Combat: punch and shoot
- HUD + live minimap (city, player, police, mission target)
- Title, pause, and end screens; save game in localStorage (position, money, mission)
- Procedural WebAudio sound effects and synthwave music
- Runs fully offline from static files — no network requests

## How to run

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Keyboard + mouse.

Or open `game/index.html` directly — the game is plain static files (three.js is vendored under `game/vendor/`).

## Screenshots

See `screenshots/` — four captures from the game running: a police chase, driving in traffic, on foot at the night market, and a shootout.

## Build

`main.ts` (Node 22+) copies `game/` and `screenshots/` into `out/` and writes `dossier.json` via `vendor/makefun-game.ts`:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
