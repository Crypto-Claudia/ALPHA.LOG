import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { slugify, extractTextFromHtml } from "@/lib/utils";
import { logActivity } from "@/lib/logger";

// GET /api/posts - 글 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const categorySlug = searchParams.get("category");
    const tagSlug = searchParams.get("tag");
    const publishedOnly = searchParams.get("admin") !== "true"; // admin=true이면 임시저장 글도 포함

    const skip = (page - 1) * limit;

    // 필터 조건 설정 (삭제된 글은 일괄 배제)
    const where: any = { isDeleted: false };
    if (publishedOnly) {
      where.published = true;
    }
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }
    if (tagSlug) {
      where.tags = { some: { slug: tagSlug } };
    }

    // 포스트 조회 및 전체 개수 카운트 병렬 실행
    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          category: {
            select: { name: true, slug: true },
          },
          tags: {
            select: { name: true, slug: true },
          },
          _count: {
            select: { comments: true },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      posts,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json(
      { error: "글 목록을 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/posts - 새 글 작성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, slug, summary, content, thumbnail, published, categoryId, tags } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 본문은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // 슬러그 고유성 검증 및 자동 생성
    const finalSlug = slug ? slugify(slug) : slugify(title);
    
    const existingPost = await prisma.post.findUnique({
      where: { slug: finalSlug },
    });

    if (existingPost) {
      return NextResponse.json(
        { error: "이미 존재하는 글 슬러그(URL)입니다. 다른 제목이나 슬러그를 입력해 주세요." },
        { status: 400 }
      );
    }

    // 태그 리스트 처리 (중복 제거 및 DB connectOrCreate)
    const tagConnectOrCreate = tags && Array.isArray(tags)
      ? tags.map((tagName: string) => {
          const trimmed = tagName.trim();
          return {
            where: { name: trimmed },
            create: { name: trimmed, slug: slugify(trimmed) },
          };
        })
      : [];

    const finalSummary = summary && summary.trim()
      ? summary.trim()
      : extractTextFromHtml(content).slice(0, 500);

    const postData: any = {
      title,
      slug: finalSlug,
      summary: finalSummary || null,
      content,
      thumbnail: thumbnail || null,
      published: published ?? false,
      tags: {
        connectOrCreate: tagConnectOrCreate,
      },
    };

    if (categoryId) {
      postData.category = {
        connect: { id: parseInt(categoryId) },
      };
    }

    const post = await prisma.post.create({
      data: postData,
      include: {
        category: true,
        tags: true,
      },
    });

    // 포스트 생성 활동 로그 적재
    await logActivity("CREATE_POST", post.slug, post.title);

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json(
      { error: "글을 작성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
