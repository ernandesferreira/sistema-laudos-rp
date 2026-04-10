import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_ROLES,
  AUTH_COOKIE_USER_ID,
  AUTH_HEADER_ROLES,
  AUTH_HEADER_USER_ID,
} from "@/auth/constants";
import { resolveRoutePolicy } from "@/auth/routeProtection";
import { normalizeRoleKeys } from "@/auth/roles";

const AUTH_ENFORCE_MIDDLEWARE = process.env.AUTH_ENFORCE_MIDDLEWARE === "true";

function parseRoles(raw: string | null) {
  if (!raw) {
    return [];
  }

  return normalizeRoleKeys(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function forbiddenResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("auth", "forbidden");

  return NextResponse.redirect(url);
}

function unauthorizedResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("auth", "required");

  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const policy = resolveRoutePolicy(request.nextUrl.pathname);

  if (!policy) {
    return NextResponse.next();
  }

  const userId =
    request.headers.get(AUTH_HEADER_USER_ID) ?? request.cookies.get(AUTH_COOKIE_USER_ID)?.value ?? null;

  const rawRoles =
    request.headers.get(AUTH_HEADER_ROLES) ?? request.cookies.get(AUTH_COOKIE_ROLES)?.value ?? null;

  const roles = parseRoles(rawRoles);
  const forwardedHeaders = new Headers(request.headers);

  if (userId) {
    forwardedHeaders.set(AUTH_HEADER_USER_ID, userId);
  }

  if (roles.length > 0) {
    forwardedHeaders.set(AUTH_HEADER_ROLES, roles.join(","));
  }

  if (!AUTH_ENFORCE_MIDDLEWARE) {
    return NextResponse.next({
      request: {
        headers: forwardedHeaders,
      },
    });
  }

  if (!userId) {
    return unauthorizedResponse(request);
  }

  if (policy.requiredRoles && policy.requiredRoles.length > 0) {
    const hasRole = policy.requiredRoles.some((role) => roles.includes(role));

    if (!hasRole) {
      return forbiddenResponse(request);
    }
  }

  return NextResponse.next({
    request: {
      headers: forwardedHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/templates/:path*",
    "/workflows/:path*",
    "/submissions/:path*",
    "/requests/:path*",
    "/settings/:path*",
    "/api/templates/:path*",
    "/api/sections/:path*",
    "/api/fields/:path*",
    "/api/submissions/:path*",
    "/api/requests/:path*",
    "/api/workflows/:path*",
    "/api/rbac/:path*",
    "/api/users/:path*",
  ],
};
