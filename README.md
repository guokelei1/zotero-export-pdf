# Zotero PDF Export

[![zotero target version](https://img.shields.io/badge/Zotero-7--9-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

This plugin supports [Zotero](https://www.zotero.org/) 7 through 9.

[English](doc/README-en.md) | [简体中文](README.md)

## 介绍

`Zotero PDF Export` 是一个旨在快速导出 Zotero 中论文附件 PDF 和笔记到指定文件夹的工具。该工具的主要目的是方便批量导出 PDF 文件和笔记，以便进行进一步的 AI 辅助阅读。

## 功能

- 快速将 Zotero 中的论文 PDF 附件导出到本地文件夹。
- 快速将 Zotero 中的论文笔记导出到本地文件夹（Markdown 格式）。
- 在编辑-设置中设置导出目录，方便用户管理导出的 PDF 文件和笔记。
- 支持批量导出指定论文或目录下所有 PDF 附件，并根据论文条目的名称重命名附件。
- 支持批量导出指定论文或目录下所有笔记，笔记会保存在以当前时间命名的子文件夹中。

## 使用方法

### 1. 设置导出目录

首先，在 Zotero 的 **编辑 > 设置** 中设置导出文件的目录：

- **PDF导出文件夹路径**：指定你希望导出 PDF 文件的文件夹路径。
- **笔记导出文件夹路径**：指定你希望导出笔记的文件夹路径。

(MAC 下是 Zotero - 设置)

### 2. 导出论文或目录下的 PDF

- 在 Zotero 中选择一个论文条目或者一个目录。
- 右键点击该条目或目录，选择 **导出PDF** 选项。
- 所有该条目或目录下的 PDF 附件将会被导出到你在设置中指定的 PDF 文件夹中。
- 所有导出的 PDF 会根据论文条目的名称进行重命名。

### 3. 导出论文或目录下的笔记

- 在 Zotero 中选择一个论文条目或者一个目录。
- 右键点击该条目或目录，选择 **导出笔记** 选项。
- 所有该条目或目录下的笔记将会被导出到你在设置中指定的笔记文件夹中。
- 笔记会保存在以当前时间命名的子文件夹中（格式：YYYYMMDD_HHMMSS），方便区分不同批次的导出。
- 笔记以 Markdown 格式保存，包含论文标题和完整的笔记内容。

### 4. 附加注意事项

- **目录子目录**：当前版本不会导出目录下子目录中的 PDF 文件和笔记，仅处理目录下的直接论文条目。
- **多个 PDF 附件**：如果论文存在多个 PDF 附件，附件末尾将会自动添加数字标号以区分不同的附件。
- **多个笔记**：如果论文存在多个笔记，笔记文件名末尾会添加 `_note1`、`_note2` 等标号。
- **笔记格式**：导出的笔记为 Markdown 格式，可以用任何 Markdown 编辑器打开查看，也方便进行进一步处理。

## 示例

### PDF 导出示例

假设你有一个名为 "Research Paper A" 的论文条目，包含两个 PDF 附件，这两个文件会被导出并重命名为：

- `Research Paper A.pdf`
- `Research Paper A_1.pdf`

### 笔记导出示例

假设你在 2024年1月15日 14:30:00 导出笔记，笔记会保存在：

```
笔记导出文件夹/
└── 20240115_143000/
    ├── Research Paper A.md
    ├── Research Paper B_note1.md
    └── Research Paper B_note2.md
```

# 计划

1. 添加选项，选择是否处理所有子目录中的pdf文件和笔记
2. 添加选项，目录导出时，可以在导出文件夹中创建子文件夹存放目录下所有PDF
