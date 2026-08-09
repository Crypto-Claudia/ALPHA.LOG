"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";

export default function ImageLightbox() {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  useEffect(() => {
    // tiptap-content 영역의 이미지 클릭 이벤트 위임
    const container = document.querySelector(".tiptap-content");
    if (!container) return;

    const handleImageClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const imgElements = Array.from(container.querySelectorAll("img"));
        const imgSrcs = imgElements.map((img) => img.src);
        const index = imgElements.indexOf(target as HTMLImageElement);
        
        if (index !== -1) {
          setImages(imgSrcs);
          setCurrentIndex(index);
        }
      }
    };

    container.addEventListener("click", handleImageClick);
    return () => {
      container.removeEventListener("click", handleImageClick);
    };
  }, []);

  // 키보드 네비게이션 및 스크롤 고정
  useEffect(() => {
    if (currentIndex === -1) return;

    // 모달 활성화 시 스크롤 고정
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCurrentIndex(-1);
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex, images]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  if (currentIndex === -1 || images.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4 select-none"
      onClick={() => setCurrentIndex(-1)}
    >
      {/* 상단 컨트롤 바 */}
      <div className="w-full max-w-7xl flex justify-between items-center text-white py-2 z-10" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-semibold tracking-wider bg-white/10 px-3 py-1 rounded-full">
          {currentIndex + 1} / {images.length}
        </span>
        <div className="flex gap-3 items-center">
          <a
            href={images[currentIndex]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all cursor-pointer font-medium"
          >
            <ExternalLink size={14} /> 원본 보기
          </a>
          <button
            onClick={() => setCurrentIndex(-1)}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 중앙 메인 뷰 */}
      <div className="relative flex-grow w-full max-w-5xl flex items-center justify-center my-4" onClick={(e) => e.stopPropagation()}>
        {/* 이전 버튼 */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 md:-left-16 z-20 p-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all cursor-pointer shadow-lg"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <img
          src={images[currentIndex]}
          alt={`원본 이미지 ${currentIndex + 1}`}
          className="max-w-full max-h-[75vh] md:max-h-[82vh] object-contain rounded-lg shadow-2xl transition-all duration-300 pointer-events-auto"
        />

        {/* 다음 버튼 */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 md:-right-16 z-20 p-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all cursor-pointer shadow-lg"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* 하단 여백 보정 */}
      <div className="h-10" />
    </div>
  );
}
