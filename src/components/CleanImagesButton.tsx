"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { showToast } from "@/components/Toast";

export default function CleanImagesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    totalScanned: number;
    activeCount: number;
    archivedCount: number;
  } | null>(null);

  const handleClean = async () => {
    if (loading) return;

    const confirmRun = window.confirm(
      "포스팅 본문 및 썸네일에서 사용되지 않는 미참조 이미지를 확인하고 uploads_archive 폴더로 안전하게 이동하시겠습니까?"
    );
    if (!confirmRun) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/clean-images", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "이미지 정리 중 오류가 발생했습니다.");

      setLastResult({
        totalScanned: data.totalScanned,
        activeCount: data.activeCount,
        archivedCount: data.archivedCount,
      });

      showToast(
        data.message,
        data.archivedCount > 0 ? "success" : "info"
      );

      router.refresh();
    } catch (err: any) {
      showToast(err.message || "이미지 정리 작업 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClean}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title="포스트에서 쓰이지 않는 고아 이미지를 uploads_archive 폴더로 이동"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin text-cyan-400" />
            <span>이미지 스캔 & 격리 중...</span>
          </>
        ) : (
          <>
            <Archive size={14} className="text-cyan-400" />
            <span>미사용 이미지 정리 (아카이브)</span>
          </>
        )}
      </button>

      {lastResult && !loading && (
        <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span>
            총 {lastResult.totalScanned}개 중 {lastResult.archivedCount}개 격리 완료
          </span>
        </span>
      )}
    </div>
  );
}
