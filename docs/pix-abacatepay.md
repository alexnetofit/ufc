# Pagamento PIX com AbacatePay

Este documento descreve a implementação do fluxo de pagamento via PIX usando a API da AbacatePay.

## Variáveis de Ambiente

Adicione as seguintes variáveis ao seu `.env.local` e nas configurações do Vercel:

```env
ABACATEPAY_API_KEY=abc_prod_cpHbZ3ZtMYFkRsZzc5QSbnU5
ABACATEPAY_BASE_URL=https://api.abacatepay.com/v1
```

> **Importante**: A chave da API é usada APENAS no servidor. Nunca exponha no cliente.

## Fluxo do Pagamento

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Usuário   │      │   Frontend  │      │   Backend   │      │ AbacatePay  │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       │ Seleciona valor    │                    │                    │
       │ (R$5/10/20)        │                    │                    │
       │ ──────────────────>│                    │                    │
       │                    │                    │                    │
       │ Clica "Gerar PIX"  │                    │                    │
       │ ──────────────────>│                    │                    │
       │                    │ POST /pix/create   │                    │
       │                    │ ──────────────────>│                    │
       │                    │                    │ POST /pixQrCode    │
       │                    │                    │ ──────────────────>│
       │                    │                    │                    │
       │                    │                    │<──────────────────│
       │                    │                    │  QR Code + brCode  │
       │                    │<──────────────────│                    │
       │<──────────────────│  Exibe QR Code     │                    │
       │                    │                    │                    │
       │ Paga no app banco  │                    │                    │
       │ ─ ─ ─ ─ ─ ─ ─ ─ ─>│                    │                    │
       │                    │                    │                    │
       │                    │ POST /pix/check    │                    │
       │                    │ (polling 5s)       │                    │
       │                    │ ──────────────────>│ GET /pixQrCode/    │
       │                    │                    │ check              │
       │                    │                    │ ──────────────────>│
       │                    │                    │<──────────────────│
       │                    │                    │ status: PAID       │
       │                    │<──────────────────│                    │
       │<──────────────────│  Confirmado!       │                    │
       │                    │                    │                    │
```

## Banco de Dados

### Tabela: pix_payments

Armazena as cobranças PIX geradas:

| Campo           | Tipo         | Descrição                          |
|-----------------|--------------|-----------------------------------|
| id              | UUID         | Identificador único               |
| user_id         | UUID         | Usuário que está pagando          |
| event_id        | UUID         | Evento relacionado                |
| amount          | INTEGER      | Valor em centavos (500, 1000, 2000) |
| pix_id          | TEXT         | ID da cobrança na AbacatePay      |
| status          | TEXT         | PENDING, PAID, EXPIRED, CANCELLED |
| br_code         | TEXT         | Código copia e cola               |
| br_code_base64  | TEXT         | QR Code em base64                 |
| expires_at      | TIMESTAMPTZ  | Data/hora de expiração            |
| paid_at         | TIMESTAMPTZ  | Data/hora do pagamento            |

### Tabela: event_entries

Registra participações confirmadas em eventos:

| Campo           | Tipo         | Descrição                          |
|-----------------|--------------|-----------------------------------|
| id              | UUID         | Identificador único               |
| user_id         | UUID         | Usuário                           |
| event_id        | UUID         | Evento                            |
| amount          | INTEGER      | Valor pago em centavos            |
| pix_payment_id  | UUID         | Referência ao pagamento PIX       |
| created_at      | TIMESTAMPTZ  | Data de criação                   |

## API Endpoints

### POST /api/events/[eventId]/pix/create

Cria uma nova cobrança PIX ou retorna uma existente.

**Request:**
```json
{
  "plan": "5" | "10" | "20"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "pix_id": "pix_xxx",
    "br_code": "00020126...",
    "br_code_base64": "data:image/png;base64,...",
    "amount": 500,
    "expires_at": "2024-01-01T12:15:00Z",
    "status": "PENDING"
  }
}
```

### GET /api/pix/active?eventId={eventId}

Retorna pagamento pendente ativo ou entrada confirmada.

**Response:**
```json
{
  "success": true,
  "payment": { ... } | null,
  "hasEntry": false,
  "entry": { ... } | null
}
```

### POST /api/pix/check

Verifica status do pagamento e atualiza banco.

**Request:**
```json
{
  "paymentId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "status": "PENDING" | "PAID" | "EXPIRED" | "CANCELLED",
  "paid_at": "2024-01-01T12:10:00Z" // se PAID
}
```

## Como Testar

### 1. Ambiente de Desenvolvimento

1. Configure as variáveis de ambiente no `.env.local`
2. Execute a migração no Supabase:
   ```sql
   -- Execute o conteúdo de supabase/migrations/004_pix_payments.sql
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### 2. Fluxo de Teste

1. **Acesse um evento** que esteja aberto para palpites
2. **Selecione um valor** (R$5, R$10 ou R$20)
3. **Clique em "Gerar PIX"**
4. **Escaneie o QR Code** com seu app de banco
5. **Aguarde a confirmação** (polling automático a cada 5s)

### 3. Cenários de Teste

| Cenário | Como Testar | Resultado Esperado |
|---------|-------------|-------------------|
| Gerar PIX | Selecionar valor e clicar no botão | QR Code exibido com countdown |
| Recarregar página | F5 com PIX pendente | Mesmo PIX é recuperado |
| PIX expirado | Aguardar 15 minutos | Botão "Gerar Novo PIX" |
| Pagamento duplicado | Tentar gerar após pagar | Mensagem "já possui entrada" |
| Polling | Pagar e aguardar | Confirmação automática |

### 4. Verificar no Banco

```sql
-- Ver pagamentos PIX
SELECT * FROM pix_payments ORDER BY created_at DESC;

-- Ver entradas confirmadas
SELECT * FROM event_entries ORDER BY created_at DESC;

-- Ver detalhes com joins
SELECT * FROM pix_payments_with_details;
```

## Segurança

- A chave da API é usada APENAS no servidor
- Todas as validações críticas ocorrem no backend
- O frontend nunca confirma pagamentos diretamente
- RLS protege dados de outros usuários
- Updates são feitos via service role (server-side)

## Tratamento de Erros

| Erro | Causa | Solução |
|------|-------|---------|
| "Sistema de pagamento não configurado" | ABACATEPAY_API_KEY não definida | Configurar variável de ambiente |
| "Plano inválido" | Valor diferente de 5/10/20 | Usar valores permitidos |
| "já possui entrada confirmada" | Usuário já pagou | Não permitir novo pagamento |
| "Erro ao gerar PIX" | Falha na API AbacatePay | Tentar novamente |

## Arquivos Relacionados

- `src/lib/abacatepay/client.ts` - Cliente da API
- `src/app/api/events/[eventId]/pix/create/route.ts` - Criar PIX
- `src/app/api/pix/active/route.ts` - Buscar PIX ativo
- `src/app/api/pix/check/route.ts` - Verificar status
- `src/components/pix/PixCheckout.tsx` - Componente de checkout
- `supabase/migrations/004_pix_payments.sql` - Migração do banco






