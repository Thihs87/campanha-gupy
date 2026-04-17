const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer, ExternalHyperlink,
  PageBreak
} = require('docx');
const fs = require('fs');

// ─── Cores e bordas ───────────────────────────────────────────────────────────
const AZUL     = "1A56A0";
const AZUL_CLR = "D6E4F7";
const CINZA    = "F5F5F5";
const VERDE    = "1E7E3E";
const VERM     = "C0392B";
const AMAR     = "D4700A";

const border = (color = "CCCCCC") => ({ style: BorderStyle.SINGLE, size: 4, color });
const allBorders = (color) => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) });
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: "FFFFFF" });
const allNoBorders = () => ({ top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sp = (before = 0, after = 0) => ({ spacing: { before, after } });
const cell = (text, opts = {}) => new TableCell({
  borders: allBorders(opts.borderColor || "CCCCCC"),
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  margins: { top: 80, bottom: 80, left: 140, right: 140 },
  verticalAlign: opts.vAlign || "center",
  children: [new Paragraph({
    ...sp(0, 0),
    alignment: opts.align || AlignmentType.LEFT,
    children: [new TextRun({
      text,
      font: "Arial",
      size: opts.size || 18,
      bold: opts.bold || false,
      color: opts.color || "000000"
    })]
  })]
});

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  ...sp(320, 120),
  children: [new TextRun({ text, font: "Arial", size: 36, bold: true, color: AZUL })]
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  ...sp(280, 80),
  children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: AZUL })]
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  ...sp(200, 60),
  children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: "333333" })]
});

const p = (text, opts = {}) => new Paragraph({
  ...sp(opts.before || 60, opts.after || 60),
  alignment: opts.align || AlignmentType.LEFT,
  children: [new TextRun({ text, font: "Arial", size: 18, bold: opts.bold || false, color: opts.color || "333333", italics: opts.italic || false })]
});

const bullet = (text, opts = {}) => new Paragraph({
  numbering: { reference: "bullets", level: opts.level || 0 },
  ...sp(40, 40),
  children: [new TextRun({ text, font: "Arial", size: 18, color: "333333", bold: opts.bold || false })]
});

const divider = () => new Paragraph({
  ...sp(160, 160),
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 1 } },
  children: []
});

const badge = (icon, label, color) => new Paragraph({
  ...sp(60, 60),
  children: [
    new TextRun({ text: `${icon} `, font: "Arial", size: 18, color }),
    new TextRun({ text: label, font: "Arial", size: 18, bold: true, color })
  ]
});

const blockquote = (text) => new Paragraph({
  ...sp(100, 100),
  indent: { left: 720 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: AZUL, space: 8 } },
  children: [new TextRun({ text, font: "Arial", size: 18, italics: true, color: "444444" })]
});

const codeBlock = (text) => new Paragraph({
  ...sp(60, 60),
  indent: { left: 360 },
  shading: { fill: "F0F4FA", type: ShadingType.CLEAR },
  children: [new TextRun({ text, font: "Courier New", size: 16, color: "1A1A1A" })]
});

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// ─── Tabela genérica ──────────────────────────────────────────────────────────
const makeTable = (headers, rows, colWidths) => {
  const total = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
          borders: allBorders(AZUL),
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: AZUL, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          children: [new Paragraph({
            ...sp(0, 0),
            children: [new TextRun({ text: h, font: "Arial", size: 18, bold: true, color: "FFFFFF" })]
          })]
        }))
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((val, i) => new TableCell({
          borders: allBorders("CCCCCC"),
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: ri % 2 === 0 ? "FFFFFF" : CINZA, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          children: [new Paragraph({
            ...sp(0, 0),
            children: [new TextRun({ text: val, font: "Arial", size: 18, color: "333333" })]
          })]
        }))
      }))
    ]
  });
};

