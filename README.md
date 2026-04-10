# Sistema de Laudos RP

Aplicacao web ficticia para roleplay (RP) com criacao de modelos de laudo, campos dinamicos e preenchimento publico.

Aviso: este sistema e ficticio para RP e nao possui validade documental real.

## Stack

- Next.js 16 com App Router
- TypeScript estrito
- Tailwind CSS 4
- Prisma ORM
- Neon Postgres
- Zod para validacao

## Como executar

1. Copie `.env.example` para `.env` e informe as URLs de banco:

```bash
DATABASE_URL_LOCAL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require&channel_binding=require"
DATABASE_URL_PROD="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require&channel_binding=require"
```

Em desenvolvimento local, o projeto usa `DATABASE_URL_LOCAL`.
Em producao (Vercel), o projeto usa `DATABASE_URL_PROD`.
Se `DATABASE_URL` estiver definida, ela tem prioridade sobre as demais.

2. Gere o client e rode migracoes:

```bash
npm run db:generate
npm run db:migrate
```

3. Suba o servidor:

```bash
npm run dev
```

4. Qualidade e build:

```bash
npm run lint
npm run build
```

## Deploy no Vercel com dois bancos (local e prod)

Defina no Vercel (Project Settings -> Environment Variables):

- `DATABASE_URL_PROD`: URL do Neon de producao
- `DATABASE_POOL_MAX`: opcional
- `DATABASE_SSL_REJECT_UNAUTHORIZED`: `true`

Para ambiente local, mantenha no `.env`:

- `DATABASE_URL_LOCAL`: URL local/dev

Comandos recomendados para CI/deploy:

```bash
npm run db:generate
npm run build
```

## Deploy automatico (GitHub Actions -> Vercel)

Workflow criado em `.github/workflows/vercel-deploy.yml`.

Comportamento:

- Pull Request para `main`: gera deploy de preview no Vercel.
- Push na `main`: gera deploy de producao no Vercel.

Configure estes secrets no repositorio GitHub:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

No painel do Vercel, mantenha as variaveis de ambiente de producao:

- `DATABASE_URL_PROD`
- `DATABASE_POOL_MAX`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`

## Estrutura de pastas

```text
prisma/
	schema.prisma
src/
	auth/
		authorization.ts
		roles.ts
		permissions.ts
		routeProtection.ts
		session.ts
		guards.ts
	application/
		auth/
			rbacSchemas.ts
			rbacService.ts
	app/
		(admin)/
			layout.tsx
			dashboard/page.tsx
			templates/page.tsx
			templates/new/page.tsx
			templates/[id]/page.tsx
			submissions/page.tsx
			submissions/[id]/page.tsx
		api/
			templates/
			sections/
			fields/
			submissions/
			public/templates/[slug]/
		laudos/[slug]/page.tsx
		globals.css
		layout.tsx
		page.tsx
	components/
		admin/
		auth/
		forms/
		shared/
	domain/laudos/
	application/laudos/
	infra/repositories/
	docs/
		rbac-architecture.md
	lib/
