import type { RoleKey } from "@/auth/roles";

export const PERMISSION_CATALOG = [
  {
    key: "dashboard.read",
    name: "Visualizar dashboard",
    resource: "dashboard",
    description: "Acessar o painel principal e metricas operacionais.",
  },
  {
    key: "templates.read",
    name: "Visualizar modelos",
    resource: "templates",
    description: "Listar e consultar modelos de solicitacao.",
  },
  {
    key: "templates.create",
    name: "Criar modelos",
    resource: "templates",
    description: "Criar novos modelos de solicitacao.",
  },
  {
    key: "templates.update",
    name: "Editar modelos",
    resource: "templates",
    description: "Editar metadados e configuracoes de modelos.",
  },
  {
    key: "templates.publish",
    name: "Publicar modelos",
    resource: "templates",
    description: "Publicar modelos para uso no formulario publico.",
  },
  {
    key: "templates.archive",
    name: "Arquivar modelos",
    resource: "templates",
    description: "Arquivar modelos e remover da operacao ativa.",
  },
  {
    key: "sections.manage",
    name: "Gerenciar secoes",
    resource: "sections",
    description: "Criar, editar, reordenar e remover secoes.",
  },
  {
    key: "fields.manage",
    name: "Gerenciar campos dinamicos",
    resource: "fields",
    description: "Criar, editar, reordenar e remover campos de formulario.",
  },
  {
    key: "submissions.read",
    name: "Visualizar submisses",
    resource: "submissions",
    description: "Listar e consultar submisses enviadas.",
  },
  {
    key: "requests.read",
    name: "Visualizar solicitacoes",
    resource: "requests",
    description: "Listar solicitacoes e acompanhar o andamento operacional.",
  },
  {
    key: "requests.details.read",
    name: "Visualizar detalhes de solicitacao",
    resource: "requests",
    description: "Consultar trilha completa e dados da solicitacao.",
  },
  {
    key: "requests.create",
    name: "Abrir solicitacao",
    resource: "requests",
    description: "Registrar nova solicitacao com vinculacao de aprovacoes.",
  },
  {
    key: "requests.manage",
    name: "Gerenciar solicitacoes",
    resource: "requests",
    description: "Executar operacoes administrativas sobre solicitacoes.",
  },
  {
    key: "submissions.details.read",
    name: "Visualizar detalhes de solicitacoes",
    resource: "submissions",
    description: "Acessar detalhes completos de uma submissao.",
  },
  {
    key: "submissions.status.update",
    name: "Alterar status de submissao",
    resource: "submissions",
    description: "Atualizar status operacional de solicitacoes submetidas.",
  },
  {
    key: "submissions.review",
    name: "Registrar analise pericial",
    resource: "submissions",
    description: "Executar analise pericial e registrar revisao.",
  },
  {
    key: "audit.logs.read",
    name: "Visualizar auditoria e logs",
    resource: "audit",
    description: "Consultar trilha de auditoria e logs relevantes.",
  },
  {
    key: "users.read",
    name: "Visualizar usuarios",
    resource: "users",
    description: "Listar usuarios e dados de acesso.",
  },
  {
    key: "users.manage",
    name: "Gerenciar usuarios",
    resource: "users",
    description: "Criar, editar e remover usuarios.",
  },
  {
    key: "permissions.read",
    name: "Visualizar permissoes",
    resource: "permissions",
    description: "Listar permissoes e matriz de acesso.",
  },
  {
    key: "permissions.manage",
    name: "Gerenciar permissoes",
    resource: "permissions",
    description: "Editar permissoes por perfil.",
  },
  {
    key: "workflows.read",
    name: "Visualizar aprovacoes",
    resource: "workflows",
    description: "Visualizar configuracoes de aprovacao por modelo.",
  },
  {
    key: "workflows.manage",
    name: "Gerenciar aprovacoes",
    resource: "workflows",
    description: "Criar e editar fluxos de aprovacao configuraveis de modelos.",
  },
  {
    key: "submissions.workflow.execute",
    name: "Executar etapa de aprovacao",
    resource: "submissions",
    description: "Executar decisoes e progresso por etapa da submissao.",
  },
  {
    key: "submissions.workflow.finalize",
    name: "Aprovar fluxo final",
    resource: "submissions",
    description: "Conceder aprovacao final ou reprovar no encerramento das aprovacoes.",
  },
  {
    key: "submissions.workflow.rollback",
    name: "Retornar etapa de aprovacao",
    resource: "submissions",
    description: "Retornar aprovacoes para etapa anterior em casos de retrabalho.",
  },
  {
    key: "judicial.decisions.record",
    name: "Registrar decisao judicial RP",
    resource: "judicial",
    description: "Registrar validacao e decisao judicial RP sobre solicitacoes.",
  },
  {
    key: "medical.opinions.record",
    name: "Registrar parecer medico RP",
    resource: "medical",
    description: "Registrar parecer medico RP vinculado a solicitacao.",
  },
] as const;

