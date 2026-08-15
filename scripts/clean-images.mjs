import path from "path";
import fs from "fs/promises";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

if (!connectionString.includes("allowPublicKeyRetrieval")) {
  const separator = connectionString.includes("?") ? "&" : "?";
  connectionString = `${connectionString}${separator}allowPublicKeyRetrieval=true`;
}

const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== 미참조/고아 이미지 정리 및 격리 스크립트 시작 ===");
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const archiveDir = path.join(process.cwd(), "public", "uploads_archive");

  try {
    await fs.access(uploadDir);
  } catch {
    console.log("public/uploads 디렉토리가 존재하지 않습니다.");
    return;
  }

  // 1. DB 내 모든 활성 글의 본문 및 썸네일 조회
  const posts = await prisma.post.findMany({
    where: { isDeleted: false },
    select: { content: true, thumbnail: true },
  });

  const usedImageNames = new Set();
  const uploadRegex = /\/uploads\/([a-zA-Z0-9_\-\.]+\.(?:png|jpg|jpeg|gif|webp|bmp|svg))/gi;

  for (const post of posts) {
    if (post.thumbnail) {
      const match = post.thumbnail.match(/\/uploads\/([^\/\?#]+)/i);
      if (match && match[1]) {
        usedImageNames.add(match[1].trim());
      }
    }

    if (post.content) {
      let match;
      while ((match = uploadRegex.exec(post.content)) !== null) {
        if (match[1]) {
          usedImageNames.add(match[1].trim());
        }
      }
    }
  }

  // 2. 실제 파일 목록 스캔
  const dirEntries = await fs.readdir(uploadDir, { withFileTypes: true });
  const allFiles = dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  // 3. 미참조 파일 식별
  const orphanFiles = allFiles.filter((fileName) => !usedImageNames.has(fileName));

  console.log(`- 전체 스캔된 이미지 수: ${allFiles.length}개`);
  console.log(`- 포스팅에서 사용 중인 이미지 수: ${allFiles.length - orphanFiles.length}개`);
  console.log(`- 미사용(격리 대상) 이미지 수: ${orphanFiles.length}개`);

  if (orphanFiles.length > 0) {
    await fs.mkdir(archiveDir, { recursive: true });

    for (const file of orphanFiles) {
      const sourcePath = path.join(uploadDir, file);
      const targetPath = path.join(archiveDir, file);
      await fs.rename(sourcePath, targetPath);
      console.log(`  -> 격리 보관 이동: ${file}`);
    }

    console.log(`성공: 총 ${orphanFiles.length}개의 미사용 이미지를 public/uploads_archive/ 폴더로 이동했습니다.`);
  } else {
    console.log("정리할 미사용 이미지가 없습니다.");
  }
}

main()
  .catch((e) => {
    console.error("오류 발생:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
