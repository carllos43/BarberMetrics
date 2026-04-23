# BarberMetrics

SaaS de produtividade financeira para barbeiros, com timer de cortes, controle de
atendimentos, contas e dashboards. Estrutura monorepo `pnpm` + TypeScript.

## Arquitetura

```
artifacts/
  api-server/          # Express + TS, layered (routes → controllers → services → repositories)
  barber-metrics/      # React + Vite (mobile-first PWA)
  mockup-sandbox/      # canvas de mockups (workspace tool)
lib/
  db/                  # Drizzle ORM + schemas Postgres (multi-tenant)
  api-spec/            # OpenAPI 3.1 source of truth
  api-zod/             # Zod schemas gerados do OpenAPI
  api-client-react/    # cliente HTTP gerado + setAuthTokenGetter
```

### Multi-tenancy

Toda escrita/leitura de dados é escopada por `barbershop_id`. O cadastro
(`/api/auth/signup`) cria atomicamente: usuário + barbearia pessoal +
membership(role=owner). Os repositórios filtram por `barbershopId` em
**todas** as consultas, garantindo isolamento por código. O `barbershopId`
é resolvido no middleware a partir do `userId` extraído do JWT do Supabase.

### Autenticação (Supabase Auth)

Auth delegada ao **Supabase Auth**. O frontend usa `@supabase/supabase-js`
para signup/login (email+senha) e recebe um JWT do Supabase. O backend
verifica esse JWT chamando `supabase.auth.getUser(token)` (com cache em
memória) e extrai o `userId`.

Fluxo:
1. Frontend faz `supabase.auth.signUp()` → recebe access_token.
2. Frontend chama `POST /api/auth/onboard` com `{ fullName, barbershopName }`
   no primeiro acesso → backend cria usuário+barbearia+membership atomicamente
   usando o `auth.users.id` do Supabase como PK.
3. Em sessões subsequentes o frontend chama `GET /api/auth/me` para hidratar
   o contexto.

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: usados pelo backend (verifyToken) e
  pelo frontend (injetados via `vite.config.ts` como `VITE_SUPABASE_*`).
- `SUPABASE_DB_URL`: connection string do pooler do Supabase
  (`aws-*.pooler.supabase.com:6543`). O `lib/db` parseia a URL e passa
  `host/port/user/password` explícitos pro `pg.Pool` para evitar conflito
  com `PGUSER/PGPASSWORD` que o Replit injeta.

Endpoints públicos: `POST /api/auth/onboard`, `GET /api/auth/me`,
`GET /api/healthz`. Tudo o mais exige `Authorization: Bearer <supabase-jwt>`.

### Segurança HTTP

- `helmet` (headers seguros)
- `cors` com allowlist (`CORS_ORIGINS` separado por vírgulas; vazio = permissivo em dev)
- `express-rate-limit` global (240 req/min) + estrito em `/auth/*` (10 req/min)
- `express.json({ limit: "256kb" })`
- `validate({ body, params, query })` com Zod em toda rota mutating
- Envelope padronizado de erros: `{ success: false, error: string }`
- Respostas de sucesso seguem o schema OpenAPI (compatibilidade com cliente gerado)

### Módulo Financeiro Pessoal (Fase 1)

Tabelas adicionadas no Supabase:

- `appointments` ganhou `valor_bruto`, `comissao_percentual`, `valor_liquido`
  (legado `value` + `barber_earnings` continua, sem quebrar nada existente)
- `weekly_cycles` — ciclo Segunda→Sábado por (barbershop, user) com
  `saldo_produzido`, `total_vales`, `status` ('open'|'closed')
- `withdrawals` — vales/Mobills com `categoria_destino`
  ('gasto_livre'|'conta_fixa'|'reserva') e `is_excedente` quando vale > saldo
- `personal_finances` — linha única por (barbershop, user) com `saldo_banco`,
  `saldo_guardado`, `percentual_caixinha` e limites por categoria
- `personal_bills` — contas fixas pessoais com `dia_vencimento` (semáforo)

Camada de domínio: `PersonalFinancesService` (em
`modules/personalFinances/personalFinances.service.ts`) orquestra
ciclo+vales+saldo. Métodos chave: `getOverview`, `createWithdrawal` (valida
excedente), `closeWeek` (transfere saldo→banco e desconta caixinha).

### Camadas (exemplo `appointments`)

