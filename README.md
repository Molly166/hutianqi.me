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

## 经历内容管理

学校、公司、实习、工作、生活共用 `src/data/experiences.json` 和统一增删改入口。
每条便签有稳定 ID，按日期自动排序；正式内容为空时页面保持留白。

```bash
npm run experience -- list --module school
npm test
```

详细操作、图片约定及提供素材的方式见 [经历管理说明](docs/experience-management.md)。
目前只有学校模块接入了详情页，其他模块的数据能力已预留，不代表它们的建筑或页面已经创建。

## Handwriting font

网站使用开源的志莽行书（Zhi Mang Xing），通过
[`@fontsource/zhi-mang-xing`](https://fontsource.org/fonts/zhi-mang-xing)
随项目自托管，不依赖运行时的第三方字体服务。字体采用 SIL Open Font
License 1.1。
