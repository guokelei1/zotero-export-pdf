# Zotero PDF Export

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

This is a plugin template for [Zotero](https://www.zotero.org/).

[English](doc/README-en.md) | [简体中文](doc/README.md)



## Introduction

`Zotero PDF Export` is a tool designed to quickly export PDF attachments of papers from Zotero to a specified folder. The main purpose of this tool is to facilitate batch exporting of PDF files for further AI-assisted reading.

## Features

- Quickly export Zotero paper PDF attachments to a local folder.
- Set the export directory in **Edit > Preferences** to easily manage the exported PDF files.
- Support batch export of all PDF attachments from a specific paper or folder, and rename the attachments according to the paper's title.

## Usage

### 1. Set the Export Directory

First, set the directory for exporting files in Zotero under **Edit > Preferences**. Specify the folder path where you want the PDF files to be exported.
(Mac: Zotero > Preferences)

### 2. Export PDFs of Papers or Folders

- In Zotero, select a paper entry or a folder.
- Right-click the entry or folder, and choose the **Export PDF** option.
- All PDF attachments from the selected entry or folder will be exported to the folder you specified in the settings.
- The exported PDFs will be renamed according to the paper's title.

### 3. Additional Notes

- **Subdirectories in Folders**: The current version does not export PDFs from subdirectories within folders, only the direct paper entries under the folder.
- **Multiple PDF Attachments**: If a paper has multiple PDF attachments, a numerical suffix will be added to the end of each file name to distinguish the attachments.

## Example

Suppose you have a paper entry called "Research Paper A" with two PDF attachments, `Research_Paper_A.pdf` and `Research_Paper_A_2.pdf`. These two files will be exported and renamed as:

- `Research Paper A.pdf`
- `Research Paper A_1.pdf`