```
http/routes/index.ts            → mapeia URL → controller
modules/appointments/
  appointments.controller.ts    → traduz HTTP ↔ DTO, sem regras de negócio
  appointments.service.ts       → regras (cálculo de comissão, validações)
  appointments.repository.ts    → única camada que toca no Drizzle/DB
```

`container.ts` é o composition root: instancia repositórios, injeta nos
serviços e nos controllers. Trocar o storage = trocar uma classe.

### Frontend

- React + Vite, TanStack Query
- `lib/auth.ts`: login/signup/me chamando a API; persiste sessão em
  `localStorage` (`barbermetrics.jwt` + `barbermetrics.user`)
- `setAuthTokenGetter` injeta o JWT no cliente gerado em todo request
- App renderiza `LoginPage` quando sem sessão, rotas protegidas quando logado
- **Frontend não fala mais com banco direto** (Supabase e `localDatabase` removidos)

### Design system

Estilo iOS-like, dark, glassmorphism + gradientes sutis. Tudo aplicado via
classes utilitárias em `src/index.css`:

- `.glass` / `.glass-strong` — superfícies com `backdrop-filter` + borda branca a 8%
- `.lift` — hover subindo `-2px` com sombra
- `.icon-pill` + `.grad-{amber,green,blue,purple,rose,slate}` — pílulas de ícone com gradiente iOS
- `.glow-primary` — halo âmbar para o timer ativo
- `Card` (`components/ui/card.tsx`) já é glass por padrão, raio 16px, padding 16px

Layout mobile (`MobileLayout`) tem header glass com botão ⚙️ que abre o
modal global de configurações.

### Settings system

- `lib/settings.tsx`: `SettingsProvider` + `useSettings()` + `useOpenSettings()`,
  persiste em `localStorage`
- `components/SettingsModal.tsx`: modal com 4 abas — Geral, Timer, Finanças, Relatórios
- A comissão padrão é a única configuração que vai pra API (`PUT /api/commission`);
  o resto é preferência cliente (formato de data, agrupamento de gráfico,
  categorias de despesa, incluir cliente/comissão no PDF, etc.)
- Botão de Sair também vive dentro do modal

### Relatório PDF

`lib/pdf.ts` usa `jspdf` + `jspdf-autotable` para gerar PDF estruturado
(NÃO screenshot) com cabeçalho colorido, tabela de resumo financeiro,
detalhamento e bloco de assinatura/totais. Filtros rápidos: Hoje, 7 dias,
30 dias, este mês, e personalizado com dois inputs de data.

## Variáveis de ambiente

| Variável            | Obrigatória | Descrição                                       |
|---------------------|-------------|-------------------------------------------------|
| `DATABASE_URL`      | sim         | Postgres (já configurado no Replit)             |
| `JWT_SECRET`        | em prod     | Chave HS256, mínimo 32 chars                    |
| `JWT_TTL_SECONDS`   | não         | TTL do token (default 604800 = 7 dias)          |
| `CORS_ORIGINS`      | não         | Origins permitidos, separados por vírgula        |
| `BCRYPT_ROUNDS`     | não         | Custo do bcrypt (default 10)                    |
| `PORT`              | sim         | Porta de bind do servidor                       |

## Comandos

```bash
# Push do schema Drizzle no Postgres
pnpm --filter @workspace/db push-force

# Rodar tudo (workflows configurados):
#   - artifacts/api-server: API Server
#   - artifacts/barber-metrics: web

# Regenerar cliente OpenAPI quando openapi.yaml mudar
pnpm --filter @workspace/api-spec run codegen
```

## Decisões importantes

1. **Auth local vs. Supabase**: trocou-se Supabase por bcrypt+JWT local para
   não depender de credenciais não configuradas e manter o app pronto pra usar.
   O contrato JWT permanece, então migrar de volta basta substituir `auth.service.ts`.
2. **Envelope de resposta**: erros usam envelope `{success:false,error}`,
   sucessos mantêm o schema flat do OpenAPI para preservar compat com o
   cliente já gerado em `lib/api-client-react`.
3. **Sem RLS no Postgres**: isolamento é por código nos repositórios. Como a
   única forma de acessar dados é via API e os repositórios sempre exigem
   `barbershopId`, o efeito prático é equivalente. RLS pode ser adicionado
   mais tarde sem mudar a aplicação.
