import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_ROLES, AUTH_COOKIE_USER_ID } from "@/auth/constants";
import { normalizeRoleKeys } from "@/auth/roles";
import { findUserForLoginByPassport } from "@/infra/repositories/authRepository";
import { verifyPassword } from "@/lib/password";

const loginSchema = z.object({
  passportNumber: z.string().trim().min(3).max(40),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const passportNumber = payload.passportNumber.toUpperCase();

    const user = await findUserForLoginByPassport(passportNumber);

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Passaporte ou senha invalido" }, { status: 401 });
    }

    const isValid = verifyPassword(payload.password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: "Passaporte ou senha invalido" }, { status: 401 });
    }

    const roles = normalizeRoleKeys(user.roles.map((entry) => entry.role.key));

    if (roles.length === 0) {
      return NextResponse.json({ error: "Usuario sem perfil de acesso" }, { status: 403 });
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        passportNumber: user.passportNumber,
        roles,
      },
    });

    response.cookies.set(AUTH_COOKIE_USER_ID, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    response.cookies.set(AUTH_COOKIE_ROLES, roles.join(","), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Falha no login" }, { status: 400 });
  }
}
