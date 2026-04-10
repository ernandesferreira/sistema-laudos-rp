export const SYSTEM_ROLE_KEYS = [
  "super_admin",
  "admin",
  "perito_rp",
  "operador",
  "leitor",
  "juiz",
  "medico",
] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

export const SYSTEM_ROLES: Array<{
  key: SystemRoleKey;
  name: string;
  description: string;
}> = [
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Controle total da plataforma, incluindo configuracoes sensiveis.",
  },
  {
    key: "admin",
    name: "Administrador",
    description: "Gestao operacional de modelos, solicitacoes e usuarios.",
  },
  {
    key: "perito_rp",
    name: "Perito RP",
    description: "Avaliacao tecnica de solicitacoes e pareceres de roleplay.",
  },
  {
    key: "operador",
    name: "Operador",
    description: "Operacao diaria de cadastros e fluxo administrativo.",
  },
  {
    key: "leitor",
    name: "Leitor",
    description: "Acesso somente leitura a consultas e historicos.",
  },
  {
    key: "juiz",
    name: "Juiz",
    description: "Acompanhamento e decisao com acesso a informacoes revisadas.",
  },
  {
    key: "medico",
    name: "Medico",
    description: "Avaliacao de solicitacoes medicas e documentacao clinica RP.",
  },
];
