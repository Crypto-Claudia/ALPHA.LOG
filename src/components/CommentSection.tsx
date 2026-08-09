"use client";

import { useState } from "react";
import { MessageSquare, Trash2, Reply, Send, X } from "lucide-react";

interface Comment {
  id: number;
  author: string;
  content: string;
  createdAt: Date | string;
  parentId: number | null;
  isDeleted?: boolean;
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: number;
  initialComments: (Comment & { replies?: Comment[] })[];
  isAdmin?: boolean;
}

export default function CommentSection({ postId, initialComments, isAdmin = false }: CommentSectionProps) {
  const [comments, setComments] = useState<any[]>(initialComments);
  const [author, setAuthor] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [replyAuthor, setReplyAuthor] = useState("");
  const [replyPassword, setReplyPassword] = useState("");
  const [replyContent, setReplyContent] = useState("");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author || !password || !content) return alert("모든 항목을 입력해주세요.");

    setLoading(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, password, content, postId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setComments([...comments, { ...data, replies: [] }]);
      setAuthor("");
      setPassword("");
      setContent("");
    } catch (err: any) {
      alert(err.message || "댓글 등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!replyAuthor || !replyPassword || !replyContent) return alert("모든 항목을 입력해주세요.");

    setLoading(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: replyAuthor,
          password: replyPassword,
          content: replyContent,
          postId,
          parentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setComments(
        comments.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), data],
            };
          }
          return c;
        })
      );

      setReplyToId(null);
      setReplyAuthor("");
      setReplyPassword("");
      setReplyContent("");
    } catch (err: any) {
      alert(err.message || "답글 등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteId || !deletePassword) return;

    try {
      const res = await fetch(`/api/comments?id=${deleteId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setComments(
        comments.map((c) => {
          if (c.id === deleteId) {
            return { ...c, isDeleted: true };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r: any) =>
                r.id === deleteId ? { ...r, isDeleted: true } : r
              ),
            };
          }
          return c;
        })
      );

      setDeleteId(null);
      setDeletePassword("");
      alert("댓글이 삭제되었습니다.");
    } catch (err: any) {
      alert(err.message || "삭제 중 오류가 발생했습니다.");
    }
  };

  const handleAdminDelete = async (id: number) => {
    if (!window.confirm("관리자 권한으로 이 댓글을 영구적으로 삭제하시겠습니까?")) {
      return;
    }
    try {
      const res = await fetch(`/api/comments?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "admin_bypass" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setComments(
        comments.map((c) => {
          if (c.id === id) {
            return { ...c, isDeleted: true };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r: any) =>
                r.id === id ? { ...r, isDeleted: true } : r
              ),
            };
          }
          return c;
        })
      );
      alert("댓글이 삭제되었습니다.");
    } catch (err: any) {
      alert(err.message || "삭제 중 오류가 발생했습니다.");
    }
  };

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 활성 댓글 수 계산 (삭제된 댓글 및 삭제된 대댓글 제외)
  const totalActiveComments = comments.reduce((acc, c) => {
    let count = 0;
    const activeRepliesCount = c.replies?.filter((r: any) => !r.isDeleted).length || 0;
    if (!c.isDeleted) {
      count += 1;
    }
    return acc + count + activeRepliesCount;
  }, 0);

  return (
    <div className="mt-4 space-y-6">
      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-4">
        <MessageSquare size={20} className="text-violet-600" /> 댓글 ({totalActiveComments})
      </h3>

      {/* 댓글 목록 */}
      <div className="space-y-6">
        {comments.map((comment) => {
          const activeReplies = comment.replies?.filter((r: any) => !r.isDeleted) || [];
          const hasActiveReplies = activeReplies.length > 0;

          // 부모 댓글이 삭제되었는데 보여줄 활성 대댓글도 없는 경우 -> 화면에 그리지 않음
          if (comment.isDeleted && !hasActiveReplies) {
            return null;
          }

          return (
            <div key={comment.id} className="space-y-4">
              {/* 부모 댓글 */}
              {comment.isDeleted ? (
                <div className="glass-panel -mx-4 sm:mx-0 p-4 rounded-none sm:rounded-2xl border-x-0 sm:border-x border-slate-200 bg-slate-50/40 relative text-slate-400 text-xs italic">
                  삭제된 댓글입니다.
                </div>
              ) : (
                <div className="glass-panel -mx-4 sm:mx-0 p-5 rounded-none sm:rounded-2xl border-x-0 sm:border-x border-slate-200 relative group bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{comment.author}</span>
                      <span className="text-[11px] text-slate-400 ml-3">{formatDate(comment.createdAt)}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setReplyToId(comment.id)} className="text-slate-500 hover:text-cyan-600 text-xs flex items-center gap-1 cursor-pointer">
                        <Reply size={12} /> 답글
                      </button>
                      <button onClick={() => isAdmin ? handleAdminDelete(comment.id) : setDeleteId(comment.id)} className="text-slate-500 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer">
                        <Trash2 size={12} /> 삭제
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>

                  {/* 대댓글 입력 폼 활성화 */}
                  {replyToId === comment.id && (
                    <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="mt-4 p-4 rounded-xl bg-violet-500/5 border border-violet-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-violet-600 font-semibold flex items-center gap-1">
                          <Reply size={12} className="rotate-180" /> {comment.author} 님에게 답글 작성
                        </span>
                        <button type="button" onClick={() => setReplyToId(null)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="닉네임" value={replyAuthor} onChange={(e) => setReplyAuthor(e.target.value)} className="w-full bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-violet-500" />
                        <input type="password" placeholder="비밀번호" value={replyPassword} onChange={(e) => setReplyPassword(e.target.value)} className="w-full bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-violet-500" autoComplete="new-password" />
                      </div>
                      <div className="relative">
                        <textarea placeholder="답글 내용을 입력해 주세요..." value={replyContent} onChange={(e) => setReplyContent(e.target.value)} rows={2} className="w-full bg-white border border-gray-200 p-3 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-violet-500 resize-none pr-10" />
                        <button type="submit" disabled={loading} className="absolute right-2.5 bottom-2.5 text-violet-600 hover:text-violet-700 disabled:opacity-50 cursor-pointer">
                          <Send size={16} />
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* 대댓글 리스트 */}
              {hasActiveReplies && (
                <div className="pl-8 space-y-3 border-l-2 border-violet-100 ml-4">
                  {activeReplies.map((reply: any) => (
                    <div key={reply.id} className="glass-panel -mr-4 sm:mr-0 pl-4 pr-5 py-4 rounded-l-2xl rounded-r-none sm:rounded-r-2xl border-r-0 sm:border-r border-slate-200 bg-slate-50/50 relative group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-semibold text-slate-700 text-xs">{reply.author}</span>
                          <span className="text-[10px] text-slate-400 ml-3">{formatDate(reply.createdAt)}</span>
                        </div>
                        <button onClick={() => isAdmin ? handleAdminDelete(reply.id) : setDeleteId(reply.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer">
                          <Trash2 size={12} /> 삭제
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 신규 댓글 등록 폼 */}
      <form onSubmit={handleSubmit} className="glass-panel -mx-4 sm:mx-0 p-6 rounded-none sm:rounded-3xl border-x-0 sm:border-x border-slate-200 bg-white space-y-4">
        <h4 className="text-sm font-semibold text-slate-800">새 댓글 쓰기</h4>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="닉네임" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-violet-500" />
          <input type="password" placeholder="삭제 비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-violet-500" autoComplete="new-password" />
        </div>
        <div className="relative">
          <textarea placeholder="댓글 내용을 남겨주세요..." value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="w-full bg-white border border-gray-200 p-4 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-violet-500 resize-none pr-12" />
          <button type="submit" disabled={loading} className="absolute right-3.5 bottom-3.5 bg-violet-600 hover:bg-violet-750 text-white p-2 rounded-xl disabled:opacity-50 transition-colors shadow-md cursor-pointer">
            <Send size={16} />
          </button>
        </div>
      </form>

      {/* 삭제 확인 모달 */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-xl">
            <h4 className="text-md font-bold text-slate-800">댓글 삭제 비밀번호 확인</h4>
            <p className="text-xs text-slate-500">이 댓글을 삭제하려면 작성 시 입력한 비밀번호를 입력해 주세요.</p>
            <form onSubmit={handleDelete} className="space-y-4">
              <input type="password" placeholder="비밀번호" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-rose-500" autoFocus autoComplete="new-password" />
              <div className="flex gap-3 justify-end text-xs">
                <button type="button" onClick={() => { setDeleteId(null); setDeletePassword(""); }} className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer">
                  취소
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors cursor-pointer">
                  삭제하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
