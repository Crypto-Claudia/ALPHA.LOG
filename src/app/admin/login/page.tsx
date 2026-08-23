import type { Metadata } from "next";
import { logVisit } from "@/lib/logger";
import AdminLoginForm from "@/components/AdminLoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "관리자 로그인 - ALPHA.LOG",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage() {
  // 로그인 페이지 접속 이력 기록
  await logVisit("/admin/login");

  return <AdminLoginForm />;
}
