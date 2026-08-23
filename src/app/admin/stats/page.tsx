import prisma from "@/lib/prisma";
import {
  MessageSquare,
  FileText,
  BarChart3,
  Clock,
  Eye,
  Activity,
  Globe,
  Monitor,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import CleanImagesButton from "@/components/CleanImagesButton";
import AdminInquiryList from "@/components/AdminInquiryList";

export const revalidate = 0; // 통계 페이지이므로 매번 새로운 실시간 데이터 로드

interface PageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    type?: string;
  }>;
}

function getFriendlyUA(ua: string) {
  if (!ua) return "기기 알 수 없음";
  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) {
    if (ua.includes("iPhone")) return "Safari (iPhone)";
    if (ua.includes("Android")) return "Chrome (Android)";
    return "모바일 브라우저";
  }
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Macintosh")) return "Mac OS PC";
  if (ua.includes("Linux")) return "Linux PC";
  return "데스크톱 브라우저";
}

function getBadgeColor(action: string) {
  switch (action) {
    case "CREATE_POST":
      return "text-emerald-700 bg-emerald-50 border-emerald-100";
    case "UPDATE_POST":
      return "text-amber-700 bg-amber-50 border-amber-100";
    case "DELETE_POST":
      return "text-rose-700 bg-rose-50 border-rose-100";
    case "CREATE_COMMENT":
      return "text-violet-700 bg-violet-50 border-violet-100";
    case "DELETE_COMMENT":
      return "text-red-700 bg-red-50 border-red-100";
    default:
      return "text-slate-700 bg-slate-50 border-slate-100";
  }
}

function getFriendlyAction(action: string) {
  switch (action) {
    case "CREATE_POST":
      return "글 작성";
    case "UPDATE_POST":
      return "글 수정";
    case "DELETE_POST":
      return "글 삭제";
    case "CREATE_COMMENT":
      return "댓글 작성";
    case "DELETE_COMMENT":
      return "댓글 삭제";
    default:
      return action;
  }
}

