"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Trash2, Edit } from "lucide-react";
import { showToast } from "@/components/Toast";

interface PostAdminActionsProps {
  slug: string;
  published: boolean;
}

export default function PostAdminActions({ slug, published }: PostAdminActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 1. 공개/비공개 토글 처리
  const handleToggleVisibility = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ published: !published }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`포스트가 성공적으로 ${!published ? "공개" : "비공개"} 상태로 전환되었습니다.`, "success");
      router.refresh();
    } catch (err: any) {
      showToast(err.message || "상태 변경 중 오류가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. 포스트 삭제 처리
  const handleDeletePost = async () => {
    if (!window.confirm("정말 이 포스트를 영구적으로 삭제하시겠습니까?\n삭제된 포스트와 댓글은 복구할 수 없습니다.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("포스트가 성공적으로 삭제되었습니다.", "success");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      showToast(err.message || "포스트 삭제 중 오류가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 수정 화면 이동 링크 */}
      <Link
        href={`/admin/edit/${encodeURIComponent(slug)}`}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white transition-colors cursor-pointer flex items-center gap-1"
        title="포스트 수정"
      >
        <Edit size={14} className="text-violet-600" />
        <span>수정</span>
      </Link>

      {/* 공개/비공개 토글 버튼 */}
      <button
        onClick={handleToggleVisibility}
        disabled={loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
        title={published ? "비공개로 전환" : "공개로 전환"}
      >
        {published ? (
          <>
            <EyeOff size={14} className="text-amber-500" />
            <span>비공개 전환</span>
          </>
        ) : (
          <>
            <Eye size={14} className="text-emerald-500" />
            <span>공개 전환</span>
          </>
        )}
      </button>

      {/* 포스트 삭제 버튼 */}
      <button
        onClick={handleDeletePost}
        disabled={loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
        title="포스트 영구 삭제"
      >
        <Trash2 size={14} />
        <span>삭제</span>
      </button>
    </div>
  );
}
