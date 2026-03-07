// functions/api/scores.js
// GET /api/scores — read-only, returns top 10

export async function onRequestGet(context) {
  try {
    const data = await context.env.SCORES.get('leaderboard', { type: 'json' });
    const scores = (data || []).slice(0, 10);
    return new Response(JSON.stringify(scores), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10',
      },
    });
  } catch {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Block all other methods
export async function onRequestPost() {
  return new Response(JSON.stringify({ error: 'Read only' }), { status: 405 });
}
export async function onRequestPut() {
  return new Response(JSON.stringify({ error: 'Read only' }), { status: 405 });
}
export async function onRequestDelete() {
  return new Response(JSON.stringify({ error: 'Read only' }), { status: 405 });
}