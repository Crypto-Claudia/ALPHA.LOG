export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\uac00-\ud7a3-]/g, "") // 영문, 숫자, 한글, 공백, 하이픈만 허용
    .replace(/[\s_]+/g, "-") // 공백과 언더바를 하이픈으로 대체
    .replace(/-+/g, "-"); // 연속된 하이픈 단일화
}
