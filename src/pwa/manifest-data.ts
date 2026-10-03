import type { MetadataRoute } from "next";

export const timefitManifest: MetadataRoute.Manifest = {
  id: "/",
  name: "TimeFit",
  short_name: "TimeFit",
  description: "직원과 관리자를 위한 스케줄·출퇴근·휴가 업무 앱",
  lang: "ko-KR",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait-primary",
  background_color: "#F5F7FA",
  theme_color: "#3182F6",
  categories: ["business", "productivity"],
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
};
