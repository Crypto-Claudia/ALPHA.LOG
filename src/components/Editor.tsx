"use client";

import { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CustomImage from "./CustomImage";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { Extension } from "@tiptap/core";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough as StrikeIcon,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Image as ImageIcon,
  Table as TableIcon, Undo, Redo, X, Check, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Minus
} from "lucide-react";

// Tiptap font-size 인라인 스타일 가공을 위한 커스텀 확장 선언
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize?.replace(/['"]+/g, ""),
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

// Tiptap line-height 인라인 스타일 가공을 위한 커스텀 확장 선언
const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.lineHeight,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },
});

// TableCell 에 backgroundColor 인라인 스타일 속성을 반영하는 커스텀 확장
const CustomTableCell = TableCell.extend({
  name: "tableCell",
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
});

// TableHeader 에 backgroundColor 인라인 스타일 속성을 반영하는 커스텀 확장
const CustomTableHeader = TableHeader.extend({
  name: "tableHeader",
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
});

// 네이버 스마트에디터 스타일 격자 색상 팔레트 정의 (6행 x 11열 격자)
const COLOR_PALETTE = [
  ["#ffffff", "#e2e8f0", "#ffcdd2", "#ffe0b2", "#fff9c4", "#d1c4e9", "#c8e6c9", "#b2dfdb", "#b3e5fc", "#e1bee7", "#f8bbd0"],
  ["#f1f5f9", "#cbd5e1", "#ef9a9a", "#ffcc80", "#fff59d", "#b39ddb", "#a5d6a7", "#80cbc4", "#81d4fa", "#ce93d8", "#f48fb1"],
  ["#e2e8f0", "#94a3b8", "#e57373", "#ffb74d", "#fff176", "#9575cd", "#81c784", "#4db6ac", "#64b5f6", "#ba68c8", "#f06292"],
  ["#cbd5e1", "#64748b", "#ef5350", "#ffa726", "#ffee58", "#7e57c2", "#66bb6a", "#26a69a", "#29b6f6", "#ab47bc", "#ec407a"],
  ["#94a3b8", "#334155", "#e53935", "#fb8c00", "#fdd835", "#5e35b1", "#43a047", "#00897b", "#039be5", "#8e24aa", "#d81b60"],
  ["#475569", "#0f172a", "#c62828", "#ef6c00", "#fbc02d", "#4527a0", "#2e7d32", "#00695c", "#0277bd", "#6a1b9a", "#ad1457"]
];

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function Editor({ content, onChange }: EditorProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageActiveTab, setImageActiveTab] = useState<"upload" | "link">("upload");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);

  // 팝업 열림/닫힘 상태
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showCellColorPicker, setShowCellColorPicker] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [selectionTick, setSelectionTick] = useState(0);

  // 직접 선택용 입력값 상태
  const [customTextColor, setCustomTextColor] = useState("#000000");
  const [customBgColor, setCustomBgColor] = useState("#ffffff");
  const [customCellColor, setCustomCellColor] = useState("#ffffff");
  const [linkUrlInput, setLinkUrlInput] = useState("");

  // 최근 색상 리스트 상태
  const [recentTextColors, setRecentTextColors] = useState<string[]>([]);
  const [recentBgColors, setRecentBgColors] = useState<string[]>([]);
  const [recentCellColors, setRecentCellColors] = useState<string[]>([]);

  // DOM Refs (외부 클릭 시 팝업 닫기 및 네이티브 피커 제어)
  const textColorPickerRef = useRef<HTMLDivElement>(null);
  const bgColorPickerRef = useRef<HTMLDivElement>(null);
  const cellColorPickerRef = useRef<HTMLDivElement>(null);
  const linkPopoverRef = useRef<HTMLDivElement>(null);
  const hiddenTextColorInputRef = useRef<HTMLInputElement>(null);
  const hiddenBgColorInputRef = useRef<HTMLInputElement>(null);
  const hiddenCellColorInputRef = useRef<HTMLInputElement>(null);

  // 로컬스토리지에서 최근 사용 색상 로딩
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedText = localStorage.getItem("recent-text-colors");
      if (savedText) {
        try { setRecentTextColors(JSON.parse(savedText)); } catch (e) { }
      }
      const savedBg = localStorage.getItem("recent-bg-colors");
      if (savedBg) {
        try { setRecentBgColors(JSON.parse(savedBg)); } catch (e) { }
      }
      const savedCell = localStorage.getItem("recent-cell-colors");
      if (savedCell) {
        try { setRecentCellColors(JSON.parse(savedCell)); } catch (e) { }
      }
    }
  }, []);

  // 외부 클릭 리스너 등록
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (textColorPickerRef.current && !textColorPickerRef.current.contains(event.target as Node)) {
        setShowTextColorPicker(false);
      }
      if (bgColorPickerRef.current && !bgColorPickerRef.current.contains(event.target as Node)) {
        setShowBgColorPicker(false);
      }
      if (cellColorPickerRef.current && !cellColorPickerRef.current.contains(event.target as Node)) {
        setShowCellColorPicker(false);
      }
      if (linkPopoverRef.current && !linkPopoverRef.current.contains(event.target as Node)) {
        setShowLinkPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      CustomImage,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
      TextStyle,
      FontFamily,
      Underline,
      FontSize,
      LineHeight,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-violet-650 underline hover:text-violet-850 transition-colors cursor-pointer",
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: () => {
      setSelectionTick((t) => t + 1);
    },
    onTransaction: () => {
      setSelectionTick((t) => t + 1);
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[350px] p-6 text-slate-900 tiptap-content prose max-w-none bg-white",
      },
    },
  });

  if (!editor) {
    return null;
  }

  // 글자색 적용 & 로컬스토리지 저장
  const handleApplyTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setCustomTextColor(color);
    setRecentTextColors((prev) => {
      const filtered = prev.filter((c) => c !== color);
      const next = [color, ...filtered].slice(0, 11);
      localStorage.setItem("recent-text-colors", JSON.stringify(next));
      return next;
    });
  };

  // 배경색 적용 & 로컬스토리지 저장
  const handleApplyBgColor = (color: string) => {
    editor.chain().focus().setHighlight({ color }).run();
    setCustomBgColor(color);
    setRecentBgColors((prev) => {
      const filtered = prev.filter((c) => c !== color);
      const next = [color, ...filtered].slice(0, 11);
      localStorage.setItem("recent-bg-colors", JSON.stringify(next));
      return next;
    });
  };

  // 표 셀 배경색 적용 & 로컬스토리지 저장
  const handleApplyCellColor = (color: string) => {
    (editor.chain().focus() as any).setCellAttribute("backgroundColor", color).run();
    setCustomCellColor(color);
    setRecentCellColors((prev) => {
      const filtered = prev.filter((c) => c !== color);
      const next = [color, ...filtered].slice(0, 11);
      localStorage.setItem("recent-cell-colors", JSON.stringify(next));
      return next;
    });
  };

  // 하이퍼링크 생성/해제 핸들러
  const handleOpenLinkPopover = () => {
    const isActive = editor.isActive("link");
    if (isActive) {
      setLinkUrlInput(editor.getAttributes("link").href || "");
    } else {
      setLinkUrlInput("");
    }
    setShowLinkPopover(!showLinkPopover);
    setShowTextColorPicker(false);
    setShowBgColorPicker(false);
  };

  const handleApplyLink = () => {
    if (!linkUrlInput) {
      editor.chain().focus().unsetLink().run();
    } else {
      let formattedUrl = linkUrlInput;
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      editor.chain().focus().setLink({ href: formattedUrl, target: "_blank" }).run();
    }
    setShowLinkPopover(false);
    setLinkUrlInput("");
  };

  // 파일 직접 업로드 처리
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      editor.chain().focus().setImage({ src: data.url }).run();
      setShowImageModal(false);
    } catch (err: any) {
      alert(err.message || "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  // 외부 웹 링크 이미지 삽입 처리
  const handleInsertLinkImage = () => {
    if (!imageUrlInput) return alert("이미지 URL 주소를 입력해주세요.");
    editor.chain().focus().setImage({ src: imageUrlInput }).run();
    setImageUrlInput("");
    setShowImageModal(false);
  };

  const toolbarBtnClass = (active: boolean) =>
    `p-2 rounded-lg transition-colors cursor-pointer ${active
      ? "bg-violet-600 text-white"
      : "text-gray-500 hover:text-gray-900 hover:bg-black/5"
    }`;

  const currentTextColor = editor.getAttributes("textStyle").color || "#000000";
  const currentBgColor = editor.getAttributes("highlight").color || "transparent";

  return (
    <div className="w-full glass-panel rounded-2xl border-gray-200 relative">
      {/* 툴바 단일 Sticky 컨테이너 (줄바꿈 시 가려짐 및 겹침 버그 소멸) */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 flex flex-col shadow-sm rounded-t-2xl">
        {/* 메인 툴바 */}
        <div className="flex flex-wrap gap-1 p-2 items-center">
          {/* 글꼴 패밀리 선택기 */}
          <select
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            value={editor.getAttributes("textStyle").fontFamily || "NanumSquare"}
            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-violet-500 cursor-pointer"
            title="글꼴 변경"
          >
            <option value="NanumSquare">나눔스퀘어</option>
            <option value="Nanum Gothic">나눔고딕</option>
            <option value="Nanum Myeongjo">나눔명조</option>
            <option value="Nanum Brush Script">나눔붓글씨</option>
            <option value="Gowun Dodum">고운돋움</option>
            <option value="Song Myung">송명</option>
            <option value="Gungsuh">궁서체</option>
          </select>

          {/* 글자 크기(px) 선택기 */}
          <select
            onChange={(e) => editor.chain().focus().setMark("textStyle", { fontSize: e.target.value }).run()}
            value={editor.getAttributes("textStyle").fontSize || "15px"}
            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-violet-500 cursor-pointer"
            title="글자 크기"
          >
            <option value="11px">11px</option>
            <option value="13px">13px</option>
            <option value="15px">15px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="28px">28px</option>
            <option value="32px">32px</option>
            <option value="36px">36px</option>
            <option value="48px">48px</option>
          </select>

          {/* 줄간격(Line Height) 선택기 */}
          <select
            onChange={(e) => {
              const val = e.target.value;
              editor.chain().focus().updateAttributes("paragraph", { lineHeight: val }).run();
              editor.chain().focus().updateAttributes("heading", { lineHeight: val }).run();
            }}
            value={editor.getAttributes("paragraph").lineHeight || "1.8"}
            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-violet-500 cursor-pointer"
            title="줄간격 조절"
          >
            <option value="1.2">120%</option>
            <option value="1.4">140%</option>
            <option value="1.6">160%</option>
            <option value="1.8">180%</option>
            <option value="2.0">200%</option>
            <option value="2.5">250%</option>
          </select>

          <div className="w-[1px] bg-gray-200 mx-1 self-stretch" />

          {/* 기본 서식 제어 (밑줄 및 취소선) */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={toolbarBtnClass(editor.isActive("bold"))}
            title="굵게"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={toolbarBtnClass(editor.isActive("italic"))}
            title="기울임"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={toolbarBtnClass(editor.isActive("underline"))}
            title="밑줄"
          >
            <UnderlineIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={toolbarBtnClass(editor.isActive("strike"))}
            title="취소선"
          >
            <StrikeIcon size={16} />
          </button>

          <div className="w-[1px] bg-gray-200 mx-1 self-stretch" />

          {/* 텍스트 정렬 도구 4종 */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={toolbarBtnClass(editor.isActive({ textAlign: "left" }))}
            title="왼쪽 정렬"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={toolbarBtnClass(editor.isActive({ textAlign: "center" }))}
            title="가운데 정렬"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={toolbarBtnClass(editor.isActive({ textAlign: "right" }))}
            title="우측 정렬"
          >
            <AlignRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={toolbarBtnClass(editor.isActive({ textAlign: "justify" }))}
            title="양쪽 정렬"
          >
            <AlignJustify size={16} />
          </button>

          <div className="w-[1px] bg-gray-200 mx-1 self-stretch" />

          {/* 1. 네이버 스타일 글자색 피커 */}
          <div className="relative" ref={textColorPickerRef}>
            <button
              type="button"
              onClick={() => {
                setShowTextColorPicker(!showTextColorPicker);
                setShowBgColorPicker(false);
                setShowLinkPopover(false);
              }}
              className={`p-1.5 rounded-lg flex items-center gap-0.5 hover:bg-black/5 transition-all cursor-pointer ${showTextColorPicker ? "bg-slate-200/70" : ""}`}
              title="글자 색상"
            >
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold font-mono text-slate-800 leading-none">T</span>
                <div
                  className="w-4 h-1 mt-0.5 rounded-full border border-[rgba(0,0,0,0.1)]"
                  style={{ backgroundColor: currentTextColor }}
                />
              </div>
              <ChevronDown size={10} className="text-slate-400" />
            </button>

            {showTextColorPicker && (
              <div className="absolute top-10 left-0 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 z-50 w-[240px] space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 block">최근 사용한 글자색</span>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handleApplyTextColor("#000000")}
                      className="w-4 h-4 border border-gray-300 relative bg-black hover:scale-110 transition-transform cursor-pointer"
                      title="기본 검정색"
                    />
                    {recentTextColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleApplyTextColor(color)}
                        className="w-4 h-4 border border-gray-300 hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-semibold text-slate-400 block">글자색 팔레트</span>
                  <div className="grid grid-cols-11 gap-0.5">
                    {COLOR_PALETTE.map((row, rIdx) =>
                      row.map((color, cIdx) => (
                        <button
                          key={`${rIdx}-${cIdx}`}
                          type="button"
                          onClick={() => handleApplyTextColor(color)}
                          className="w-4 h-4 border border-[rgba(0,0,0,0.06)] hover:scale-115 transition-transform cursor-pointer"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => hiddenTextColorInputRef.current?.click()}
                      className="w-14 h-8 rounded border border-gray-350 hover:opacity-90 relative overflow-hidden cursor-pointer"
                      style={{ background: "linear-gradient(to right, red, orange, yellow, green, blue, purple)" }}
                      title="커스텀 컬러 보드 열기"
                    />
                    <input
                      type="color"
                      ref={hiddenTextColorInputRef}
                      value={customTextColor}
                      onChange={(e) => handleApplyTextColor(e.target.value)}
                      className="hidden"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customTextColor}
                        onChange={(e) => setCustomTextColor(e.target.value)}
                        className="w-[70px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 uppercase focus:outline-none focus:border-violet-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyTextColor(customTextColor)}
                        className="px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800 cursor-pointer flex items-center gap-0.5"
                      >
                        <Check size={10} /> 확인
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTextColorPicker(false)}
                  className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 pt-1 border-t border-slate-100 cursor-pointer block"
                >
                  접기 ▲
                </button>
              </div>
            )}
          </div>

          {/* 2. 네이버 스타일 배경색(형광펜) 피커 */}
          <div className="relative" ref={bgColorPickerRef}>
            <button
              type="button"
              onClick={() => {
                setShowBgColorPicker(!showBgColorPicker);
                setShowTextColorPicker(false);
                setShowLinkPopover(false);
              }}
              className={`p-1.5 rounded-lg flex items-center gap-0.5 hover:bg-black/5 transition-all cursor-pointer ${showBgColorPicker ? "bg-slate-200/70" : ""}`}
              title="글자 배경색"
            >
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold font-mono text-slate-800 bg-slate-200 px-0.5 rounded leading-none">ab</span>
                <div
                  className="w-4 h-1 mt-0.5 rounded-full border border-[rgba(0,0,0,0.1)]"
                  style={{ backgroundColor: currentBgColor }}
                />
              </div>
              <ChevronDown size={10} className="text-slate-400" />
            </button>

            {showBgColorPicker && (
              <div className="absolute top-10 left-0 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 z-50 w-[240px] space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 block">최근 사용한 배경색</span>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().unsetHighlight().run();
                        setShowBgColorPicker(false);
                      }}
                      className="w-4 h-4 border border-gray-300 relative overflow-hidden bg-white hover:scale-110 transition-transform cursor-pointer"
                      title="배경색 투명화"
                    >
                      <div className="absolute inset-0 bg-white" />
                      <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-rose-500 rotate-45 transform origin-center" />
                    </button>
                    {recentBgColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleApplyBgColor(color)}
                        className="w-4 h-4 border border-gray-300 hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-semibold text-slate-400 block">배경색 팔레트</span>
                  <div className="grid grid-cols-11 gap-0.5">
                    {COLOR_PALETTE.map((row, rIdx) =>
                      row.map((color, cIdx) => (
                        <button
                          key={`${rIdx}-${cIdx}`}
                          type="button"
                          onClick={() => handleApplyBgColor(color)}
                          className="w-4 h-4 border border-[rgba(0,0,0,0.06)] hover:scale-115 transition-transform cursor-pointer"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => hiddenBgColorInputRef.current?.click()}
                      className="w-14 h-8 rounded border border-gray-350 hover:opacity-90 relative overflow-hidden cursor-pointer"
                      style={{ background: "linear-gradient(to right, red, orange, yellow, green, blue, purple)" }}
                      title="커스텀 컬러 보드 열기"
                    />
                    <input
                      type="color"
                      ref={hiddenBgColorInputRef}
                      value={customBgColor}
                      onChange={(e) => handleApplyBgColor(e.target.value)}
                      className="hidden"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customBgColor}
                        onChange={(e) => setCustomBgColor(e.target.value)}
                        className="w-[70px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 uppercase focus:outline-none focus:border-violet-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyBgColor(customBgColor)}
                        className="px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800 cursor-pointer flex items-center gap-0.5"
                      >
                        <Check size={10} /> 확인
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBgColorPicker(false)}
                  className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 pt-1 border-t border-slate-100 cursor-pointer block"
                >
                  접기 ▲
                </button>
              </div>
            )}
          </div>

          {/* 3. 네이버 스마트에디터 스타일 하이퍼링크 팝업 */}
          <div className="relative" ref={linkPopoverRef}>
            <button
              type="button"
              onClick={handleOpenLinkPopover}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${editor.isActive("link") || showLinkPopover
                  ? "bg-slate-200/75 text-emerald-600"
                  : "text-emerald-500 hover:bg-black/5"
                }`}
              title="하이퍼링크"
            >
              <LinkIcon size={16} />
            </button>

            {showLinkPopover && (
              <div className="absolute top-10 left-0 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 z-50 w-[280px] flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <input
                  type="text"
                  placeholder="https://www.naver.com"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyLink();
                    }
                  }}
                  className="flex-grow bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-violet-500 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleApplyLink}
                  className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center"
                  title="링크 적용"
                >
                  <Check size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="w-[1px] bg-gray-200 mx-1 self-stretch" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={toolbarBtnClass(editor.isActive("heading", { level: 1 }))}
            title="제목 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={toolbarBtnClass(editor.isActive("heading", { level: 2 }))}
            title="제목 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={toolbarBtnClass(editor.isActive("heading", { level: 3 }))}
            title="제목 3"
          >
            <Heading3 size={16} />
          </button>

          <div className="w-[1px] bg-gray-200 mx-1 self-stretch" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={toolbarBtnClass(editor.isActive("bulletList"))}
            title="순서 없는 리스트"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={toolbarBtnClass(editor.isActive("orderedList"))}
            title="순서 있는 리스트"
          >
            <ListOrdered size={16} />
          </button>

          <div className="w-[1px] bg-gray-200 mx-1 self-stretch" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={toolbarBtnClass(editor.isActive("blockquote"))}
            title="인용구"
          >
            <Quote size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={toolbarBtnClass(editor.isActive("codeBlock"))}
            title="코드 블록"
          >
            <Code size={16} />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className={toolbarBtnClass(false)}
            title="구분선 삽입"
          >
            <Minus size={16} />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className={toolbarBtnClass(editor.isActive("table"))}
            title="표 삽입 (3x3)"
          >
            <TableIcon size={16} />
          </button>

          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-black/5 transition-colors cursor-pointer"
            title="이미지 삽입"
          >
            <ImageIcon size={16} />
          </button>

          <div className="flex-grow" />

          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-black/5 disabled:opacity-30 transition-colors cursor-pointer"
            title="되돌리기"
          >
            <Undo size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-black/5 disabled:opacity-30 transition-colors cursor-pointer"
            title="재실행"
          >
            <Redo size={16} />
          </button>
        </div>

        {/* 표 조작 보조 툴바 (동적 결합형) */}
        {editor.isActive("table") && (
          <div className="flex flex-wrap gap-1 p-2 bg-slate-100 border-t border-gray-200 text-xs items-center">
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className="px-2.5 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 cursor-pointer font-semibold"
            >
              열 앞에 추가
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="px-2.5 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 cursor-pointer font-semibold"
            >
              열 뒤에 추가
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="px-2.5 py-1 rounded bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 cursor-pointer font-semibold"
            >
              열 삭제
            </button>

            <div className="w-[1px] bg-gray-200 mx-1" />

            <button
              type="button"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className="px-2.5 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 cursor-pointer font-semibold"
            >
              행 위에 추가
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="px-2.5 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 cursor-pointer font-semibold"
            >
              행 아래에 추가
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="px-2.5 py-1 rounded bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 cursor-pointer font-semibold"
            >
              행 삭제
            </button>

            <div className="w-[1px] bg-gray-200 mx-1" />

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeaderCell().run()}
              className="px-2.5 py-1 rounded bg-violet-50 border border-violet-200 hover:bg-violet-100 text-violet-700 cursor-pointer font-semibold"
            >
              헤더 셀 토글
            </button>

            <div className="flex-grow" />

            {/* 셀 배경색 피커 단추 및 팝업 */}
            <div className="relative" ref={cellColorPickerRef}>
              <button
                type="button"
                onClick={() => {
                  setShowCellColorPicker(!showCellColorPicker);
                }}
                className={`px-2 py-0.5 rounded-lg border border-gray-200 bg-white flex items-center gap-1.5 hover:bg-slate-50 transition-all cursor-pointer ${showCellColorPicker ? "bg-slate-100" : ""}`}
                title="셀 배경색상"
              >
                <span className="text-[10px] text-gray-500 font-bold">셀 배경</span>
                <div
                  className="w-3.5 h-3.5 rounded border border-[rgba(0,0,0,0.1)]"
                  style={{ backgroundColor: editor.getAttributes("tableCell").backgroundColor || "transparent" }}
                />
                <ChevronDown size={10} className="text-slate-400" />
              </button>

              {showCellColorPicker && (
                <div className="absolute top-8 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 z-50 w-[240px] space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* 최근 사용한 셀 배경색 */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 block">최근 사용한 셀 배경색</span>
                    <div className="flex flex-wrap gap-1">
                      {/* 기본 투명화/지우기 빗금 사각형 */}
                      <button
                        type="button"
                        onClick={() => {
                          (editor.chain().focus() as any).setCellAttribute("backgroundColor", null).run();
                          setShowCellColorPicker(false);
                        }}
                        className="w-4 h-4 border border-gray-350 relative overflow-hidden bg-white hover:scale-110 transition-transform cursor-pointer"
                        title="셀 배경색 투명화"
                      >
                        <div className="absolute inset-0 bg-white" />
                        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-rose-500 rotate-45 transform origin-center" />
                      </button>
                      {recentCellColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleApplyCellColor(color)}
                          className="w-4 h-4 border border-gray-300 hover:scale-110 transition-transform cursor-pointer"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 기본 격자 팔레트 */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-semibold text-slate-400 block">셀 배경색 팔레트</span>
                    <div className="grid grid-cols-11 gap-0.5">
                      {COLOR_PALETTE.map((row, rIdx) =>
                        row.map((color, cIdx) => (
                          <button
                            key={`${rIdx}-${cIdx}`}
                            type="button"
                            onClick={() => handleApplyCellColor(color)}
                            className="w-4 h-4 border border-[rgba(0,0,0,0.06)] hover:scale-115 transition-transform cursor-pointer"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* 직접 선택 피커 및 HEX 입력창 */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => hiddenCellColorInputRef.current?.click()}
                        className="w-14 h-8 rounded border border-gray-350 hover:opacity-90 relative overflow-hidden cursor-pointer"
                        style={{ background: "linear-gradient(to right, red, orange, yellow, green, blue, purple)" }}
                        title="커스텀 컬러 보드 열기"
                      />
                      <input
                        type="color"
                        ref={hiddenCellColorInputRef}
                        value={customCellColor}
                        onChange={(e) => handleApplyCellColor(e.target.value)}
                        className="hidden"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customCellColor}
                          onChange={(e) => setCustomCellColor(e.target.value)}
                          className="w-[70px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 uppercase focus:outline-none focus:border-violet-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCellColor(customCellColor)}
                          className="px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800 cursor-pointer flex items-center gap-0.5"
                        >
                          <Check size={10} /> 확인
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCellColorPicker(false)}
                    className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 pt-1 border-t border-slate-100 cursor-pointer block"
                  >
                    접기 ▲
                  </button>
                </div>
              )}
            </div>

            <div className="w-[1px] bg-gray-200 mx-1" />

            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              표 삭제
            </button>
          </div>
        )}
      </div>

      {/* 하이브리드 이미지 삽입 모달 */}
      {showImageModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h4 className="text-sm font-bold text-slate-800">본문 이미지 삽입</h4>
              <button
                type="button"
                onClick={() => { setShowImageModal(false); setImageUrlInput(""); }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setImageActiveTab("upload")}
                className={`flex-1 py-1.5 rounded-lg font-semibold text-center cursor-pointer transition-colors ${imageActiveTab === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                로컬 파일 업로드
              </button>
              <button
                type="button"
                onClick={() => setImageActiveTab("link")}
                className={`flex-1 py-1.5 rounded-lg font-semibold text-center cursor-pointer transition-colors ${imageActiveTab === "link" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                외부 이미지 링크
              </button>
            </div>

            {imageActiveTab === "upload" ? (
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-8 hover:bg-slate-50 cursor-pointer transition-colors text-center">
                  <ImageIcon size={32} className="text-slate-455 mb-2" />
                  <span className="text-xs text-slate-700 font-semibold">
                    {uploading ? "업로드 중..." : "내 컴퓨터에서 사진 선택"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">PNG, JPG, GIF (최대 10MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImage}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">이미지 외부 주소 (URL)</label>
                  <input
                    type="text"
                    placeholder="https://example.com/photo.jpg"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowImageModal(false); setImageUrlInput(""); }}
                    className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertLinkImage}
                    className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold cursor-pointer"
                  >
                    본문 삽입
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Body */}
      <EditorContent editor={editor} />
    </div>
  );
}
