import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { slugify, extractTextFromHtml } from "@/lib/utils";
import { logActivity } from "@/lib/logger";

interface Params {
  params: Promise<{
    slug: string;
  }>;
}

// GET /api/posts/[slug] - 특정 글 조회 및 조회수 증가
export async function GET(request: Request, props: Params) {
  try {
    const { slug } = await props.params;
    const decodedSlug = decodeURIComponent(slug);

    // 1. 기존 게시글 유효성 및 삭제 여부 검사
    const checkPost = await prisma.post.findUnique({
      where: { slug: decodedSlug },
      select: { isDeleted: true },
    });

    if (!checkPost || checkPost.isDeleted) {
      return NextResponse.json(
        { error: "존재하지 않는 게시글입니다." },
        { status: 404 }
      );
    }

    // 2. 조회수 1 증가 및 포스트 조회
    const post = await prisma.post.update({
      where: { slug: decodedSlug },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      include: {
        category: true,
        tags: true,
        comments: {
          where: {
            parentId: null, // 대댓글 조회를 위해 최상위 댓글만 가져오고, 하위에 대댓글을 include
          },
          include: {
            replies: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json(post);
  } catch (error: any) {
    const slugVal = (await props.params).slug;
    console.error(`GET /api/posts/${slugVal} error:`, error);
    return NextResponse.json(
      { error: "글을 찾을 수 없거나 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 404 }
    );
  }
}

// PATCH /api/posts/[slug] - 글 수정
export async function PATCH(request: Request, props: Params) {
  try {
    const { slug } = await props.params;
    const decodedSlug = decodeURIComponent(slug);
    const body = await request.json();
    const { title, slug: newSlug, summary, content, thumbnail, published, categoryId, tags } = body;

    // 기존 게시글 존재 체크
    const post = await prisma.post.findUnique({
      where: { slug: decodedSlug },
    });

    if (!post || post.isDeleted) {
      return NextResponse.json(
        { error: "수정할 게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const finalSlug = newSlug ? slugify(newSlug) : post.slug;

    // 슬러그가 바뀌는 경우 중복 검사 (기존 글 및 이전 리다이렉트 슬러그 검증)
    if (finalSlug !== decodedSlug) {
      const [slugDuplicate, historyDuplicate] = await Promise.all([
        prisma.post.findUnique({ where: { slug: finalSlug } }),
        prisma.postSlugHistory.findUnique({ where: { oldSlug: finalSlug } }),
      ]);
      if (slugDuplicate || historyDuplicate) {
        return NextResponse.json(
          { error: "이미 사용 중이거나 이전 리다이렉트 주소로 등록된 슬러그(URL)입니다. 다른 슬러그를 입력해 주세요." },
          { status: 400 }
        );
      }
    }

    let finalSummary = summary !== undefined ? summary : post.summary;
    if (!finalSummary || finalSummary.trim() === "") {
      const activeContent = content !== undefined ? content : post.content;
      finalSummary = extractTextFromHtml(activeContent).slice(0, 500);
    }

    const updateData: any = {
      title: title ?? post.title,
      slug: finalSlug,
      summary: finalSummary || null,
      content: content ?? post.content,
      thumbnail: thumbnail !== undefined ? thumbnail : post.thumbnail,
      published: published !== undefined ? published : post.published,
    };

    // 태그 정보가 명시적으로 전달되었을 때만 관계 업데이트 수행
    if (tags !== undefined && Array.isArray(tags)) {
      const tagConnectOrCreate = tags.map((tagName: string) => {
        const trimmed = tagName.trim();
        return {
          where: { name: trimmed },
          create: { name: trimmed, slug: slugify(trimmed) },
        };
      });

      updateData.tags = {
        set: [], // 기존 관계 끊기
        connectOrCreate: tagConnectOrCreate, // 새 관계 형성
      };
    }

    if (categoryId !== undefined) {
      if (categoryId === null) {
        updateData.category = { disconnect: true };
      } else {
        updateData.category = {
          connect: { id: parseInt(categoryId) },
        };
      }
    }

    let updatedPost;

    if (finalSlug !== decodedSlug) {
      // 슬러그가 변경된 경우: 포스트 업데이트와 함께 이전 슬러그를 PostSlugHistory에 자동 적재
      const [updated] = await prisma.$transaction([
        prisma.post.update({
          where: { slug: decodedSlug },
          data: updateData,
          include: {
            category: true,
            tags: true,
          },
        }),
        prisma.postSlugHistory.upsert({
          where: { oldSlug: decodedSlug },
          create: {
            oldSlug: decodedSlug,
            postId: post.id,
          },
          update: {
            postId: post.id,
          },
        }),
      ]);
      updatedPost = updated;
    } else {
      updatedPost = await prisma.post.update({
        where: { slug: decodedSlug },
        data: updateData,
        include: {
          category: true,
          tags: true,
        },
      });
    }

    // 포스트 수정 활동 로그 적재
    await logActivity("UPDATE_POST", updatedPost.slug, updatedPost.title);

    return NextResponse.json(updatedPost);
  } catch (error: any) {
    const slugVal = (await props.params).slug;
    console.error(`PATCH /api/posts/${slugVal} error:`, error);
    return NextResponse.json(
      { error: "글을 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[slug] - 글 삭제
export async function DELETE(request: Request, props: Params) {
  try {
    const { slug } = await props.params;
    const decodedSlug = decodeURIComponent(slug);

    // 기존 포스트 상태 및 존재 검증
    const post = await prisma.post.findUnique({
      where: { slug: decodedSlug },
    });

    if (!post || post.isDeleted) {
      return NextResponse.json(
        { error: "삭제할 게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 포스트 소프트 딜리트 처리 (isDeleted = true)
    const updatedPost = await prisma.post.update({
      where: { slug: decodedSlug },
      data: { isDeleted: true },
    });

    // 포스트 삭제 활동 로그 적재
    await logActivity("DELETE_POST", updatedPost.slug, updatedPost.title);

    return NextResponse.json({ message: "게시글이 성공적으로 삭제되었습니다." });
  } catch (error: any) {
    const slugVal = (await props.params).slug;
    console.error(`DELETE /api/posts/${slugVal} error:`, error);
    return NextResponse.json(
      { error: "글을 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
