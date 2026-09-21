import type { Metadata } from "next";
import FootstepBackLink from "@/components/journey/FootstepBackLink";

export const metadata: Metadata = {
  title: "hutianqi.me",
  description: "胡天齐在字节跳动深圳湾工区的经历。",
};

export default function ByteDanceShenzhenBayPage() {
  return (
    <main className="school-detail">
      <h1 className="sr-only" data-journey-heading tabIndex={-1}>
        字节跳动深圳湾工区
      </h1>
      <FootstepBackLink transitionLabel="正在离开字节跳动深圳湾工区，返回人生地图" />
    </main>
  );
}
