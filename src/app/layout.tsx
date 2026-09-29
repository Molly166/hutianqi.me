import type { Metadata } from "next";
import type { ReactNode } from "react";
import JourneyTransitionProvider from "@/components/journey/JourneyTransitionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "hutianqi.me",
  description: "An evolving life map beginning at the twin-tower library of South-Central Minzu University.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <JourneyTransitionProvider>{children}</JourneyTransitionProvider>
      </body>
    </html>
  );
}
