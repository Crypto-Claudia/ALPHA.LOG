import { NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { cleanOrphanImages } from "@/lib/image-cleaner";
import { logActivity } from "@/lib/logger";

export async function POST() {
  try {
    // 1. 관리자 권한 검증
    const isAdmin = await verifySessionCookie();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 401 }
      );
    }

    // 2. 미참조 이미지 스캔 및 uploads_archive 격리 이동 실행
    const result = await cleanOrphanImages();

    // 3. 관리자 활동 로그 기록
    await logActivity(
      "CLEAN_ORPHAN_IMAGES",
      `${result.archivedCount} files`,
      `미사용 이미지 ${result.archivedCount}건 격리 보관 처리`
    );

    return NextResponse.json({
      success: true,
      ...result,
      message:
        result.archivedCount > 0
          ? `총 ${result.archivedCount}개의 미참조 이미지를 uploads_archive 폴더로 안전하게 이동했습니다.`
          : "모든 이미지가 포스팅에서 정상 사용 중이며, 정리할 미참조 이미지가 없습니다.",
    });
  } catch (error: any) {
    console.error("POST /api/admin/clean-images error:", error);
    return NextResponse.json(
      { error: "이미지 정리 작업 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
