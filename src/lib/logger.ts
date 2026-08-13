import prisma from "./prisma";
import { headers } from "next/headers";

/**
 * 사용자 페이지 방문 로그(접속 이력) 적재
 * @param path 방문 경로 (예: "/" 또는 "/posts/slug")
 */
export async function logVisit(path: string) {
  try {
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || "";
    
    // IP 주소 파싱 (프록시 환경 대응)
    const ip = headerList.get("x-forwarded-for")?.split(",")[0].trim() || 
               headerList.get("x-real-ip") || 
               "127.0.0.1";

    await prisma.visitLog.create({
      data: {
        path,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to log visit:", error);
  }
}

/**
 * 주요 CUD 작업에 대한 관리자/사용자 활동 로그 적재
 * @param action 행위 이름 (예: "CREATE_POST", "UPDATE_POST", "DELETE_POST", "CREATE_COMMENT", "DELETE_COMMENT")
 * @param targetId 대상 아이디 또는 포스트 슬러그
 * @param targetTitle 대상 타이틀 또는 식별 값
 */
export async function logActivity(action: string, targetId: string, targetTitle?: string) {
  try {
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || "";
    
    // IP 주소 파싱
    const ip = headerList.get("x-forwarded-for")?.split(",")[0].trim() || 
               headerList.get("x-real-ip") || 
               "127.0.0.1";

    await prisma.activityLog.create({
      data: {
        action,
        targetId,
        targetTitle,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

/**
 * 사용자 검색 이력 로그 적재
 * @param query 검색어
 * @param searchType 검색 분류 (all, title, tag)
 * @param resultCount 검색 결과 건수
 * @param statusCode HTTP 응답 상태 코드 (200 등)
 */
export async function logSearch(
  query: string,
  searchType: string = "all",
  resultCount: number = 0,
  statusCode: number = 200
) {
  try {
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || "";

    // IP 주소 파싱
    const ip =
      headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headerList.get("x-real-ip") ||
      "127.0.0.1";

    await prisma.searchLog.create({
      data: {
        query,
        searchType,
        resultCount,
        statusCode,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to log search:", error);
  }
}
