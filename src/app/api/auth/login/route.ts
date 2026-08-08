import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyPassword, signSession, SESSION_COOKIE_NAME, SESSION_DURATION } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "비밀번호를 입력해 주세요." },
        { status: 400 }
      );
    }

    // 비밀번호 검증
    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    // 세션 쿠키 발행
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
