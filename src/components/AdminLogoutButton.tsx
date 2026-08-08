"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (res.ok) {
        alert("성공적으로 로그아웃 되었습니다.");
        router.push("/");
        router.refresh();
      } else {
        alert("로그아웃 처리 중 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("서버 연결 실패로 로그아웃 하지 못했습니다.");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
      title="관리자 로그아웃"
    >
      <LogOut size={16} />
      <span>로그아웃</span>
    </button>
  );
}
