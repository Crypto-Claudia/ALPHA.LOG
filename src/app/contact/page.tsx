"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Send, CheckCircle2, ArrowLeft, MessageSquareText, ShieldCheck, Clock, HelpCircle, Loader2 } from "lucide-react";
import { showToast } from "@/components/Toast";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedEmail || !trimmedTitle || !trimmedContent) {
      showToast("이메일, 제목, 문의 내용을 모두 입력해 주세요.", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showToast("올바른 이메일 주소 형식을 입력해 주세요.", "error");
      return;
    }

    if (trimmedTitle.length < 2) {
      showToast("제목은 최소 2자 이상 입력해 주세요.", "error");
      return;
    }

    if (trimmedContent.length < 5) {
      showToast("문의 내용은 최소 5자 이상 작성해 주세요.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          title: trimmedTitle,
          content: trimmedContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "문의 접수에 실패했습니다.");

      setSubmitted(true);
      showToast(data.message, "success");
      setEmail("");
      setTitle("");
      setContent("");
    } catch (err: any) {
      showToast(err.message || "문의 전송 중 오류가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[860px] mx-auto space-y-10 py-4">
      {/* Top Back Navigation */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600 transition-colors"
        >
          <ArrowLeft size={14} /> 메인으로 돌아가기
        </Link>
      </div>

      {/* Header */}
      <section className="text-center space-y-3 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold">
          <Mail size={13} className="text-violet-600" />
          <span>Contact Us</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          문의하기
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          ALPHA.LOG에 대한 의견, 포스팅 오류 제보, 제휴 제안 등 문의사항을 남겨주시면 확인 후 입력해 주신 이메일로 정성껏 회신드리겠습니다.
        </p>
      </section>

      {/* Main Grid: Form + Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Contact Form (2 Cols) */}
        <div className="md:col-span-2">
          {submitted ? (
            <div className="glass-panel p-8 sm:p-10 rounded-3xl border-slate-200 bg-white text-center space-y-5 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                <CheckCircle2 size={30} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">문의가 정상 접수되었습니다!</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                  소중한 문의를 남겨주셔서 감사합니다. 관리자가 내용을 신속하게 확인한 후 작성해 주신 이메일로 답변드리겠습니다.
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-5 py-2.5 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition-all cursor-pointer"
                >
                  추가 문의 작성하기
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="glass-panel p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-5 shadow-sm"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  답변받으실 이메일 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="example@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400">
                  회신을 전달받으실 수 있는 유효한 이메일을 정확히 입력해 주세요.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  문의 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="문의 제목을 간략히 입력해 주세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  문의 내용 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="상세한 문의 또는 제안 내용을 자유롭게 작성해 주세요..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={5000}
                  className="w-full bg-white border border-slate-200 p-4 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all resize-none placeholder:text-slate-400 leading-relaxed"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>최소 5자 이상 작성</span>
                  <span>{content.length} / 5000자</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-md shadow-violet-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>문의 접수 중...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>문의 보내기</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right: Helpful Info Cards (1 Col) */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border-slate-200 bg-white space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-violet-600" /> 답변 안내
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              접수된 문의는 관리자가 순차적으로 확인하며, 보통 <strong>1~2 영업일 이내</strong>에 입력하신 이메일로 정성껏 회신드립니다.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border-slate-200 bg-white space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle size={14} className="text-cyan-600" /> 주요 문의 유형
            </h3>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-600 font-bold">•</span>
                <span>포스팅 내용 오류 및 데이터 오탈자 제보</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-600 font-bold">•</span>
                <span>크립토 리서치 및 온체인 분석 주제 제안</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-600 font-bold">•</span>
                <span>블로그 제휴, 협업 및 기타 피드백</span>
              </li>
            </ul>
          </div>

          <div className="glass-panel p-5 rounded-2xl border-slate-200 bg-slate-50/50 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" /> 개인정보 보호
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              입력해 주신 이메일 주소 및 문의 내용은 문의 답변 목적 외의 용도로 활용되거나 제3자에게 제공되지 않습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
