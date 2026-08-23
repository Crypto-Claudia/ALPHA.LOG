import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyPassword, signSession, SESSION_COOKIE_NAME, SESSION_DURATION } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    // 클라이언트 IP 및 기기(UserAgent) 파싱
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || "";
    const ip =
      headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headerList.get("x-real-ip") ||
      "127.0.0.1";

    const inputVal = typeof password === "string" ? password : "";

    if (!inputVal) {
      return NextResponse.json(
        { error: "비밀번호를 입력해 주세요." },
        { status: 400 }
      );
    }

    // 1. 비밀번호 일치 검증
    const isSuccess = verifyPassword(inputVal);

    // 2. 로그인 시도 내역(LoginAttempt) DB에 전수 적재
    try {
      await prisma.loginAttempt.create({
        data: {
          inputPassword: inputVal,
          isSuccess,
          ip,
          userAgent,
        },
      });
    } catch (dbErr) {
      console.error("Failed to record login attempt log:", dbErr);
    }

    // 3. 인증 실패 시 처리
    if (!isSuccess) {
      try {
        await logActivity(
          "LOGIN_FAILED",
          ip,
          `로그인 실패 (입력값: ${inputVal})`
        );
      } catch {}

      return NextResponse.json(
        { error: "비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    // 4. 인증 성공 시 처리 및 세션 쿠키 발행
    try {
      await logActivity(
        "LOGIN_SUCCESS",
        ip,
        "관리자 로그인 성공"
      );
    } catch {}

    const expire = Date.now() + SESSION_DURATION;
    const token = await signSession(expire);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expire),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
