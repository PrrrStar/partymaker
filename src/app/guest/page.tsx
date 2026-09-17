import type { Metadata } from "next";

import { GuestApp } from "@/features/guest/guest-app";

export const metadata: Metadata = {
  title: "하객 참여",
  description: "PartyMaker 파티에 입장해 미션과 투표에 참여합니다.",
};

export default function GuestPage() {
  return <GuestApp />;
}
