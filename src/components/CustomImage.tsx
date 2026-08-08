import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ImageNodeView from "./ImageNodeView";

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => {
          if (element.tagName.toLowerCase() === "figure") {
            const img = element.querySelector("img");
            if (img) {
              return img.getAttribute("data-align") || "center";
            }
          }
          return element.getAttribute("data-align") || "center";
        },
        renderHTML: (attributes) => {
          const align = attributes.align || "center";
          const margin = align === "left" ? "0 auto 0 0" : align === "right" ? "0 0 0 auto" : "0 auto";
          return {
            "data-align": align,
            style: `display: block; margin: ${margin};`,
          };
        },
      },
      caption: {
        default: "",
        parseHTML: (element) => {
          if (element.tagName.toLowerCase() === "figure") {
            const figcaption = element.querySelector("figcaption");
            if (figcaption) {
              return figcaption.textContent || "";
            }
          }
          const figcaption = element.querySelector("figcaption");
          if (figcaption) {
            return figcaption.textContent || "";
          }
          return element.getAttribute("data-caption") || "";
        },
        renderHTML: (attributes) => ({
          "data-caption": attributes.caption || "",
        }),
      },
      width: {
        default: "100%",
        parseHTML: (element) => {
          if (element.tagName.toLowerCase() === "figure") {
            const img = element.querySelector("img");
            if (img) {
              return img.style.width || img.getAttribute("data-width") || "100%";
            }
          }
          return element.style.width || element.getAttribute("data-width") || "100%";
        },
        renderHTML: (attributes) => ({
          "data-width": attributes.width || "100%",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure.editor-image-container",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const img = el.querySelector("img");
          const figcaption = el.querySelector("figcaption");
          return {
            src: img?.getAttribute("src") || null,
            alt: img?.getAttribute("alt") || null,
            title: img?.getAttribute("title") || null,
            align: img?.getAttribute("data-align") || el.getAttribute("data-align") || "center",
            caption: figcaption?.textContent || el.getAttribute("data-caption") || "",
            width: img?.style.width || img?.getAttribute("data-width") || el.getAttribute("data-width") || "100%",
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            src: el.getAttribute("src"),
            alt: el.getAttribute("alt"),
            title: el.getAttribute("title"),
            align: el.getAttribute("data-align") || "center",
            caption: el.getAttribute("data-caption") || "",
            width: el.style.width || el.getAttribute("data-width") || "100%",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes["data-align"] || "center";
    const margin = align === "left" ? "0 auto 0 0" : align === "right" ? "0 0 0 auto" : "0 auto";
    const captionText = HTMLAttributes["data-caption"] || "";
    const width = HTMLAttributes["data-width"] || "100%";

    return [
      "figure",
      {
        class: "editor-image-container my-6",
        style: `max-width: 100%; display: block; margin: ${margin}; text-align: ${align};`
      },
      [
        "img",
        {
          ...HTMLAttributes,
          class: "max-w-full height-auto rounded-2xl border border-slate-100 shadow-sm",
          style: `display: inline-block; width: ${width};`
        }
      ],
      captionText
        ? [
            "figcaption",
            {
              class: "text-slate-400 text-xs mt-2 select-none font-medium leading-relaxed",
              style: `display: block; text-align: ${align};`
            },
            captionText
          ]
        : ["span", { style: "display: none;" }]
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
export default CustomImage;
