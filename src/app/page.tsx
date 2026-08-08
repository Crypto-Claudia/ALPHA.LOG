import Link from "next/link";
import prisma from "@/lib/prisma";
import { Calendar, Eye, MessageSquare, Folder, Tag as TagIcon, ArrowRight } from "lucide-react";
import { verifySessionCookie } from "@/lib/auth";
import { logVisit } from "@/lib/logger";

interface PageProps {
  searchParams: Promise<{
    category?: string;
    tag?: string;
  }>;
}

export default async function Home(props: PageProps) {
  const searchParams = await props.searchParams;
  const categorySlug = searchParams.category;
  const tagSlug = searchParams.tag;
  const isAdmin = await verifySessionCookie();

  // 방문 페이지 및 매개변수 로그 기록
  const pathParams = [];
  if (categorySlug) pathParams.push(`category=${categorySlug}`);
  if (tagSlug) pathParams.push(`tag=${tagSlug}`);
  const visitPath = pathParams.length > 0 ? `/?${pathParams.join("&")}` : "/";
  await logVisit(visitPath);

  // 1. 카테고리 목록 조회 (대분류 및 하위 소분류 트리 구조 포함)
  const categories = await prisma.category.findMany({
    where: {
      parentId: null, // 대분류만 우선적으로 가져옴
    },
    include: {
      children: {
        include: {
          _count: {
            select: { posts: { where: { published: true } } },
          },
        },
        orderBy: [
          { sortOrder: "asc" },
          { name: "asc" },
        ],
      },
      _count: {
        select: { posts: { where: { published: true } } },
      },
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });

  // 2. 인기 태그 목록 조회
  const tags = await prisma.tag.findMany({
    take: 15,
    include: {
      _count: {
        select: { posts: { where: { published: true } } },
      },
    },
    orderBy: { posts: { _count: "desc" } },
  });

  // 3. 카테고리 계층형 필터링 ID 수집
  let targetCategoryIds: number[] = [];
  let activeCategoryName = "";

  if (categorySlug) {
    // 3-1. 대분류 중에서 찾기
    const parentCat = categories.find((c: any) => c.slug === categorySlug);
    if (parentCat) {
      activeCategoryName = parentCat.name;
      // 대분류 본인 ID 및 하위 모든 소분류 ID 목록을 취합하여 한꺼번에 합산조회
      targetCategoryIds = [parentCat.id, ...parentCat.children.map((child: any) => child.id)];
    } else {
      // 3-2. 소분류(자식) 중에서 찾기
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

  // 4. 포스트 필터링 조건 설정 (관리자이면 비공개 포스트 포함 조회. 단, 삭제글은 모두 배제)
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

  // 5. 포스트 리스트 조회
  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: {
        include: {
          parent: true, // 대소분류 라벨 구성을 위함
        },
      },
      tags: true,
      _count: {
        select: { comments: true },
      },
    },
  });

  const activeCategory = categorySlug ? { name: activeCategoryName } : null;
  const activeTag = tagSlug ? tags.find((t: any) => t.slug === tagSlug) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Posts Section */}
      <div className="lg:col-span-3 space-y-8">
        {/* Active Filter Header */}
        {(activeCategory || activeTag) && (
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border-violet-100 bg-violet-50">
            <span className="text-slate-700 text-sm">
              필터:{" "}
              <strong className="text-violet-700 font-semibold">
                {activeCategory ? `카테고리 [${activeCategory.name}]` : `태그 #${activeTag?.name}`}
              </strong>
              의 글 ({posts.length}개)
            </span>
            <Link href="/" className="text-xs text-cyan-600 hover:text-cyan-700 transition-colors font-medium">
              필터 초기화 &times;
            </Link>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="glass-panel rounded-3xl py-24 text-center border-slate-200">
            <h3 className="text-xl font-bold text-slate-400 mb-2">아직 게시글이 없습니다.</h3>
            <p className="text-sm text-slate-500 mb-6">첫 번째 블로그 글을 남겨보세요!</p>
            <Link href="/admin/write" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 transition-all text-white shadow-lg shadow-violet-900/10">
              글 작성하러 가기 <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post: any) => (
              <article key={post.id} className="glass-panel rounded-3xl overflow-hidden hover:scale-[1.01] hover:shadow-lg transition-all duration-300 flex flex-col group border-slate-200">
                {/* Card Thumbnail */}
                {post.thumbnail ? (
                  <div className="w-full aspect-[1200/630] overflow-hidden relative bg-slate-100 border-b border-slate-200">
                    <img src={post.thumbnail} alt={post.title} className="object-cover w-full h-full group-hover:scale-102 transition-transform duration-500" />
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
                        <Link href={`/?category=${post.category.slug}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-750 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md hover:bg-cyan-100 transition-colors">
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
                      <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                    </h2>

                    {/* Summary */}
                    <p className="text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                      {post.summary || "글 요약본이 존재하지 않습니다."}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
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
              <Link href="/" className={`flex items-center justify-between text-sm py-2 px-3.5 rounded-xl transition-all cursor-pointer ${!categorySlug ? "bg-violet-600 text-white font-semibold shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}>
                <span>전체 보기</span>
              </Link>
            </li>
            {categories.map((c: any) => {
              const totalPosts = c._count.posts + (c.children?.reduce((acc: number, child: any) => acc + (child._count?.posts || 0), 0) || 0);
              return (
                <li key={c.id} className="space-y-1">
                  {/* 대분류 */}
                  <Link href={`/?category=${c.slug}`} className={`flex items-center justify-between text-sm py-2 px-3.5 rounded-xl transition-all cursor-pointer ${categorySlug === c.slug ? "bg-violet-600 text-white font-semibold shadow-sm" : "text-slate-700 font-semibold hover:text-slate-900 hover:bg-slate-100"}`}>
                    <span>{c.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${categorySlug === c.slug ? "bg-violet-750 text-violet-100" : "bg-slate-100 text-slate-500"}`}>{totalPosts}</span>
                  </Link>

                {/* 소분류 (자식 카테고리) - 네이버 블로그 스타일 트리구조 */}
                {c.children && c.children.length > 0 && (
                  <ul className="pl-4 space-y-1 mt-1 border-l border-slate-100 ml-4.5">
                    {c.children.map((child: any) => (
                      <li key={child.id}>
                        <Link href={`/?category=${child.slug}`} className={`flex items-center justify-between text-xs py-1.5 px-3 rounded-lg transition-all cursor-pointer ${categorySlug === child.slug ? "bg-cyan-600 text-white font-semibold shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
                          <span className="flex items-center gap-1.5">
                            <span className="text-slate-300 font-normal">└</span> {child.name}
                          </span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${categorySlug === child.slug ? "bg-cyan-700 text-cyan-100" : "bg-slate-100 text-slate-400"}`}>{child._count.posts}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )})}
          </ul>

        </section>

        {/* Tags Widget */}
        <section className="glass-panel p-4 sm:p-6 rounded-3xl border-slate-200 bg-white">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <TagIcon size={14} className="text-cyan-600" /> 인기 태그
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((t: any) => (
              <Link key={t.id} href={`/?tag=${t.slug}`} className={`inline-flex items-center text-xs px-3 py-1 rounded-full transition-all cursor-pointer ${tagSlug === t.slug ? "bg-cyan-600 text-white font-semibold shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}>
                #{t.name}
              </Link>
            ))}
            {tags.length === 0 && (
              <span className="text-xs text-slate-400">등록된 태그가 없습니다.</span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
