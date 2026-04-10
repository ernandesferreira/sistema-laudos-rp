import { prisma } from "@/lib/prisma";
import { PERMISSION_CATALOG } from "@/auth/permissions";

export async function syncSystemPermissionsCatalog() {
  await prisma.$transaction(
    PERMISSION_CATALOG.map((permission) =>
      prisma.permission.upsert({
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
      }),
    ),
  );
}

export async function listRolesWithPermissions() {
  return prisma.role.findMany({
    where: {
      isSystem: true,
    },
    orderBy: {
      key: "asc",
    },
    include: {
      rolePermissions: {
        include: {
          permission: {
            select: {
              key: true,
              name: true,
              resource: true,
              description: true,
            },
          },
        },
        orderBy: {
          permission: {
            key: "asc",
          },
        },
      },
    },
  });
}

export async function listPermissionsCatalog() {
  return prisma.permission.findMany({
    where: {
      isSystem: true,
    },
    orderBy: [{ resource: "asc" }, { key: "asc" }],
  });
}

export async function replaceRolePermissions(roleKey: string, permissionKeys: string[]) {
  const role = await prisma.role.findUnique({
    where: {
      key: roleKey,
    },
    select: {
      id: true,
      key: true,
    },
  });

  if (!role) {
    return null;
  }

  const permissions = await prisma.permission.findMany({
    where: {
      key: {
        in: permissionKeys,
      },
      isSystem: true,
    },
    select: {
      id: true,
      key: true,
    },
  });

  const validPermissionIds = new Set(permissions.map((permission) => permission.id));

  await prisma.$transaction(async (tx) => {
    const existing = await tx.rolePermission.findMany({
      where: {
        roleId: role.id,
      },
      select: {
        id: true,
        permissionId: true,
      },
    });

    const existingByPermissionId = new Set(existing.map((item) => item.permissionId));

    for (const permission of permissions) {
      if (!existingByPermissionId.has(permission.id)) {
        await tx.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }

    const removeIds = existing
      .filter((item) => !validPermissionIds.has(item.permissionId))
      .map((item) => item.id);

    if (removeIds.length > 0) {
      await tx.rolePermission.deleteMany({
        where: {
          id: { in: removeIds },
        },
      });
    }
  });

  return role;
}
