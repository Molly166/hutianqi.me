# Hu Tianqi Handwriting

这是网站自用手写字体的源文件目录。网页中的文字仍然是可选择、可复制、可被搜索引擎读取的 Unicode 文本；字体文件只负责把字符显示成手写字形。

## 目录

- `charset.txt`：当前网站要求覆盖的字符。
- `glyphs.json`：字符、Unicode、PDF 页码和 600 DPI 裁切坐标。
- `originals/`：用户单独提供、需要长期保留的原始单字图片。
- `glyphs/`：从手写稿中抽出的原始字形图片。
- `scripts/extract_glyphs.py`：从 PDF 重建字形图片。
- `scripts/build_font.py`：清理图片、矢量化轮廓并生成 TTF/WOFF2。

## 第一次准备环境

在仓库根目录执行：

```bash
python3 -m venv .venv-font
.venv-font/bin/pip install -r requirements-font.txt
```

## 从原稿提取字形

```bash
.venv-font/bin/python font-src/scripts/extract_glyphs.py \
  --pdf "/Users/bytedance/Downloads/草帖.pdf"
```

提取脚本会严格按照 `glyphs.json` 的来源与坐标生成 `glyphs/U+XXXX.png`。来源可以是 PDF 页码，也可以是 `originals/` 中的独立单字图片。如果重新扫描了原稿，应先核对裁切坐标再覆盖这些源图片。

## 构建字体

```bash
.venv-font/bin/python font-src/scripts/build_font.py
```

输出：

- `public/fonts/hu-tianqi-handwriting.ttf`：母版字体。
- `public/fonts/hu-tianqi-handwriting.woff2`：网站实际加载的压缩字体。

构建会检查 `charset.txt`；缺少任何目标字形都会直接失败，避免网页静默回退为系统字体。

## 扩充字符

1. 在清晰白纸上单独书写新字符，字符之间留足空白；同一字建议写 3 个版本。
2. 扫描为 600 DPI 灰度图或 PDF。
3. 在 `glyphs.json` 添加字符、Unicode、页码与裁切坐标。
4. 在 `charset.txt` 添加网站实际会出现的新字符。
5. 重新提取、构建，并在浏览器中逐字检查。

当前版本是网站首屏子集，只覆盖“欢迎光临”。要让后续整站文案都保持同一字体，需要在文案确定后继续补齐字符；不能用四个字自动推导出其余汉字。
