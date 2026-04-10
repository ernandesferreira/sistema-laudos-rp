import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  type Permission,
} from "../src/auth/permissions";
import type { RoleKey } from "../src/auth/roles";

const prisma = new PrismaClient();

const SYSTEM_ROLES = [
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Acesso total ao sistema, incluindo gestao de usuarios e papeis.",
  },
  {
    key: "admin",
    name: "Admin",
    description: "Gestao operacional de modelos e submisses.",
  },
  {
    key: "perito_rp",
    name: "Perito RP",
    description: "Analise tecnica e revisao de laudos no contexto RP.",
  },
  {
    key: "operador",
    name: "Operador",
    description: "Execucao operacional e acompanhamento de fila de submisses.",
  },
  {
    key: "leitor",
    name: "Leitor",
    description: "Acesso somente leitura a dashboards e laudos.",
  },
  {
    key: "juiz",
    name: "Juiz",
    description: "Consulta e auditoria de laudos para decisao RP.",
  },
  {
    key: "medico",
    name: "Medico",
    description: "Consulta e parecer de laudos medicos RP.",
  },
] as const;

type SystemRole = (typeof SYSTEM_ROLES)[number];

function permissionsForRole(roleKey: RoleKey): Permission[] {
  return DEFAULT_ROLE_PERMISSIONS[roleKey] ?? [];
}

async function main() {
  const roleIdByKey = new Map<RoleKey, string>();
  const permissionIdByKey = new Map<Permission, string>();

  for (const role of SYSTEM_ROLES) {
    const savedRole = await prisma.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description,
        isSystem: true,
      },
      create: {
        key: role.key,
        name: role.name,
        description: role.description,
        isSystem: true,
      },
    });

    roleIdByKey.set(role.key, savedRole.id);
  }

  for (const permission of PERMISSION_CATALOG) {
    const savedPermission = await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        resource: permission.resource,
        description: permission.description,
        isSystem: true,
      },
      create: {
        key: permission.key,
        name: permission.name,
        resource: permission.resource,
        description: permission.description,
        isSystem: true,
      },
    });

    permissionIdByKey.set(permission.key, savedPermission.id);
  }

  for (const role of SYSTEM_ROLES as readonly SystemRole[]) {
    const roleId = roleIdByKey.get(role.key);

    if (!roleId) {
      continue;
    }

    const desiredPermissionIds = permissionsForRole(role.key)
      .map((permissionKey) => permissionIdByKey.get(permissionKey))
      .filter((value): value is string => Boolean(value));

    const existing = await prisma.rolePermission.findMany({
      where: { roleId },
      select: {
        id: true,
        permissionId: true,
      },
    });

    const existingPermissionIds = new Set(existing.map((item) => item.permissionId));

    for (const permissionId of desiredPermissionIds) {
      if (!existingPermissionIds.has(permissionId)) {
        await prisma.rolePermission.create({
          data: {
            roleId,
            permissionId,
          },
        });
      }
    }

    const desiredSet = new Set(desiredPermissionIds);
    const toDelete = existing
      .filter((item) => !desiredSet.has(item.permissionId))
      .map((item) => item.id);

    if (toDelete.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });
    }
  }

  console.log(`Roles sincronizadas: ${SYSTEM_ROLES.length}`);
  console.log(`Permissoes sincronizadas: ${PERMISSION_CATALOG.length}`);
}

main()
  .catch((error) => {
    console.error("Falha ao semear roles:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
