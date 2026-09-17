import type { Metadata } from "next";

import { AdminApp } from "@/features/admin/admin-app";

export const metadata: Metadata = {
  title: "Show Control",
  description: "Live MC control surface for PartyMaker.",
};

export default function AdminPage() {
  return <AdminApp />;
}
