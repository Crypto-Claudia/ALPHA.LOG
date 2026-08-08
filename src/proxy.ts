import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = token ? await verifySessionToken(token) : false;

  // 1. 관리자 전용 웹 페이지 보호
  // 로그인 상태가 아니면 404 Not Found 페이지로 리라이트(Rewrite)하여 경로 자체를 은닉
  // 로그인 경로(/admin/login)는 예외
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isAuthenticated) {
      return NextResponse.rewrite(new URL("/_not-found", request.url));
    }
  }

  // 2. 관리자 API 전용 쓰기 작업 보호 (CUD)
  // 단, 인증(/api/auth/*) 라우트는 허용
  if (
    (pathname.startsWith("/api/posts") ||
      pathname.startsWith("/api/categories") ||
      pathname.startsWith("/api/upload")) &&
    !pathname.startsWith("/api/auth")
  ) {
    const method = request.method.toUpperCase();
    if (["POST", "PATCH", "DELETE"].includes(method)) {
      if (!isAuthenticated) {
        return NextResponse.json(
          { error: "관리자 권한이 필요한 작업입니다." },
          { status: 401 }
        );
      }
    }
  }

  return NextResponse.next();
}

// 프록시 매칭 조건 지정
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/posts/:path*",
    "/api/categories/:path*",
    "/api/upload/:path*",
  ],
};