middleware.ts
```

## Responsabilidade dos arquivos criados

- `prisma/schema.prisma`: schema inicial de banco com templates, secoes, campos, submisses e respostas por campo.
- `src/lib/env.ts`: validacao de variaveis de ambiente com Zod.
- `src/lib/prisma.ts`: singleton do Prisma Client para ambiente Next.js.
- `src/lib/http.ts`: helpers padrao de resposta HTTP e tratamento de erro.
- `src/domain/laudos/types.ts`: tipos de dominio e contratos base dos campos.
- `src/application/laudos/schemas.ts`: contratos de entrada com Zod para APIs.
- `src/application/laudos/service.ts`: fachada de caso de uso para laudos.
- `src/infra/repositories/laudosRepository.ts`: acesso a dados Prisma e regras de persistencia.
- `src/infra/repositories/authRepository.ts`: leitura de perfil de autenticacao e papeis ativos do usuario.
- `src/infra/repositories/rbacRepository.ts`: acesso a dados da matriz RBAC (roles, permissions e role_permissions).
- `src/auth/roles.ts`: perfis oficiais do sistema.
- `src/auth/permissions.ts`: catalogo padronizado de permissoes e mapeamento default por perfil.
- `src/auth/authorization.ts`: helpers reutilizaveis (`hasPermission`, `hasAllPermissions`, `hasAnyRole`).
- `src/auth/session.ts`: resolucao de identidade atual (headers/cookies) e enriquecimento com roles/permissoes.
- `src/auth/guards.ts`: guardas reutilizaveis para pagina e API.
- `src/auth/routeProtection.ts`: politicas de protecao por prefixo de rota.
- `src/components/auth/PermissionGate.tsx`: exemplo de protecao de interface por permissao.
- `src/application/auth/rbacSchemas.ts`: contratos de entrada para manutencao da matriz RBAC.
- `src/application/auth/rbacService.ts`: casos de uso para leitura e alteracao de permissoes por perfil.
- `middleware.ts`: camada de protecao de rotas no Edge com enforcement opcional.
- `src/app/layout.tsx`: layout raiz com metadata e aviso global de sistema ficticio RP.
- `src/app/globals.css`: design tokens, componentes utilitarios e base responsiva.
- `src/app/page.tsx`: landing inicial com entrada para painel e modelos.
- `src/app/(admin)/layout.tsx`: shell administrativo com sidebar + topbar.
- `src/components/admin/AdminSidebar.tsx`: navegacao principal do painel.
- `src/components/admin/AdminTopbar.tsx`: barra superior com contexto operacional.
- `src/components/shared/PageHeader.tsx`: cabecalho reutilizavel para paginas do painel.
- `src/components/shared/EmptyState.tsx`: estado vazio reutilizavel.
- `src/components/shared/Disclaimer.tsx`: aviso reutilizavel de uso ficticio RP.
- `src/app/(admin)/dashboard/page.tsx`: dashboard inicial com metricas e atalhos.
- `src/app/(admin)/templates/page.tsx`: listagem de modelos de laudo.
- `src/app/(admin)/templates/new/page.tsx`: criacao de modelo.
- `src/app/(admin)/templates/[id]/page.tsx`: edicao de modelo com CRUD de secoes e campos.
- `src/components/forms/TemplateCreateForm.tsx`: formulario de criacao de modelo.
- `src/components/forms/TemplateEditor.tsx`: editor completo de template, secoes e campos dinamicos.
- `src/app/laudos/[slug]/page.tsx`: tela publica para terceiros preencherem laudo.
- `src/components/forms/PublicReportForm.tsx`: renderer dinamico de campos e envio de submissao.
- `src/app/(admin)/submissions/page.tsx`: listagem de submisses no painel.
- `src/app/(admin)/submissions/[id]/page.tsx`: detalhe de submissao.
- `src/app/api/templates/*`: CRUD HTTP de modelos e criacao de secoes.
- `src/app/api/sections/*`: update/delete de secoes e criacao de campos.
- `src/app/api/fields/*`: update/delete de campos.
- `src/app/api/public/templates/[slug]/route.ts`: leitura publica de template ativo.
- `src/app/api/public/templates/[slug]/submit/route.ts`: envio de submissao publica com validacao.
- `src/app/api/submissions/*`: listagem e detalhe de submisses para admin.
- `.env.example`: exemplo de configuracao Neon.

## Schema inicial do banco

- `User`: base da identidade.
- `Role` (`roles`): papeis do sistema (`super_admin`, `admin`, `perito_rp`, `operador`, `leitor`, `juiz`, `medico`).
- `Permission` (`permissions`): catalogo de permissoes padronizadas do sistema.
- `RolePermission` (`role_permissions`): relacao N:N entre papeis e permissoes.
- `UserRole` (`user_roles`): atribuicoes de papeis por usuario, com suporte a expiracao e auditoria basica.
- `ReportTemplate`: modelo de laudo (titulo, slug, status, relacoes).
- `ReportSection`: secoes ordenadas por template.
- `ReportField`: campos dinamicos por secao (tipo, obrigatoriedade, opcoes e validacao JSON).
- `ReportSubmission`: submissao publica com metadados e respostas completas em JSON.
- `SubmissionFieldAnswer`: snapshot por campo para auditoria e leitura estruturada.

## Rotas principais

- Admin:
	- `/dashboard`
	- `/templates`
	- `/templates/new`
	- `/templates/[id]`
	- `/submissions`
	- `/submissions/[id]`
- Publico:
	- `/laudos/[slug]`

## Arquitetura para evolucao (auth/permissoes)

- Dominio isolado em `domain`.
- Casos de uso e validacao em `application`.
- Persistencia em `infra/repositories`.
- Camada HTTP no App Router (`app/api`).
- UI desacoplada em `components`.

Essa base permite adicionar autenticacao (NextAuth/JWT), middlewares de permissao e trilha de auditoria sem reestruturar o projeto.

## Auth preparado (sem provedor externo)

Convencao de permissao:

- Formato: `recurso.acao`
- Exemplos: `templates.manage`, `submissions.read`, `users.manage`

Rollout gradual:

- `AUTH_ENFORCE_MIDDLEWARE=false`: middleware so propaga identidade (nao bloqueia)
- `AUTH_ENFORCE_GUARDS=false`: guardas de pagina/API nao bloqueiam

Quando existir login/sessao real, basta:

1. Popular cookies/headers (`auth_user_id`, `auth_roles` / `x-auth-user-id`, `x-auth-roles`).
2. Ligar os flags para `true`.
3. Ajustar regras em `src/auth/permissions.ts` e `src/auth/routeProtection.ts`.

Seed inicial de roles:

```bash
npm run db:seed:roles
```

O seed tambem sincroniza permissoes e relacionamentos role_permissions.
