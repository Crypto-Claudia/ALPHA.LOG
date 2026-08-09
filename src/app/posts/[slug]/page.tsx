import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { verifySessionCookie } from "@/lib/auth";
import { logVisit } from "@/lib/logger";
import CommentSection from "@/components/CommentSection";
import PostAdminActions from "@/components/PostAdminActions";
import { Calendar, Eye, EyeOff, Folder, Tag as TagIcon, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

interface Params {
  params: Promise<{
    slug: string;
  }>;
}

// 1. Dynamic Metadata 생성
export async function generateMetadata(props: Params): Promise<Metadata> {
  const { slug } = await props.params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await prisma.post.findUnique({
    where: { slug: decodedSlug },
    select: { title: true, summary: true, thumbnail: true },
  });

  if (!post) {
    return {
      title: "글을 찾을 수 없습니다 - ALPHA.LOG",
    };
  }

  return {
    title: `${post.title} - ALPHA.LOG`,
    description: post.summary || "블록체인 및 가상자산 투자 아카이브. 크립토 시장 통찰과 온체인 데이터 가치 분석, 복리 성장을 기록하는 ALPHA.LOG.",
    openGraph: {
      title: post.title,
      description: post.summary || undefined,
      images: post.thumbnail ? [{ url: post.thumbnail }] : undefined,
      type: "article",
    },
  };
}

// 2. 글 상세 페이지 컴포넌트
export default async function PostDetailPage(props: Params) {
  const { slug } = await props.params;
  const decodedSlug = decodeURIComponent(slug);
  const isAdmin = await verifySessionCookie();

  let post;
  try {
    const queryInclude = {
      category: true,
      tags: true,
      comments: {
        where: {
          parentId: null, // 대댓글 조회를 위해 최상위 댓글만 가져오고, 하위에 대댓글을 include
        },
        include: {
          replies: {
            orderBy: {
              createdAt: "asc" as const,
            },
          },
        },
        orderBy: {
          createdAt: "asc" as const,
        },
      },
    };

    // 삭제 여부 및 공개 여부 사전 검증
    const checkPost = await prisma.post.findUnique({
      where: { slug: decodedSlug },
      select: { isDeleted: true, published: true },
    });

    if (!checkPost || checkPost.isDeleted) {
      notFound();
    }

    // 비관리자가 비공개 글 접근 시 404 처리
    if (!checkPost.published && !isAdmin) {
      notFound();
    }

    // 상세 페이지 진입 시 조회수 항상 1 증가
    post = await prisma.post.update({
      where: { slug: decodedSlug },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      include: queryInclude,
    });
  } catch (error) {
    console.error("PostDetailPage DB error details:", error);
    notFound();
  }

  // 상세 페이지 방문 로그 적재
  await logVisit(`/posts/${post.slug}`);

  return (
    <article className="max-w-[966px] mx-auto space-y-8">
      {/* Back Button */}
      <div className="flex justify-between items-center">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ChevronLeft size={16} /> 목록으로 돌아가기
        </Link>
      </div>

      {/* 비공개 상태 안내 알림 배지 */}
      {!post.published && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold flex items-center gap-2">
          <EyeOff size={16} className="text-amber-600 flex-shrink-0" />
          <span>현재 이 글은 비공개 상태입니다. 메인 홈 화면의 글 목록 카드에 노출되지 않고 있습니다.</span>
        </div>
      )}

      {/* Single Main Card Container */}
      <div className="glass-panel -mx-4 sm:mx-0 rounded-none sm:rounded-3xl border-x-0 sm:border-x border-slate-200 overflow-hidden bg-white flex flex-col">
        {/* 1. Header Info (Title and Metadata) */}
        <div className="p-5 sm:p-10 pb-6 border-b border-slate-100 space-y-4">
          {/* Category Label */}
          {post.category && (
            <div>
              <Link href={`/?category=${post.category.slug}`} className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 bg-cyan-50 border border-cyan-100 px-3 py-1 rounded-md hover:bg-cyan-100 transition-colors">
                <Folder size={12} /> {post.category.name}
              </Link>
            </div>
          )}

          <h1 className="text-[20px] sm:text-[32px] font-normal text-slate-900 leading-tight post-detail-title">
            {post.title}
          </h1>

          {/* Post Metadata & Admin Controls */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-between items-center text-xs text-slate-500 gap-4">
            <div className="flex flex-wrap gap-4 items-center">
              <span className="flex items-center gap-1">
                <Calendar size={14} className="text-violet-600" /> {new Date(post.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </span>
              <span className="flex items-center gap-1">
                <Eye size={14} className="text-cyan-600" /> 조회 {post.viewCount}회
              </span>
            </div>
            
            {/* 어드민 조작 버튼 이식 */}
            {isAdmin && <PostAdminActions slug={post.slug} published={post.published} />}
          </div>
        </div>

        {/* 2. Main Thumbnail (Flush) */}
        {post.thumbnail && (
          <div className="w-full aspect-[1200/630] overflow-hidden border-b border-slate-100 bg-slate-50 relative">
            <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* 3. Body Content & Tags Area */}
        <div className="p-5 sm:p-10 pt-6 sm:pt-8 space-y-6">
          <div className="tiptap-content text-slate-800" dangerouslySetInnerHTML={{ __html: post.content }} />
          
          {/* Tags Block */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100">
              {post.tags.map((tag: any) => (
                <Link key={tag.id} href={`/?tag=${tag.slug}`} className="inline-flex items-center text-xs px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-all">
                  <TagIcon size={12} className="mr-1 text-cyan-600" /> {tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comment Section (Client Component) */}
      <div>
        <CommentSection postId={post.id} initialComments={post.comments} isAdmin={isAdmin} />
      </div>
    </article>
  );
}
