// functions/api/submit.js
// POST /api/submit — receives raw game data, recalculates score server-side
// Only writes to KV if score qualifies for top 10

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}
function clamp(v, mn, mx) {
  return Math.max(mn, Math.min(mx, v));
}
function calcLevel(totalRound) {
  const sub = totalRound % 10;
  const set = Math.floor(totalRound / 10) % 10;
  const tier = Math.floor(totalRound / 100);
  return { tier, set, sub };
}
function getMultiplier(lv) {
  const total = lv.set + lv.tier * 10;
  return total === 0 ? 1 : total + 1;
}
function getMaxTime(totalRound) {
  return Math.max(0.2, 2.0 / (1 + totalRound * 0.3));
}
function levelString(lv) {
  return lv.tier + ' / ' + lv.set + ' / ' + lv.sub;
}

// ── Profanity check via PurgoMalum API ──
async function isProfane(text) {
  try {
    const res = await fetch(
      'https://www.purgomalum.com/service/containsprofanity?text=' + encodeURIComponent(text),
      { signal: AbortSignal.timeout(2000) }
    );
    if (res.ok) {
      const result = await res.text();
      return result.trim() === 'true';
    }
  } catch {}
  // if the API is down, allow the name (fail open)
  return false;
}

// ── Replay a single round ──
function replayRound(round, roundIndex) {
  const { dotAngle, lineAngle, lineLength, dragPath, circleR, cx, cy, elapsed } = round;

  if (typeof dotAngle !== 'number' || typeof lineAngle !== 'number') return null;
  if (typeof lineLength !== 'number' || typeof circleR !== 'number') return null;
  if (typeof cx !== 'number' || typeof cy !== 'number') return null;
  if (typeof elapsed !== 'number' || elapsed < 0) return null;
  if (!Array.isArray(dragPath) || dragPath.length < 3) return null;

  const dotX = cx + Math.cos(dotAngle) * circleR;
  const dotY = cy + Math.sin(dotAngle) * circleR;
  const lineEndX = dotX + Math.cos(lineAngle) * lineLength;
  const lineEndY = dotY + Math.sin(lineAngle) * lineLength;

  const totalLineLen = dist(dotX, dotY, lineEndX, lineEndY);
  if (totalLineLen < 1) return null;

  const ldx = (lineEndX - dotX) / totalLineLen;
  const ldy = (lineEndY - dotY) / totalLineLen;
  let totalDist = 0, maxProjection = 0;

  for (const p of dragPath) {
    if (typeof p.x !== 'number' || typeof p.y !== 'number') return null;
    const dx = p.x - dotX, dy = p.y - dotY;
    const proj = dx * ldx + dy * ldy;
    const pc = clamp(proj, 0, totalLineLen);
    totalDist += dist(p.x, p.y, dotX + ldx * pc, dotY + ldy * pc);
    maxProjection = Math.max(maxProjection, proj);
  }

  const avgDist = totalDist / dragPath.length;
  const coverage = clamp(maxProjection / totalLineLen, 0, 1);
  const accuracy = Math.max(0, 1 - avgDist / 60);

  if (coverage <= 0.5 || accuracy <= 0.3) return null;

  const maxTime = getMaxTime(roundIndex);
  const timeRemaining = Math.max(0, maxTime - elapsed);
  const accuracyPct = Math.round(accuracy * 100);

  let accMult = 1.0;
  if (accuracyPct >= 95) accMult = 1.5;
  else if (accuracyPct >= 90) accMult = 1.4;
  else if (accuracyPct >= 85) accMult = 1.3;
  else if (accuracyPct >= 80) accMult = 1.2;
  else if (accuracyPct >= 75) accMult = 1.1;

  const lv = calcLevel(roundIndex);
  const multiplier = getMultiplier(lv);

  const baseScore = Math.round(accuracy * 400 + coverage * 200);
  const timeBonus = Math.round(timeRemaining * 100);
  const accBoosted = Math.round(baseScore * accMult);
  const finalScore = Math.round((accBoosted + timeBonus) * multiplier);

  // anti-cheat
  if (accuracy > 0.995 && coverage > 0.95 && dragPath.length < 8) return null;
  if (elapsed < 0.05 && roundIndex > 5) return null;
  for (let i = 1; i < dragPath.length; i++) {
    if (dist(dragPath[i-1].x, dragPath[i-1].y, dragPath[i].x, dragPath[i].y) > 200) return null;
  }

  return { score: finalScore, lv };
}

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const { name, rounds } = body;

    if (typeof name !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid name' }), { status: 400 });
    }
    if (!Array.isArray(rounds) || rounds.length === 0 || rounds.length > 10000) {
      return new Response(JSON.stringify({ error: 'Invalid rounds' }), { status: 400 });
    }

    const cleanName = name.replace(/[^A-Z0-9_\- ]/gi, '').slice(0, 16).trim() || 'ANON';

    // ── Profanity check (server-side, not trusting client) ──
    if (cleanName !== 'ANON' && await isProfane(cleanName)) {
      return new Response(JSON.stringify({ error: 'profanity' }), { status: 400 });
    }

    // ── Rate limit ──
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = 'ratelimit:' + ip;
    const lastSubmit = await env.SCORES.get(rateLimitKey);
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < 5000) {
      return new Response(JSON.stringify({ error: 'Too fast' }), { status: 429 });
    }

    // ── Replay all rounds ──
    let totalScore = 0;
    let lastLv = { tier: 0, set: 0, sub: 0 };

    for (let i = 0; i < rounds.length; i++) {
      const result = replayRound(rounds[i], i);
      if (result === null) break;
      totalScore += result.score;
      lastLv = result.lv;
    }

    if (totalScore <= 0) {
      return new Response(JSON.stringify({ error: 'No valid score' }), { status: 400 });
    }

    // ── Compare against current top 10 BEFORE writing ──
    const existing = (await env.SCORES.get('leaderboard', { type: 'json' })) || [];

    // if top 10 is full and this score doesn't beat the lowest, skip the write
    if (existing.length >= 10 && totalScore <= existing[existing.length - 1].s) {
      return new Response(JSON.stringify({
        success: true,
        score: totalScore,
        rank: null,
        message: 'Score did not qualify for top 10',
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // ── Score qualifies — write to KV ──
    // set rate limit (only count actual writes)
    await env.SCORES.put(rateLimitKey, String(Date.now()), { expirationTtl: 10 });

    const entry = {
      n: cleanName,
      s: totalScore,
      l: levelString(lastLv),
      r: rounds.length,
      t: Date.now(),
    };

    existing.push(entry);
    existing.sort((a, b) => b.s - a.s);
    const top = existing.slice(0, 10);
    await env.SCORES.put('leaderboard', JSON.stringify(top));

    const rank = top.findIndex(e => e.t === entry.t) + 1;

    return new Response(JSON.stringify({
      success: true,
      score: totalScore,
      rank: rank > 0 && rank <= 10 ? rank : null,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}

export async function onRequestGet() {
  return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405 });
}