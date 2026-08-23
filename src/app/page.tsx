import Link from "next/link";
import prisma from "@/lib/prisma";
import {
  Calendar,
  Eye,
  MessageSquare,
  Folder,
  Tag as TagIcon,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  ListFilter,
  Search,
} from "lucide-react";
import { verifySessionCookie } from "@/lib/auth";
import { logVisit, logSearch } from "@/lib/logger";
import SearchBar from "@/components/SearchBar";
import type { Metadata } from "next";

interface PageProps {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    page?: string;
    q?: string;
    type?: string;
  }>;
}

// category / tag / 검색 시 구글 검색 엔진에 고유 메타데이터 생성
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const categorySlug = searchParams.category;
  const tagSlug = searchParams.tag;
  const rawQuery = searchParams.q?.trim() || "";
  const searchQuery = rawQuery.length >= 2 ? rawQuery : "";
  const searchType = searchParams.type || "all";

  // 검색 결과 페이지는 중복 색인 방지를 위해 noindex, follow 설정
  if (searchQuery) {
    const typeLabel = searchType === "title" ? "제목" : searchType === "tag" ? "태그" : "제목+본문";
    return {
      title: `'${searchQuery}' (${typeLabel}) 검색 결과 - ALPHA.LOG`,
      description: `'${searchQuery}' 키워드로 검색된 블로그 포스트 목록입니다.`,
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  if (categorySlug) {
    try {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { name: true },
      });
      if (category) {
        return {
          title: `${category.name} - ALPHA.LOG`,
          description: `${category.name} 카테고리의 가상자산 및 블록체인 투자 분석 글 목록입니다.`,
        };
      }
    } catch (e) {
      console.error("Home generateMetadata error:", e);
    }
  }

  if (tagSlug) {
    try {
      const tag = await prisma.tag.findUnique({
        where: { slug: tagSlug },
        select: { name: true },
      });
      if (tag) {
        return {
          title: `#${tag.name} 태그 글 목록 - ALPHA.LOG`,
          description: `#${tag.name} 태그 관련 온체인 데이터 및 가치 투자 기록들을 모아봅니다.`,
          robots: {
            index: false,
            follow: true,
          },
        };
      }
    } catch (e) {
      console.error("Home generateMetadata error:", e);
    }
  }

  return {};
}

