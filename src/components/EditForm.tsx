"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Editor from "@/components/Editor";
import { FolderPlus, Tag, Link2, Plus, ArrowLeft, ArrowUpDown } from "lucide-react";
import Link from "next/link";

interface Category {
  id: number;
  name: string;
  slug: string;
  sortOrder?: number;
  children?: Category[];
}

interface PostData {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  thumbnail: string | null;
  published: boolean;
  categoryId: number | null;
  tags: { name: string }[];
}

interface EditFormProps {
  post: PostData;
  initialCategories: Category[];
}

export default function EditForm({ post, initialCategories }: EditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [summary, setSummary] = useState(post.summary || "");
  const [thumbnail, setThumbnail] = useState(post.thumbnail || "");
  const [content, setContent] = useState(post.content);
  const [published, setPublished] = useState(post.published);
  const [categoryId, setCategoryId] = useState(post.categoryId?.toString() || "");
  const [tagsInput, setTagsInput] = useState(post.tags.map((t) => t.name).join(", "));

  const [categories, setCategories] = useState<Category[]>(initialCategories);

  // 신규 카테고리 추가/정렬 관련 상태
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatParentId, setNewCatParentId] = useState("");
  const [newCatSortOrder, setNewCatSortOrder] = useState("0");
  const [sortOrders, setSortOrders] = useState<{ [id: number]: number }>({});

  const [loading, setLoading] = useState(false);

  // 카테고리 목록 리패치
  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (res.ok) setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  // 정렬 순서 가중치 상태 바인딩
  useEffect(() => {
    const initialSorts: { [id: number]: number } = {};
    categories.forEach((p) => {
      initialSorts[p.id] = p.sortOrder || 0;
      (p.children || []).forEach((c) => {
        initialSorts[c.id] = c.sortOrder || 0;
      });
    });
    setSortOrders(initialSorts);
  }, [categories]);

  // 슬러그 고유화 핸들러 (제목 변경 시 자동 추천하되, 타이핑 중 수동 수정도 지원)
  const handleTitleChange = (val: string) => {
    setTitle(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\uac00-\ud7a3-]/g, "")
      .replace(/[\s_]+/g, "-");
    setSlug(autoSlug);
  };

  // 새 카테고리 추가
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return alert("카테고리명과 슬러그를 모두 입력해주세요.");

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newCatName, 
          slug: newCatSlug, 
          parentId: newCatParentId ? parseInt(newCatParentId) : null,
          sortOrder: parseInt(newCatSortOrder) || 0
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("카테고리가 성공적으로 추가되었습니다.");
      setNewCatName("");
      setNewCatSlug("");
      setNewCatParentId("");
      setNewCatSortOrder("0");
      setShowNewCatForm(false);
      
      await fetchCategories();
      setCategoryId(data.id.toString());
    } catch (err: any) {
      alert(err.message || "카테고리 추가 중 오류가 발생했습니다.");
    }
  };

  // 카테고리 정렬 순서 저장
  const handleSaveSortOrders = async () => {
    setLoading(true);
    const payload = Object.keys(sortOrders).map((key) => ({
      id: parseInt(key),
      sortOrder: sortOrders[parseInt(key)],
    }));

    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("카테고리 정렬 순서가 저장되었습니다!");
      await fetchCategories();
      router.refresh();
    } catch (err: any) {
      alert(err.message || "순서 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 포스트 수정 완료 (PATCH 요청)
  const handleUpdate = async () => {
    if (!title || !content) return alert("제목과 본문은 필수 입력 사항입니다.");
    if (!categoryId) return alert("카테고리를 선택해 주세요.");

    setLoading(true);
    
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(post.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          summary,
          content,
          thumbnail,
          published,
          categoryId: parseInt(categoryId),
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("포스트가 성공적으로 수정되었습니다!");
      router.push(`/posts/${data.slug}`);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "게시글 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[966px] mx-auto space-y-6">
      {/* Top Action Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <Link href={`/posts/${post.slug}`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={14} /> 상세 글로 돌아가기
        </Link>
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="px-6 py-2 rounded-full bg-violet-600 hover:bg-violet-700 font-semibold text-sm text-white disabled:opacity-50 transition-all shadow-lg shadow-violet-900/10 cursor-pointer"
        >
          {loading ? "저장 중..." : "포스트 수정 완료"}
        </button>
      </div>

      {/* Main write form container */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-gray-200 space-y-6 bg-white">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">제목</label>
          <input
            type="text"
            placeholder="글 제목을 입력하세요..."
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-900 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Slug & Category Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* URL Slug */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
              <Link2 size={12} /> URL 슬러그 (기존 주소명)
            </label>
            <input
              type="text"
              placeholder="url-friendly-slug-name"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-violet-500 transition-colors font-mono"
            />
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 flex justify-between items-center">
              <span>Category 선택</span>
              <button
                type="button"
                onClick={() => setShowNewCatForm(!showNewCatForm)}
                className="text-cyan-600 hover:text-cyan-700 text-xs flex items-center gap-1 cursor-pointer font-medium"
              >
                <FolderPlus size={12} /> 신규 카테고리 관리/추가
              </button>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="" className="text-gray-400">카테고리를 선택하세요</option>
              {categories.map((parent) => [
                // 1. 대분류 옵션
                <option key={`p-${parent.id}`} value={parent.id} className="text-slate-900 font-bold">
                  {parent.name}
                </option>,
                // 2. 소분류(자식) 옵션들 매핑
                ...(parent.children || []).map((child) => (
                  <option key={`c-${child.id}`} value={child.id} className="text-slate-600">
                    &nbsp;&nbsp;└ {child.name}
                  </option>
                ))
              ])}
            </select>
          </div>
        </div>

        {/* Inline New Category Form / Reordering Tool */}
        {showNewCatForm && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-gray-200 space-y-4">
            {/* 1. 카테고리 추가 폼 */}
            <form onSubmit={handleAddCategory} className="space-y-3">
              <h4 className="text-xs font-bold text-violet-650 flex items-center gap-1">신규 카테고리 정보 입력</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="이름 (예: 경제·매크로)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                />
                <input
                  type="text"
                  placeholder="슬러그 (예: economy)"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-violet-500 font-mono"
                />
                <select
                  value={newCatParentId}
                  onChange={(e) => setNewCatParentId(e.target.value)}
                  className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-violet-500"
                >
                  <option value="">없음 (대분류로 생성)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      상위: {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="정렬 가중치 (기본: 0)"
                  value={newCatSortOrder}
                  onChange={(e) => setNewCatSortOrder(e.target.value)}
                  className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex gap-2 justify-end text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCatForm(false);
                    setNewCatName("");
                    setNewCatSlug("");
                    setNewCatParentId("");
                    setNewCatSortOrder("0");
                  }}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> 추가하기
                </button>
              </div>
            </form>

            {/* 2. 카테고리 순서 벌크 변경 테이블 */}
            {categories.length > 0 && (
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <ArrowUpDown size={14} className="text-cyan-600" /> 카테고리 노출 순서 설정
                </h4>
                <p className="text-[10px] text-slate-500">가중치 숫자가 작을수록(오름차순) 카테고리 목록 상단에 먼저 노출됩니다.</p>
                
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl bg-white divide-y divide-gray-100">
                  {categories.map((parent) => [
                    // 대분류 정렬
                    <div key={`sort-p-${parent.id}`} className="flex items-center justify-between p-2.5 text-xs bg-slate-50/50">
                      <span className="font-bold text-slate-800">{parent.name}</span>
                      <input
                        type="number"
                        value={sortOrders[parent.id] ?? 0}
                        onChange={(e) => setSortOrders({ ...sortOrders, [parent.id]: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-center text-xs text-slate-800 focus:outline-none focus:border-violet-500 bg-white"
                      />
                    </div>,
                    // 소분류 정렬
                    ...(parent.children || []).map((child) => (
                      <div key={`sort-c-${child.id}`} className="flex items-center justify-between p-2 pl-6 text-xs bg-white">
                        <span className="text-slate-600">└ {child.name}</span>
                        <input
                          type="number"
                          value={sortOrders[child.id] ?? 0}
                          onChange={(e) => setSortOrders({ ...sortOrders, [child.id]: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-center text-xs text-slate-600 focus:outline-none focus:border-violet-500 bg-white"
                        />
                      </div>
                    ))
                  ])}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSortOrders}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs cursor-pointer shadow-md disabled:opacity-50"
                  >
                    정렬 순서 저장
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary & Thumbnail */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">글 요약 (글 목록 소개글)</label>
            <textarea
              placeholder="글의 짤막한 요약 내용을 작성하세요... (최대 500자)"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 text-xs text-slate-800 focus:outline-none focus:border-violet-500 resize-none transition-colors"
            />
          </div>

          {/* Thumbnail URL & Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 flex justify-between items-center">
              <span>대표 썸네일 이미지 URL</span>
              <span className="text-[10px] text-slate-400 font-normal">웹 링크 또는 로컬 파일 업로드</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://example.com/image.jpg 또는 /uploads/파일명"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                className="flex-grow bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <label className="px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition-colors flex items-center justify-center whitespace-nowrap">
                파일 찾기
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const res = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      setThumbnail(data.url);
                    } catch (err: any) {
                      alert(err.message || "업로드 실패");
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
            {thumbnail && (
              <div className="mt-2 flex items-center gap-3">
                <div className="w-32 aspect-[1200/630] border border-gray-200 rounded-lg overflow-hidden relative bg-gray-50">
                  <img src={thumbnail} alt="Thumbnail preview" className="object-cover w-full h-full" />
                </div>
                <button
                  type="button"
                  onClick={() => setThumbnail("")}
                  className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer font-semibold"
                >
                  지우기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
            <Tag size={12} /> 태그 (쉼표로 구분)
          </label>
          <input
            type="text"
            placeholder="Nextjs, Prisma, MySQL, 일상 (쉼표로 구분)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* WYSIWYG Editor */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">본문 내용</label>
          <Editor content={content} onChange={(html) => setContent(html)} />
        </div>

        {/* Published Toggle */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="published-toggle"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="w-4 h-4 text-violet-600 bg-white border-gray-300 rounded focus:ring-violet-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor="published-toggle" className="text-xs font-semibold text-slate-600 select-none cursor-pointer">
            글 저장 시 즉시 공개(발행) 상태로 설정
          </label>
        </div>
      </div>
    </div>
  );
}
