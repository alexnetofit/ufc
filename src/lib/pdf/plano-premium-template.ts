import { PlanoAlimentarData, RefeicaoData } from './plano-alimentar-types';
import { MacrosCalculados } from './macros';
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
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

function toText(value: string | undefined, fallback = 'Não informado'): string {
  const t = (value ?? '').toString().trim();
  return t.length > 0 ? escapeHtml(t) : fallback;
}

function toNumberText(value: number | string | undefined, suffix = ''): string {
  const t = (value ?? '').toString().trim();
  return t.length > 0 ? `${escapeHtml(t)}${suffix}` : '—';
}

function formatGeneratedDate(): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
}

export interface PremiumRenderOptions {
  coverImage?: string; // data URI ou URL
  mealsImage?: string;
  macros?: MacrosCalculados | null;
}

// Cor fixa por tipo de refeição (paleta validada para contraste/daltonismo).
function mealAccent(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes('café') || n.includes('cafe') || (n.includes('manhã') && !n.includes('lanche'))) return '#eda100';
  if (n.includes('almoço') || n.includes('almoco')) return '#2a78d6';
  if (n.includes('lanche') || n.includes('snack')) return '#1baf7a';
  if (n.includes('jantar')) return '#4a3aa7';
  if (n.includes('ceia')) return '#e34948';
  return '#eb6834';
}

function renderMacroBar(m: MacrosCalculados): string {
  const protKcal = m.proteina_g * 4;
  const carbKcal = m.carboidrato_g * 4;
  const fatKcal = m.gordura_g * 9;
  const total = Math.max(protKcal + carbKcal + fatKcal, 1);
  const pP = Math.round((protKcal / total) * 100);
  const pC = Math.round((carbKcal / total) * 100);
  const pF = Math.max(100 - pP - pC, 0);
  return `<div class="macro-bar">
<span style="width:${pP}%;background:#e34948"></span>
<span style="width:${pC}%;background:#eda100"></span>
<span style="width:${pF}%;background:#eb6834"></span>
</div>
<div class="macro-legend">
<span><i style="background:#e34948"></i>Proteína ${pP}%</span>
<span><i style="background:#eda100"></i>Carbo ${pC}%</span>
<span><i style="background:#eb6834"></i>Gordura ${pF}%</span>
</div>`;
}

function renderMacros(m: MacrosCalculados | null | undefined): string {
  if (!m) return '';
  return `<div class="macros">
<div class="macro-tiles">
<div class="macro-tile macro-cal">
<div class="macro-val">${m.calorias}</div>
<div class="macro-label">kcal / dia</div>
</div>
<div class="macro-tile">
<div class="macro-val" style="color:#ff9d9c">${m.proteina_g}<small>g</small></div>
<div class="macro-label">Proteína</div>
</div>
<div class="macro-tile">
<div class="macro-val" style="color:#ffcf6b">${m.carboidrato_g}<small>g</small></div>
<div class="macro-label">Carboidrato</div>
</div>
<div class="macro-tile">
<div class="macro-val" style="color:#ffa878">${m.gordura_g}<small>g</small></div>
<div class="macro-label">Gordura</div>
</div>
</div>
${renderMacroBar(m)}
</div>`;
}

