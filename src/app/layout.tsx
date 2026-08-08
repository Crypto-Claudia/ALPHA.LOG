import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { verifySessionCookie } from "@/lib/auth";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://alpha-log.xyz"),
  title: "ALPHA.LOG - 알파의 투자 아카이브",
  description: "구글 애드센스 탑재와 SEO 최적화가 완비된 나만의 기술 블로그입니다.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await verifySessionCookie();

  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&family=Nanum+Myeongjo:wght@400;700&family=Nanum+Brush+Script&family=Gowun+Dodum&family=Song+Myung&display=swap" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@2.0/nanumsquare.css" rel="stylesheet" />
        {/* Favicon & Device Icons */}
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/apple-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/apple-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/apple-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/apple-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/apple-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
        <meta name="theme-color" content="#ffffff" />
      </head>
       <body className="min-h-full flex flex-col">
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05),0_2px_4px_-2px_rgba(15,23,42,0.05)]">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex-shrink-0">
                <Link href="/" className="text-xl font-black bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                  ALPHA.LOG
                </Link>
              </div>

              {/* Navigation Menu */}
              <nav className="flex space-x-6 items-center">
                <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  포스트
                </Link>
                {isAdmin && (
                  <>
                    <Link href="/admin/stats" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                      통계
                    </Link>
                    <Link href="/admin/write" className="text-sm font-medium px-4 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg shadow-violet-900/10">
                      글쓰기
                    </Link>
                    <AdminLogoutButton />
                  </>
                )}
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[rgba(0,0,0,0.04)] py-6 mt-12 bg-black/[0.02]">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Alpha.Log. 생각과 자산이 복리로 쌓이는 기록 보관소.
          </div>
        </footer>
      </body>
    </html>
  );
}
