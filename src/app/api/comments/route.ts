import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifySessionCookie } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

// POST /api/comments - 댓글(또는 대댓글) 작성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { author, password, content, postId, parentId } = body;

    if (!author || !password || !content || !postId) {
      return NextResponse.json(
        { error: "작성자, 비밀번호, 내용, 게시글 ID는 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    const commentData: any = {
      author,
      password: hashedPassword,
      content,
      post: {
        connect: { id: parseInt(postId) },
      },
    };

    if (parentId) {
      commentData.parent = {
        connect: { id: parseInt(parentId) },
      };
    }

    const comment = await prisma.comment.create({
      data: commentData,
    });

    // 댓글 생성 활동 로그 적재
    await logActivity("CREATE_COMMENT", comment.id.toString(), comment.author);

    // 비밀번호 필드는 제거하고 응답
    const { password: _, ...commentWithoutPassword } = comment;

    return NextResponse.json(commentWithoutPassword, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/comments error:", error);
    return NextResponse.json(
      { error: "댓글을 등록하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/comments - 댓글 삭제 (비밀번호 검증 필요. 단, 관리자는 무조건 패스)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = parseInt(searchParams.get("id") || "");

    if (!commentId) {
      return NextResponse.json(
        { error: "댓글 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const isAdmin = await verifySessionCookie();
    let password = "";

    if (!isAdmin) {
      const body = await request.json();
      password = body.password;
      if (!password) {
        return NextResponse.json(
          { error: "댓글 비밀번호가 필요합니다." },
          { status: 400 }
        );
      }
    }

    // 댓글 조회
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "해당 댓글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 관리자가 아니라면 비밀번호 대조
    if (!isAdmin) {
      const isPasswordCorrect = await bcrypt.compare(password, comment.password);
      if (!isPasswordCorrect) {
        return NextResponse.json(
          { error: "비밀번호가 일치하지 않습니다." },
          { status: 403 }
        );
      }
    }

    // 댓글 소프트 딜리트 처리 (데이터베이스에서 지우지 않고 isDeleted만 true로 마스킹)
    await prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    // 댓글 삭제 활동 로그 적재
    await logActivity("DELETE_COMMENT", commentId.toString(), comment.author);

    return NextResponse.json({ message: "댓글이 정상적으로 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE /api/comments error:", error);
    return NextResponse.json(
      { error: "댓글을 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
