import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/zhi-mang-xing/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "hutianqi.me",
  description: "从中南民族大学双子塔图书馆出发，探索一张持续生长的人生地图。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
