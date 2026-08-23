import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { logVisit } from "@/lib/logger";
import ContactForm from "@/components/ContactForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "문의하기 - ALPHA.LOG",
  description: "ALPHA.LOG에 대한 의견, 오류 제보, 제휴 및 협업 문의를 남겨주세요.",
  openGraph: {
    title: "문의하기 - ALPHA.LOG",
    description: "ALPHA.LOG에 대한 의견이나 제휴 제안을 남겨주시면 정성껏 회신드리겠습니다.",
    type: "website",
  },
};

export default async function ContactPage() {
  // 문의하기 페이지 방문 로그 적재
  await logVisit("/contact");

  return (
    <div className="max-w-[860px] mx-auto space-y-10 py-4">
      {/* Top Back Navigation */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600 transition-colors"
        >
          <ArrowLeft size={14} /> 메인으로 돌아가기
        </Link>
      </div>

      {/* Header */}
      <section className="text-center space-y-3 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold">
          <Mail size={13} className="text-violet-600" />
          <span>Contact Us</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          문의하기
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          ALPHA.LOG에 대한 의견, 포스팅 오류 제보, 제휴 제안 등 문의사항을 남겨주시면 확인 후 입력해 주신 이메일로 정성껏 회신드리겠습니다.
        </p>
      </section>

      {/* Main Form & Info Component */}
      <ContactForm />
    </div>
  );
}