export default async function AdminStatsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const currentPage = Math.max(1, parseInt(searchParams.page || "1", 10));
  const searchQuery = searchParams.q?.trim() || "";
  const searchType = searchParams.type || "all";

  const PAGE_SIZE = 50;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 방문 로그 검색 조건 설정
  const visitWhere: any = {};
  if (searchQuery) {
    if (searchType === "path") {
      visitWhere.path = { contains: searchQuery };
    } else if (searchType === "ip") {
      visitWhere.ip = { contains: searchQuery };
    } else if (searchType === "ua") {
      visitWhere.userAgent = { contains: searchQuery };
    } else {
      // all: 경로, IP, 브라우저 정보 중 하나라도 포함
      visitWhere.OR = [
        { path: { contains: searchQuery } },
        { ip: { contains: searchQuery } },
        { userAgent: { contains: searchQuery } },
      ];
    }
  }

  // 병렬 데이터 쿼리 실행
  const [
    totalViews,
    todayViews,
    totalPosts,
    totalComments,
    popularPosts,
    recentActivities,
    totalFilteredVisits,
    recentVisits,
    inquiries,
    unreadInquiriesCount,
  ] = await Promise.all([
    prisma.visitLog.count(),
    prisma.visitLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.post.count({ where: { isDeleted: false } }),
    prisma.comment.count({ where: { isDeleted: false } }),
    prisma.post.findMany({
      where: { isDeleted: false },
      orderBy: { viewCount: "desc" },
      take: 5,
      include: { category: true },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.visitLog.count({ where: visitWhere }),
    prisma.visitLog.findMany({
      where: visitWhere,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.inquiry.count({ where: { isRead: false } }),
  ]);

  const totalPages = Math.ceil(totalFilteredVisits / PAGE_SIZE) || 1;

  // 페이지 URL 생성 헬퍼
  const createLogPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("q", searchQuery);
      params.set("type", searchType);
    }
    if (pageNum > 1) {
      params.set("page", pageNum.toString());
    }
    const qs = params.toString();
    return qs ? `/admin/stats?${qs}` : "/admin/stats";
  };

  // 페이지네이션 번호 윈도우 계산 (최대 5개 노출)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-violet-600" /> 관리 대시보드
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            블로그의 접속 통계, 접수된 문의 내역, 활동 로그를 조회하고 관리할 수 있는 페이지입니다.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CleanImagesButton />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm w-fit"
          >
            메인으로 이동
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Views */}
        <div className="glass-panel p-5 rounded-2xl border-slate-200 bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 flex-shrink-0">
            <Eye size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">오늘 방문 수</span>
            <span className="text-xl font-extrabold text-slate-800">{todayViews.toLocaleString()}회</span>
          </div>
        </div>

        {/* Total Views */}
        <div className="glass-panel p-5 rounded-2xl border-slate-200 bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 flex-shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">누적 방문 수</span>
            <span className="text-xl font-extrabold text-slate-800">{totalViews.toLocaleString()}회</span>
          </div>
        </div>

        {/* Total Posts */}
        <div className="glass-panel p-5 rounded-2xl border-slate-200 bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">총 포스팅</span>
            <span className="text-xl font-extrabold text-slate-800">{totalPosts.toLocaleString()}개</span>
          </div>
        </div>

        {/* Total Comments */}
        <div className="glass-panel p-5 rounded-2xl border-slate-200 bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100 flex-shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">총 댓글</span>
            <span className="text-xl font-extrabold text-slate-800">{totalComments.toLocaleString()}개</span>
          </div>
        </div>
      </div>

      {/* Inquiries Section (문의 내역 관리) */}
      <AdminInquiryList initialInquiries={inquiries} unreadCount={unreadInquiriesCount} />

      {/* Main Stats Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top Popular Posts */}
        <div className="glass-panel p-6 rounded-3xl border-slate-200 bg-white space-y-4">
          <h2 className="text-md font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Eye size={18} className="text-violet-600" /> 인기 포스트 TOP 5
          </h2>
          <div className="divide-y divide-slate-100">
            {popularPosts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">집계된 포스트가 없습니다.</p>
            ) : (
              popularPosts.map((post: any, idx: number) => (
                <div key={post.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="overflow-hidden">
                      <Link
                        href={`/posts/${post.slug}`}
                        className="text-xs font-semibold text-slate-800 hover:text-violet-600 transition-colors block truncate"
                      >
                        {post.title}
                      </Link>
                      <span className="text-[10px] text-slate-400">
                        {post.category ? post.category.name : "미분류"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-cyan-600 whitespace-nowrap bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-100">
                    {post.viewCount}회
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Recent Activities */}
        <div className="glass-panel p-6 rounded-3xl border-slate-200 bg-white space-y-4">
          <h2 className="text-md font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Activity size={18} className="text-violet-600" /> 최근 활동 로그 (최근 10건)
          </h2>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">수집된 활동 이력이 없습니다.</p>
            ) : (
              recentActivities.map((log: any) => (
                <div key={log.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md border ${getBadgeColor(log.action)}`}>
                        {getFriendlyAction(log.action)}
                      </span>
                      <span className="font-semibold text-slate-600">{log.ip}</span>
                    </div>
                    <span className="flex items-center gap-0.5">
                      <Clock size={10} /> {new Date(log.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-slate-700 truncate" title={log.targetTitle || ""}>
                      {log.targetTitle || log.targetId}
                    </span>
                    <span
                      className="text-[9px] text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]"
                      title={log.userAgent || ""}
                    >
                      {getFriendlyUA(log.userAgent || "")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Recent Visit Logs (50개 단위 페이징 및 다중 검색 필터) */}
      <div className="glass-panel p-6 rounded-3xl border-slate-200 bg-white space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <Monitor size={18} className="text-violet-600" /> 최근 방문자 상세 로그
            </h2>
            <span className="text-xs text-slate-400">
              총 {totalFilteredVisits.toLocaleString()}건 (페이지당 50건씩 표시, 현재 {currentPage}/{totalPages} 페이지)
            </span>
          </div>

          {/* 검색 폼 */}
          <form method="GET" action="/admin/stats" className="flex items-center gap-2 flex-wrap">
            <select
              name="type"
              defaultValue={searchType}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="all">전체 (경로+IP+기기)</option>
              <option value="path">접속 경로</option>
              <option value="ip">IP 주소</option>
              <option value="ua">기기/브라우저</option>
            </select>

            <div className="relative flex items-center">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="검색어 입력..."
                className="text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-violet-500 w-44 sm:w-56"
              />
              <button
                type="submit"
                className="absolute right-2 p-1 text-slate-400 hover:text-violet-600 transition-colors cursor-pointer"
                title="검색"
              >
                <Search size={14} />
              </button>
            </div>

            {searchQuery && (
              <Link
                href="/admin/stats"
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-2 rounded-xl transition-colors font-semibold"
                title="검색 필터 초기화"
              >
                <RotateCcw size={12} /> 초기화
              </Link>
            )}
          </form>
        </div>

        {/* 검색 요약 알림 배너 */}
        {searchQuery && (
          <div className="p-3 bg-violet-50/80 border border-violet-100 rounded-xl flex items-center justify-between text-xs text-slate-700">
            <span>
              검색어 &ldquo;<strong className="text-violet-700 font-bold">{searchQuery}</strong>&rdquo; 에 대한 검색 결과:{" "}
              <strong className="text-violet-700 font-bold">{totalFilteredVisits.toLocaleString()}</strong>건
            </span>
            <Link href="/admin/stats" className="text-violet-600 hover:underline font-semibold">
              전체 로그 보기
            </Link>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold bg-slate-50/50">
                <th className="py-3 px-3">경로 (Path)</th>
                <th className="py-3 px-3">IP 주소</th>
                <th className="py-3 px-3">접속 브라우저 및 기기</th>
                <th className="py-3 px-3 text-right">시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentVisits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    {searchQuery ? "검색 조건과 일치하는 방문 로그가 없습니다." : "수집된 방문 이력이 없습니다."}
                  </td>
                </tr>
              ) : (
                recentVisits.map((visit: any) => (
                  <tr key={visit.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 font-mono break-all">{visit.path}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{visit.ip}</td>
                    <td
                      className="py-2.5 px-3 text-slate-500 max-w-[240px] truncate"
                      title={visit.userAgent || ""}
                    >
                      {getFriendlyUA(visit.userAgent || "")}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400 font-mono whitespace-nowrap">
                      {new Date(visit.createdAt).toLocaleString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <nav aria-label="Logs Pagination" className="pt-2 flex items-center justify-center gap-1.5">
            {/* Previous Button */}
            {currentPage > 1 ? (
              <Link
                href={createLogPageUrl(currentPage - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
              >
                <ChevronLeft size={14} /> 이전
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed">
                <ChevronLeft size={14} /> 이전
              </span>
            )}

            {/* Numeric Page Buttons */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((pageNum) => {
                const isActive = pageNum === currentPage;
                return (
                  <Link
                    key={pageNum}
                    href={createLogPageUrl(pageNum)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-violet-600 text-white shadow-md shadow-violet-900/20"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {pageNum}
                  </Link>
                );
              })}
            </div>

            {/* Next Button */}
            {currentPage < totalPages ? (
              <Link
                href={createLogPageUrl(currentPage + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
              >
                다음 <ChevronRight size={14} />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed">
                다음 <ChevronRight size={14} />
              </span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
