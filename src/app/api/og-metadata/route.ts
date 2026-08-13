import { NextResponse } from "next/server";

function extractOgMeta(html: string, property: string): string | null {
  // property="og:name" 또는 name="og:name" 매칭
  const ogRegex = new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, "i");
  let match = html.match(ogRegex);
  if (match) return match[1];

  const nameRegex = new RegExp(`<meta[^>]*name=["']og:${property}["'][^>]*content=["']([^"']*)["']`, "i");
  match = html.match(nameRegex);
  if (match) return match[1];

  // 타이틀 및 설명 대체 태그 매칭
  if (property === "title") {
    const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i;
    match = html.match(titleRegex);
    if (match) return match[1].trim();
  }
  if (property === "description") {
    const descRegex = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i;
    match = html.match(descRegex);
    if (match) return match[1];
  }
  return null;
}

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&apos;/gi, "'")
    .trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL 매개변수가 필요합니다." },
        { status: 400 }
      );
    }

    // http:// 또는 https:// 스키마 누락 시 기본 보정
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return NextResponse.json(
        { error: "올바르지 않은 URL 형식입니다." },
        { status: 400 }
      );
    }

    const domain = parsedUrl.hostname;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        next: { revalidate: 3600 }, // 1시간 캐싱
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      const title = decodeHtmlEntities(extractOgMeta(html, "title") || url);
      const description = decodeHtmlEntities(extractOgMeta(html, "description") || "링크로 이동하여 내용을 확인해 보세요.");
      const image = extractOgMeta(html, "image") || "";
      const siteName = decodeHtmlEntities(extractOgMeta(html, "site_name") || domain);

      return NextResponse.json({
        title,
        description,
        image,
        url,
        domain: siteName,
      });
    } catch (fetchError) {
      console.warn("fetch link metadata error fallback:", fetchError);
      // 페치 실패 시 크래시 방지용 기본 폴백 정보 반환
      return NextResponse.json({
        title: url,
        description: "링크로 이동하여 내용을 확인해 보세요.",
        image: "",
        url,
        domain,
      });
    }
  } catch (error: any) {
    console.error("GET /api/og-metadata error:", error);
    return NextResponse.json(
      { error: "메타데이터를 수집하는 중 알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
