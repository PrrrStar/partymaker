import type { Metadata } from "next";

import { GuestApp } from "@/features/guest/guest-app";

export const metadata: Metadata = {
  title: "Guest",
  description: "Join the party and follow the live cue.",
};

export default function GuestPage() {
  return <GuestApp />;
}
