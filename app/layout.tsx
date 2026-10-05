import type { Metadata, Viewport } from "next";
import { PwaRuntime } from "@/components/pwa-runtime";
import "./globals.css";
import "./auth.css";
import "./role.css";
import "./mob05.css";
import "./mob06.css";
import "./mob07.css";
import "./mob08.css";
import "./mob08-navigation.css";
import "./qr-attendance.css";
import "./mob09.css";
import "./alt01.css";
import "./mob10.css";

export const metadata: Metadata = {
  title: { default: "TimeFit", template: "%s · TimeFit" },
  description: "직원과 관리자를 위한 스케줄·출퇴근·휴가 업무 앱",
  applicationName: "TimeFit",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TimeFit" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }]
  },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#3182F6", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}<PwaRuntime /></body></html>;
}
