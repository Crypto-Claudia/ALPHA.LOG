"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag as TagIcon, ChevronDown, ChevronUp } from "lucide-react";

interface Tag {
  id: number | string;
  name: string;
  slug: string;
}

interface ExpandableTagsProps {
  tags: Tag[];
  isPreview?: boolean;
}

export default function ExpandableTags({ tags, isPreview = false }: ExpandableTagsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!tags || tags.length === 0) return null;

  const displayedTags = isExpanded ? tags : tags.slice(0, 3);
  const hasMore = tags.length > 3;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-slate-100 animate-in fade-in duration-200">
      {displayedTags.map((tag) => {
        if (isPreview) {
          return (
            <span
              key={tag.id}
              className="inline-flex items-center text-xs px-3 py-1 rounded-full border border-slate-200 text-slate-600 bg-white"
            >
              <TagIcon size={12} className="mr-1 text-cyan-600" /> {tag.name}
            </span>
          );
        }

        return (
          <Link
            key={tag.id}
            href={`/?tag=${tag.slug}`}
            className="inline-flex items-center text-xs px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-all bg-white"
          >
            <TagIcon size={12} className="mr-1 text-cyan-600" /> {tag.name}
          </Link>
        );
      })}

      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-850 px-2.5 py-1 rounded-full hover:bg-violet-50 transition-all cursor-pointer border border-violet-100"
        >
          {isExpanded ? (
            <>
              접기 <ChevronUp size={12} />
            </>
          ) : (
            <>
              태그 더 보기 (+{tags.length - 3}) <ChevronDown size={12} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
