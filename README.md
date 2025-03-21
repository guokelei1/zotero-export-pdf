#  Zotero PDF Export

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

This is a plugin template for [Zotero](https://www.zotero.org/).

[English](doc/README-en.md) | [简体中文](doc/README.md) 


## 介绍

`Zotero PDF Export` 是一个旨在快速导出 Zotero 中论文附件 PDF 到指定文件夹的工具。该工具的主要目的是方便批量导出 PDF 文件，以便进行进一步的 AI 辅助阅读。

## 功能

- 快速将 Zotero 中的论文 PDF 附件导出到本地文件夹。
- 在编辑-设置中设置导出目录，方便用户管理导出的 PDF 文件。
- 支持批量导出指定论文或目录下所有 PDF 附件，并根据论文条目的名称重命名附件。
  
## 使用方法

### 1. 设置导出目录

首先，在 Zotero 的 **编辑 > 设置** 中设置导出文件的目录。指定一个你希望导出 PDF 文件的文件夹路径。

### 2. 导出论文或目录下的 PDF

- 在 Zotero 中选择一个论文条目或者一个目录。
- 右键点击该条目或目录，选择 **导出PDF** 选项。
- 所有该条目或目录下的 PDF 附件将会被导出到你在设置中指定的文件夹中。
- 所有导出的 PDF 会根据论文条目的名称进行重命名。

### 3. 附加注意事项

- **目录子目录**：当前版本不会导出目录下子目录中的 PDF 文件，仅处理目录下的直接论文条目。
- **多个 PDF 附件**：如果论文存在多个 PDF 附件，附件末尾将会自动添加数字标号以区分不同的附件。

## 示例

假设你有一个名为 "Research Paper A" 的论文条目，包含两个 PDF 附件，分别是 `Research_Paper_A.pdf` 和 `Research_Paper_A_2.pdf`，这两个文件会被导出并重命名为：

- `Research Paper A.pdf`
- `Research Paper A_1.pdf`


