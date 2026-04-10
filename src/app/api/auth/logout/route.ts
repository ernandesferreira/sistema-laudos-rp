import { NextResponse } from "next/server";
import { AUTH_COOKIE_ROLES, AUTH_COOKIE_USER_ID } from "@/auth/constants";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(AUTH_COOKIE_USER_ID, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(AUTH_COOKIE_ROLES, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
