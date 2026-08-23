import { NextResponse } from "next/server";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, title, content } = body;

    // 1. 필수 입력값 및 유효성 검증
    if (!email || !title || !content) {
      return NextResponse.json(
        { error: "이메일, 제목, 문의 내용을 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    const trimmedEmail = String(email).trim();
    const trimmedTitle = String(title).trim();
    const trimmedContent = String(content).trim();

    // 이메일 정규식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "올바른 이메일 주소 형식을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (trimmedTitle.length < 2 || trimmedTitle.length > 200) {
      return NextResponse.json(
        { error: "제목은 최소 2자 이상 200자 이하로 입력해 주세요." },
        { status: 400 }
      );
    }

    if (trimmedContent.length < 5 || trimmedContent.length > 5000) {
      return NextResponse.json(
        { error: "문의 내용은 최소 5자 이상 5,000자 이하로 입력해 주세요." },
        { status: 400 }
      );
    }

    // 2. 작성자 IP 및 UserAgent 파싱
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || "";
    const ip =
      headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headerList.get("x-real-ip") ||
      "127.0.0.1";

    // 3. 데이터베이스에 문의 내역 저장
    const inquiry = await prisma.inquiry.create({
      data: {
        email: trimmedEmail,
        title: trimmedTitle,
        content: trimmedContent,
        ip,
        userAgent,
      },
    });

    // 4. 관리자 활동 로그 적재
    try {
      await logActivity(
        "NEW_INQUIRY",
        inquiry.email,
        `신규 문의 접수: ${inquiry.title}`
      );
    } catch {
      // 활동 로그 실패가 문의 접수를 막지 않음
    }

    return NextResponse.json(
      {
        success: true,
        message: "문의가 성공적으로 접수되었습니다. 확인 후 남겨주신 이메일로 답변드리겠습니다.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/inquiries error:", error);
    return NextResponse.json(
      { error: "문의를 접수하는 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
