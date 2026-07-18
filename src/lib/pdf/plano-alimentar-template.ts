import { PlanoAlimentarData, RefeicaoData } from './plano-alimentar-types';
import { icon, mealIcon } from './icons';

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

function renderTagList(items: string[], emptyText = 'Nenhum item informado.'): string {
  if (items.length === 0) {
    return `<span class="empty-state">${emptyText}</span>`;
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

function formatGeneratedDate(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function renderRefeicoes(refeicoes: RefeicaoData[] | undefined): string {
  const validas = (refeicoes ?? []).filter(
    (r) => (r.nome && r.nome.trim()) || (r.itens && toArray(r.itens).length > 0)
  );

  if (validas.length === 0) {
    return `<div class="section">
<div class="section-heading"><span class="icon-badge">${icon('utensils')}</span><h2>Cardápio sugerido para o seu dia</h2></div>
<p class="muted">Cardápio não gerado para esta consulta.</p>
</div>`;
  }

  const cards = validas
    .map((r) => {
      const nome = toText(r.nome, 'Refeição');
      const horario = (r.horario ?? '').toString().trim();
      const itens = toArray(r.itens);
      return `<div class="meal-card">
<div class="meal-card-header">
<span class="meal-icon">${mealIcon(r.nome ?? '')}</span>
<div class="meal-card-title">
<div class="meal-name">${nome}</div>
${horario ? `<div class="meal-time">${icon('clock', 14)} ${escapeHtml(horario)}</div>` : ''}
</div>
</div>
${itens.length > 0
  ? `<ul class="meal-items">${itens.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
  : '<p class="empty-state">Itens não especificados.</p>'}
</div>`;
    })
    .join('');

  return `<div class="section">
<div class="section-heading"><span class="icon-badge">${icon('utensils')}</span><h2>Cardápio sugerido para o seu dia</h2></div>
<p class="section-subtitle">Uma sugestão de distribuição das refeições, alinhada às suas preferências e rotina.</p>
<div class="meal-grid">${cards}</div>
</div>`;
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
  const geradoEm = formatGeneratedDate();

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
--bg:#f4f6fb;
--card:#ffffff;
--text:#1f2937;
--muted:#6b7280;
--accent:#5b6ee8;
--accent-dark:#3d4fc4;
--accent-2:#28b18f;
--line:#e6e9f2;
--soft:#eef1ff;
--soft-2:#eafaf5;
--warn:#fff4e8;
--warn-line:#f4dcb8;
--warn-text:#8a5a17;
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
padding:16mm 16mm 14mm;
}
.icon-badge{
display:inline-flex;
align-items:center;
justify-content:center;
width:34px;
height:34px;
border-radius:12px;
background:var(--soft);
color:var(--accent-dark);
flex-shrink:0;
}
.cover{
position:relative;
overflow:hidden;
border-radius:26px;
padding:40px 36px 34px;
background:linear-gradient(135deg, #4b5ce0 0%, #6c7cf0 45%, #4fb6a8 130%);
color:#ffffff;
box-shadow:0 22px 45px rgba(59,68,180,0.22);
margin-bottom:20px;
}
.cover::before{
content:'';
position:absolute;
top:-70px; right:-60px;
width:220px; height:220px;
border-radius:50%;
background:rgba(255,255,255,0.14);
}
.cover::after{
content:'';
position:absolute;
bottom:-90px; left:-40px;
width:260px; height:260px;
border-radius:50%;
background:rgba(255,255,255,0.09);
}
.cover-top{
position:relative;
display:flex;
justify-content:space-between;
align-items:flex-start;
gap:12px;
}
.eyebrow{
display:inline-flex;
align-items:center;
gap:8px;
font-size:12px;
letter-spacing:.14em;
text-transform:uppercase;
color:#ffffff;
font-weight:700;
background:rgba(255,255,255,0.16);
padding:8px 14px;
border-radius:999px;
}
.gerado-em{
display:inline-flex;
align-items:center;
gap:6px;
font-size:11.5px;
color:rgba(255,255,255,0.85);
background:rgba(255,255,255,0.12);
padding:7px 12px;
border-radius:999px;
white-space:nowrap;
}
h1{
position:relative;
margin:18px 0 0;
font-size:34px;
line-height:1.12;
letter-spacing:-0.03em;
font-weight:800;
}
.patient-name{
position:relative;
margin-top:12px;
font-size:20px;
font-weight:600;
color:rgba(255,255,255,0.95);
}
.goal{
position:relative;
margin-top:16px;
display:flex;
flex-wrap:wrap;
gap:10px;
}
.pill{
display:inline-flex;
align-items:center;
gap:7px;
padding:8px 14px;
border-radius:999px;
font-size:13px;
font-weight:600;
background:rgba(255,255,255,0.16);
color:#ffffff;
}
.welcome{
position:relative;
margin-top:18px;
font-size:14.5px;
color:rgba(255,255,255,0.92);
max-width:96%;
}
.meta{
position:relative;
margin-top:22px;
display:grid;
grid-template-columns:repeat(3,1fr);
gap:10px;
}
.meta-card{
display:flex;
align-items:center;
gap:10px;
padding:13px 14px;
border-radius:16px;
background:rgba(255,255,255,0.14);
}
.meta-card .icon-badge{
background:rgba(255,255,255,0.2);
color:#ffffff;
width:30px; height:30px;
}
.meta-card .label{
font-size:11px;
color:rgba(255,255,255,0.78);
text-transform:uppercase;
letter-spacing:.06em;
font-weight:700;
}
.meta-card .value{
font-size:14.5px;
font-weight:700;
color:#ffffff;
}
.section{
margin-top:16px;
background:var(--card);
border:1px solid var(--line);
border-radius:20px;
padding:20px 22px 18px;
box-shadow:0 6px 18px rgba(31,41,55,0.04);
page-break-inside: avoid;
}
.section-heading{
display:flex;
align-items:center;
gap:12px;
margin-bottom:6px;
}
.section-heading h2{
margin:0;
font-size:19px;
line-height:1.2;
color:#111827;
letter-spacing:-0.02em;
}
.section-subtitle{
margin:0 0 14px 46px;
color:var(--muted);
font-size:13px;
}
.section p{
margin:0;
color:#374151;
font-size:14px;
}
.grid{
display:grid;
grid-template-columns:1fr 1fr;
gap:12px;
}
.box{
border-radius:16px;
padding:15px 16px;
border:1px solid var(--line);
background:#fbfbfe;
}
.box h3{
display:flex;
align-items:center;
gap:8px;
margin:0 0 10px 0;
font-size:13px;
text-transform:uppercase;
letter-spacing:.06em;
color:#374151;
font-weight:700;
}
.box h3 .icon-badge{ width:26px; height:26px; border-radius:9px; }
.tag-list{ display:flex; flex-wrap:wrap; gap:7px; }
.tag{
display:inline-block;
padding:6px 11px;
border-radius:999px;
background:var(--soft);
color:var(--accent-dark);
font-size:12.5px;
font-weight:600;
}
.meal-grid{
display:grid;
grid-template-columns:1fr 1fr;
gap:12px;
}
.meal-card{
border:1px solid var(--line);
border-radius:16px;
padding:14px 16px;
background:linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
page-break-inside: avoid;
}
.meal-card-header{
display:flex;
align-items:center;
gap:10px;
margin-bottom:8px;
}
.meal-icon{
display:flex; align-items:center; justify-content:center;
width:32px; height:32px;
border-radius:10px;
background:var(--soft-2);
color:var(--accent-2);
flex-shrink:0;
}
.meal-name{ font-size:14.5px; font-weight:700; color:#111827; }
.meal-time{
display:inline-flex; align-items:center; gap:4px;
font-size:11.5px; color:var(--muted); margin-top:2px;
}
.meal-items{ margin:0; padding-left:18px; }
.meal-items li{ font-size:13px; color:#374151; margin:3px 0; }
.warn-box{
background:var(--warn);
border:1px solid var(--warn-line);
border-radius:16px;
padding:14px 16px;
color:var(--warn-text);
font-size:14px;
}
.final-box{
background:linear-gradient(135deg, #eef1ff 0%, #eafaf5 100%);
border:1px solid var(--line);
border-radius:16px;
padding:18px;
}
.footer-note{
margin-top:14px;
font-size:12px;
color:var(--muted);
text-align:center;
}
.muted, .empty-state{ color:var(--muted); }
</style>
</head>
<body>
<div class="page">
<div class="cover">
<div class="cover-top">
<span class="eyebrow">${icon('sparkles', 14)} Plano alimentar personalizado</span>
<span class="gerado-em">${icon('calendar', 13)} Gerado em ${geradoEm}</span>
</div>
<h1>Plano Alimentar Personalizado</h1>
<div class="patient-name">${nome}</div>
<div class="goal">
<span class="pill">${icon('target', 14)} Objetivo: ${objetivo}</span>
${genero ? `<span class="pill">${icon('person', 14)} ${genero}</span>` : ''}
</div>
<p class="welcome">Olá${nome !== 'Não informado' ? `, ${nome}` : ''}! Com base nas informações que você compartilhou, foi elaborado um plano pensado para se adaptar à sua rotina, respeitar suas preferências alimentares e oferecer praticidade no dia a dia, com foco em consistência e aderência.</p>
<div class="meta">
<div class="meta-card"><span class="icon-badge">${icon('calendar')}</span><div><div class="label">Idade</div><div class="value">${idade}</div></div></div>
<div class="meta-card"><span class="icon-badge">${icon('ruler')}</span><div><div class="label">Altura</div><div class="value">${altura}</div></div></div>
<div class="meta-card"><span class="icon-badge">${icon('scale')}</span><div><div class="label">Peso atual</div><div class="value">${peso}</div></div></div>
</div>
</div>

<div class="section">
<div class="section-heading"><span class="icon-badge">${icon('person')}</span><h2>Sobre você</h2></div>
<p>${sobreVoceParagraph}</p>
</div>

${renderRefeicoes(data.refeicoes)}

<div class="section">
<div class="section-heading"><span class="icon-badge">${icon('drumstick')}</span><h2>Alimentos que você gosta</h2></div>
<div class="grid">
<div class="box">
<h3><span class="icon-badge">${icon('drumstick', 15)}</span>Proteínas</h3>
${renderTagList(proteinasPreferidas)}
</div>
<div class="box">
<h3><span class="icon-badge">${icon('wheat', 15)}</span>Carboidratos</h3>
${renderTagList(carboidratosPreferidos)}
</div>
</div>
<div style="height:12px"></div>
<div class="grid">
<div class="box">
<h3><span class="icon-badge">${icon('droplet', 15)}</span>Gorduras</h3>
${renderTagList(gordurasPreferidas)}
</div>
<div class="box">
<h3><span class="icon-badge">${icon('cup', 15)}</span>Bebidas preferidas</h3>
${renderTagList(bebidasPreferidas)}
</div>
</div>
${alimentosIndispensaveis.length > 0 ? `
<div style="height:12px"></div>
<div class="box">
<h3><span class="icon-badge">${icon('star', 15)}</span>Itens indispensáveis</h3>
${renderTagList(alimentosIndispensaveis)}
</div>` : ''}
</div>

<div class="section">
<div class="section-heading"><span class="icon-badge">${icon('ban')}</span><h2>Alimentos que serão evitados</h2></div>
<p>${renderInlineList(alimentosEvitados, 'Nenhum alimento foi informado como não desejado.')}</p>
</div>

<div class="section">
<div class="section-heading"><span class="icon-badge">${icon('alert')}</span><h2>Restrições alimentares</h2></div>
${restricoes.length > 0
  ? `<div class="warn-box">${escapeHtml(restricoes.join(', '))}</div>`
  : `<p class="empty-state">Sem restrições alimentares informadas.</p>`}
</div>

<div class="section">
<div class="section-heading"><span class="icon-badge">${icon('alert')}</span><h2>Alergias</h2></div>
${alergias.length > 0
  ? `<div class="warn-box">${escapeHtml(alergias.join(', '))}</div>`
  : `<p class="empty-state">Não há alergias alimentares informadas.</p>`}
</div>

<div class="section">
<div class="section-heading"><span class="icon-badge">${icon('sparkles')}</span><h2>Considerações finais</h2></div>
<div class="final-box">
<p>A melhor dieta é aquela que você consegue manter de forma consistente. Como parte do seu objetivo de ${objetivo.toLowerCase()}, o foco agora é construir um plano prático, agradável e sustentável, alinhado à sua rotina. Manter regularidade, atenção às porções e constância será essencial para alcançar o resultado desejado com segurança e equilíbrio.</p>
</div>
</div>

<div class="footer-note">Plano elaborado com base exclusivamente nas informações fornecidas durante a consulta • Gerado em ${geradoEm}</div>
</div>
</body>
</html>`;
}
