"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowRight, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("비밀번호를 입력해 주세요.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "로그인 실패");
      }

      // 로그인 성공 시 홈 화면으로 이동 및 세션 강제 갱신
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "서버 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="glass-panel w-full max-w-[420px] p-8 space-y-6 border-slate-200">
        {/* Header Icon & Text */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 mb-2">
            <Lock size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight post-detail-title">
            관리자 로그인
          </h2>
          <p className="text-xs text-slate-500">
            블로그 관리 권한을 위해 비밀번호를 입력해 주세요.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 pl-1" htmlFor="password">
              비밀번호
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <KeyRound size={16} />
              </span>
              <input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm text-slate-900 placeholder-slate-400 transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-xs text-rose-500 pl-1 animate-in fade-in slide-in-from-top-1 duration-150">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-violet-900/10 active:scale-98 disabled:opacity-50"
          >
            {loading ? "인증 중..." : "확인"}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
}
