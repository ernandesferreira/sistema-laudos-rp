import { prisma } from "@/lib/prisma";
import type { RoleKey } from "@/auth/roles";

type CreateUserInput = {
  name: string;
  passportNumber: string;
  oabNumber?: string;
  email: string;
  passwordHash: string | null;
  isActive: boolean;
  roleKeys: RoleKey[];
  assignedById?: string | null;
};

type UpdateUserInput = {
  id: string;
  name?: string;
  passportNumber?: string;
  oabNumber?: string;
  email?: string;
  passwordHash?: string | null;
  isActive?: boolean;
  roleKeys?: RoleKey[];
  assignedById?: string | null;
};

async function getRoleIdsByKeys(roleKeys: RoleKey[]) {
  const roles = await prisma.role.findMany({
    where: {
      key: {
        in: roleKeys,
      },
    },
    select: {
      id: true,
      key: true,
    },
  });

  return roles;
}

export async function listUsers(input: { search?: string }) {
  return prisma.user.findMany({
    where: {
      OR: input.search
        ? [
            {
              name: {
                contains: input.search,
                mode: "insensitive",
              },
            },
            {
              passportNumber: {
                contains: input.search,
                mode: "insensitive",
              },
            },
            {
              oabNumber: {
                contains: input.search,
                mode: "insensitive",
              },
            },
          ]
        : undefined,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      passportNumber: true,
      oabNumber: true,
      email: true,
      isActive: true,
      createdAt: true,
      roles: {
        select: {
          role: {
            select: {
              key: true,
              name: true,
            },
          },
        },
        orderBy: {
          role: {
            key: "asc",
          },
        },
      },
    },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      passportNumber: true,
      oabNumber: true,
      email: true,
      isActive: true,
      createdAt: true,
      roles: {
        select: {
          role: {
            select: {
              key: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function listRolesForAssignment() {
  return prisma.role.findMany({
    where: {
      isSystem: true,
    },
    orderBy: {
      key: "asc",
    },
    select: {
      key: true,
      name: true,
      description: true,
    },
  });
}

export async function createUser(input: CreateUserInput) {
  const roles = await getRoleIdsByKeys(input.roleKeys);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        passportNumber: input.passportNumber,
        oabNumber: input.oabNumber,
        email: input.email,
        passwordHash: input.passwordHash,
        isActive: input.isActive,
      },
      select: {
        id: true,
      },
    });

    if (roles.length > 0) {
      await tx.userRole.createMany({
        data: roles.map((role) => ({
          userId: user.id,
          roleId: role.id,
          assignedById: input.assignedById ?? null,
        })),
      });
    }

    return getUserById(user.id);
  });
}

export async function updateUser(input: UpdateUserInput) {
  const user = await prisma.user.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: input.id,
      },
      data: {
        name: input.name,
        passportNumber: input.passportNumber,
        oabNumber: input.oabNumber,
        email: input.email,
        passwordHash: input.passwordHash,
        isActive: input.isActive,
      },
    });

    if (input.roleKeys) {
      const roles = await getRoleIdsByKeys(input.roleKeys);

      await tx.userRole.deleteMany({
        where: {
          userId: input.id,
        },
      });

      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({
            userId: input.id,
            roleId: role.id,
            assignedById: input.assignedById ?? null,
          })),
        });
      }
    }

    return getUserById(input.id);
  });
}

export async function setUserActiveStatus(id: string, isActive: boolean) {
  return prisma.user.update({
    where: {
      id,
    },
    data: {
      isActive,
    },
    select: {
      id: true,
      isActive: true,
    },
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });
}
