# Sigma UFC

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




