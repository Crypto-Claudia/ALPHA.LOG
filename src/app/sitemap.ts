import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // DB의 모든 발행 글 조회
  let posts: any[] = [];
  try {
    posts = await prisma.post.findMany({
      where: { published: true, isDeleted: false },
      select: { slug: true, updatedAt: true },
    });
  } catch (error) {
    console.error("Sitemap generation database error:", error);
  }

  // 기본 페이지 경로
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
  ];

  // 각 글 상세 경로 추가
  const postUrls = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...routes, ...postUrls];
}
