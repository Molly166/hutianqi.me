import { site } from "@/data/site";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回首页">
          {site.name}
        </a>
        <nav aria-label="主导航">
          {site.navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">{site.domain}</p>
          <h1 id="hero-title">{site.name}</h1>
          <p className="lede">个人网站正在搭建中。</p>
          <a className="primary-link" href="#status">
            查看当前状态
          </a>
        </section>

        <section id="status" className="section" aria-labelledby="status-title">
          <p className="eyebrow">Foundation</p>
          <h2 id="status-title">发布链路测试页</h2>
          <p>
            当前页面用于验证 Next.js、GitHub Actions、GitHub Pages 与自定义域名是否正常连接。
          </p>
        </section>

        <section id="work" className="section" aria-labelledby="work-title">
          <p className="eyebrow">Work</p>
          <h2 id="work-title">精选作品</h2>
          <p>项目内容将在页面设计阶段加入。</p>
        </section>

        <section id="about" className="section" aria-labelledby="about-title">
          <p className="eyebrow">About</p>
          <h2 id="about-title">关于我</h2>
          <p>个人介绍将在内容整理阶段加入。</p>
        </section>

        <section id="contact" className="section" aria-labelledby="contact-title">
          <p className="eyebrow">Contact</p>
          <h2 id="contact-title">保持联系</h2>
          <a className="text-link" href={site.github} target="_blank" rel="noreferrer">
            GitHub: Molly166
          </a>
        </section>
      </main>

      <footer>
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span>{site.domain}</span>
      </footer>
    </div>
  );
}
