# THE HOLE — Changelog

## v0.5.4b — 2025-03-12
### Multi-Line Overhaul & Polish
- **Staggered dot reveal**: All dots generated at round start but only the first is visible. Tapping a dot instantly reveals the next one on the circle
- **Timer starts on first tap**: Timer bar stays full until you touch your first dot, then runs continuously through all lines — no pauses
- **Streak multiplier**: Each completed line in a multi-line round increases score — ×1.1 for the 2nd line, ×1.2 for the 3rd, and so on
- **No portal between lines**: Portal animation and score breakdown only appear at round end, not between individual lines
- **Instant line transitions**: Completing a mid-round line immediately resets for the next dot tap — zero delay
- **Line count caps**: Arcade maxes at 10 lines, Classic maxes at 5
- **Time scaling formula**: 1 line = 1×, 2 lines = 1.5×, 3 lines = 2×, 4+ lines = (count-1)× base time
- **Touch input fix**: `touchAction` set to `"auto"` outside gameplay — menu scrolling, button taps, and drag all work properly on mobile. `preventDefault` only fires after confirmed dot hit
- **Tabbed Rules screen**: Classic/Arcade toggle at top of rules. Shared rules (9) shown for both modes, mode-specific rules swap below a divider
- **Tabbed Scoreboard**: Classic/Arcade toggle inside the scoreboard — switch between leaderboards without leaving the screen
- **Language selector centered**: 2 rows of 6, centered at bottom of menu, consistent on mobile and desktop
- **Rules scroll fix**: Rules and tutorial screens use `flex-start` layout with padding so titles aren't clipped on small screens
- **Race condition fix**: `advanceTimeoutRef` prevents timer expiry and line-advance from conflicting
- **Stale closure fix**: `startLevelRef` pattern used for success handler, `startGame`, and `retryFromCheckpoint` to prevent stale `totalRound` values
- **Reset fix**: `hasFailedOnce` properly resets on new game. `completedLines` and `visibleDots` reset in `startLevel`
- **Version string**: Updated to v0.5.4b

## v0.3.0b — 2025-03-11
### Dual Game Modes & Multi-Line System
- **Classic mode**: Single line per round for the first 100 rounds (tier 0), then +1 line per tier
- **Arcade mode**: Extra lines added every set (every 10 rounds), difficulty ramps 10× faster
- **Mode selector**: CLASSIC/ARCADE toggle on menu screen
- **Bonus line**: Last line in multi-line rounds is optional — fail it with no penalty, complete it for ×1.5 compound multiplier
- **HUD line label**: Shows "LINE 1/3" or "BONUS" (cyan) during multi-line rounds
- **Separate scoreboards**: Independent KV keys for `leaderboard:classic` and `leaderboard:arcade`
- **Mode-aware API**: Both `/api/scores` and `/api/submit` accept `?mode=` parameter

## v0.2.x — 2025-03-10
### Anti-Cheat & Leaderboard
- **Server-side score replay**: Client sends raw round data (angles, paths, timing) — worker replays and recalculates independently
- **Anti-cheat checks**: Path too perfect, elapsed too fast, teleport detection, rate limiting (1 submit per 5s per IP)
- **Profanity filter**: PurgoMalum API on both client and server, input shakes on rejection
- **Score qualification check**: "Submit Score" only shown if score beats #10 on current board
- **Double-submit prevention**: `submittingRef` set synchronously before async submit
- **Cloudflare Pages + KV deployment**: Worker functions for GET/POST score endpoints

## v0.2.x — 2025-03-09
### Scoring & Audio Overhaul
- **Accuracy bonus multipliers**: 95%+ = ×1.5, 90%+ = ×1.4, 85%+ = ×1.3, 80%+ = ×1.2, 75%+ = ×1.1
- **Time bonus**: Remaining seconds × 100 added to score
- **Score breakdown display**: Stacked lines slide in 120ms apart (BASE, ACCURACY, TIME, LEVEL, TOTAL)
- **Audio engine**: Web Audio API synthesis — ambient drone, swish (drag), thrum (success), fail, ascending score ticks, accuracy shimmer chord
- **Portal effect**: Spinning toothed ring with color coding — green (3 bonuses), yellow (2), orange (1), red (0)
- **Timer decay**: `getMaxTime(round) = max(0.2, 2.0 / (1 + round * 0.3))`
- **HUD shake animation**: Timer bar shakes at <1s remaining

## v0.1.x — 2025-03-08
### Retry System & Polish
- **3 retries**: Counting down display ("Retry 3", "Retry 2", "Retry 1")
- **Checkpoint system**: Saved at each set boundary (every 10 rounds)
- **Bonus retries**: Rounds 20 and 30 award +1 retry if overall accuracy ≥ 95%
- **First-fail tutorial**: Animated demo on first failure — purple target line, white trace, finger emoji
- **Screen sleep handling**: AudioContext suspends/resumes on visibility change, mid-drag attempts auto-finish
- **Line clamping**: Lines stay 25px from all edges, shorten proportionally
- **Black hole growth**: Diminishing returns `+4 / (1 + prev * 0.01)`, canvas capped at 35% screen

## v0.1.0 — 2025-03-07
### Initial Release
- **Core mechanic**: Tap pulsing red dot → drag finger along shooting line → black hole grows on success
- **Level system**: TIER/SET/SUB (0–9 sub, 0–9 set, 0+ tier), multiplier increases every 10 rounds
- **Touch + mouse input**: Fully native event handling with refs for synchronous state
- **12-language support**: ENG, ESP, FRA, DEU, POR, ITA, JPN, KOR, ZHO, RUS, ARA, HIN — auto-detected via `navigator.language`
- **Visual design**: Black hole canvas with wobble layers and accretion particles, background blobs, title pulse animation
- **Menu UI**: Stacking buttons with hover effects, mode selector, language grid
- **Standalone HTML**: React 18 + Babel from CDN, no build step required
