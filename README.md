# THE HOLE

![Version](https://img.shields.io/badge/version-0.5.4b-a855f7?style=flat-square)
![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-blue?style=flat-square)
![Platform](https://img.shields.io/badge/platform-web-ff3050?style=flat-square)
![Mobile](https://img.shields.io/badge/mobile-ready-40dd60?style=flat-square)
![Languages](https://img.shields.io/badge/languages-12-ff9020?style=flat-square)
![No Build](https://img.shields.io/badge/build-none-555?style=flat-square)
![Cloudflare](https://img.shields.io/badge/deploy-Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)

**Tap the dot. Trace the line. Feed the void.**

A reflex-based web game where precision meets speed. Trace lines shooting from a pulsing red dot before they fade — grow a black hole, stack multipliers, climb the leaderboard.

---

## How It Works

1. A red dot pulses on the edge of a circle
2. Tap it — a line shoots outward
3. Drag your finger along the line before it fades
4. Accuracy + speed + coverage = score
5. The black hole grows. The timer shrinks. Repeat.

## Game Modes

| | Classic | Arcade |
|---|---------|--------|
| **Line scaling** | +1 line per tier (every 100 rounds) | +1 line every round (max 10) |
| **Difficulty curve** | Slow burn | Rapid escalation |
| **Leaderboard** | Separate | Separate |
| **Best for** | Endurance | Intensity |

## Scoring

```
BASE        = accuracy × 400 + coverage × 200
ACC BONUS   = 95%+ ×1.5 · 90%+ ×1.4 · 85%+ ×1.3 · 80%+ ×1.2 · 75%+ ×1.1
TIME BONUS  = seconds remaining × 100 (final line only)
STREAK      = ×1.1 per completed line (2nd line ×1.1, 3rd ×1.2, ...)
COMPOUND    = ×1.5 (bonus line only)
LEVEL MULT  = increases every 10 rounds

FINAL = (BASE × ACC_BONUS + TIME_BONUS) × LEVEL × STREAK × COMPOUND
```

## Multi-Line Rounds

In multi-line rounds, dots appear **staggered** — tapping one reveals the next. The timer starts on your first tap and runs continuously.

- Complete all required lines → round clear
- Last line is always a **bonus** — optional, but worth ×1.5 compound on top of the streak
- Miss the bonus? No penalty. Time runs out after required lines done? Still counts.

## Features

**Gameplay**
- Two modes: Classic (endurance) and Arcade (intensity)
- Multi-line rounds with staggered dot reveal and streak multipliers
- Bonus line compound system
- Checkpoint + retry system (3 retries, bonus retries for 95%+ accuracy)
- Timer decay per round
- First-fail tutorial

**Audio**
- Full Web Audio API synthesis — no audio files
- Ambient drone, laser swish, success thrum, fail tone, score chimes, accuracy shimmer
- Dot pulse synced to ambient LFO

**Visuals**
- Black hole canvas: 4 wobble layers, 40 accretion particles
- Portal effect on round clear — color-coded by bonus count
- HUD shake on low timer
- Background blob animation

**i18n**
- 12 languages: `ENG` `ESP` `FRA` `DEU` `POR` `ITA` `JPN` `KOR` `ZHO` `RUS` `ARA` `HIN`
- Auto-detected via `navigator.language`

---

## Architecture

```
the-hole/
├── index.html              ← The entire game (standalone, ~2300 lines)
├── CHANGELOG.md            ← Version history
├── README.md               ← You are here
└── functions/
    └── api/
        ├── scores.js       ← GET /api/scores?mode=classic|arcade
        └── submit.js       ← POST /api/submit (server-side replay)
```

**Zero build step.** React 18 + Babel loaded from CDN. One HTML file. Deploy anywhere.

## Anti-Cheat

The client **never sends a score**. It sends raw round data:

| Data sent | Purpose |
|-----------|---------|
| `dotAngle`, `lineAngle`, `lineLength` | Round setup |
| `dragPath` (array of `{x, y}`) | Player's actual trace |
| `circleR`, `cx`, `cy` | Layout context |
| `elapsed` | Timing |

The Worker **replays every round** from scratch. Server-side checks:

- Path too perfect → rejected (>99.5% acc + >95% coverage with <8 points)
- Elapsed < 0.05s on later rounds → rejected
- Path teleport (>200px gap) → rejected
- Rate limited: 1 submit per 5s per IP
- Profanity filter on names (PurgoMalum API, client + server)

---

## Deploy

### Cloudflare Pages + KV

**1. Create KV namespace**

```bash
wrangler kv:namespace create SCORES
```

Or: Dashboard → Workers & Pages → KV → Create → name it `SCORES`

**2. Deploy**

```bash
wrangler pages deploy . --project-name thehole
```

**3. Bind KV**

Pages project → Settings → Functions → KV namespace bindings:
- Variable name: `SCORES`
- Namespace: `SCORES`

Redeploy after binding.

**4. Verify**

```bash
# Should return {"scores":[]}
curl https://thehole.pages.dev/api/scores?mode=classic

# Should return {"scores":[]}
curl https://thehole.pages.dev/api/scores?mode=arcade
```

## API

| Method | Path | Params | Description |
|--------|------|--------|-------------|
| `GET` | `/api/scores` | `?mode=classic\|arcade` | Top 10 scores for mode |
| `POST` | `/api/submit` | JSON body | Submit raw game data |

### POST `/api/submit`

```json
{
  "name": "PLAYER",
  "mode": "arcade",
  "rounds": [
    {
      "dotAngle": 1.23,
      "lineAngle": 1.45,
      "lineLength": 128,
      "dragPath": [{"x": 200, "y": 300}],
      "circleR": 48,
      "cx": 200,
      "cy": 350,
      "elapsed": 0.84
    }
  ]
}
```

**Response:**

```json
{"success": true, "score": 4200, "rank": 3}
```

## KV Keys

| Key | Contents |
|-----|----------|
| `leaderboard:classic` | Top 10 classic scores |
| `leaderboard:arcade` | Top 10 arcade scores |
| `ratelimit:{ip}` | Rate limit flag (TTL 10s) |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Babel (CDN), vanilla CSS |
| Audio | Web Audio API (oscillators, gain nodes, noise buffers) |
| Canvas | 2D context for black hole rendering |
| Backend | Cloudflare Pages Functions |
| Storage | Cloudflare Workers KV |
| Build | None |

---

## License

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) — Free to use and modify with attribution. No commercial use.
