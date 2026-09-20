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

网站使用开源的志莽行书（Zhi Mang Xing），通过
[`@fontsource/zhi-mang-xing`](https://fontsource.org/fonts/zhi-mang-xing)
随项目自托管，不依赖运行时的第三方字体服务。字体采用 SIL Open Font
License 1.1。
