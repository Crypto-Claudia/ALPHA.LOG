"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquareText,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  Trash2,
  ExternalLink,
  Shield,
  Monitor,
} from "lucide-react";
import { showToast } from "@/components/Toast";

interface Inquiry {
  id: number;
  email: string;
  title: string;
  content: string;
  ip: string | null;
  userAgent: string | null;
  isRead: boolean;
  createdAt: string | Date;
}

interface Props {
  initialInquiries: Inquiry[];
  unreadCount: number;
}

export default function AdminInquiryList({ initialInquiries, unreadCount }: Props) {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const toggleExpand = async (inquiry: Inquiry) => {
    const nextId = expandedId === inquiry.id ? null : inquiry.id;
    setExpandedId(nextId);

    // 안 읽은 상태에서 처음 펼칠 때 자동으로 읽음 처리
    if (nextId && !inquiry.isRead) {
      await handleToggleRead(inquiry.id, true);
    }
  };

  const handleToggleRead = async (id: number, targetStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: targetStatus }),
      });
      if (!res.ok) throw new Error("읽음 상태 변경 실패");

      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: targetStatus } : item))
      );
      router.refresh();
    } catch {
      showToast("읽음 상태 변경 중 오류가 발생했습니다.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm("정말로 이 문의 내역을 삭제하시겠습니까?");
    if (!confirmDelete) return;

    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");

      setInquiries((prev) => prev.filter((item) => item.id !== id));
      if (expandedId === id) setExpandedId(null);
      showToast("문의가 삭제되었습니다.", "info");
      router.refresh();
    } catch (err: any) {
      showToast(err.message || "문의 삭제 중 오류가 발생했습니다.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
            <MessageSquareText size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              접수된 문의 내역
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500 text-white animate-pulse">
                  신규 {unreadCount}
                </span>
              )}
            </h2>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-mono">총 {inquiries.length}건</span>
      </div>

      {/* List */}
      {inquiries.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          접수된 문의 내역이 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {inquiries.map((inquiry) => {
            const isExpanded = expandedId === inquiry.id;
            return (
              <div
                key={inquiry.id}
                className={`py-3.5 transition-colors rounded-2xl px-3 -mx-3 ${
                  isExpanded ? "bg-slate-50/80" : "hover:bg-slate-50/50"
                }`}
              >
                {/* Summary Row (Clickable) */}
                <div
                  onClick={() => toggleExpand(inquiry)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status Badge */}
                    {inquiry.isRead ? (
                      <span className="shrink-0 text-emerald-600" title="확인 완료">
                        <CheckCircle size={16} />
                      </span>
                    ) : (
                      <span className="shrink-0 text-rose-500 font-bold" title="미확인 문의">
                        <Circle size={16} className="fill-rose-500" />
                      </span>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {inquiry.title}
                        </span>
                        {!inquiry.isRead && (
                          <span className="shrink-0 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                            NEW
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail size={11} /> {inquiry.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-xs text-slate-400 pl-7 sm:pl-0">
                    <span className="font-mono text-[11px]">{formatDate(inquiry.createdAt)}</span>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-700 p-1"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detail Body */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-4 pl-7 pr-2">
                    {/* Content Text */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {inquiry.content}
                    </div>

                    {/* Metadata: IP & UA */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono">
                      {inquiry.ip && (
                        <span className="flex items-center gap-1">
                          <Shield size={11} className="text-slate-400" /> IP: {inquiry.ip}
                        </span>
                      )}
                      {inquiry.userAgent && (
                        <span className="flex items-center gap-1 truncate max-w-md" title={inquiry.userAgent}>
                          <Monitor size={11} className="text-slate-400" /> {inquiry.userAgent}
                        </span>
                      )}
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <a
                        href={`mailto:${inquiry.email}?subject=RE: ${encodeURIComponent(inquiry.title)}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition-all shadow-sm"
                      >
                        <ExternalLink size={13} /> 답장 메일 작성
                      </a>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleRead(inquiry.id, !inquiry.isRead)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          {inquiry.isRead ? "안읽음으로 표시" : "읽음 처리"}
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === inquiry.id}
                          onClick={() => handleDelete(inquiry.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={13} /> 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
