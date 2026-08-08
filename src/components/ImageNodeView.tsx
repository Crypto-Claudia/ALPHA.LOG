"use client";

import { useState, useEffect, useRef } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";

export default function ImageNodeView({ node, updateAttributes, deleteNode, selected, editor, getPos }: NodeViewProps) {
  const align = node.attrs.align || "center";
  
  // 캡션 입력을 위한 격리 로컬 상태 관리 (한글 IME 조합 깨짐 방지)
  const [localCaption, setLocalCaption] = useState(node.attrs.caption || "");

  // 이미지 폭 상태 관리
  const [localWidth, setLocalWidth] = useState(node.attrs.width || "100%");
  const [isResizing, setIsResizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 외부(언두/리두 등) 속성 변화 시 로컬 캡션 및 폭 상태 동기화
  useEffect(() => {
    setLocalCaption(node.attrs.caption || "");
  }, [node.attrs.caption]);

  useEffect(() => {
    setLocalWidth(node.attrs.width || "100%");
  }, [node.attrs.width]);

  // 최종 포커스 아웃 혹은 저장 시점에만 Tiptap 속성으로 동기화
  const handleSaveCaption = () => {
    updateAttributes({ caption: localCaption });
  };

  const handleSetAlign = (newAlign: "left" | "center" | "right") => {
    updateAttributes({ align: newAlign });
  };

  // 이미지 클릭 시 ProseMirror NodeSelection 강제 바인딩 (간헐적 포커스 씹힘 버그 완치)
  const handleNodeClick = (e: React.MouseEvent) => {
    // 캡션 타이핑 입력 창을 클릭한 거라면 타이핑 커서가 먹도록 리턴 예외 처리
    if (e.target instanceof HTMLInputElement) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // 이 노드의 정확한 에디터 내 좌표 문서 위치(getPos())를 구해서 강제 선택
    const position = getPos();
    if (typeof position === "number" && editor) {
      const { view } = editor;
      const transaction = view.state.tr.setSelection(
        NodeSelection.create(view.state.doc, position)
      );
      view.dispatch(transaction);
    }
  };

  // 마우스 및 터치 드래그 리사이징 이벤트 핸들러
  const handleStartResize = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    direction: "left" | "right"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const startWidthPercent = parseFloat(localWidth) || 100;
    const containerWidth = containerRef.current?.clientWidth || 500;
    const imgStartWidth = imgRef.current?.clientWidth || (containerWidth * (startWidthPercent / 100));
    
    let currentWidthPercent = `${startWidthPercent}%`;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = "touches" in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const deltaX = direction === "right" ? currentX - clientX : clientX - currentX;
      
      // 가운데 정렬의 경우 양방향 대칭 크기 조절을 위해 deltaX를 2배로 연산
      const multiplier = align === "center" ? 2 : 1;
      const newWidthPx = imgStartWidth + (deltaX * multiplier);
      const newWidthPercent = Math.min(Math.max(Math.round((newWidthPx / containerWidth) * 100), 15), 100);

      currentWidthPercent = `${newWidthPercent}%`;
      setLocalWidth(currentWidthPercent);
    };

    const onEnd = () => {
      setIsResizing(false);
      updateAttributes({ width: currentWidthPercent });
      
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  };

  // 이미지 수평 정렬값에 따라 부모 플렉스 상자의 수평 분배축 결정
  const wrapperAlign = 
    align === "left" ? "items-start" : 
    align === "right" ? "items-end" : "items-center";

  // 이미지 캡션 텍스트 정렬
  const textAlign = 
    align === "left" ? "text-left" : 
    align === "right" ? "text-right" : "text-center";

  return (
    <NodeViewWrapper 
      ref={containerRef}
      className={`w-full flex flex-col ${wrapperAlign} my-6 select-none`}
    >
      {/* 이미지 및 툴바 컨테이너 */}
      <div 
        onClick={handleNodeClick}
        className="relative max-w-full flex flex-col items-center group cursor-pointer"
        style={{ width: localWidth }}
      >
        {/* 이미지 노드 */}
        <div className={`w-full relative rounded-2xl overflow-hidden transition-all duration-200 ${
          selected 
            ? "ring-4 ring-emerald-500 ring-offset-2 shadow-md scale-[0.99]" 
            : "hover:ring-2 hover:ring-slate-350"
        }`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            ref={imgRef}
            src={node.attrs.src} 
            alt={node.attrs.alt || "본문 이미지"} 
            className="w-full height-auto pointer-events-none display-block"
          />

          {/* 리사이즈 실시간 오버레이 수치 표시 */}
          {isResizing && (
            <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-50 pointer-events-none">
              {localWidth}
            </div>
          )}
        </div>

        {/* 1. 플로팅 정렬/크기/삭제 툴바 (선택 상태일 때만 절대좌표 부유) */}
        {selected && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-sm text-white rounded-xl py-1 px-1.5 shadow-xl flex items-center gap-1 z-40 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150 whitespace-nowrap">
            {/* 정렬 버튼들 */}
            <button
              type="button"
              onClick={() => handleSetAlign("left")}
              className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${align === "left" ? "bg-emerald-600 text-white" : "text-slate-350"}`}
              title="왼쪽 정렬"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign("center")}
              className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${align === "center" ? "bg-emerald-600 text-white" : "text-slate-350"}`}
              title="가운데 정렬"
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign("right")}
              className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${align === "right" ? "bg-emerald-600 text-white" : "text-slate-350"}`}
              title="오른쪽 정렬"
            >
              <AlignRight size={14} />
            </button>
            
            <div className="w-[1px] bg-slate-700 self-stretch my-1 mx-0.5" />
            
            {/* 크기 프리셋 버튼들 (모바일 친화용) */}
            <button
              type="button"
              onClick={() => {
                setLocalWidth("25%");
                updateAttributes({ width: "25%" });
              }}
              className={`px-1.5 py-1 text-[10px] font-bold rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${localWidth === "25%" ? "bg-emerald-600 text-white" : "text-slate-350"}`}
              title="너비 25%"
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalWidth("50%");
                updateAttributes({ width: "50%" });
              }}
              className={`px-1.5 py-1 text-[10px] font-bold rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${localWidth === "50%" ? "bg-emerald-600 text-white" : "text-slate-350"}`}
              title="너비 50%"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalWidth("75%");
                updateAttributes({ width: "75%" });
              }}
              className={`px-1.5 py-1 text-[10px] font-bold rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${localWidth === "75%" ? "bg-emerald-600 text-white" : "text-slate-350"}`}
              title="너비 75%"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalWidth("100%");
                updateAttributes({ width: "100%" });
              }}
              className={`px-1.5 py-1 text-[10px] font-bold rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${localWidth === "100%" ? "bg-emerald-600 text-white" : "text-slate-350"}`}
              title="너비 100%"
            >
              100%
            </button>
            
            <div className="w-[1px] bg-slate-700 self-stretch my-1 mx-0.5" />
            
            {/* 삭제 버튼 */}
            <button
              type="button"
              onClick={deleteNode}
              className="p-1.5 rounded-lg text-rose-450 hover:bg-rose-600/20 hover:text-rose-350 transition-colors cursor-pointer"
              title="이미지 삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* 2. 드래그 리사이즈 핸들 (선택 상태이고 크기 조절 중이 아닐 때 혹은 조절 중일 때도 모두 표시) */}
        {selected && (
          <>
            {/* 왼쪽 핸들 */}
            <div
              onMouseDown={(e) => handleStartResize(e, "left")}
              onTouchStart={(e) => handleStartResize(e, "left")}
              className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-4 h-8 bg-emerald-500 hover:bg-emerald-600 border border-white rounded-full cursor-col-resize z-50 flex items-center justify-center shadow-md active:scale-110 active:bg-emerald-700 transition-all"
              title="드래그하여 크기 조절"
            >
              <div className="w-[2px] h-4 bg-white/70 rounded-full" />
            </div>

            {/* 오른쪽 핸들 */}
            <div
              onMouseDown={(e) => handleStartResize(e, "right")}
              onTouchStart={(e) => handleStartResize(e, "right")}
              className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-4 h-8 bg-emerald-500 hover:bg-emerald-600 border border-white rounded-full cursor-col-resize z-50 flex items-center justify-center shadow-md active:scale-110 active:bg-emerald-700 transition-all"
              title="드래그하여 크기 조절"
            >
              <div className="w-[2px] h-4 bg-white/70 rounded-full" />
            </div>
          </>
        )}
      </div>

      {/* 3. 네이버형 이미지 캡션(사진 설명) 입력 필드 */}
      <div className="w-full max-w-xl px-4 mt-2 transition-opacity duration-200">
        <input
          type="text"
          placeholder={selected ? "사진 설명을 입력하세요." : ""}
          value={localCaption}
          onChange={(e) => setLocalCaption(e.target.value)}
          onBlur={handleSaveCaption}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur(); // 엔터 시 자동으로 포커스 아웃
            }
          }}
          className={`w-full bg-transparent border-none focus:outline-none focus:ring-0 text-xs text-slate-400 placeholder-slate-300 focus:text-slate-800 ${textAlign} transition-all duration-150 ${
            selected 
              ? "border-b border-dashed border-slate-300 pb-1" 
              : localCaption === "" 
                ? "h-0 opacity-0 overflow-hidden pointer-events-none mt-0" 
                : "border-b border-transparent pb-1"
          }`}
        />
      </div>
    </NodeViewWrapper>
  );
}
