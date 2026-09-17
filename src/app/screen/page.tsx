import type { Metadata } from "next";

import { ScreenApp } from "@/features/screen/screen-app";

export const metadata: Metadata = {
  title: "메인 화면",
  description: "프로젝터와 TV에 PartyMaker 진행 장면을 표시합니다.",
};

export default function ScreenPage() {
  return <ScreenApp />;
}
