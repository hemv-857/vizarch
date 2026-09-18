// vizarch — Edge middleware
// Adds security headers and optional API key auth for write endpoints.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_KEY = process.env.VIZARCH_API_KEY;

// Endpoints that require API key auth (POST/DELETE operations)
const PROTECTED_METHODS = ["POST", "DELETE", "PUT", "PATCH"];

// Endpoints that are always public (read-only, no auth needed)
const PUBLIC_PATHS = [
  "/",
  "/api/v1/services",
  "/api/v1/templates",
  "/api/diagrams/",  // GET is public, POST is protected
  "/api/route.ts",
];

function isPublicRead(pathname: string, method: string): boolean {
  if (method === "GET" || method === "HEAD") {
    return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip auth for public read endpoints
  if (isPublicRead(pathname, method)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Skip auth for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // API key check for write endpoints (only if VIZARCH_API_KEY is configured)
  if (API_KEY && PROTECTED_METHODS.includes(method) && pathname.startsWith("/api/")) {
    const providedKey =
      request.headers.get("x-api-key") ||
      request.nextUrl.searchParams.get("api_key");

    if (providedKey !== API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Missing or invalid API key" },
        { status: 401 },
      );
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
