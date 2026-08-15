import path from "path";
import { promises as fs } from "fs";
import prisma from "./prisma";

export interface CleanImagesResult {
  totalScanned: number;
  activeCount: number;
  archivedCount: number;
  archivedFiles: string[];
}

/**
 * DB 포스트 전체의 본문 및 썸네일을 전수 조사하여,
 * 어디에서도 참조되지 않는 uploads 폴더 내 미사용 이미지를 uploads_archive 폴더로 안전하게 격리 이동합니다.
 */
export async function cleanOrphanImages(): Promise<CleanImagesResult> {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const archiveDir = path.join(process.cwd(), "public", "uploads_archive");

  // 1. uploads 디렉토리 존재 확인
  try {
    await fs.access(uploadDir);
  } catch {
    // 폴더가 없으면 0건 반환
    return {
      totalScanned: 0,
      activeCount: 0,
      archivedCount: 0,
      archivedFiles: [],
    };
  }

  // 2. DB 내 모든 활성(미삭제) 포스트의 content 및 thumbnail 조회
  const posts = await prisma.post.findMany({
    where: { isDeleted: false },
    select: {
      content: true,
      thumbnail: true,
    },
  });

  // 3. 사용 중인 이미지 파일명 Set 구성
  const usedImageNames = new Set<string>();

  // /uploads/파일명.확장자 패턴 추출 정규식
  const uploadRegex = /\/uploads\/([a-zA-Z0-9_\-\.]+\.(?:png|jpg|jpeg|gif|webp|bmp|svg))/gi;

  for (const post of posts) {
    // 썸네일 검사
    if (post.thumbnail) {
      const match = post.thumbnail.match(/\/uploads\/([^\/\?#]+)/i);
      if (match && match[1]) {
        usedImageNames.add(match[1].trim());
      }
    }

    // 본문(HTML) 내 모든 이미지 src 검사
    if (post.content) {
      let match: RegExpExecArray | null;
      while ((match = uploadRegex.exec(post.content)) !== null) {
        if (match[1]) {
          usedImageNames.add(match[1].trim());
        }
      }
    }
  }

  // 4. public/uploads 폴더 내의 실제 파일 목록 스캔
  const dirEntries = await fs.readdir(uploadDir, { withFileTypes: true });
  const allFiles = dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  // 5. 미참조(고아) 파일 목록 필터링
  const orphanFiles = allFiles.filter((fileName) => !usedImageNames.has(fileName));

  // 6. uploads_archive 폴더 생성 및 파일 이동 (안전 격리)
  if (orphanFiles.length > 0) {
    await fs.mkdir(archiveDir, { recursive: true });

    for (const file of orphanFiles) {
      const sourcePath = path.join(uploadDir, file);
      const targetPath = path.join(archiveDir, file);

      try {
        await fs.rename(sourcePath, targetPath);
      } catch (err) {
        console.error(`Failed to move orphan image ${file}:`, err);
      }
    }
  }

  return {
    totalScanned: allFiles.length,
    activeCount: allFiles.length - orphanFiles.length,
    archivedCount: orphanFiles.length,
    archivedFiles: orphanFiles,
  };
}
