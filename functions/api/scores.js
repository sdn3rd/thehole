// functions/api/scores.js
// Cloudflare Pages Function — binds to KV namespace "SCORES"
//
// GET  /api/scores        → returns top 50 scores
// POST /api/scores        → submits a new score (validated server-side)

// ── Server-side validation ──
// Max theoretical score per round: ~1200 base * multiplier
// This is generous — real scores will be lower
function maxPossibleScore(totalRounds) {
  let max = 0;
  for (let i = 0; i < totalRounds; i++) {
    const tier = Math.floor(i / 100);
    max += 1500 * (tier + 1); // generous ceiling
  }
  return max;
}

// FNV-1a hash with server secret for integrity check
function hashScore(score, secret) {
  let h = 0x811c9dc5;
  const s = secret + '|' + String(score);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= (score >>> 0) * 0x27d4eb2d;
  h = Math.imul(h, 0x5bd1e995);
  return (h >>> 0).toString(36);
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const data = await env.SCORES.get('leaderboard', { type: 'json' });
    const scores = data || [];
    return new Response(JSON.stringify(scores), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const SECRET = env.SCORE_SECRET || 'HOLE_DEFAULT_SECRET_CHANGE_ME';

  try {
    const body = await request.json();
    const { name, score, level, rounds } = body;

    // ── Validate input types ──
    if (typeof name !== 'string' || typeof score !== 'number' || typeof rounds !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
    }

    // ── Sanitize ──
    const cleanName = name.replace(/[^A-Z0-9_\- ]/gi, '').slice(0, 16).trim() || 'ANON';
    const cleanScore = Math.floor(score);
    const cleanRounds = Math.floor(rounds);

    // ── Validate score is possible ──
    if (cleanScore < 0 || cleanScore > maxPossibleScore(cleanRounds)) {
      return new Response(JSON.stringify({ error: 'Score exceeds maximum possible' }), { status: 400 });
    }

    if (cleanRounds < 1 || cleanRounds > 100000) {
      return new Response(JSON.stringify({ error: 'Invalid rounds' }), { status: 400 });
    }

    // ── Build entry with server-side hash ──
    const entry = {
      n: cleanName,
      s: cleanScore,
      l: typeof level === 'string' ? level.slice(0, 20) : '0/0/0',
      r: cleanRounds,
      t: Date.now(),
      h: hashScore(cleanScore, SECRET),
    };

    // ── Read existing, merge, save ──
    const existing = (await env.SCORES.get('leaderboard', { type: 'json' })) || [];

    // Validate existing entries still have correct hashes
    const validated = existing.filter(e =>
      e && typeof e.s === 'number' && typeof e.h === 'string' &&
      hashScore(e.s, SECRET) === e.h
    );

    validated.push(entry);
    validated.sort((a, b) => b.s - a.s);
    const top = validated.slice(0, 50);

    await env.SCORES.put('leaderboard', JSON.stringify(top));

    return new Response(JSON.stringify({ success: true, rank: top.findIndex(e => e.t === entry.t) + 1 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
