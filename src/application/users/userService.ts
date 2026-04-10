import type { AuthUser } from "@/auth/session";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import {
  createUserPayloadSchema,
  listUsersQuerySchema,
  updateUserPayloadSchema,
  updateUserStatusPayloadSchema,
  userIdParamSchema,
} from "@/application/users/userSchemas";
import {
  createUser,
  deleteUser,
  getUserById,
  listRolesForAssignment,
  listUsers,
  setUserActiveStatus,
  updateUser,
} from "@/infra/repositories/usersRepository";

function parseUniqueConstraintTarget(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (error.code !== "P2002") {
    return null;
  }

  const target = (error.meta?.target ?? []) as string[];

  if (target.includes("passportNumber")) {
    return "passportNumber";
  }

  if (target.includes("email")) {
    return "email";
  }

  return "unknown";
}

export const userService = {
  listRolesForAssignment,

  async listUsers(rawInput: unknown) {
    const input = listUsersQuerySchema.parse(rawInput);
    return listUsers(input);
  },

  async getUserById(idRaw: string) {
    const { id } = userIdParamSchema.parse({ id: idRaw });
    return getUserById(id);
  },

  async createUser(rawPayload: unknown, actor: AuthUser | null) {
    const payload = createUserPayloadSchema.parse(rawPayload);

    try {
      return await createUser({
        name: payload.name,
        passportNumber: payload.passportNumber.trim().toUpperCase(),
        email: payload.email.toLowerCase(),
        passwordHash: payload.password ? hashPassword(payload.password) : null,
        isActive: payload.isActive,
        roleKeys: payload.roleKeys,
        assignedById: actor?.id ?? null,
      });
    } catch (error) {
      const conflictTarget = parseUniqueConstraintTarget(error);

      if (conflictTarget === "passportNumber") {
        throw new AppError("Ja existe usuario com este passaporte", 409);
      }

      if (conflictTarget === "email") {
        throw new AppError("Ja existe usuario com este email", 409);
      }

      if (conflictTarget === "unknown") {
        throw new AppError("Ja existe usuario com os mesmos dados", 409);
      }

      throw error;
    }
  },

  async updateUser(idRaw: string, rawPayload: unknown, actor: AuthUser | null) {
    const { id } = userIdParamSchema.parse({ id: idRaw });
    const payload = updateUserPayloadSchema.parse(rawPayload);

    try {
      const user = await updateUser({
        id,
        name: payload.name,
        passportNumber: payload.passportNumber?.trim().toUpperCase(),
        email: payload.email?.toLowerCase(),
        passwordHash: payload.password ? hashPassword(payload.password) : undefined,
        isActive: payload.isActive,
        roleKeys: payload.roleKeys,
        assignedById: actor?.id ?? null,
      });

      if (!user) {
        throw new AppError("Usuario nao encontrado", 404);
      }

      return user;
    } catch (error) {
      const conflictTarget = parseUniqueConstraintTarget(error);

      if (conflictTarget === "passportNumber") {
        throw new AppError("Ja existe usuario com este passaporte", 409);
      }

      if (conflictTarget === "email") {
        throw new AppError("Ja existe usuario com este email", 409);
      }

      if (conflictTarget === "unknown") {
        throw new AppError("Ja existe usuario com os mesmos dados", 409);
      }

      throw error;
    }
  },

  async updateUserStatus(idRaw: string, rawPayload: unknown, actor: AuthUser | null) {
    const { id } = userIdParamSchema.parse({ id: idRaw });
    const payload = updateUserStatusPayloadSchema.parse(rawPayload);

    if (actor && actor.id === id && !payload.isActive) {
      throw new AppError("Voce nao pode desativar o proprio usuario", 422);
    }

    try {
      return await setUserActiveStatus(id, payload.isActive);
    } catch {
      throw new AppError("Usuario nao encontrado", 404);
    }
  },

  async deleteUser(idRaw: string, actor: AuthUser | null) {
    const { id } = userIdParamSchema.parse({ id: idRaw });

    if (actor && actor.id === id) {
      throw new AppError("Voce nao pode excluir o proprio usuario", 422);
    }

    try {
      return await deleteUser(id);
    } catch {
      throw new AppError("Usuario nao encontrado", 404);
    }
  },
};
