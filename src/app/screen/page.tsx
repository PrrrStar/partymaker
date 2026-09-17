import type { Metadata } from "next";

import { ScreenApp } from "@/features/screen/screen-app";

export const metadata: Metadata = {
  title: "Live Screen",
  description: "Projector and TV output for the live PartyMaker show.",
};

export default function ScreenPage() {
  return <ScreenApp />;
}
