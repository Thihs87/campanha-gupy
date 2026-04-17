const mammoth = require('mammoth');

const GITHUB_OWNER = 'Thihs87';
const GITHUB_REPO = 'campanha-gupy';

async function getFileSHA(path) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) return null;
  return (await res.json()).sha;
}

async function updateGitHubFile(path, content) {
  const sha = await getFileSHA(path);
  const body = {
    message: `chore: atualizar ${path.split('/').pop()} via upload`,
    content: Buffer.from(content).toString('base64'),
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
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
        max_tokens: 4000,
        system: `Você é um assistente de marketing da Gupy. Receberá o conteúdo de um briefing de campanha revisado extraído de um documento Word. Analise o conteúdo e retorne um JSON válido com exatamente 3 chaves:
- "campanha": conteúdo Markdown com estratégia de mídia, budget e plataformas
- "anuncios": conteúdo Markdown com todos os copies de anúncios para LinkedIn, Meta e Google
- "cro": conteúdo Markdown com análise e recomendações de CRO da landing page
Retorne APENAS o JSON, sem texto adicional.`,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude API: ${await claudeRes.text()}`);

    const claudeData = await claudeRes.json();
    const responseText = claudeData.content[0].text;

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
      if (match) parsed = JSON.parse(match[1]);
      else throw new Error('Claude não retornou JSON válido');
    }

    // 3. Atualizar arquivos no GitHub
    await Promise.all([
      updateGitHubFile('.agents/campanha-diagnostico-gupy.md', parsed.campanha || ''),
      updateGitHubFile('.agents/anuncios-diagnostico-gupy.md', parsed.anuncios || ''),
      updateGitHubFile('.agents/cro-lp-diagnostico.md', parsed.cro || ''),
    ]);

    // 4. Disparar redeploy no Vercel
    await fetch(process.env.VERCEL_DEPLOY_HOOK, { method: 'POST' });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[processar-briefing]', err);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
