"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, ChevronDown } from "lucide-react";
import { showToast } from "@/components/Toast";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [searchType, setSearchType] = useState<"all" | "title" | "tag">(
    (searchParams.get("type") as "all" | "title" | "tag") || "all"
  );

  // URL searchParams 변경 시 상태 동기화
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setSearchType((searchParams.get("type") as "all" | "title" | "tag") || "all");
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    if (trimmed.length < 2) {
      showToast("검색어는 최소 2자 이상 입력해 주세요.", "error");
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("q", trimmed);
    params.set("type", searchType);
    params.delete("page"); // 새로운 검색 시 1페이지로 이동

    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const handleClear = () => {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("type");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  return (
    <form
      onSubmit={handleSearch}
      className="glass-panel p-1.5 sm:p-2 rounded-2xl sm:rounded-full bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-2 transition-all focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/10"
    >
      {/* 검색 모드 드롭다운 */}
      <div className="relative w-full sm:w-auto shrink-0">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value as "all" | "title" | "tag")}
          className="w-full sm:w-auto appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs py-2 pl-3.5 pr-8 rounded-xl sm:rounded-full focus:outline-none transition-colors cursor-pointer"
        >
          <option value="all">제목 + 내용</option>
          <option value="title">제목만</option>
          <option value="tag">태그</option>
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>

      {/* 검색어 입력창 */}
      <div className="relative flex-grow flex items-center w-full">
        <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색어를 입력해 주세요..."
          className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent pl-9 pr-8 py-2 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            title="검색어 지우기"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 검색 실행 버튼 */}
      <button
        type="submit"
        className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl sm:rounded-full transition-all shadow-md shadow-violet-900/10 cursor-pointer"
      >
        <Search size={14} />
        <span>검색</span>
      </button>
    </form>
  );
}
