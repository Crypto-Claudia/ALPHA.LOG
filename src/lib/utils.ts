export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\uac00-\ud7a3-]/g, "") // 영문, 숫자, 한글, 공백, 하이픈만 허용
    .replace(/[\s_]+/g, "-") // 공백과 언더바를 하이픈으로 대체
    .replace(/-+/g, "-"); // 연속된 하이픈 단일화
}

export function extractTextFromHtml(html: string): string {
  if (!html) return "";
  // 1. 스타일, 스크립트, 타이틀 태그 및 그 내부 텍스트 제거
  let text = html.replace(/<(style|script|title)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // 2. HTML 태그를 모두 공백으로 대체
  text = text.replace(/<[^>]+>/g, " ");
  // 3. 다중 공백 및 개행을 단일 공백으로 치환
  text = text.replace(/\s+/g, " ");
  // 4. HTML 엔티티 해독
  text = text.replace(/&nbsp;/gi, " ")
             .replace(/&lt;/gi, "<")
             .replace(/&gt;/gi, ">")
             .replace(/&amp;/gi, "&")
             .replace(/&quot;/gi, '"')
             .replace(/&#39;/gi, "'");
  return text.trim();
}
