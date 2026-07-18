import { PlanoAlimentarData } from './plano-alimentar-types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toArray(value: string[] | string | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function toText(value: string | undefined, fallback = 'Não informado'): string {
  const trimmed = (value ?? '').toString().trim();
  return trimmed.length > 0 ? escapeHtml(trimmed) : fallback;
}

function toNumberText(value: number | string | undefined, suffix = ''): string {
  const trimmed = (value ?? '').toString().trim();
  return trimmed.length > 0 ? `${escapeHtml(trimmed)}${suffix}` : 'Não informado';
}

function renderTagList(items: string[]): string {
  if (items.length === 0) {
    return '<span class="empty-state">Nenhum item informado.</span>';
  }
  return `<div class="tag-list">${items
    .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
    .join('')}</div>`;
}

function renderInlineList(items: string[], emptyText: string): string {
  if (items.length === 0) {
    return `<span class="empty-state">${emptyText}</span>`;
  }
  return escapeHtml(items.join(', '));
}

export function renderPlanoAlimentarHtml(data: PlanoAlimentarData): string {
  const nome = toText(data.nome);
  const objetivo = toText(data.objetivo);
  const genero = toText(data.genero, '');
  const idade = toNumberText(data.idade, ' anos');
  const altura = toNumberText(data.altura_cm, ' cm');
  const peso = toNumberText(data.peso_kg, ' kg');
  const quantidadeRefeicoes = toNumberText(data.quantidade_refeicoes);
  const rotina = toText(data.rotina, 'rotina não detalhada');
  const nivelAtividade = toText(data.nivel_atividade, 'não informado');
  const horarioAcorda = toText(data.horario_acorda, 'não informado');
  const horarioDorme = toText(data.horario_dorme, 'não informado');
  const observacoes = (data.observacoes ?? '').toString().trim();

  const proteinasPreferidas = toArray(data.proteinas_preferidas);
  const carboidratosPreferidos = toArray(data.carboidratos_preferidos);
  const gordurasPreferidas = toArray(data.gorduras_preferidas);
  const bebidasPreferidas = toArray(data.bebidas_preferidas);
  const alimentosIndispensaveis = toArray(data.alimentos_indispensaveis);

  const alimentosEvitados = [
    ...toArray(data.alimentos_que_recusa),
    ...toArray(data.proteinas_que_nao_gosta),
    ...toArray(data.carboidratos_que_nao_gosta),
    ...toArray(data.gorduras_que_nao_gosta),
  ];

  const restricoes = toArray(data.restricoes_alimentares);
  const alergias = toArray(data.alergias);

  const sobreVoceParagraph = `
    Com base nas informações fornecidas durante a consulta, este plano foi pensado para respeitar
    suas preferências alimentares e se encaixar na sua rotina (${rotina !== 'rotina não detalhada' ? rotina : 'rotina informada'}).
    Você relatou nível de atividade física ${nivelAtividade}, costuma acordar por volta de ${horarioAcorda}
    e dormir por volta de ${horarioDorme}, com ${quantidadeRefeicoes} refeições ao longo do dia.
    ${observacoes ? `Observação registrada: ${escapeHtml(observacoes)}.` : ''}
  `.trim();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Plano Alimentar Personalizado${nome !== 'Não informado' ? ` - ${nome}` : ''}</title>
<style>
:root{
--bg:#f6f8fb;
--card:#ffffff;
--text:#1f2937;
--muted:#6b7280;
--accent:#6c8cff;
--accent-2:#8fd3c7;
--line:#e5e7eb;
--soft:#eef4ff;
--soft-2:#f2fbf8;
}
*{box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
@page { size: A4; margin: 0; }
body{
margin:0;
padding:0;
background:var(--bg);
color:var(--text);
font-family: "Helvetica Neue", Arial, sans-serif;
line-height:1.55;
}
.page{
width:210mm;
min-height:297mm;
margin:0 auto;
background:linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
padding:26mm 18mm 18mm;
}
.cover{
border:1px solid var(--line);
border-radius:24px;
padding:38px 34px;
background:
radial-gradient(circle at top right, rgba(108,140,255,0.10), transparent 28%),
radial-gradient(circle at bottom left, rgba(143,211,199,0.14), transparent 26%),
#ffffff;
box-shadow:0 18px 40px rgba(31,41,55,0.06);
margin-bottom:20px;
page-break-inside: avoid;
}
.eyebrow{
display:inline-block;
font-size:12px;
letter-spacing:.14em;
text-transform:uppercase;
color:var(--accent);
font-weight:700;
margin-bottom:14px;
}
h1{
margin:0;
font-size:32px;
line-height:1.1;
letter-spacing:-0.03em;
color:#111827;
}
.patient-name{
margin-top:14px;
font-size:22px;
font-weight:700;
color:var(--text);
}
.goal{
margin-top:10px;
display:flex;
flex-wrap:wrap;
gap:10px;
}
.pill{
display:inline-block;
padding:9px 14px;
border-radius:999px;
font-size:13px;
font-weight:600;
background:var(--soft);
color:#3557c6;
border:1px solid rgba(108,140,255,0.18);
}
.welcome{
margin-top:22px;
font-size:16px;
color:#374151;
max-width:92%;
}
.section{
margin-top:18px;
background:var(--card);
border:1px solid var(--line);
border-radius:20px;
padding:22px 22px 18px;
box-shadow:0 8px 24px rgba(31,41,55,0.04);
page-break-inside: avoid;
}
.section h2{
margin:0 0 12px 0;
font-size:22px;
line-height:1.2;
color:#111827;
letter-spacing:-0.02em;
}
.section p{
margin:0;
color:#374151;
font-size:14.5px;
}
.grid{
display:grid;
grid-template-columns:1fr 1fr;
gap:14px;
}
.box{
border-radius:18px;
padding:18px;
border:1px solid var(--line);
background:#fff;
}
.box.soft-blue{background:var(--soft)}
.box.soft-green{background:var(--soft-2)}
.box h3{
margin:0 0 10px 0;
font-size:15px;
text-transform:uppercase;
letter-spacing:.08em;
color:#374151;
}
.tag-list{ display:flex; flex-wrap:wrap; gap:8px; }
.tag{
display:inline-block;
padding:6px 12px;
border-radius:999px;
background:var(--soft);
color:#1e3a8a;
border:1px solid #dbe7ff;
font-size:13px;
font-weight:600;
}
.meta{
margin-top:10px;
display:grid;
grid-template-columns:repeat(3,1fr);
gap:10px;
}
.meta-card{
padding:14px 16px;
border:1px solid var(--line);
border-radius:16px;
background:#fcfcfd;
}
.meta-card .label{
font-size:12px;
color:var(--muted);
text-transform:uppercase;
letter-spacing:.08em;
margin-bottom:4px;
font-weight:700;
}
.meta-card .value{
font-size:15px;
font-weight:700;
color:#111827;
}
.footer-note{
margin-top:10px;
font-size:13px;
color:var(--muted);
text-align:center;
}
.muted, .empty-state{
color:var(--muted);
}
</style>
</head>
<body>
<div class="page">
<div class="cover">
<span class="eyebrow">Plano alimentar personalizado</span>
<h1>Plano Alimentar Personalizado</h1>
<div class="patient-name">${nome}</div>
<div class="goal">
<span class="pill">Objetivo: ${objetivo}</span>
${genero ? `<span class="pill">${genero}</span>` : ''}
</div>
<p class="welcome">Olá${nome !== 'Não informado' ? `, ${nome}` : ''}! Com base nas informações que você compartilhou, foi elaborado um plano pensado para se adaptar à sua rotina, respeitar suas preferências alimentares e oferecer praticidade no dia a dia, com foco em consistência e aderência.</p>
<div class="meta">
<div class="meta-card">
<div class="label">Idade</div>
<div class="value">${idade}</div>
</div>
<div class="meta-card">
<div class="label">Altura</div>
<div class="value">${altura}</div>
</div>
<div class="meta-card">
<div class="label">Peso atual</div>
<div class="value">${peso}</div>
</div>
</div>
</div>

<div class="section">
<h2>Sobre você</h2>
<p>${sobreVoceParagraph}</p>
</div>

<div class="section">
<h2>Alimentos que você gosta</h2>
<div class="grid">
<div class="box soft-blue">
<h3>Proteínas</h3>
${renderTagList(proteinasPreferidas)}
</div>
<div class="box soft-green">
<h3>Carboidratos</h3>
${renderTagList(carboidratosPreferidos)}
</div>
</div>
<div style="height:14px"></div>
<div class="grid">
<div class="box">
<h3>Gorduras</h3>
${renderTagList(gordurasPreferidas)}
</div>
<div class="box">
<h3>Bebidas preferidas</h3>
${renderTagList(bebidasPreferidas)}
</div>
</div>
${alimentosIndispensaveis.length > 0 ? `
<div style="height:14px"></div>
<div class="box soft-blue">
<h3>Itens indispensáveis</h3>
${renderTagList(alimentosIndispensaveis)}
</div>` : ''}
</div>

<div class="section">
<h2>Alimentos que serão evitados</h2>
<p>${renderInlineList(alimentosEvitados, 'Nenhum alimento foi informado como não desejado.')}</p>
</div>

<div class="section">
<h2>Restrições alimentares</h2>
<p>${renderInlineList(restricoes, 'Sem restrições alimentares informadas.')}</p>
</div>

<div class="section">
<h2>Alergias</h2>
<p>${renderInlineList(alergias, 'Não há alergias alimentares informadas.')}</p>
</div>

<div class="section">
<h2>Considerações finais</h2>
<p>A melhor dieta é aquela que você consegue manter de forma consistente. Como parte do seu objetivo de ${objetivo.toLowerCase()}, o foco agora é construir um plano prático, agradável e sustentável, alinhado à sua rotina. Manter regularidade, atenção às porções e constância será essencial para alcançar o resultado desejado com segurança e equilíbrio.</p>
</div>

<div class="footer-note">Plano elaborado com base exclusivamente nas informações fornecidas durante a consulta.</div>
</div>
</body>
</html>`;
}
