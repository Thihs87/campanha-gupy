const mammoth = require('mammoth');

const GITHUB_OWNER = 'Thihs87';
const GITHUB_REPO = 'campanha-gupy';

async function getFileSHA(path) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
    { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) {
    console.log(`[getFileSHA] ${path} → ${res.status}`);
    return null;
  }
  const data = await res.json();
  console.log(`[getFileSHA] ${path} → sha: ${data.sha}`);
  return data.sha;
}

async function updateGitHubFile(path, content) {
  // Busca SHA atual — sem ele o GitHub rejeita com 409
  const sha = await getFileSHA(path);
  const body = {
    message: `chore: atualizar ${path.split('/').pop()} via upload`,
    content: Buffer.from(content).toString('base64'),
    sha: sha, // sempre incluir — se null GitHub trata como criação e falha se existir
  };
  if (!sha) delete body.sha; // arquivo novo: omite sha

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`GitHub: falha ao atualizar ${path} — ${await res.text()}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { file: base64 } = req.body;
    if (!base64) return res.status(400).json({ error: 'Arquivo não recebido' });

    // 1. Extrair texto do .docx
    const buffer = Buffer.from(base64, 'base64');
    const { value: text } = await mammoth.extractRawText({ buffer });

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Não foi possível extrair texto do documento' });
    }

    // Truncar texto — limite conservador para caber no timeout do Vercel Hobby (10s)
    const textTruncado = text.length > 7000 ? text.substring(0, 7000) + '\n[documento truncado]' : text;

    // 2. Enviar para Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5000,
        system: `Você é um assistente de marketing da Gupy. Analise o briefing e retorne um JSON com 3 chaves: "campanha" (estratégia e budget em Markdown), "anuncios" (copies dos anúncios em Markdown), "cro" (recomendações de CRO em Markdown). Seja conciso.`,
        messages: [
          { role: 'user', content: textTruncado },
          { role: 'assistant', content: '{' },
        ],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude API: ${await claudeRes.text()}`);

    const claudeData = await claudeRes.json();
    // prefill force: Claude continua a partir de '{', precisamos recolocar
    const responseText = ('{' + claudeData.content[0].text).trim();

    console.log('[processar-briefing] Claude response preview:', responseText.substring(0, 200));

    let parsed;
    try {
      // Tentar parse direto
      parsed = JSON.parse(responseText);
    } catch {
      // Tentar extrair JSON de bloco de código
      const codeBlock = responseText.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
      if (codeBlock) {
        parsed = JSON.parse(codeBlock[1].trim());
      } else {
        // Tentar encontrar JSON entre chaves
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          console.error('[processar-briefing] Resposta inválida:', responseText.substring(0, 500));
          throw new Error('Claude não retornou JSON válido');
        }
      }
    }

    // 3. Atualizar arquivos no GitHub (sequencial para evitar conflito de SHA)
    await updateGitHubFile('.agents/campanha-diagnostico-gupy.md', parsed.campanha || '');
    await updateGitHubFile('.agents/anuncios-diagnostico-gupy.md', parsed.anuncios || '');
    await updateGitHubFile('.agents/cro-lp-diagnostico.md', parsed.cro || '');

    // 4. Disparar redeploy no Vercel
    await fetch(process.env.VERCEL_DEPLOY_HOOK, { method: 'POST' });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[processar-briefing]', err);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
