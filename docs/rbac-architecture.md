# RBAC Architecture

## Banco de dados

Tabelas principais para RBAC:

- roles
- permissions
- role_permissions
- user_roles

Relacoes:

- users 1:N user_roles
- roles 1:N user_roles
- roles 1:N role_permissions
- permissions 1:N role_permissions

## Permissoes iniciais padronizadas

- dashboard.read
- templates.read
- templates.create
- templates.update
- templates.publish
- templates.archive
- sections.manage
- fields.manage
- submissions.read
- submissions.details.read
- submissions.status.update
- submissions.review
- audit.logs.read
- users.read
- users.manage
- permissions.read
- permissions.manage
- judicial.decisions.record
- medical.opinions.record

## Perfis base

- super_admin
- admin
- perito_rp
- operador
- leitor
- juiz
- medico

## Convencao

Formato: recurso.acao

Exemplos:

- templates.publish
- submissions.status.update
- permissions.manage

## Estrutura de pastas recomendada

- src/auth
  - constants.ts
  - roles.ts
  - permissions.ts
  - authorization.ts
  - session.ts
  - guards.ts
  - routeProtection.ts
- src/components/auth
  - PermissionGate.tsx
- src/application/auth
  - rbacSchemas.ts
  - rbacService.ts
- src/infra/repositories
  - authRepository.ts
  - rbacRepository.ts
- scripts
  - seed-system-roles.ts

## Como evoluir para painel de edicao de permissoes

1. Criar pagina admin para matriz role x permission.
2. Ler dados por getRbacMatrix em src/application/auth/rbacService.ts.
3. Persistir alteracoes por updateRolePermissions em src/application/auth/rbacService.ts.
4. Proteger pagina e endpoint com permissions.manage.
