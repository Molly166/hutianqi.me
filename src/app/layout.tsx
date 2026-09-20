import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/zhi-mang-xing/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "欢迎光临",
  description: "hutianqi.me",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
