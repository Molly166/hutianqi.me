# 经历便签管理

这是一个本地内容管理能力，不是访客留言系统或网站后台。每个事件单独保存在一个 JSON 文件中；不存在需要不断扩大的 `entries` 总表。

## 不借助助手时，在哪里添加

在对应模块目录中新建一个 JSON 文件：

```text
src/data/experiences/
├── school/       学校
├── company/      公司
├── internship/   实习
├── work/         工作
├── life/         生活
└── watch/        观影
```

文件名以事件日期开头。某天只有一条时使用 `YYYY-MM-DD.json`；同一天有多条时依次使用 `YYYY-MM-DD-01.json`、`YYYY-MM-DD-02.json`。文件名日期必须和 JSON 中的 `date` 一致。同一天的展示顺序是无后缀文件在前，其后按后缀字典序排列。

例如，学校事件可以放在：

```text
src/data/experiences/school/2023-09-12.json
```

文件本身只写这一件事，不要包一层数组，也不要填写 `moduleId`：

```json
{
  "id": "school-2023-09-12",
  "date": "2023-09-12",
  "title": "初入校园",
  "text": "今天正式开始大学生活。",
  "textEn": "Today marks the beginning of my university life.",
  "images": [
    {
      "src": "/images/experiences/school/2023-09-12/campus.jpg",
      "alt": "初入校园时拍摄的校园照片"
    }
  ]
}
```

`moduleId` 由父目录推断，`id` 由模块和文件名共同确定：`school/2023-09-12.json` 的 ID 必须是 `school-2023-09-12`，`school/2023-09-12-01.json` 的 ID 必须是 `school-2023-09-12-01`。标题、正文或图片更新不会改变 ID；日期更新会同步改变文件名和 ID。

日期必须是实际存在的 `YYYY-MM-DD` 日期。`title`、`text`、`textEn`、`images` 至少有一项有效内容；允许纯文字、纯图片或图文混排。中文正文写在 `text`，对应英文写在 `textEn`，页面会依次展示。每张图片都必须包含网站地址和替代文字 `alt`。

手工添加后，在项目根目录运行：

```bash
npm run experience -- list --module school
npm test
npm run build
```

这些命令会检查文件名、日期、模块、全局重复 ID 和内容格式。学校与观影详情页已经接入展示，其他模块可以先保存内容，后续再接入页面。

## 使用命令增删改查

命令要求 Node.js 22+。`--input` 指向一个本地 JSON 文件，相对路径从当前终端目录计算。

```bash
# 查询学校模块；不传 --module 时查询全部模块
npm run experience -- list --module school
npm run experience -- list

# 新增；note.json 通常省略 id，命令按模块、日期自动生成
npm run experience -- add --module school --input note.json --dry-run
npm run experience -- add --module school --input note.json

# 修改；patch.json 只填写要改的 date/title/text/textEn/images
npm run experience -- update --module school --id 记录ID --input patch.json --dry-run
npm run experience -- update --module school --id 记录ID --input patch.json

# 删除；必须同时给出正确模块和当前 ID
npm run experience -- remove --module school --id 记录ID --dry-run
npm run experience -- remove --module school --id 记录ID
```

新增输入只允许 `id`、`date`、`title`、`text`、`textEn`、`images`；其中 `id` 建议省略，`date` 必填。命令会选择当天编号最小的空闲位置：第一条是 `YYYY-MM-DD.json` 和 `<module>-YYYY-MM-DD`，后续是 `-01`、`-02`。如果明确填写 ID，它必须正好等于这次应生成的 ID。输出的 `file` 和 `entry.id` 是最终结果；相同目录状态下，试运行和正式运行的结果一致。

更新输入只允许 `date`、`title`、`text`、`textEn`、`images`，不能直接填写 `id` 或移动模块。未出现的字段保持不变；用空字符串清空标题、中文正文或英文正文，用 `images: []` 清空图片引用，不使用 `null`。清空后仍需至少保留一种有效内容。修改日期时，命令会优先保留原来的同日序号；如该位置已占用，则选择新日期下编号最小的空闲位置，并同步修改 ID。输出中的 `previousId`、`previousFile` 和新的 `entry.id`、`file` 会明确列出变化。

`--dry-run` 会执行完整读取、查找、合并和校验，但不会创建、替换、重命名或删除任何文件。测试其他数据目录时使用 `--root /绝对路径/experiences`；旧的 `--store` 单文件参数已移除。

每次真实操作只写目标事件：

- 新增先写同目录临时文件，再发布为新的事件文件，绝不覆盖同名文件。
- 更新先检查原文件没有被改动，再用完整的新 JSON 原子替换；日期变化时发布新日期文件并移除旧文件。
- 删除再次确认原文件未变化后，只删除该事件 JSON。
- 失败会清理本次临时文件，不会重写其他事件。

请一次只运行一个内容编辑操作，也不要在命令执行时同时手工修改目标文件。

## 图片如何接入

公开图片建议放在：

```text
public/images/experiences/<moduleId>/<事件文件名去掉.json>/
```

数据中的 `src` 使用网站根路径，例如 `/images/experiences/school/2023-09-12/campus.jpg`，不能填写 `/Users/...` 这类电脑路径。也支持完整的 `https://` 或 `http://` 地址。相对路径、`//...`、`data:`、`blob:`、反斜杠和未编码空白会被拒绝；文件名中的空格应写成 `%20`。

命令只维护 JSON 引用，不上传、下载或删除图片文件：

- 更新时未填写 `images`，原图片列表完整保留。
- `images: []` 只移除引用，不删除磁盘图片。
- 删除事件只删除该 JSON，不删除其图片目录。
- 修改事件日期不会自动搬动图片；现有 `src` 和图片目录会原样保留。

需要清理无用图片时，应先检查所有事件引用，再单独确认具体资源，避免误删共用图片。

## 提供内容给助手时

直接说明「模块 + 操作 + 内容」即可，例如：

- 「学校，新增：2023 年 9 月 12 日，文字是……，配这两张图片。」
- 「学校，修改：把 ID 为 `xxx` 的第二张图片换成这张。」
- 「生活，删除：删掉 ID 为 `xxx` 的便签。」

如果同一天有多条相似内容，助手会先确认目标，不猜测删除对象。真实日期或内容缺失时，不编造经历，也不把测试数据写入正式目录。未明确要求时，不 push、不合并分支。
