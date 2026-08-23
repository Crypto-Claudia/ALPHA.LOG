import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySessionCookie } from "@/lib/auth";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// PATCH /api/admin/inquiries/[id] - 읽음/안읽음 상태 토글
export async function PATCH(request: Request, props: Params) {
  try {
    const isAdmin = await verifySessionCookie();
    if (!isAdmin) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 401 });
    }

    const { id } = await props.params;
    const inquiryId = parseInt(id, 10);
    if (isNaN(inquiryId)) {
      return NextResponse.json({ error: "유효하지 않은 문의 ID입니다." }, { status: 400 });
    }

    const body = await request.json();
    const { isRead } = body;

    const updated = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { isRead: Boolean(isRead) },
    });

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (error: any) {
    console.error("PATCH /api/admin/inquiries/[id] error:", error);
    return NextResponse.json({ error: "문의 상태 업데이트 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE /api/admin/inquiries/[id] - 문의 내역 삭제
export async function DELETE(request: Request, props: Params) {
  try {
    const isAdmin = await verifySessionCookie();
    if (!isAdmin) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 401 });
    }

    const { id } = await props.params;
    const inquiryId = parseInt(id, 10);
    if (isNaN(inquiryId)) {
      return NextResponse.json({ error: "유효하지 않은 문의 ID입니다." }, { status: 400 });
    }

    await prisma.inquiry.delete({
      where: { id: inquiryId },
    });

    return NextResponse.json({ success: true, message: "문의가 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE /api/admin/inquiries/[id] error:", error);
    return NextResponse.json({ error: "문의를 삭제하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
