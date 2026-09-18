# hutianqi.me

Hu Tianqi 的个人网站，使用 Next.js 构建并通过 GitHub Pages 发布。

## Local development

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

## Production build

```bash
npm run build
```

静态文件输出至 `out/`。推送到 `main` 后，GitHub Actions 会自动部署网站。

## Handwriting font

网站首屏使用项目内的 Unicode 手写字体。字形源、映射与构建说明见 [`font-src/README.md`](font-src/README.md)。
