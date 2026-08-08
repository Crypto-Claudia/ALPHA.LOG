import { NextResponse } from "next/server";
import path from "path";
import { promises as fsPromises } from "fs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "업로드할 파일이 전송되지 않았습니다." },
        { status: 400 }
      );
    }

    // 1. 파일 형식 검증 (이미지만 허용)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일(.png, .jpg, .gif 등)만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    // 2. 용량 검증 (최대 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "파일 크기는 최대 10MB를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    // 3. 파일 바이너리 버퍼 생성
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. 유니크한 파일명 조합 (타임스탬프 + 임의의 수 + 원본 확장자)
    const originalExtension = path.extname(file.name) || ".png";
    const uniqueFileName = `${Date.now()}_${Math.floor(Math.random() * 100000)}${originalExtension}`;

    // 5. 저장 절대 경로 지정 (Cwd/public/uploads)
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    // public/uploads 폴더가 없으면 자동 생성
    try {
      await fsPromises.mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // 디렉토리 기존 생성 무시
    }

    const filePath = path.join(uploadDir, uniqueFileName);
    
    // 로컬 파일 쓰기 실행
    await fsPromises.writeFile(filePath, buffer);

    // 6. 브라우저 정적 라우팅용 이미지 상대 경로 리턴
    const imageUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({ url: imageUrl }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: "이미지를 서버에 업로드하는 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
