import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/categories - 카테고리 계층 트리 목록 조회 (정렬 순서 sortOrder 적용)
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentId: null, // 대분류만 최상위로 가져옴
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
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { error: "카테고리를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/categories - 새 카테고리 등록 (순서 sortOrder 지정 지원)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, parentId, sortOrder } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "이름과 슬러그는 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // 중복 체크 (이름 및 슬러그)
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "이미 존재하는 카테고리 이름 또는 슬러그입니다." },
        { status: 400 }
      );
    }

    const categoryData: any = { 
      name, 
      slug,
      sortOrder: sortOrder ? parseInt(sortOrder) : 0
    };
    
    // 부모 카테고리 ID가 있으면 매핑 설정
    if (parentId) {
      categoryData.parent = {
        connect: { id: parseInt(parentId) },
      };
    }

    const category = await prisma.category.create({
      data: categoryData,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { error: "카테고리를 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/categories - 카테고리 순서 벌크(일괄) 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json(); // Array of { id: number, sortOrder: number }
    
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "올바르지 않은 데이터 형식입니다. 배열로 전달되어야 합니다." },
        { status: 400 }
      );
    }

    // 트랜잭션을 통해 원자적으로 모든 카테고리 순서 일괄 갱신
    const updateOperations = body.map((item: { id: number; sortOrder: number }) =>
      prisma.category.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );

    await prisma.$transaction(updateOperations);

    return NextResponse.json({ message: "카테고리 정렬 순서가 저장되었습니다." });
  } catch (error: any) {
    console.error("PUT /api/categories error:", error);
    return NextResponse.json(
      { error: "카테고리 순서를 업데이트하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
