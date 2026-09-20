# 经历便签管理

这是一个可复用的本地内容管理能力，不是访客留言系统，也不是网站后台。学校、公司、实习、工作、生活共用同一种数据格式；当前只有学校详情页接入展示，其他模块可以先存内容，后续再接入对应页面。

## 以后如何提供内容

直接告诉助手「模块 + 操作 + 内容」即可。例如：

- 「学校，新增：2023 年 9 月 12 日，文字是……，配这两张图片。」
- 「学校，修改：把 2023 年 9 月 12 日那条的第二张图片换成这张。」
- 「生活，删除：删掉 ID 为 `xxx` 的便签。」

助手先按模块、日期、现有文字定位记录；如果同一天有多条相似内容，先与你确认，不猜测删除对象。真实日期和内容缺失时，不编造经历，也不把测试数据放入正式内容。完成后只修改本地文件并验收；未明确要求时不 push、不合并分支。

## 数据位置与模块

统一数据源是 `src/data/experiences.json`，纯数据操作函数在 `src/lib/experiences.ts`。

| 模块 | moduleId |
| --- | --- |
| 学校 | `school` |
| 公司 | `company` |
| 实习 | `internship` |
| 工作 | `work` |
| 生活 | `life` |

每张便签都有独立、稳定且全局唯一的 `id`。修改日期、图片或文字不会改变 ID。展示按日期从早到晚排序，同一天的便签保留录入顺序；不需要人为调整 JSON 中的位置。学校页面按年月分组，无内容的月份保持空白。

单条记录的结构如下。这只是格式示例，不应直接写入正式数据：

```json
{
  "id": "稳定且唯一的记录 ID",
  "moduleId": "school",
  "date": "2023-09-12",
  "title": "可选标题",
  "text": "真实文字，可以包含换行。",
  "images": [
    {
      "src": "/images/experiences/school/记录ID/campus.jpg",
      "alt": "图片的实际内容描述"
    }
  ]
}
```

日期必须是真实的 `YYYY-MM-DD` 日期。标题、正文、图片至少有一种；允许纯文字、纯图片或图文混排。每张图片都有地址和替代文字 `alt`，一个便签支持多张图片。

## 命令入口

在项目根目录运行，要求 Node.js 22+。命令共用同一套校验、排序和增删改函数。`--input` 指向本地 JSON 文件；相对路径从当前终端目录计算。

项目也提供短入口：`npm run experience -- list --module school`。以下命令中的 `node --experimental-strip-types scripts/experiences.mjs` 都可以替换为 `npm run experience --`。

```bash
# 查询学校模块，结果包括每条的 ID，按日期排序
node --experimental-strip-types scripts/experiences.mjs list --module school

# 查询所有模块
node --experimental-strip-types scripts/experiences.mjs list

# 新增：note.json 至少包含 date 和 title/text/images 中的一种
# id 可以省略，工具会生成 UUID；moduleId 可省略，由 --module 指定
node --experimental-strip-types scripts/experiences.mjs add --module school --input note.json --dry-run
node --experimental-strip-types scripts/experiences.mjs add --module school --input note.json

# 修改：patch.json 只填写要改的字段，例如 {"text":"新的真实文字"}
node --experimental-strip-types scripts/experiences.mjs update --module school --id 记录ID --input patch.json --dry-run
node --experimental-strip-types scripts/experiences.mjs update --module school --id 记录ID --input patch.json

# 删除：必须同时指定正确的模块和记录 ID
node --experimental-strip-types scripts/experiences.mjs remove --module school --id 记录ID --dry-run
node --experimental-strip-types scripts/experiences.mjs remove --module school --id 记录ID
```

`--dry-run` 会完整校验并输出预计结果，但不会写入数据。若新增时省略 ID，试运行和正式运行会各自生成一个 UUID；以正式运行返回的 ID 为准。需要预先固定图片目录时，可以先生成并在输入中明确填写 ID。

修改正文或标题时，传入空字符串可以清空该字段；`images: []` 可以移除全部图片引用；不使用 `null`。清空后仍需保留至少一种非空标题、文字或图片。不能通过更新修改 ID，也不能用另一个模块的命令改删现有记录。JSON 中没有写到的字段保持不变。

所有变更先校验，成功后通过同目录临时文件原子替换数据文件；失败不会把半写入的数据留在正式 JSON 中。请一次运行一个内容编辑操作，不要同时从多个终端修改同一个数据文件。可用 `--store /绝对路径/测试数据.json` 对另一个已有数据文件操作，测试不要指向正式内容。

## 图片如何接入

1. 助手接收你提供的真实图片后，将要公开展示的版本放到 `public/images/experiences/<moduleId>/<记录ID>/`。使用清晰且不冲突的文件名，避免覆盖其他便签的资源。
2. 数据中的 `src` 优先使用网站根路径，例如 `/images/experiences/school/记录ID/campus.jpg`，不能使用 `/Users/...` 这类电脑路径。也支持完整的 `https://...` 或 `http://...` 图片地址，建议使用 HTTPS 并确认有使用权限；外链可能失效。相对路径、`//...`、`data:`、`blob:`、反斜杠和未编码空白字符会被拒绝，文件名中的空格应编码为 `%20`。
3. 多张图片按照 `images` 数组的顺序展示；修改其中一张时，保留其他图片的引用与顺序。
4. 页面是公开的。发布前检查照片、文字和图片元数据是否含不希望公开的信息。不要在数据文件放账号、密钥或私人文件地址。

命令只处理记录，不上传、下载或删除图片。删除便签仅删除该记录；移除图片引用不会删除图片文件，以免误伤共用资源。需要清理无用图片时，应单独检查所有引用，再确认具体文件。

## 后续复用与验收

其他模块继续使用这一数据源、`listExperiences(store, moduleId)` 和统一增删改接口，不复制一套学校专用内容管理逻辑。新增模块时先登记唯一的模块 ID，再接入对应页面；不需要改动已有便签结构。

每次更新后至少检查日期、目标模块、记录 ID、图片路径、图文内容与页面排序。命令测试使用独立临时目录，不修改正式内容：

```bash
node --experimental-strip-types --test tests/experiences-cli.test.mjs
```
