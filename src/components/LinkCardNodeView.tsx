"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Trash2, ExternalLink } from "lucide-react";

export default function LinkCardNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const { url, title, description, image, domain } = node.attrs;

  return (
    <NodeViewWrapper className="w-full flex justify-center my-6 select-none">
      <div
        className={`relative w-full max-w-xl border rounded-2xl overflow-hidden bg-white transition-all group ${
          selected
            ? "ring-4 ring-emerald-500 ring-offset-2 border-transparent shadow-md scale-[0.99]"
            : "border-slate-200 hover:border-slate-350 shadow-sm"
        }`}
      >
        {/* 선택 상태일 때만 보이는 플로팅 조작 툴바 */}
        {selected && (
          <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-sm text-white rounded-xl py-1 px-1.5 shadow-xl flex items-center gap-2 z-40 border border-slate-700 animate-in fade-in duration-100 whitespace-nowrap">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold"
            >
              <ExternalLink size={12} /> 열기
            </a>
            <div className="w-[1px] bg-slate-700 self-stretch my-1" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteNode();
              }}
              className="p-1.5 hover:bg-rose-600/20 rounded-lg text-rose-450 hover:text-rose-350 transition-all cursor-pointer"
              title="링크 카드 삭제"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}

        {/* 카드 구조 */}
        <div className="block cursor-pointer">
          {image && (
            <div className="w-full aspect-[16/9] overflow-hidden bg-slate-50 border-b border-slate-100 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={title || "링크 대표 이미지"} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4 space-y-1.5 text-left">
            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{title || url}</h4>
            <p className="text-xs text-slate-500 line-clamp-2">{description || "링크로 이동하여 확인해 보세요."}</p>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">{domain}</span>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
