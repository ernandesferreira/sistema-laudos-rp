export const ROLE_KEYS = [
  "super_admin",
  "admin",
  "perito_rp",
  "operador",
  "leitor",
  "juiz",
  "medico",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  perito_rp: "Perito RP",
  operador: "Operador",
  leitor: "Leitor",
  juiz: "Juiz",
  medico: "Medico",
};

export function isRoleKey(value: string): value is RoleKey {
  return ROLE_KEYS.includes(value as RoleKey);
}

export function normalizeRoleKeys(values: string[]): RoleKey[] {
  return values.filter((value): value is RoleKey => isRoleKey(value));
}
