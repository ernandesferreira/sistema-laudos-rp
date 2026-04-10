import { prisma } from "@/lib/prisma";

export async function findUserAuthProfileById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      passportNumber: true,
      oabNumber: true,
      roles: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          role: {
            select: {
              key: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      key: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function findUserForLoginByPassport(passportNumber: string) {
  return prisma.user.findFirst({
    where: {
      passportNumber,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      passportNumber: true,
      passwordHash: true,
      roles: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          role: {
            select: {
              key: true,
            },
          },
        },
      },
    },
  });
}