export type Permission = (typeof PERMISSION_CATALOG)[number]["key"];

export type PermissionDefinition = {
  key: Permission;
  name: string;
  resource: string;
  description: string;
};

export const PERMISSIONS = PERMISSION_CATALOG.map((entry) => entry.key) as Permission[];

export const PERMISSIONS_BY_KEY: Record<Permission, PermissionDefinition> =
  PERMISSION_CATALOG.reduce(
    (acc, entry) => {
      acc[entry.key] = {
        key: entry.key,
        name: entry.name,
        resource: entry.resource,
        description: entry.description,
      };

      return acc;
    },
    {} as Record<Permission, PermissionDefinition>,
  );

const allPermissions = [...PERMISSIONS] as Permission[];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  super_admin: allPermissions,
  admin: [
    "dashboard.read",
    "templates.read",
    "templates.create",
    "templates.update",
    "templates.publish",
    "templates.archive",
    "sections.manage",
    "fields.manage",
    "submissions.read",
    "requests.read",
    "requests.details.read",
    "requests.create",
    "requests.manage",
    "submissions.details.read",
    "submissions.status.update",
    "submissions.review",
    "audit.logs.read",
    "users.read",
    "users.manage",
    "permissions.read",
    "workflows.read",
    "workflows.manage",
    "submissions.workflow.execute",
    "submissions.workflow.rollback",
  ],
  perito_rp: [
    "dashboard.read",
    "templates.read",
    "templates.create",
    "templates.update",
    "sections.manage",
    "fields.manage",
    "submissions.read",
    "submissions.details.read",
    "submissions.review",
    "submissions.workflow.execute",
    "submissions.workflow.finalize",
    "submissions.workflow.rollback",
    "workflows.read",
    "audit.logs.read",
  ],
  operador: [
    "dashboard.read",
    "templates.read",
    "submissions.read",
    "requests.read",
    "requests.details.read",
    "requests.create",
    "submissions.details.read",
    "submissions.status.update",
    "submissions.workflow.execute",
    "submissions.workflow.rollback",
    "workflows.read",
  ],
  leitor: [
    "dashboard.read",
    "templates.read",
    "submissions.read",
    "requests.read",
    "requests.details.read",
    "submissions.details.read",
    "workflows.read",
  ],
  juiz: [
    "dashboard.read",
    "requests.read",
    "requests.details.read",
    "submissions.read",
    "submissions.details.read",
    "submissions.workflow.execute",
    "submissions.workflow.finalize",
    "submissions.workflow.rollback",
    "workflows.read",
    "audit.logs.read",
    "judicial.decisions.record",
  ],
  medico: [
    "dashboard.read",
    "submissions.read",
    "submissions.details.read",
    "submissions.workflow.execute",
    "workflows.read",
    "medical.opinions.record",
  ],
};

export function isPermission(value: string): value is Permission {
  return PERMISSIONS.includes(value as Permission);
}

export function normalizePermissions(values: string[]): Permission[] {
  return values.filter((value): value is Permission => isPermission(value));
}

export function getDefaultPermissionsForRoles(roles: RoleKey[]): Permission[] {
  const merged = new Set<Permission>();

  for (const role of roles) {
    for (const permission of DEFAULT_ROLE_PERMISSIONS[role] ?? []) {
      merged.add(permission);
    }
  }

  return [...merged];
}
