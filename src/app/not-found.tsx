import Link from "next/link";

export default function NotFound() {
  return (
    <main className="hero">
      <p className="eyebrow">404</p>
      <h1>页面不存在</h1>
      <p className="lede">这个地址暂时没有内容。</p>
      <Link className="primary-link" href="/">
        返回首页
      </Link>
    </main>
  );
}
