import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const publicRoutes = ["/", "/auth/login", "/auth/signup"];
  const isPublic = publicRoutes.some((r) => pathname === r);

  if (!isLoggedIn && !isPublic && !pathname.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  if (isLoggedIn && (pathname === "/auth/login" || pathname === "/auth/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
