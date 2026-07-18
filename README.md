# Bolão Walker

Um SaaS de palpites do UFC, onde usuários fazem palpites em lutas do UFC e competem por pontos no ranking.

## Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth + Postgres)
- **API de Dados**: RapidAPI (MMA API)
- **Deploy**: Vercel

## Funcionalidades

- Autenticação com email/senha
- Dashboard com eventos da semana
- Visualização de lutas com fotos dos lutadores
- Sistema de palpites em 3 passos (vencedor, método, detalhe)
- Pontuação automática após resultados
- Ranking global e por evento
- Perfil do usuário com estatísticas
- Sincronização automática via Cron Jobs

## Pontuação

| Acerto | Pontos |
|--------|--------|
| Vencedor | +10 |
| Método (KO/SUB/DEC) | +20 |
| Detalhe (Round ou Tipo de Decisão) | +30 |
| **Máximo por luta** | **60** |

## Setup Local

### 1. Clonar o repositório

```bash
git clone <repo-url>
cd sigma-ufc
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# RapidAPI
RAPIDAPI_KEY=sua_rapidapi_key
RAPIDAPI_HOST=mmaapi.p.rapidapi.com

# Cron Secret
CRON_SECRET=um_secret_seguro_aqui
```

### 4. Configurar banco de dados

Execute o SQL em `supabase/migrations/001_initial_schema.sql` no SQL Editor do Supabase.

### 5. Rodar o projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

## Geração de PDF (assíncrona, com imagens por IA)

Gera um PDF premium do plano alimentar em **2 páginas 16:9**: uma capa (nome, dados, objetivo e macros calculados) e uma página de cardápio, ambas com imagens de comida geradas pela OpenAI (gpt-image-1) como fundo e o texto real sobreposto por cima (dados sempre precisos). O visual é montado no backend — a IA do Leona só manda os dados coletados.

Requer:
- Bucket `pdfs` (público) no Supabase — ver `supabase/migrations/008_pdfs_bucket.sql`.
- Tabela `pdf_jobs` (migration `create_pdf_jobs_table`).
- Env var `OPENAI_API_KEY` na Vercel (opcional `OPENAI_IMAGE_MODEL`, padrão `gpt-image-1`, e `OPENAI_IMAGE_QUALITY`, padrão `high`). Sem a chave, o PDF é gerado com fundo em gradiente.

**Endpoint aberto, sem autenticação** (decisão consciente para integração low-code).

### Fluxo assíncrono

O processamento (gerar imagens + renderizar) leva alguns segundos, então é assíncrono:

**1. POST `/api/pdf/generate`** — cria o job e retorna o ID na hora (HTTP 202):

```json
{ "success": true, "id": "<uuid>", "status": "pending" }
```

**2. GET `/api/pdf/status/{id}`** — o integrador faz polling a cada ~30s:

```json
{ "success": true, "id": "<uuid>", "status": "completed", "url": "https://.../pdfs/alex-neto-<uuid>.pdf", "error": null }
```

`status`: `pending` → `processing` → `completed` (com `url`) ou `failed` (com `error`).

### Formato do corpo do POST

Detectado automaticamente. Aceita JSON, o mesmo JSON em **Base64**, ou o formato **`chave: valor`** (uma por linha) — este último é o usado pelo Leona, pois sobrevive à sanitização de `<`, `>`, `"`. Campos:

```
nome, idade, altura_cm, peso_kg, genero, objetivo, rotina, nivel_atividade,
horario_acorda, horario_dorme, quantidade_refeicoes, proteinas_preferidas,
proteinas_que_nao_gosta, carboidratos_preferidos, carboidratos_que_nao_gosta,
gorduras_preferidas, gorduras_que_nao_gosta, bebidas_preferidas,
alimentos_indispensaveis, alimentos_que_recusa, restricoes_alimentares,
alergias, observacoes
```

Cardápio (campos planos, 1 a 6): `refeicao_N_horario`, `refeicao_N_nome`, `refeicao_N_itens` (itens separados por vírgula). Em JSON, também aceita um array `refeicoes: [{ horario, nome, itens }]`.

As **calorias e macros** (proteína/carbo/gordura) são calculadas no backend (Mifflin-St Jeor + TDEE + distribuição por objetivo) a partir de idade/peso/altura/gênero/atividade — não precisa mandar.

Exemplo (`chave: valor`, como o Leona envia):

```bash
curl -X POST https://app.sigmaufc.com/api/pdf/generate --data-binary $'nome: Alex Neto\nidade: 29\naltura_cm: 160\npeso_kg: 76\ngenero: Masculino\nobjetivo: emagrecer e definir\n...'
# -> { "id": "...", "status": "pending" }
curl https://app.sigmaufc.com/api/pdf/status/<id>
# -> { "status": "completed", "url": "https://.../pdfs/....pdf" }
```

### Limpeza automática

Um cron horário (`/api/cron/cleanup-pdfs`) remove jobs e arquivos (PDFs) com mais de **12h** do Storage e da tabela `pdf_jobs`.

## Cron Jobs

Os cron jobs são configurados automaticamente na Vercel:

| Job | Horário | Descrição |
|-----|---------|-----------|
| sync-events | Segunda 12:00 UTC | Busca próximos eventos |
| update-results | Domingo 06:00 UTC | Atualiza resultados |

Para testar manualmente:
```bash
# Sincronizar eventos
curl -X POST http://localhost:3000/api/sync?action=events

# Atualizar resultados
curl -X POST http://localhost:3000/api/sync?action=results
```

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/           # Páginas de login/registro
│   ├── (protected)/      # Páginas protegidas
│   │   ├── dashboard/
│   │   ├── events/
│   │   ├── picks/
│   │   ├── ranking/
│   │   └── profile/
│   └── api/
│       ├── cron/         # Endpoints de cron
│       └── sync/         # Sincronização manual
├── components/
│   ├── ui/               # Componentes base
│   ├── layout/           # Navbar, Footer
│   ├── events/           # Cards de eventos
│   ├── fights/           # Cards de lutas
│   ├── picks/            # Wizard de palpites
│   └── ranking/          # Tabela de ranking
├── lib/
│   ├── supabase/         # Clientes Supabase
│   ├── mma-api/          # Cliente da API MMA
│   └── utils/            # Funções utilitárias
└── types/                # TypeScript types
```

## Deploy na Vercel

1. Conecte o repositório na Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

## Licença

MIT




