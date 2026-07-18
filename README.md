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

## Geração de PDF

Endpoint que recebe os dados de uma consulta nutricional, monta o HTML do plano alimentar **no próprio backend** (template em `src/lib/pdf/plano-alimentar-template.ts`) e hospeda o PDF resultante no Supabase Storage. A geração do visual não depende de uma IA externa produzir HTML — a IA (Leona ou qualquer outro sistema) só precisa mandar os dados coletados.

Requer o bucket `pdfs` (público) criado no Supabase — ver `supabase/migrations/008_pdfs_bucket.sql`.

**Endpoint aberto, sem autenticação** (decisão consciente para simplificar a integração com ferramentas low-code como o Leona — qualquer um com a URL pode gerar PDFs).

**Motivo do Base64**: ferramentas low-code (Leona) costumam remover `<`, `>` e `"` do texto de uma IA antes de repassá-lo (proteção contra HTML/JS em mensagens de chat), o que corrompe tanto HTML quanto JSON cru. Por isso o corpo pode vir em Base64 (alfabeto sem esses caracteres) — o endpoint decodifica automaticamente antes de interpretar.

O endpoint detecta sozinho o formato do corpo — não precisa declarar qual:

**1. Dados estruturados do plano alimentar** (o uso principal — o HTML é montado por nós):

```bash
curl -X POST https://seu-dominio/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Alex Neto", "idade": 29, "altura_cm": 160, "peso_kg": 76,
    "genero": "Masculino", "objetivo": "emagrecer e definir",
    "rotina": "horário livre", "nivel_atividade": "musculação 6x/semana",
    "horario_acorda": "07:00", "horario_dorme": "23:00", "quantidade_refeicoes": 4,
    "proteinas_preferidas": ["Frango", "Whey"], "proteinas_que_nao_gosta": [],
    "carboidratos_preferidos": ["Arroz"], "carboidratos_que_nao_gosta": [],
    "gorduras_preferidas": ["Azeite"], "gorduras_que_nao_gosta": [],
    "bebidas_preferidas": [], "alimentos_indispensaveis": [], "alimentos_que_recusa": [],
    "restricoes_alimentares": [], "alergias": [], "observacoes": ""
  }'
```

O mesmo JSON pode vir **Base64-encoded** direto no corpo (sem wrapper, sem content-type especial) — é o formato usado pelo node de integração do Leona, já que sobrevive à sanitização de caracteres:

```bash
BASE64=$(node -e "console.log(Buffer.from(JSON.stringify({nome:'Alex Neto', idade:29, ...})).toString('base64'))")
curl -X POST https://seu-dominio/api/pdf/generate --data-binary "$BASE64"
```

`filename` é opcional dentro do JSON; se ausente, usa `nome`. Também aceita `?filename=...` na query string.

**2. HTML pronto** (modo legado/manual, útil para testes — `{"html": "...", "filename": "..."}` ou HTML cru no corpo):

```bash
curl -X POST "https://seu-dominio/api/pdf/generate?filename=teste" \
  --data-binary @plano.html
```

Se o corpo vier envolto em um bloco de código markdown (` ```html ... ``` `), o endpoint remove automaticamente antes de renderizar.

Resposta (todos os formatos):

```json
{ "success": true, "url": "https://.../storage/v1/object/public/pdfs/alex-neto-<uuid>.pdf" }
```

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




