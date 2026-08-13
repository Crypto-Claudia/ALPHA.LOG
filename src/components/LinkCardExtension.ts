import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import LinkCardNodeView from "./LinkCardNodeView";

export interface LinkCardOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    linkCard: {
      setLinkCard: (attrs: {
        url: string;
        title: string;
        description: string;
        image: string;
        domain: string;
      }) => ReturnType;
    };
  }
}

export const LinkCardExtension = Node.create<LinkCardOptions>({
  name: "linkCard",
  group: "block",
  selectable: true,
  draggable: true,
  atom: true, // 블록 요소로 일괄 선택/이동되도록 설정

  addAttributes() {
    return {
      url: { default: "" },
      title: { default: "" },
      description: { default: "" },
      image: { default: "" },
      domain: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-link-card]",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            url: el.getAttribute("data-url") || "",
            title: el.getAttribute("data-title") || "",
            description: el.getAttribute("data-description") || "",
            image: el.getAttribute("data-image") || "",
            domain: el.getAttribute("data-domain") || "",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { url, title, description, image, domain } = HTMLAttributes;

    const imgNode = image
      ? [
          "div",
          { class: "link-card-image-box" },
          [
            "img",
            {
              src: image,
              alt: title || "링크 이미지",
              class: "link-card-img",
              loading: "lazy",
            },
          ],
        ]
      : "";

    // 뷰포트에서 HTML 자체로 바로 로드될 수 있도록 정적 마크업 설계
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, {
        class: "link-card-container my-6 max-w-md mx-auto border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200",
        "data-link-card": "",
        "data-url": url,
        "data-title": title,
        "data-description": description,
        "data-image": image,
        "data-domain": domain,
      }),
      [
        "a",
        {
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
          class: "link-card-link block no-underline",
        },
        imgNode,
        [
          "div",
          { class: "link-card-body p-4 space-y-1.5" },
          [
            "div",
            { class: "link-card-title text-sm font-bold text-slate-900 line-clamp-1" },
            title || url,
          ],
          [
            "div",
            { class: "link-card-desc text-xs text-slate-500 line-clamp-2" },
            description || "링크로 이동하여 확인해 보세요.",
          ],
          [
            "div",
            { class: "link-card-domain text-[10px] text-emerald-600 font-semibold mt-1" },
            domain,
          ],
        ],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkCardNodeView);
  },

  addCommands() {
    return {
      setLinkCard:
        (attrs) =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name, attrs }).run();
        },
    };
  },
});
