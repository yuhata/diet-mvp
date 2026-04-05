// Cloudflare Workers — Claude API プロキシ
// デプロイ: wrangler secret put ANTHROPIC_API_KEY && wrangler deploy

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { archetype, day, status, memo, protocols } = await request.json();

      const systemPrompt = `あなたはダイエットメンターです。
ユーザーのタイプ: ${archetype}
���奨プロトコル: ${(protocols || []).join('、')}

ルール：
- 1、2文の簡潔な日本語で返す
- 「意志力ではなくホルモン・構造・環境の問題」というフレームを必ず使う
- 崩れた日は「想定内」で正常化する
- 明日の具体的な1アクションだけを示す
- 発励や積極的なコメントは不要`;

      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: `Day ${day}日目。状況: ${status}。メモ: ${memo || 'なし'}`,
          }],
        }),
      });

      const apiData = await apiRes.json();

      if (!apiRes.ok) {
        return new Response(
          JSON.stringify({ error: apiData.error?.message || 'API error' }),
          { status: apiRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      return new Response(
        JSON.stringify({ message: apiData.content[0].text }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  },
};
