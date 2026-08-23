import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Database, TrendingUp, ShieldAlert, Mail, ArrowLeft, Layers, Compass, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "사이트 소개 - ALPHA.LOG",
  description: "블록체인 및 가상자산 투자 아카이브. 크립토 시장 통찰과 온체인 데이터 가치 분석, 복리 성장을 기록하는 ALPHA.LOG를 소개합니다.",
  openGraph: {
    title: "사이트 소개 - ALPHA.LOG",
    description: "생각과 자산이 복리로 쌓이는 기록 보관소, ALPHA.LOG의 운영 철학과 주요 리서치 분야를 소개합니다.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-[860px] mx-auto space-y-12 py-4">
      {/* Top Back Navigation */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600 transition-colors"
        >
          <ArrowLeft size={14} /> 메인으로 돌아가기
        </Link>
      </div>

      {/* Hero Header */}
      <section className="text-center space-y-4 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold">
          <Sparkles size={13} className="text-violet-600" />
          <span>About ALPHA.LOG</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          생각과 자산이{" "}
          <span className="bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent">
            복리로 쌓이는
          </span>{" "}
          기록 보관소
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          <strong>ALPHA.LOG</strong>는 빠르게 변화하는 크립토/가상자산 시장에서 단기적인 노이즈를 걷어내고,
          데이터에 기반한 본질적 신호(Signal)와 장기적인 가치를 탐구하는 1인 리서치 아카이브입니다.
        </p>
      </section>

      {/* Core Pillars Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
          <Layers size={18} className="text-violet-600" /> 주요 리서치 및 아카이브 분야
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="glass-panel p-6 rounded-2xl border-slate-200 bg-white space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
              <Database size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">온체인 & 매크로 데이터</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              온체인 고래 지갑 이동, 네트워크 활성도, 유동성 흐름 등 객관적인 블록체인 온체인 데이터를 통해 시장 구조를 분석합니다.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-6 rounded-2xl border-slate-200 bg-white space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
              <Compass size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">거래소 공시 & 시장 동향</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              국내외 주요 거래소의 유의 종목 지정, 거래지원 종료(상폐), 신규 상장 등의 정책 변화와 시장 영향력을 아카이빙합니다.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-6 rounded-2xl border-slate-200 bg-white space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">가치 투자 & 복리 성장</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              감정에 휘둘리지 않는 원칙 중심의 투자 철학을 정립하고, 지속 가능한 복리 성장을 만들어가는 과정을 솔직하게 기록합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Compass size={18} className="text-violet-600" /> 운영 원칙
        </h2>
        <ul className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-violet-600 flex-shrink-0 mt-0.5" />
            <span><strong>데이터 기반의 사실 기록:</strong> 근거 없는 루머나 과장된 정보 대신, 공식 공시와 온체인 팩트를 최우선으로 검증합니다.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-violet-600 flex-shrink-0 mt-0.5" />
            <span><strong>지속적인 배움과 투명성:</strong> 성공적인 판단뿐만 아니라 시장에서의 시행착오와 배운 교훈을 투명하게 기록하여 복리의 지혜를 쌓습니다.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-violet-600 flex-shrink-0 mt-0.5" />
            <span><strong>클린 아카이브 지향:</strong> 불필요한 광고 공해 없이 양질의 리서치 콘텐츠를 읽기 편한 미니멀 디자인으로 전달합니다.</span>
          </li>
        </ul>
      </section>

      {/* Disclaimer (투자 면책 조항) */}
      <section className="p-6 rounded-2xl border border-amber-200/80 bg-amber-50/50 space-y-2.5">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
          <ShieldAlert size={18} className="text-amber-600 flex-shrink-0" />
          <span>투자 유의사항 및 면책 조항 (Disclaimer)</span>
        </div>
        <p className="text-xs text-amber-900/80 leading-relaxed">
          ALPHA.LOG에 게재된 모든 포스팅과 자료는 <strong>정보 제공 및 개인의 리서치 아카이브 목적</strong>으로 작성되었으며,
          어떠한 경우에도 금융 상품이나 가상자산에 대한 매수·매도 추천, 투자 권유, 또는 법적 자문이 아닙니다.
          가상자산은 높은 변동성을 내포하고 있으므로 모든 투자 결정에 따른 최종적인 책임은 투자자 본인에게 있습니다.
        </p>
      </section>

      {/* Contact Section */}
      <section className="glass-panel p-6 rounded-2xl border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-2">
            <Mail size={16} className="text-violet-600" /> 문의 및 피드백
          </h3>
          <p className="text-xs text-slate-500">
            게시글 내용에 대한 오류 제보, 제휴 및 기타 문의 사항은 언제든 환영합니다.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all shadow-sm shadow-violet-900/10"
          >
            문의하기
          </Link>
        </div>
      </section>
    </div>
  );
}
