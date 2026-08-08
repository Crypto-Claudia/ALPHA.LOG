import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import EditForm from "@/components/EditForm";

interface Params {
  params: Promise<{
    slug: string;
  }>;
}

export default async function EditPage(props: Params) {
  const { slug } = await props.params;
  const decodedSlug = decodeURIComponent(slug);

  // 1. 기존 포스트 상세 조회 (태그 및 카테고리 포함)
  const post = await prisma.post.findUnique({
    where: { slug: decodedSlug },
    include: {
      tags: {
        select: { name: true },
      },
      category: true,
    },
  });

  if (!post) {
    notFound();
  }

  // 2. 전체 카테고리 목록 조회 (정렬 순서 적용)
  const categories = await prisma.category.findMany({
    where: {
      parentId: null, // 대분류만 우선적으로 가져옴
    },
    include: {
      children: {
        orderBy: [
          { sortOrder: "asc" },
          { name: "asc" },
        ],
      },
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });

  return (
    <div className="py-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6 max-w-4xl mx-auto">
        게시글 수정하기
      </h2>
      <EditForm post={post} initialCategories={categories} />
    </div>
  );
}