// ─── Conteúdo do documento ────────────────────────────────────────────────────
const children = [

  // CAPA
  new Paragraph({ ...sp(1440, 120), alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "BRIEFING DE CAMPANHA", font: "Arial", size: 52, bold: true, color: AZUL })] }),
  new Paragraph({ ...sp(0, 120), alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Diagnóstico de Maturidade de RH na IA", font: "Arial", size: 36, color: "444444" })] }),
  new Paragraph({ ...sp(0, 60), alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Gupy | HR4Results 2026", font: "Arial", size: 24, bold: true, color: AZUL })] }),
  new Paragraph({ ...sp(0, 60), alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Criado em: 17 de abril de 2026", font: "Arial", size: 20, color: "888888" })] }),

  divider(),
  pageBreak(),

  // 1. VISÃO GERAL
  h1("1. Visão Geral da Campanha"),
  makeTable(
    ["Item", "Detalhe"],
    [
      ["Produto", "Diagnóstico gratuito de maturidade de RH na era da IA"],
      ["Formato", "Sessão de 15 min com especialista em RH via telefone"],
      ["Objetivo", "Geração de leads qualificados → oportunidades comerciais"],
      ["Landing page", "https://info.gupy.io/diagnostico-teste"],
      ["Budget mensal", "R$20.000"],
      ["Plataformas", "LinkedIn + Meta + Google"],
      ["Tom", "Brutal facts — ROI-first, provocador, sem promessa de feature"],
    ],
    [2800, 6560]
  ),

  divider(),
  pageBreak(),

  // 2. PÚBLICO-ALVO
  h1("2. Público-Alvo"),
  makeTable(
    ["Critério", "Detalhe"],
    [
      ["Tamanho", "500+ funcionários; sweet spot acima de 1.000"],
      ["Grandes empresas", "Coordenadores, supervisores, especialistas sênior de RH"],
      ["Médias empresas", "Gerentes e diretores de RH"],
      ["Setores prioritários", "Varejo, indústria, tecnologia, manufatura"],
      ["Gatilho", "Pressão por usar IA de forma estratégica para gerar ROI"],
    ],
    [2800, 6560]
  ),

  h2("Tensão central do lead"),
  p("Medo de irrelevância gradual — não de demissão imediata, mas de se tornar progressivamente dispensável enquanto o CEO cobra ROI e os concorrentes avançam."),

  h2("Frase que captura a dor"),
  blockquote('"Estamos pagando por IA que automatiza tarefa. Não por IA que gera resultado. E a diferença está me custando o orçamento do ano que vem."'),

  divider(),
  pageBreak(),

  // 3. DIFERENCIAÇÃO
  h1("3. Diferenciação e Objeções"),
  h2("Três pilares de diferenciação"),
  makeTable(
    ["Pilar", "Argumento"],
    [
      ["Dados reais do Brasil", "A Gupy processa centenas de milhares de contratações/ano — diagnóstico baseado em dados reais, não teoria global"],
      ["Especialista em RH, não em vendas", "Sessão conduzida por quem entende de gestão de pessoas. Resultado útil independente de qualquer decisão de compra"],
      ["15 minutos, saída prática", "O líder sai sabendo onde está e o que priorizar — sem deck, sem semanas de espera"],
    ],
    [3200, 6160]
  ),

  h2("Objeções a endereçar"),
  bullet('"É gratuito, então deve ter pitch de vendas no final"'),
  bullet('"Vou passar meu contato e vou ser bombardeado de ligação"'),

  h2("Linha defensiva para todos os anúncios"),
  blockquote('"Conduzido por especialista em RH — não pelo time comercial. Resultado prático, independente de qualquer decisão de compra."'),

  divider(),
  pageBreak(),

  // 4. BUDGET
  h1("4. Alocação de Budget"),
  makeTable(
    ["Plataforma", "Budget", "%", "CPL Esperado", "Leads Estimados"],
    [
      ["LinkedIn", "R$8.000", "40%", "R$180–250", "32–44"],
      ["Meta", "R$7.000", "35%", "R$70–110", "64–100"],
      ["Google", "R$5.000", "25%", "R$90–140", "36–56"],
      ["TOTAL", "R$20.000", "100%", "~R$85–120", "~132–200"],
    ],
    [2200, 1600, 900, 2000, 2660]
  ),
  p("Com 5–10% MQL→OPP (histórico): 7–20 oportunidades/mês (conservador) a 13–25 (otimista).", { italic: true, color: "666666" }),

  divider(),
  pageBreak(),

  // 5. ESTRUTURA DAS CAMPANHAS
  h1("5. Estrutura das Campanhas"),

  h2("LinkedIn"),
  bullet("Campanha 1: LI_LeadGen_Coord-Ger-RH_Diagnostico_Abr26", { bold: true }),
  bullet("Ad Set A: 500–2.000 func | Coord/Gerente RH | Varejo + Indústria", { level: 1 }),
  bullet("Ad Set B: 2.000+ func | Gerente/Diretor/CHRO | Todos os setores", { level: 1 }),
  bullet("Campanha 2: LI_Retargeting_SiteVisitors_Diagnostico_Abr26", { bold: true }),
  bullet("Visitantes da LP (30 dias) — copy de objection handling", { level: 1 }),
  p("Targeting: Coordenador/Gerente/Diretor/CHRO/Head de RH · 500+ funcionários · Brasil"),
  p("Formato: Lead Gen Forms nativos do LinkedIn (não enviar para LP externa — reduz atrito em 2–3x)"),

  h2("Meta"),
  bullet("Campanha 1: META_Conv_Interesses-RH_Diagnostico_Abr26", { bold: true }),
  bullet("Ad Set A: Interesses RH + IA + Gestão de Pessoas", { level: 1 }),
  bullet("Ad Set B: Lookalike 1–3% de leads atuais", { level: 1 }),
  bullet("Campanha 2: META_Conv_Retargeting_Diagnostico_Abr26", { bold: true }),
  bullet("Visitantes da LP (30 dias) + engajadores", { level: 1 }),
  p("Formatos: Vídeo 15–30s (feed/Reels) + imagem estática (retargeting)"),

  h2("Google Search"),
  bullet("Campanha 1: GOOG_Search_Intencao-RH-IA_Diagnostico_Abr26", { bold: true }),
  bullet("Ad Group A: Keywords diretas (diagnóstico RH, assessment RH)", { level: 1 }),
  bullet("Ad Group B: Keywords conceituais (maturidade IA RH, ROI IA RH)", { level: 1 }),
  bullet("Ad Group C: Keywords de problema (como usar IA no RH)", { level: 1 }),
  bullet("Campanha 2: GOOG_Search_Brand_Gupy_Ongoing", { bold: true }),
  bullet("Campanha 3: GOOG_Display_Retargeting_Diagnostico_Abr26", { bold: true }),
  p("Negativos: careers, emprego, vagas, curriculum, ATS"),

  divider(),
  pageBreak(),

  // 6. ÂNGULOS CRIATIVOS
  h1("6. Ângulos Criativos"),
  p("3 ângulos evergreen — testar os 3 no lançamento, escalar o vencedor na semana 3.", { italic: true }),

  // Ângulo 1
  h2("Ângulo 1 — \"Você sabe onde está de verdade?\""),
  p("Tensão de incerteza", { italic: true, color: "666666" }),

  h3("LinkedIn"),
  p("Intro text:"),
  blockquote("Seu RH adotou IA. Mas você sabe se ela está gerando resultado real — ou só automatizando tarefa? A diferença entre as duas está custando orçamento e relevância para muitas áreas de RH hoje. Em 15 minutos com um especialista da Gupy, você descobre em qual estágio de maturidade sua empresa está — e o que priorizar para que a IA do seu RH gere ROI de verdade. Baseado em dados reais de centenas de empresas brasileiras. Resultado prático, independente de qualquer decisão de compra."),
  p("Headline: Diagnóstico gratuito: descubra onde seu RH está na era da IA", { bold: true }),

  h3("Meta"),
  p("Primary text:"),
  blockquote("Seu RH tem IA. Mas você sabe se ela está gerando resultado — ou só automatizando tarefa? A maioria das empresas está pagando pela segunda opção sem saber. Em 15 minutos com um especialista da Gupy, você descobre em qual estágio está e o que precisa mudar. Gratuito. Sem pitch de vendas."),
  p("Headline: Seu RH tem IA. Mas tem resultado?", { bold: true }),
  p("Description: Diagnóstico gratuito · 15 min", { bold: true }),

  // Ângulo 2
  h2("Ângulo 2 — \"O CEO quer ROI\""),
  p("Pressão externa", { italic: true, color: "666666" }),

  h3("LinkedIn"),
  p("Intro text:"),
  blockquote("O CEO quer eficiência. O board quer ROI. E o RH está no meio disso tudo com ferramentas de IA que ninguém sabe ao certo se estão entregando resultado. A pressão por protagonismo nunca foi tão alta — e a falta de clareza sobre onde a área está nessa jornada é o maior risco. Diagnóstico gratuito de maturidade de RH na IA: 15 minutos com um especialista que entende de gestão de pessoas, não de vendas. Você sai com um mapa claro do seu estágio e dos próximos passos."),
  p("Headline: O CEO quer saber o ROI do RH. Você tem a resposta?", { bold: true }),

  h3("Meta"),
  p("Primary text:"),
  blockquote("O CEO quer ROI do RH. E você está pagando por IA que automatiza tarefa, não por IA que gera resultado. Diagnóstico gratuito de 15 min com especialista em RH — você sai sabendo onde está e o que fazer a seguir. Independente de qualquer decisão de compra."),
  p("Headline: O CEO quer ROI. Você tem a resposta?", { bold: true }),
  p("Description: 15 min · Especialista em RH · Grátis", { bold: true }),

  // Ângulo 3
  h2("Ângulo 3 — \"Custo da inação\""),
  p("Stakes — o que custa não agir", { italic: true, color: "666666" }),

  h3("LinkedIn"),
  p("Intro text:"),
  blockquote("Cada trimestre sem clareza sobre IA no RH é um trimestre cedendo terreno — para concorrentes, para o CEO, para a irrelevância da área. Não falta inspiração. Falta um mapa real de onde sua empresa está e o que priorizar. Em 15 minutos, um especialista da Gupy faz esse diagnóstico com você — baseado em dados reais do mercado brasileiro, não em teoria de relatório global. Resultado prático, sem pitch de vendas."),
  p("Headline: Cada mês sem clareza sobre IA é um mês cedendo terreno", { bold: true }),

  h3("Meta"),
  p("Primary text:"),
  blockquote("Líderes de RH que não sabem onde estão nessa jornada perdem orçamento, relevância e protagonismo. Não é falta de IA. É falta de clareza sobre o que a IA está gerando. 15 minutos com um especialista da Gupy mudam isso."),
  p("Headline: Cada mês sem clareza custa caro", { bold: true }),
  p("Description: Diagnóstico gratuito · Sem pitch", { bold: true }),

  h2("Ângulo reserva — HR4Results"),
  p("Ativar apenas em janelas do evento — NÃO incluir no lançamento.", { italic: true, color: VERM }),
  blockquote('"Você saiu do HR4Results inspirado. Mas sabe onde sua empresa está de verdade?"'),

  divider(),
  pageBreak(),

  // 7. GOOGLE RSA
  h1("7. Google Search — Headlines e Descriptions (RSA)"),
  makeTable(
    ["#", "Headline (máx. 30 chars)"],
    [
      ["1",  "Diagnóstico RH na IA · Grátis"],
      ["2",  "Seu RH gera ROI com IA?"],
      ["3",  "15 min com especialista em RH"],
      ["4",  "Maturidade de RH na era da IA"],
      ["5",  "Sem pitch. Resultado prático."],
      ["6",  "IA no RH que gera resultado"],
      ["7",  "Onde seu RH está na IA?"],
      ["8",  "Especialista Gupy · Gratuito"],
      ["9",  "Avaliação de Maturidade de RH"],
      ["10", "O CEO quer ROI do RH?"],
      ["11", "Saia sabendo o que priorizar"],
      ["12", "Baseado em dados reais do BR"],
      ["13", "15 minutos. Mapa prático."],
      ["14", "Você sabe seu estágio na IA?"],
      ["15", "Diagnóstico gratuito · 15 min"],
    ],
    [900, 8460]
  ),

  p(""),
  makeTable(
    ["#", "Description (máx. 90 chars)"],
    [
      ["1", "Seu RH paga por IA que automatiza. Descubra se está gerando resultado real."],
      ["2", "Em 15 min, um especialista da Gupy mapeia seu estágio de maturidade. Sem pitch de vendas."],
      ["3", "Dados reais do mercado BR. Resultado prático, independente de qualquer compra."],
      ["4", "Pressão do CEO por ROI? Saiba onde sua área está na era da IA e o que priorizar agora."],
    ],
    [900, 8460]
  ),

  divider(),
  pageBreak(),

  // 8. BRIEFING CRIATIVO PARA DESIGNER
  h1("8. Briefing Criativo para Designer"),
  p("Cada peça está detalhada com conceito, hierarquia, direção visual, copy e formatos. O designer executa no Figma usando assets da marca Gupy e identidade visual do HR4Results.", { italic: true }),

  // ── PEÇA 1 ──────────────────────────────────────────────────────────────────
  h2("Peça 1 — \"Seu RH tem IA. Mas tem resultado?\""),
  p("Ângulo: Tensão de incerteza — ter tecnologia sem saber o que ela entrega", { italic: true, color: "666666" }),

  h3("Conceito"),
  p("O líder de RH está cercado de ferramentas, dashboards e dados — mas nenhum deles responde a pergunta que o CEO faz toda semana. A peça traduz visualmente essa contradição: muito input, zero clareza. O headline corta como uma pergunta direta que o lead não consegue ignorar."),

  h3("Copy na Peça"),
  makeTable(
    ["Elemento", "Texto", "Observação"],
    [
      ["Headline",  "Seu RH tem IA. Mas tem resultado?",           "Principal — maior hierarquia visual"],
      ["Subtexto",  "Descubra em 15 min onde sua empresa está de verdade.", "Secundário — abaixo do headline"],
      ["CTA",       "Diagnóstico gratuito",                        "Botão ou tag destacada"],
      ["Rodapé",    "Gupy | gupy.io/diagnostico",                  "Logo + URL discreta"],
    ],
    [1800, 4400, 3160]
  ),

  h3("Hierarquia Visual"),
  bullet("1. Headline — ocupa ~40% da área, fonte bold, branco ou creme sobre fundo escuro"),
  bullet("2. Imagem/visual de fundo — executivo de RH sozinho em ambiente corporativo à noite, cercado de telas com dados fragmentados"),
  bullet("3. Subtexto — fonte regular, menor, logo abaixo do headline"),
  bullet("4. CTA — pill/badge destacado em azul Gupy ou branco com borda"),
  bullet("5. Logo Gupy — canto inferior direito, discreta"),

  h3("Direção Visual"),
  makeTable(
    ["Atributo", "Especificação"],
    [
      ["Paleta",        "Fundo escuro (azul-marinho profundo ou quase preto) + headline branco + acento azul Gupy"],
      ["Mood",          "Dramático, cinematográfico, profissional — não genérico de stock photo"],
      ["Foto/imagem",   "Executivo de RH (40+ anos) sozinho em sala corporativa à noite. Múltiplas telas ao fundo com gráficos fragmentados. Expressão pensativa/preocupada. Iluminação: contraluz azul + ponto de luz âmbar."],
      ["Tipografia",    "Headline em sans-serif bold pesado (pode usar a tipografia Gupy ou Inter/Gilroy). Subtexto em regular. Nenhum texto decorativo."],
      ["Composição",    "Headline alinhado à esquerda ou centralizado no terço superior. Imagem ocupa 60–70% do espaço. Respiração generosa entre elementos."],
      ["Elementos Gupy","Usar paleta e logo oficial. Pode incorporar elemento gráfico do HR4Results de forma sutil."],
    ],
    [2200, 7160]
  ),

  h3("Formatos a Produzir"),
  makeTable(
    ["Plataforma", "Tamanho", "Adaptação"],
    [
      ["LinkedIn feed",      "1200×627px",  "Headline e imagem lado a lado ou headline centralizado sobre imagem"],
      ["LinkedIn quadrado",  "1200×1200px", "Imagem centralizada, headline no terço superior"],
      ["Meta feed",          "1080×1080px", "Composição quadrada — headline no topo, imagem abaixo"],
      ["Meta feed retrato",  "1080×1350px", "Mais espaço vertical — headline maior, mais respiração"],
      ["Meta Stories/Reels", "1080×1920px", "Headline no terço superior, imagem no centro, CTA no terço inferior"],
    ],
    [2400, 2200, 4760]
  ),

  divider(),

  // ── PEÇA 2 ──────────────────────────────────────────────────────────────────
  h2("Peça 2 — \"O CEO quer ROI. Você tem a resposta?\""),
  p("Ângulo: Pressão externa — o C-suite cobrando resultado da área de RH", { italic: true, color: "666666" }),

  h3("Conceito"),
  p("A tensão não é interna — ela vem de cima. O CEO está na sala, olhando para números de RH que não traduzem resultado claro. A peça captura esse momento de cobrança: o RH na berlinda, sem a resposta que o negócio precisa. O headline é uma pergunta que o lead já ouviu — ou vai ouvir em breve."),

  h3("Copy na Peça"),
  makeTable(
    ["Elemento", "Texto", "Observação"],
    [
      ["Headline",  "O CEO quer ROI do RH. Você tem a resposta?",  "Principal — tom direto, quase desafiador"],
      ["Subtexto",  "15 min com um especialista para saber onde você está.", "Secundário"],
      ["CTA",       "Fazer o diagnóstico",                         "Botão ou tag destacada"],
      ["Rodapé",    "Gupy | gupy.io/diagnostico",                  "Logo + URL discreta"],
    ],
    [1800, 4400, 3160]
  ),

  h3("Hierarquia Visual"),
  bullet("1. Headline — dominante, tom de pergunta direta, não suavizar"),
  bullet("2. Imagem — cena de boardroom: executiva de RH apresentando para CEO cético. Dados ambíguos na tela atrás dela."),
  bullet("3. Subtexto — complementa o headline, entrega o benefício"),
  bullet("4. CTA — destacado, convidativo mas não agressivo"),
  bullet("5. Logo Gupy — discreta"),

  h3("Direção Visual"),
  makeTable(
    ["Atributo", "Especificação"],
    [
      ["Paleta",      "Tons frios e dessaturados — cinza escuro, branco, azul Gupy como acento. Clima de sala de reunião real."],
      ["Mood",        "Tenso, profissional, high-stakes. Cinematográfico. Iluminação lateral dramática com sombras profundas."],
      ["Foto/imagem", "Cena de boardroom moderno. Executiva de RH (35–45 anos) de frente para CEO/comitê. Tela atrás dela com gráficos de IA com resultado ambíguo. Expressão do CEO: expectante, questionador. Iluminação: luz lateral fria vinda da janela ou tela."],
      ["Tipografia",  "Headline bold, branco ou creme. Pode usar caixa alta no início para dar peso. Subtexto em regular."],
      ["Composição",  "Headline no terço superior. Imagem preenche o centro. CTA e logo na base. Headline pode sobrepor levemente a imagem se o contraste permitir."],
    ],
    [2200, 7160]
  ),

  h3("Formatos a Produzir"),
  makeTable(
    ["Plataforma", "Tamanho", "Adaptação"],
    [
      ["LinkedIn feed",      "1200×627px",  "Cena de boardroom ao fundo, headline sobre a imagem com overlay escuro sutil"],
      ["LinkedIn quadrado",  "1200×1200px", "Crop na executiva e CEO, headline centralizado no topo"],
      ["Meta feed",          "1080×1080px", "Foco no rosto da executiva sob pressão, headline grande no topo"],
      ["Meta feed retrato",  "1080×1350px", "Mais contexto da sala, headline e subtexto com mais respiro"],
      ["Meta Stories/Reels", "1080×1920px", "Headline terço superior, cena no meio, CTA terço inferior"],
    ],
    [2400, 2200, 4760]
  ),

  divider(),

  // ── PEÇA 3 ──────────────────────────────────────────────────────────────────
  h2("Peça 3 — \"Cada mês sem clareza é um mês cedendo terreno\""),
  p("Ângulo: Custo da inação — o que se perde enquanto a decisão não é tomada", { italic: true, color: "666666" }),

  h3("Conceito"),
  p("Não há urgência explícita — mas há consequência silenciosa. Cada mês que passa sem saber onde o RH está na jornada de IA é um mês em que concorrentes avançam, orçamento encolhe e relevância da área diminui. A peça usa o contraste visual entre estagnação e movimento para tornar essa perda tangível. Duas versões: abstrata (split) e com pessoa."),

  h3("Copy na Peça"),
  makeTable(
    ["Elemento", "Texto", "Observação"],
    [
      ["Headline",  "Cada mês sem clareza é um mês cedendo terreno.", "Principal — declaração, não pergunta"],
      ["Subtexto",  "Saiba onde seu RH está em 15 minutos.",          "Direto, solução imediata"],
      ["CTA",       "Diagnóstico gratuito",                           "Botão ou tag destacada"],
      ["Rodapé",    "Gupy | gupy.io/diagnostico",                     "Logo + URL discreta"],
    ],
    [1800, 4400, 3160]
  ),

  h3("Hierarquia Visual — Versão A (Split abstrato)"),
  bullet("1. Composição dividida ao meio: lado esquerdo escuro/estático, lado direito iluminado/dinâmico"),
  bullet("2. Headline no centro ou terço superior, sobrepondo os dois lados"),
  bullet("3. Subtexto no lado claro — associado ao caminho correto"),
  bullet("4. CTA e logo na base"),

  h3("Hierarquia Visual — Versão B (Com pessoa — testar A/B)"),
  bullet("1. Líder de RH caminhando em direção a uma porta iluminada (clareza, resultado)"),
  bullet("2. Corredor escuro atrás — representa o passado sem direção"),
  bullet("3. Headline no terço superior"),
  bullet("4. CTA e logo na base"),

  h3("Direção Visual"),
  makeTable(
    ["Atributo", "Especificação"],
    [
      ["Paleta — Versão A",  "Esquerda: cinza escuro, dessaturado, sem vida. Direita: azul Gupy vibrante, dados organizados, linhas de dados clean. Headline em branco cruzando os dois lados."],
      ["Paleta — Versão B",  "Corredor escuro em azul-marinho profundo. Porta iluminada em branco/azul claro. Headline em branco sobre o escuro."],
      ["Mood",               "Urgência silenciosa. Não catastrófico — consequência real e gradual. Profissional, moderno."],
      ["Foto/imagem V.A",    "Composição gráfica abstrata — pode ser criada 100% em Figma sem foto. Elementos de dados (linhas, pontos, gráficos) no lado claro."],
      ["Foto/imagem V.B",    "Homem de RH (35–45 anos) de costas ou perfil, caminhando em corredor corporativo em direção a luz. Não mostrar rosto — gera identificação mais ampla."],
      ["Tipografia",         "Headline bold, branco. Caixa alta no início para peso. Subtexto regular."],
    ],
    [2200, 7160]
  ),

  h3("Formatos a Produzir"),
  makeTable(
    ["Plataforma", "Tamanho", "Adaptação"],
    [
      ["LinkedIn feed",      "1200×627px",  "Split horizontal — lado a lado. Headline centralizado sobre a divisão."],
      ["LinkedIn quadrado",  "1200×1200px", "Split vertical ou Versão B com pessoa. Headline no topo."],
      ["Meta feed",          "1080×1080px", "Versão A abstrata funciona bem no quadrado. Alto contraste."],
      ["Meta feed retrato",  "1080×1350px", "Versão B com pessoa — mais espaço para a composição de corredor."],
      ["Meta Stories/Reels", "1080×1920px", "Versão B: corredor vertical, muito impactante. Headline grande no topo."],
    ],
    [2400, 2200, 4760]
  ),

  divider(),

  h2("Resumo de Formatos — Todas as Peças"),
  makeTable(
    ["Plataforma", "Tamanho", "Qtd. de Peças"],
    [
      ["LinkedIn feed (retangular)",  "1200×627px",   "3 (uma por ângulo)"],
      ["LinkedIn feed (quadrado)",    "1200×1200px",  "3 (uma por ângulo)"],
      ["Meta feed (quadrado)",        "1080×1080px",  "3 (uma por ângulo)"],
      ["Meta feed (retrato)",         "1080×1350px",  "3 (uma por ângulo)"],
      ["Meta Stories / Reels",        "1080×1920px",  "3 (uma por ângulo)"],
      ["TOTAL",                       "—",            "15 peças"],
    ],
    [2800, 2400, 4160]
  ),
  p("Prioridade de produção: LinkedIn 1200×627 + Meta 1080×1080 para subir na fase de testes. Demais formatos após definir o ângulo vencedor.", { italic: true, color: "666666" }),

  divider(),
  pageBreak(),

  // 9. CRO LP
  h1("9. Recomendações de Landing Page (CRO)"),
  p("URL: https://info.gupy.io/diagnostico-teste", { color: "666666", italic: true }),

  h2("Diagnóstico Geral"),
  p("A LP tem base sólida — framework de 4 níveis é um ativo forte. Mas há dois problemas críticos que vão afetar a conversão da campanha:"),
  bullet("As objeções principais não estão respondidas em nenhum lugar da página"),
  bullet("Descontinuidade de tom entre anúncios (brutal facts) e LP (inspiracional/consultivo)"),

  h2("Implementar Agora — Baixo Esforço / Alto Impacto"),

  h3("1. Objection handler próximo ao CTA"),
  p("Adicionar acima ou abaixo do botão principal:"),
  blockquote('"Esta sessão é conduzida por um especialista em RH — não pelo time comercial. O resultado é prático e útil independente de qualquer decisão de compra."'),

  h3("2. Microcopy no campo telefone"),
  p("O telefone é obrigatório pois o especialista liga para conduzir a sessão. Sem explicação, o lead interpreta como abordagem comercial. Adicionar abaixo do campo:"),
  blockquote('"Usamos apenas para agendar sua sessão com o especialista."'),

  h3("3. Mover \"100% Independente de qualquer decisão\" para o hero"),
  p("Atualmente enterrado no meio da página. Deve estar visível sem scroll — é o argumento mais forte contra a objeção principal."),

  h3("4. Novo CTA copy"),
  p("Substituir \"Solicitar minha sessão de diagnóstico\" por:"),
  bullet("Quero saber onde meu RH está"),
  bullet("Agendar meu diagnóstico gratuito"),
  bullet("Descobrir meu estágio de maturidade"),

  h3("5. Remover menu de navegação do header"),
  p("Manter apenas o logo. Toda saída é conversão perdida em páginas de lead gen."),

  h2("Mudanças de Maior Esforço — Priorizar no Mês 2"),

  h3("6. Seção \"O que você vai sair sabendo\""),
  p("Antes do formulário, listar os entregáveis concretos da sessão:"),
  bullet("Em qual dos 4 estágios sua empresa está hoje"),
  bullet("O que está travando a evolução para o próximo nível"),
  bullet("As 2–3 prioridades práticas para avançar agora"),
  bullet("Se sua empresa está acima ou abaixo da média do mercado brasileiro"),

  h3("7. Alinhar hero com tom dos anúncios"),
  p("Testar headline orientada a brutal facts:"),
  blockquote('"Seu RH tem IA. Mas você sabe se ela está gerando resultado?"'),

  h2("Tabela de Priorização"),
  makeTable(
    ["Prioridade", "Ação", "Esforço", "Impacto"],
    [
      ["Alta", "Adicionar objection handler próximo ao CTA",                         "Baixo", "Alto"],
      ["Alta", "Microcopy no campo telefone",                                        "Baixo", "Alto"],
      ["Alta", "Mover '100% independente' para o hero",                             "Baixo", "Médio"],
      ["Alta", "Novo CTA copy",                                                      "Baixo", "Médio"],
      ["Alta", "Remover navegação do header",                                        "Baixo", "Médio"],
      ["Média", "Seção 'O que você vai sair sabendo'",                              "Médio", "Alto"],
      ["Média", "A/B test hero headline (brutal facts vs. atual)",                  "Médio", "Alto"],
    ],
    [1400, 4760, 1500, 1700]
  ),

  divider(),
  pageBreak(),

  // 10. CHECKLIST
  h1("10. Checklist de Lançamento"),

  h2("Time Técnico"),
  bullet("GTM disparando evento de conversão na confirmação de agendamento"),
  bullet("LinkedIn Insight Tag instalada na LP"),
  bullet("Meta Pixel com evento 'Lead' na confirmação"),
  bullet("UTMs configurados em todos os anúncios"),
  bullet("Upload de lista de clientes atuais como exclusão (LinkedIn + Meta)"),
  bullet("Custom Audience de visitantes da LP criada (Meta + LinkedIn)"),
  bullet("Lookalike 1–3% criado no Meta baseado em leads existentes"),
  bullet("LP testada em mobile (meta: menos de 3 segundos de carregamento)"),

  h2("Marketing / Design"),
  bullet("3 variações de imagem (uma por ângulo) para LinkedIn e Meta"),
  bullet("Vídeo 15–30 seg com legenda para Meta/Reels (ao menos 1 variação)"),
  bullet("Objection handler adicionado à LP"),
  bullet("Microcopy do telefone adicionado à LP"),
  bullet("CTA da LP atualizado"),
  bullet("Navegação do header removida"),

  divider(),
  pageBreak(),

  // 11. KPIs
  h1("11. KPIs e Métricas"),

  h2("Fases de Gestão"),
  makeTable(
    ["Fase", "Período", "Foco"],
    [
      ["Aprendizado", "Semanas 1–2", "CTR por ângulo, CPL inicial, taxa de preenchimento do form"],
      ["Otimização",  "Semanas 3–4", "CPL por plataforma e ângulo, taxa de agendamento efetivo"],
      ["Escala",      "Mês 2+",      "MQL→OPP por canal, CAC real, oportunidades geradas"],
    ],
    [2000, 2000, 5360]
  ),

  p(""),
  h2("Benchmarks por Plataforma"),
  makeTable(
    ["Métrica", "LinkedIn", "Meta", "Google"],
    [
      ["CTR esperado",   "0,4–0,8%",  "1,5–3%",   "3–6%"],
      ["CPL alvo",       "R$180–250", "R$70–110",  "R$90–140"],
      ["Alerta de CPL",  ">R$250",    ">R$130",    ">R$160"],
    ],
    [2760, 2200, 2200, 2200]
  ),

  divider(),
  pageBreak(),

  // 12. PRÓXIMOS PASSOS
  h1("12. Próximos Passos"),
  makeTable(
    ["Prioridade", "Ação", "Responsável"],
    [
      ["Alta",  "Setup técnico de tracking e pixels",                    "Time técnico"],
      ["Alta",  "Upload de exclusões (clientes atuais)",                 "Time técnico / CRM"],
      ["Alta",  "Implementar quick wins na LP (itens 1 a 5 do CRO)",    "Marketing"],
      ["Alta",  "Produzir 3 visuais (um por ângulo)",                    "Design"],
      ["Média", "Gravar vídeo 15–30 seg para Meta/Reels",               "Marketing/Vídeo"],
      ["Média", "Subir campanhas e iniciar fase de testes",             "Media"],
      ["Baixa", "Semana 3: pausar ângulos fracos, escalar vencedor",    "Media"],
      ["Baixa", "Mês 2: seção 'O que você vai sair sabendo' na LP",     "Marketing"],
    ],
    [1400, 5200, 2760]
  ),

];

// ─── Documento ────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2022",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      }, {
        level: 1, format: LevelFormat.BULLET, text: "\u25E6",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
      }] }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: AZUL },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: AZUL },
        paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
      }
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: AZUL, space: 4 } },
          spacing: { before: 0, after: 160 },
          children: [
            new TextRun({ text: "Gupy | Diagnóstico de Maturidade de RH na IA", font: "Arial", size: 16, color: "888888" }),
          ]
        })
      ]})
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: AZUL, space: 4 } },
          spacing: { before: 160, after: 0 },
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Página ", font: "Arial", size: 16, color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "888888" }),
            new TextRun({ text: " | Confidencial", font: "Arial", size: 16, color: "888888" }),
          ]
        })
      ]})
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("briefing-campanha-gupy.docx", buffer);
  console.log("OK: briefing-campanha-gupy.docx gerado com sucesso");
});