function renderMealCards(refeicoes: RefeicaoData[] | undefined): string {
  const validas = (refeicoes ?? []).filter(
    (r) => (r.nome && r.nome.trim()) || (r.itens && toArray(r.itens).length > 0)
  );

  if (validas.length === 0) {
    return `<p class="empty-meals">Cardápio não gerado para esta consulta.</p>`;
  }

  return validas
    .map((r) => {
      const nome = toText(r.nome, 'Refeição');
      const horario = (r.horario ?? '').toString().trim();
      const itens = toArray(r.itens);
      const accent = mealAccent(r.nome ?? '');
      return `<div class="meal-card" style="--accent:${accent}">
<div class="meal-head">
<span class="meal-ic">${mealIcon(r.nome ?? '')}</span>
<div>
<div class="meal-name">${nome}</div>
${horario ? `<div class="meal-time">${icon('clock', 12)} ${escapeHtml(horario)}</div>` : ''}
</div>
</div>
${itens.length > 0 ? `<ul class="meal-items">${itens.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : ''}
</div>`;
    })
    .join('');
}

export function renderPlanoPremiumHtml(data: PlanoAlimentarData, opts: PremiumRenderOptions = {}): string {
  const nome = toText(data.nome);
  const objetivo = toText(data.objetivo);
  const genero = toText(data.genero, '');
  const idade = toNumberText(data.idade, ' anos');
  const altura = toNumberText(data.altura_cm, ' cm');
  const peso = toNumberText(data.peso_kg, ' kg');
  const geradoEm = formatGeneratedDate();
  const mealCount = (data.refeicoes ?? []).filter((r) => (r.nome && r.nome.trim()) || (r.itens && toArray(r.itens).length > 0)).length;

  const coverBg = opts.coverImage
    ? `background-image:linear-gradient(90deg, rgba(10,12,20,0.92) 0%, rgba(10,12,20,0.72) 40%, rgba(10,12,20,0.30) 100%), url('${opts.coverImage}');`
    : `background-image:linear-gradient(120deg, #1f2a4a 0%, #3a2a6b 60%, #7a3a6b 130%);`;

  const mealsBg = opts.mealsImage
    ? `background-image:linear-gradient(180deg, rgba(10,12,20,0.20), rgba(10,12,20,0.55)), url('${opts.mealsImage}');`
    : `background-image:linear-gradient(160deg, #1baf7a 0%, #2a78d6 120%);`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Plano Alimentar Personalizado${nome !== 'Não informado' ? ` - ${nome}` : ''}</title>
<style>
*{box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
:root{ --ink:#0b0b0b; --muted:#6b7280; --line:#e6e9f2; }
@page { size: 1280px 720px; margin: 0; }
html,body{ font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:var(--ink); }
.page{
width:1280px; height:720px; position:relative; overflow:hidden;
background:#ffffff;
}
.page + .page{ page-break-before: always; }

/* ---------- CAPA ---------- */
.cover{
${coverBg}
background-size:cover; background-position:center right;
color:#ffffff;
display:flex; flex-direction:column; justify-content:space-between;
padding:64px 72px;
}
.cover-top{ display:flex; justify-content:space-between; align-items:center; }
.eyebrow{
display:inline-flex; align-items:center; gap:8px;
font-size:13px; letter-spacing:.22em; text-transform:uppercase; font-weight:700;
color:rgba(255,255,255,0.9);
}
.gerado{ font-size:13px; color:rgba(255,255,255,0.75); display:inline-flex; align-items:center; gap:7px; }
.cover-main{ max-width:760px; }
.cover h1{ font-size:64px; line-height:1.02; letter-spacing:-0.03em; font-weight:800; }
.cover .subtitle{ margin-top:14px; font-size:22px; font-weight:500; color:rgba(255,255,255,0.88); }
.chips{ margin-top:26px; display:flex; gap:12px; flex-wrap:wrap; }
.chip{
display:inline-flex; align-items:center; gap:9px;
padding:11px 18px; border-radius:14px;
background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.18);
font-size:15px; font-weight:600;
}
.chip .chip-label{ color:rgba(255,255,255,0.7); font-weight:500; }
/* macros */
.macros{ margin-top:30px; max-width:720px; }
.macro-tiles{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.macro-tile{
background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.16);
border-radius:16px; padding:16px 18px;
}
.macro-tile.macro-cal{ background:rgba(255,255,255,0.16); }
.macro-val{ font-size:30px; font-weight:800; line-height:1; }
.macro-val small{ font-size:15px; font-weight:700; opacity:.8; margin-left:1px; }
.macro-label{ margin-top:7px; font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:rgba(255,255,255,0.72); font-weight:600; }
.macro-bar{ margin-top:14px; height:12px; border-radius:999px; overflow:hidden; display:flex; gap:2px; background:rgba(255,255,255,0.14); }
.macro-bar span{ height:100%; display:block; }
.macro-legend{ margin-top:9px; display:flex; gap:18px; font-size:12.5px; color:rgba(255,255,255,0.85); }
.macro-legend span{ display:inline-flex; align-items:center; gap:6px; }
.macro-legend i{ width:10px; height:10px; border-radius:3px; display:inline-block; }
.cover-foot{ font-size:12.5px; color:rgba(255,255,255,0.6); }

/* ---------- REFEIÇÕES ---------- */
.meals{ display:flex; }
.meals-visual{
width:40%; height:720px;
${mealsBg}
background-size:cover; background-position:center;
position:relative;
}
.meals-visual .vlabel{
position:absolute; left:40px; bottom:44px; color:#fff;
}
.meals-visual .vlabel .vtitle{ font-size:30px; font-weight:800; line-height:1.1; letter-spacing:-0.02em; }
.meals-visual .vlabel .vsub{ margin-top:8px; font-size:14px; color:rgba(255,255,255,0.85); max-width:340px; }
.meals-body{ width:60%; height:720px; padding:48px 52px; display:flex; flex-direction:column; }
.meals-body h2{ font-size:30px; font-weight:800; letter-spacing:-0.02em; }
.meals-body .h2sub{ margin-top:6px; color:var(--muted); font-size:14px; }
.meal-grid{
margin-top:22px; flex:1;
display:grid; grid-template-columns:1fr 1fr; gap:14px; align-content:start;
}
.meal-grid.few{ grid-template-columns:1fr; }
.meal-card{
border:1px solid var(--line); border-left:4px solid var(--accent);
border-radius:14px; padding:14px 16px; background:#fcfcfd;
}
.meal-head{ display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.meal-ic{
width:34px; height:34px; border-radius:10px; flex-shrink:0;
display:flex; align-items:center; justify-content:center;
background:color-mix(in srgb, var(--accent) 14%, #ffffff); color:var(--accent);
}
.meal-name{ font-size:15.5px; font-weight:700; color:#111827; }
.meal-time{ display:inline-flex; align-items:center; gap:4px; font-size:12px; color:var(--muted); margin-top:2px; }
.meal-items{ margin:0; padding-left:17px; }
.meal-items li{ font-size:13px; color:#374151; margin:2px 0; }
.empty-meals{ color:var(--muted); font-size:15px; margin-top:20px; }
.meals-foot{ margin-top:16px; font-size:11.5px; color:var(--muted); }
</style>
</head>
<body>

<div class="page cover">
<div class="cover-top">
<span class="eyebrow">${icon('sparkles', 15)} Plano Alimentar Personalizado</span>
<span class="gerado">${icon('calendar', 14)} ${geradoEm}</span>
</div>
<div class="cover-main">
<h1>${nome}</h1>
<div class="subtitle">${icon('target', 18)} ${objetivo}</div>
<div class="chips">
<span class="chip"><span class="chip-label">Idade</span> ${idade}</span>
<span class="chip"><span class="chip-label">Altura</span> ${altura}</span>
<span class="chip"><span class="chip-label">Peso</span> ${peso}</span>
${genero ? `<span class="chip"><span class="chip-label">Sexo</span> ${genero}</span>` : ''}
</div>
${renderMacros(opts.macros)}
</div>
<div class="cover-foot">${opts.macros?.estimado ? 'Valores de calorias e macros são uma estimativa baseada nos dados informados. ' : ''}Elaborado com base nas informações da consulta.</div>
</div>

<div class="page meals">
<div class="meals-visual">
<div class="vlabel">
<div class="vtitle">Seu cardápio<br>do dia</div>
<div class="vsub">Sugestão de refeições alinhada às suas preferências e rotina.</div>
</div>
</div>
<div class="meals-body">
<h2>Cardápio sugerido</h2>
<div class="h2sub">Distribuição das refeições ao longo do dia${data.nome ? ` para ${nome}` : ''}.</div>
<div class="meal-grid ${mealCount <= 2 ? 'few' : ''}">
${renderMealCards(data.refeicoes)}
</div>
<div class="meals-foot">Plano gerado em ${geradoEm} • baseado exclusivamente nas informações fornecidas na consulta.</div>
</div>
</div>

</body>
</html>`;
}
