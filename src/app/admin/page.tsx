import type { Metadata } from "next";

import { AdminApp } from "@/features/admin/admin-app";

export const metadata: Metadata = {
  title: "MC 운영",
  description: "PartyMaker의 진행 순서, 미션, 투표와 점수를 운영합니다.",
};

export default function AdminPage() {
  return <AdminApp />;
}
