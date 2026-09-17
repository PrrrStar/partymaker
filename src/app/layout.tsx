import type { Metadata } from "next";
import type { Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/noto-sans-kr";
import { MotionProvider } from "@/components/ui/motion-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PartyMaker",
    template: "%s · PartyMaker",
  },
  description:
    "하객의 휴대폰, MC 콘솔, 메인 스크린을 하나의 라이브 쇼로 연결하는 웨딩 애프터파티 운영 시스템.",
  applicationName: "PartyMaker",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0b14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <a className="pm-skip-link" href="#main-content">
          본문으로 건너뛰기
        </a>
        <MotionProvider>
          <div className="app-root" id="main-content" tabIndex={-1}>
            {children}
          </div>
        </MotionProvider>
      </body>
    </html>
  );
}