export default async function Home(props: PageProps) {
  const searchParams = await props.searchParams;
  const categorySlug = searchParams.category;
  const tagSlug = searchParams.tag;
  const rawQuery = searchParams.q?.trim() || "";
  const searchQuery = rawQuery.length >= 2 ? rawQuery : "";
  const searchType = searchParams.type || "all";
  const currentPage = Math.max(1, parseInt(searchParams.page || "1", 10));
  const isAdmin = await verifySessionCookie();

  // 방문 페이지 및 매개변수 로그 기록
  const pathParams = [];
  if (categorySlug) pathParams.push(`category=${categorySlug}`);
  if (tagSlug) pathParams.push(`tag=${tagSlug}`);
  if (searchQuery) pathParams.push(`q=${encodeURIComponent(searchQuery)}&type=${searchType}`);
  if (currentPage > 1) pathParams.push(`page=${currentPage}`);
  const visitPath = pathParams.length > 0 ? `/?${pathParams.join("&")}` : "/";
  await logVisit(visitPath);

  // 1. 카테고리 목록 조회 (대분류 및 하위 소분류 트리 구조 포함)
  const rawCategories = await prisma.category.findMany({
    where: {
      parentId: null,
    },
    include: {
      children: {
        include: {
          _count: {
            select: { posts: { where: { published: true, isDeleted: false } } },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      _count: {
        select: { posts: { where: { published: true, isDeleted: false } } },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // 관리자가 아닌 일반 방문자/크롤러: 게시글이 0개인 빈 카테고리 및 하위 카테고리는 노출하지 않고 자동 숨김 처리 (애드센스 심사 최적화)
  const categories = isAdmin
    ? rawCategories
    : rawCategories
        .map((c: any) => {
          const visibleChildren = c.children?.filter((child: any) => child._count.posts > 0) || [];
          return {
            ...c,
            children: visibleChildren,
          };
        })
        .filter((c: any) => {
          const totalPosts =
            c._count.posts +
            (c.children?.reduce((acc: number, child: any) => acc + (child._count?.posts || 0), 0) || 0);
          return totalPosts > 0;
        });

  // 2. 인기 태그 목록 조회 (관리자가 아니면 발행된 글이 있는 태그만 노출)
  const rawTags = await prisma.tag.findMany({
    take: 15,
    include: {
      _count: {
        select: { posts: { where: { published: true, isDeleted: false } } },
      },
    },
    orderBy: { posts: { _count: "desc" } },
  });

  const tags = isAdmin
    ? rawTags
    : rawTags.filter((t: any) => t._count.posts > 0);

  // 3. 카테고리 계층형 필터링 ID 수집
  let targetCategoryIds: number[] = [];
  let activeCategoryName = "";

  if (categorySlug) {
    const parentCat = categories.find((c: any) => c.slug === categorySlug);
    if (parentCat) {
      activeCategoryName = parentCat.name;
      targetCategoryIds = [parentCat.id, ...parentCat.children.map((child: any) => child.id)];
    } else {
      for (const parent of categories) {
        const childCat = parent.children.find((child: any) => child.slug === categorySlug);
        if (childCat) {
          activeCategoryName = childCat.name;
          targetCategoryIds = [childCat.id];
          break;
        }
      }
    }
  }

  // 4. 포스트 필터링 조건 설정 (검색어, 카테고리, 태그, 관리자 권한)
  const where: any = { isDeleted: false };
  if (!isAdmin) {
    where.published = true;
  }
  if (categorySlug && targetCategoryIds.length > 0) {
    where.categoryId = { in: targetCategoryIds };
  }
  if (tagSlug) {
    where.tags = { some: { slug: tagSlug } };
  }

  // 검색 조건 분기
  if (searchQuery) {
    if (searchType === "title") {
      where.title = { contains: searchQuery };
    } else if (searchType === "tag") {
      where.tags = { some: { name: { contains: searchQuery } } };
    } else {
      // all: 제목 또는 본문
      where.OR = [
        { title: { contains: searchQuery } },
        { content: { contains: searchQuery } },
      ];
    }
  }

  // 5. 총 매칭 게시글 수 카운트
  const totalCount = await prisma.post.count({ where });

  // 검색 요청 시 검색 이력 로그 DB 적재 (1페이지 검색 진입 시)
  if (searchQuery && currentPage === 1) {
    await logSearch(searchQuery, searchType, totalCount, 200);
  }

  // 6. 페이지네이션 및 데이터 분할 계산
  // 검색 중이거나 2페이지 이상이면 목록형 전용(10개)으로, 기본 홈 1페이지면 카드 4개 + 목록 10개(최대 14개)
  const isSearchActive = !!searchQuery;
  const LIST_ITEMS_PER_PAGE = 10;
  const FEATURED_CARD_COUNT = 4;

  let totalPages = 1;
  let skip = 0;
  let take = 10;

  if (isSearchActive) {
    totalPages = Math.ceil(totalCount / LIST_ITEMS_PER_PAGE) || 1;
    skip = (currentPage - 1) * LIST_ITEMS_PER_PAGE;
    take = LIST_ITEMS_PER_PAGE;
  } else {
    if (totalCount > 14) {
      totalPages = 1 + Math.ceil((totalCount - 14) / LIST_ITEMS_PER_PAGE);
    }
    if (currentPage > 1) {
      skip = 14 + (currentPage - 2) * LIST_ITEMS_PER_PAGE;
      take = LIST_ITEMS_PER_PAGE;
    } else {
      skip = 0;
      take = 14;
    }
  }

  const fetchedPosts = await prisma.post.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      category: {
        include: {
          parent: true,
        },
      },
      tags: true,
      _count: {
        select: { comments: true },
      },
    },
  });

  const featuredPosts = (!isSearchActive && currentPage === 1) ? fetchedPosts.slice(0, FEATURED_CARD_COUNT) : [];
  const listPosts = (!isSearchActive && currentPage === 1) ? fetchedPosts.slice(FEATURED_CARD_COUNT) : fetchedPosts;

  const activeCategory = categorySlug ? { name: activeCategoryName } : null;
  const activeTag = tagSlug ? tags.find((t: any) => t.slug === tagSlug) : null;
  const searchTypeLabel = searchType === "title" ? "제목" : searchType === "tag" ? "태그" : "제목+본문";

  // 페이지 URL 생성 헬퍼
  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (tagSlug) params.set("tag", tagSlug);
    if (searchQuery) {
      params.set("q", searchQuery);
      params.set("type", searchType);
    }
    if (pageNumber > 1) params.set("page", pageNumber.toString());
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  // 페이지네이션 번호 윈도우 계산 (최대 5개 노출하여 모바일 가로 스크롤 방지)
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Posts Section */}
      <div className="lg:col-span-3 space-y-6">
        {/* 상단 검색바 */}
        <SearchBar />

        {/* Active Filter / Search Banner */}
        {(activeCategory || activeTag || isSearchActive) && (
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border-violet-100 bg-violet-50">
            <span className="text-slate-700 text-sm flex items-center gap-1.5 flex-wrap">
              {isSearchActive && (
                <>
                  <Search size={14} className="text-violet-600 shrink-0" />
                  <span>
                    검색: &ldquo;<strong className="text-violet-700 font-bold">{searchQuery}</strong>&rdquo; ({searchTypeLabel})의 결과 ({totalCount}개)
                  </span>
                </>
              )}
              {!isSearchActive && activeCategory && (
                <span>
                  카테고리: <strong className="text-violet-700 font-semibold">[{activeCategory.name}]</strong>의 글 ({totalCount}개)
                </span>
              )}
              {!isSearchActive && activeTag && (
                <span>
                  태그: <strong className="text-violet-700 font-semibold">#{activeTag.name}</strong>의 글 ({totalCount}개)
                </span>
              )}
            </span>
            <Link href="/" className="text-xs text-cyan-600 hover:text-cyan-700 transition-colors font-medium shrink-0 ml-2">
              초기화 &times;
            </Link>
          </div>
        )}

        {totalCount === 0 ? (
          <div className="glass-panel rounded-3xl py-24 text-center border-slate-200">
            <h3 className="text-xl font-bold text-slate-400 mb-2">
              {isSearchActive ? "일치하는 검색 결과가 없습니다." : "아직 게시글이 없습니다."}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {isSearchActive ? "다른 검색어를 입력하거나 검색 모드를 변경해 보세요." : "첫 번째 블로그 글을 남겨보세요!"}
            </p>
            {isSearchActive ? (
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 transition-all text-white shadow-md"
              >
                전체 글로 돌아가기
              </Link>
            ) : (
              <Link
                href="/admin/write"
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 transition-all text-white shadow-lg shadow-violet-900/10"
              >
                글 작성하러 가기 <ArrowRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {/* 1. 최신 4개 카드 그리드 영역 (검색 중이 아닌 기본 1페이지에서만 노출) */}
            {featuredPosts.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Flame size={18} className="text-amber-500" />
                    <span>최신 포스트</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">주요 글 4개</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredPosts.map((post: any) => (
                    <article
                      key={post.id}
                      className="glass-panel rounded-3xl overflow-hidden hover:scale-[1.01] hover:shadow-lg transition-all duration-300 flex flex-col group border-slate-200 relative bg-white"
                    >
                      {/* Card Thumbnail */}
                      {post.thumbnail ? (
                        <div className="w-full aspect-[1200/630] overflow-hidden relative bg-slate-100 border-b border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.thumbnail}
                            alt={post.title}
                            className="object-cover w-full h-full group-hover:scale-102 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-[1200/630] bg-slate-100 flex items-center justify-center border-b border-slate-200">
                          <span className="text-xs text-slate-400 font-black tracking-widest">ALPHA.LOG</span>
                        </div>
                      )}

                      {/* Card Body */}
                      <div className="p-4 sm:p-6 flex-grow flex flex-col justify-between">
                        <div>
                          {/* Category Label & Published Badge */}
                          <div className="flex items-center gap-2 mb-3">
                            {post.category && (
                              <Link
                                href={`/?category=${post.category.slug}`}
                                className="relative z-20 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-750 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md hover:bg-cyan-100 transition-colors"
                              >
                                <Folder size={10} />
                                <span>
                                  {post.category.parent ? `${post.category.parent.name} > ` : ""}
                                  {post.category.name}
                                </span>
                              </Link>
                            )}
                            {!post.published && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                비공개
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h2 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-violet-700 transition-colors post-card-title">
                            <Link href={`/posts/${post.slug}`} className="after:absolute after:inset-0 after:z-10">
                              {post.title}
                            </Link>
                          </h2>

                          {/* Summary */}
                          <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                            {post.summary || "글 요약본이 존재하지 않습니다."}
                          </p>
                        </div>

                        {/* Metadata */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />{" "}
                            {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Eye size={12} /> {post.viewCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare size={12} /> {post._count.comments}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* 2. 하단 전체 글 게시판 목록형 (Table/List View) */}
            {listPosts.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ListFilter size={18} className="text-violet-600" />
                    <span>
                      {isSearchActive ? "검색 결과 목록" : `전체 글 목록 ${currentPage > 1 ? `(${currentPage} 페이지)` : ""}`}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">총 {totalCount}개의 글</span>
                </div>

                <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm">
                  {listPosts.map((post: any) => (
                    <article
                      key={post.id}
                      className="group p-3.5 sm:p-4 hover:bg-slate-50/80 transition-all duration-150 relative"
                    >
                      {/* 1. Desktop View (sm 이상: 완벽한 열 정렬) */}
                      <div className="hidden sm:flex sm:items-center w-full gap-4">
                        {/* 카테고리 열 (고정 너비 112px, 가운데 정렬) */}
                        <div className="w-28 shrink-0">
                          {post.category ? (
                            <Link
                              href={`/?category=${post.category.slug}`}
                              className="relative z-20 block text-center text-[11px] font-bold text-cyan-750 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-full hover:bg-cyan-100 transition-colors truncate"
                            >
                              {post.category.name}
                            </Link>
                          ) : (
                            <span className="block text-center text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full truncate">
                              일반
                            </span>
                          )}
                        </div>

                        {/* 제목 및 댓글 열 (가변 너비, 시작 위치 100% 일치) */}
                        <div className="flex items-center gap-2 min-w-0 flex-grow">
                          <h4 className="text-sm md:text-[15px] font-semibold text-slate-800 group-hover:text-violet-700 transition-colors truncate">
                            <Link href={`/posts/${post.slug}`} className="after:absolute after:inset-0 after:z-10">
                              {post.title}
                            </Link>
                          </h4>
                          {!post.published && (
                            <span className="relative z-20 shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              비공개
                            </span>
                          )}
                          {post._count.comments > 0 && (
                            <span className="shrink-0 text-xs font-bold text-violet-600">
                              [{post._count.comments}]
                            </span>
                          )}
                        </div>

                        {/* 작성일 열 (고정 너비 100px, 우측 정렬) */}
                        <div className="w-28 shrink-0 text-right font-mono text-xs text-slate-400 flex items-center justify-end gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>
                            {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* 조회수 열 (고정 너비 56px, 우측 정렬) */}
                        <div className="w-14 shrink-0 text-right font-mono text-xs text-slate-400 flex items-center justify-end gap-1">
                          <Eye size={12} className="text-slate-400" />
                          <span>{post.viewCount}</span>
                        </div>
                      </div>

                      {/* 2. Mobile View (sm 미만: 컴팩트 2단 레이아웃) */}
                      <div className="flex flex-col gap-1.5 sm:hidden">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          {post.category ? (
                            <Link
                              href={`/?category=${post.category.slug}`}
                              className="relative z-20 text-[10px] font-bold text-cyan-750 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-full"
                            >
                              {post.category.name}
                            </Link>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              일반
                            </span>
                          )}
                          <div className="flex items-center gap-2.5 font-mono text-[11px]">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} className="text-slate-400" />
                              {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                                year: "2-digit",
                                month: "2-digit",
                                day: "2-digit",
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye size={11} className="text-slate-400" />
                              {post.viewCount}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-800 group-hover:text-violet-700 transition-colors line-clamp-1 flex-grow">
                            <Link href={`/posts/${post.slug}`} className="after:absolute after:inset-0 after:z-10">
                              {post.title}
                            </Link>
                          </h4>
                          {!post.published && (
                            <span className="relative z-20 shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              비공개
                            </span>
                          )}
                          {post._count.comments > 0 && (
                            <span className="shrink-0 text-xs font-bold text-violet-600">
                              [{post._count.comments}]
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* 3. 페이지네이션 (Pagination) */}
            {totalPages > 1 && (
              <nav aria-label="Pagination" className="pt-4 flex items-center justify-center gap-1.5">
                {/* Previous Button */}
                {currentPage > 1 ? (
                  <Link
                    href={createPageUrl(currentPage - 1)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                  >
                    <ChevronLeft size={14} /> 이전
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed">
                    <ChevronLeft size={14} /> 이전
                  </span>
                )}

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((pageNum) => {
                    const isActive = pageNum === currentPage;
                    return (
                      <Link
                        key={pageNum}
                        href={createPageUrl(pageNum)}
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
                    href={createPageUrl(currentPage + 1)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                  >
                    다음 <ChevronRight size={14} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed">
                    다음 <ChevronRight size={14} />
                  </span>
                )}
              </nav>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Categories Widget */}
        <section className="glass-panel p-4 sm:p-6 rounded-3xl border-slate-200 bg-white">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Folder size={14} className="text-violet-500" /> 카테고리
          </h3>
          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                className={`flex items-center justify-between text-sm py-2 px-3.5 rounded-xl transition-all cursor-pointer ${
                  !categorySlug && !isSearchActive
                    ? "bg-violet-600 text-white font-semibold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span>전체 보기</span>
              </Link>
            </li>
            {categories.map((c: any) => {
              const totalPosts =
                c._count.posts +
                (c.children?.reduce((acc: number, child: any) => acc + (child._count?.posts || 0), 0) || 0);
              return (
                <li key={c.id} className="space-y-1">
                  {/* 대분류 */}
                  <Link
                    href={`/?category=${c.slug}`}
                    className={`flex items-center justify-between text-sm py-2 px-3.5 rounded-xl transition-all cursor-pointer ${
                      categorySlug === c.slug
                        ? "bg-violet-600 text-white font-semibold shadow-sm"
                        : "text-slate-700 font-semibold hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="flex items-center gap-1">
                      {isAdmin && totalPosts === 0 && (
                        <span className="text-[9px] px-1 py-0.2 rounded font-sans font-bold bg-amber-50 text-amber-600 border border-amber-200">
                          숨김
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                          categorySlug === c.slug ? "bg-violet-750 text-violet-100" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {totalPosts}
                      </span>
                    </span>
                  </Link>

                  {/* 소분류 (자식 카테고리) - 트리구조 */}
                  {c.children && c.children.length > 0 && (
                    <ul className="pl-4 space-y-1 mt-1 border-l border-slate-100 ml-4.5">
                      {c.children.map((child: any) => (
                        <li key={child.id}>
                          <Link
                            href={`/?category=${child.slug}`}
                            className={`flex items-center justify-between text-xs py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                              categorySlug === child.slug
                                ? "bg-cyan-600 text-white font-semibold shadow-sm"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-300 font-normal">└</span> {child.name}
                            </span>
                            <span className="flex items-center gap-1">
                              {isAdmin && child._count.posts === 0 && (
                                <span className="text-[9px] px-1 py-0.2 rounded font-sans font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                  숨김
                                </span>
                              )}
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                  categorySlug === child.slug
                                    ? "bg-cyan-700 text-cyan-100"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                {child._count.posts}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Tags Widget */}
        <section className="glass-panel p-4 sm:p-6 rounded-3xl border-slate-200 bg-white">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <TagIcon size={14} className="text-cyan-600" /> 인기 태그
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((t: any) => (
              <Link
                key={t.id}
                href={`/?tag=${t.slug}`}
                className={`inline-flex items-center text-xs px-3 py-1 rounded-full transition-all cursor-pointer ${
                  tagSlug === t.slug
                    ? "bg-cyan-600 text-white font-semibold shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                #{t.name}
              </Link>
            ))}
            {tags.length === 0 && <span className="text-xs text-slate-400">등록된 태그가 없습니다.</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
