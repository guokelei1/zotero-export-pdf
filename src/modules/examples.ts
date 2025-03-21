import { getLocaleID, getString } from "../utils/locale";

function example(
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) {
  const original = descriptor.value;
  descriptor.value = function (...args: any) {
    try {
      ztoolkit.log(`Calling example ${target.name}.${String(propertyKey)}`);
      return original.apply(this, args);
    } catch (e) {
      ztoolkit.log(`Error in example ${target.name}.${String(propertyKey)}`, e);
      throw e;
    }
  };
  return descriptor;
}

export class BasicExampleFactory {
  @example
  static registerNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        if (!addon?.data.alive) {
          this.unregisterNotifier(notifierID);
          return;
        }
        addon.hooks.onNotify(event, type, ids, extraData);
      },
    };

    // Register the callback in Zotero as an item observer
    const notifierID = Zotero.Notifier.registerObserver(callback, [
      "tab",
      "item",
      "file",
    ]);

    Zotero.Plugins.addObserver({
      shutdown: ({ id }) => {
        if (id === addon.data.config.addonID)
          this.unregisterNotifier(notifierID);
      },
    });
  }

  @example
  static exampleNotifierCallback() {
    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: "Open Tab Detected!",
        type: "success",
        progress: 100,
      })
      .show();
  }

  @example
  private static unregisterNotifier(notifierID: string) {
    Zotero.Notifier.unregisterObserver(notifierID);
  }

  @example
  static registerPrefs() {
    Zotero.PreferencePanes.register({
      pluginID: addon.data.config.addonID,
      src: rootURI + "content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${addon.data.config.addonRef}/content/icons/iconx2.png`,
    });
  }
}

export class KeyExampleFactory {
  @example
  static registerShortcuts() {
    // Register an event key for Alt+L
    ztoolkit.Keyboard.register((ev, keyOptions) => {
      ztoolkit.log(ev, keyOptions.keyboard);
      if (keyOptions.keyboard?.equals("shift,l")) {
        addon.hooks.onShortcuts("larger");
      }
      if (ev.shiftKey && ev.key === "S") {
        addon.hooks.onShortcuts("smaller");
      }
    });

    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: "Example Shortcuts: Alt+L/S/C",
        type: "success",
      })
      .show();
  }

  @example
  static exampleShortcutLargerCallback() {
    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: "Larger!",
        type: "default",
      })
      .show();
  }

  @example
  static exampleShortcutSmallerCallback() {
    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: "Smaller!",
        type: "default",
      })
      .show();
  }
}

export class UIExampleFactory {
  @example
  static registerStyleSheet(win: Window) {
    const doc = win.document;
    const styles = ztoolkit.UI.createElement(doc, "link", {
      properties: {
        type: "text/css",
        rel: "stylesheet",
        href: `chrome://${addon.data.config.addonRef}/content/zoteroPane.css`,
      },
    });
    doc.documentElement.appendChild(styles);
    doc.getElementById("zotero-item-pane-content")?.classList.add("makeItRed");
  }

  @example
  static registerRightClickMenuItem() {
    const menuIcon = `chrome://${addon.data.config.addonRef}/content/icons/icon.png`;
    // item menuitem with icon
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-itemmenu-addontemplate-test",
      label: getString("menuitem-label"),
      commandListener: (ev) => addon.hooks.onDialogEvents("dialogExample"),
      icon: menuIcon,
    });
  }


  /**
   * 注册文库(Collection)上的右键菜单
   */
  @example
  static registerCollectionRightClickMenuItem() {
    const menuIcon = `chrome://${addon.data.config.addonRef}/content/icons/icon.png`;
    // 为Collection注册右键菜单
    // ztoolkit.Menu.register("collection", {
    //   tag: "menuitem",
    //   id: "zotero-collectionmenu-list-content",
    //   label: "列出当前目录内容",
    //   commandListener: (ev) => this.listCollectionContents(),
    //   icon: menuIcon,
    // });
    ztoolkit.Menu.register("collection", {
      tag: "menuitem",
      id: "zotero-collectionmenu-copy-pdfs",
      label: getString("export-all-pdf"),
      commandListener: (ev) => this.exportAllPDFsInCollection(),
      icon: menuIcon,
    });

  }

  @example
  static registerRightClickMenuPopup(win: Window) {

    const menuIcon = `chrome://${addon.data.config.addonRef}/content/icons/icon.png`;
    // item menuitem with icon
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      label: getString("export-pdf"),
      commandListener: (ev) => this.exportpdf(),
      icon: menuIcon,
    });

    // ztoolkit.Menu.register(
    //   "item",
    //   {
    //     tag: "menu",
    //     label: getString("menupopup-label"),
    //     children: [
    //       // {
    //       //   tag: "menuitem",
    //       //   label: getString("menuitem-submenulabel"),
    //       //   oncommand: "alert('Hello World! Sub Menuitem.')",
    //       // },
    //       // {
    //       //   tag: "menuitem",
    //       //   label: "显示选择的文件夹",
    //       //   commandListener: (ev) => this.istlFilesInFolder(),
    //       // },
    //       {
    //         tag: "menuitem",
    //         label: "复制PDF",
    //         commandListener: (ev) => this.copyfolderpdf(),
    //       },
    //     ],
    //   },
    //   "before",
    //   win.document.querySelector(
    //     "#zotero-itemmenu-addontemplate-test",
    //   ) as XUL.MenuItem,
    // );
  }


  /**
   * 复制当前选中目录中所有论文的PDF附件到设置的文件夹
   */
  static async exportAllPDFsInCollection() {
    try {
      // 获取当前选中的collection
      const collectionsView = ztoolkit.getGlobal("ZoteroPane").collectionsView;
      if (!collectionsView) {
        ztoolkit.getGlobal("alert")("无法获取集合视图");
        return;
      }
      const selectedCollection = collectionsView.getSelectedCollection();

      if (!selectedCollection) {
        ztoolkit.getGlobal("alert")("请先选择一个目录");
        return;
      }

      // 获取设置的全局文件夹路径
      const { getFolderPath } = require("../utils/prefs");
      const targetFolderPath = getFolderPath();

      if (!targetFolderPath) {
        ztoolkit.getGlobal("alert")("未设置目标文件夹，请先在首选项中设置文件夹路径");
        return;
      }

      // 检查目标文件夹是否存在
      const targetDir = (Components as any).classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      targetDir.initWithPath(targetFolderPath);

      if (!targetDir.exists() || !targetDir.isDirectory()) {
        ztoolkit.getGlobal("alert")(`目标文件夹不存在: ${targetFolderPath}`);
        return;
      }

      // 创建进度窗口
      const progressWindow = new ztoolkit.ProgressWindow(addon.data.config.addonName)
        .createLine({
          text: `正在获取目录中的论文...`,
          type: "default",
          progress: 0
        })
        .show();

      // 获取目录中的所有条目
      const collectionItems = selectedCollection.getChildItems();
      const regularItems = [];

      // 过滤出常规条目（论文）
      for (const item of collectionItems) {
        if (item.isRegularItem()) {
          regularItems.push(item);
        }
      }

      if (regularItems.length === 0) {
        progressWindow.changeLine({
          text: "该目录中没有论文",
          type: "error",
          progress: 100
        });
        return;
      }

      progressWindow.changeLine({
        text: `找到 ${regularItems.length} 篇论文`,
        type: "default",
        progress: 20
      });

      // 处理结果统计
      let processedItems = 0;
      let copiedFiles = 0;
      let errorItems = 0;

      // 遍历每个论文条目，获取所有附件名称并复制PDF
      for (const item of regularItems) {
        try {
          const attachments = await item.getAttachments();
          if (attachments && attachments.length > 0) {
            const itemTitle = item.getField("title");

            // 使用条目标题作为文件名，替换掉非法字符
            let found = 0;

            for (const attachmentID of attachments) {
              const attachment = await Zotero.Items.getAsync(attachmentID);
              if (attachment && attachment.isAttachment()) {
                let safeItemTitle = itemTitle;
                // 使用条目标题作为文件名，替换掉非法字符
                if (found > 0) {
                  safeItemTitle = itemTitle.replace(/[\\/:*?"<>|]/g, "_") + `_${found}`;
                } else {
                  safeItemTitle = itemTitle.replace(/[\\/:*?"<>|]/g, "_");
                }
                // 如果是PDF且尚未处理过PDF，则复制它
                const contentType = attachment.getField("contentType");
                //在zotero中输出附件的contentType
                //ztoolkit.log(`附件 ${attachment.getField("title")} 的 contentType: ${contentType}`, "info");
                try {
                  // 获取附件的文件路径
                  const attachmentFilePath = await attachment.getFilePathAsync();

                  if (attachmentFilePath && typeof attachmentFilePath === 'string' && attachmentFilePath.endsWith(".pdf")) {
                    // 创建源文件对象
                    const sourceFile = (Components as any).classes["@mozilla.org/file/local;1"]
                      .createInstance(Components.interfaces.nsIFile);
                    sourceFile.initWithPath(attachmentFilePath);

                    // 创建目标文件对象
                    const targetFile = targetDir.clone();
                    targetFile.append(`${safeItemTitle}.pdf`);

                    // 检查目标文件是否已存在
                    if (targetFile.exists()) {
                      targetFile.remove(false); // 删除已存在的文件
                    }

                    // 复制文件
                    sourceFile.copyTo(targetDir, `${safeItemTitle}.pdf`);
                    copiedFiles++;
                  }
                } catch (e) {
                  ztoolkit.log(`复制附件时出错: ${e}`, "error");
                  errorItems++;
                }

              }
            }
          }
          processedItems++;

          // 更新进度
          const progress = Math.floor((processedItems / regularItems.length) * 80) + 20;
          progressWindow.changeLine({
            text: `复制了 ${copiedFiles} 个PDF文件`,
            type: "default",
            progress: progress
          });
        } catch (error) {
          errorItems++;
          ztoolkit.log(`处理条目时出错: ${error}`, "error");
        }
      }

      // 显示最终结果
      progressWindow.changeLine({
        text: `成功复制 ${copiedFiles} 个PDF文件${errorItems > 0 ? `，${errorItems} 个错误` : ''}`,
        type: errorItems > 0 ? "warning" : "success",
        progress: 100
      });



    } catch (error: any) {
      ztoolkit.log("处理目录PDF时出错:", error);
      ztoolkit.getGlobal("alert")(`处理目录PDF时出错: ${error.message || error}`);
    }
  }

  /**
   * 列出当前选中目录中的所有论文和子目录
   */
  static async listCollectionContents() {
    try {
      // 获取当前选中的collection
      const collectionsView = ztoolkit.getGlobal("ZoteroPane").collectionsView;
      if (!collectionsView) {
        ztoolkit.getGlobal("alert")("无法获取集合视图");
        return;
      }
      const selectedCollection = collectionsView.getSelectedCollection();

      if (!selectedCollection) {
        ztoolkit.getGlobal("alert")("请先选择一个目录");
        return;
      }

      const progressWindow = new ztoolkit.ProgressWindow(addon.data.config.addonName)
        .createLine({
          text: `正在读取目录内容...`,
          type: "default",
          progress: 0
        })
        .show();

      // 获取目录中的所有条目
      const collectionItems = selectedCollection.getChildItems();
      const itemTitles: string[] = [];

      // 遍历条目，获取标题
      for (const item of collectionItems) {
        if (item.isRegularItem()) {
          itemTitles.push(item.getField("title") as string);
        }
      }

      // 获取所有子目录
      const childCollections = selectedCollection.getChildCollections();
      const subCollectionNames: string[] = childCollections.map((c: Zotero.Collection) => c.name);

      // 更新进度窗口
      progressWindow.changeLine({
        text: `找到 ${itemTitles.length} 篇论文和 ${subCollectionNames.length} 个子目录`,
        progress: 100
      });

      // 创建显示内容
      let message = `目录 "${selectedCollection.name}" 的内容:\n\n`;

      if (subCollectionNames.length > 0) {
        message += `子目录 (${subCollectionNames.length}):\n`;
        message += subCollectionNames.map(name => `• ${name}`).join('\n');
        message += '\n\n';
      }

      if (itemTitles.length > 0) {
        message += `论文 (${itemTitles.length}):\n`;
        message += itemTitles.map((title, index) => `${index + 1}. ${title}`).join('\n');
      } else {
        message += '没有论文';
      }

      // 如果内容太多，使用对话框显示而不是alert
      if (itemTitles.length > 10 || message.length > 1000) {
        // 创建一个对话框展示结果
        const dialogData = {
          collectionName: selectedCollection.name,
          itemTitles,
          subCollectionNames,
          loadCallback: () => {
            ztoolkit.log("目录内容对话框已打开");
          }
        };

        const dialogHeight = Math.min(itemTitles.length + subCollectionNames.length + 5, 30);
        const dialogHelper = new ztoolkit.Dialog(dialogHeight, 1)
          .addCell(0, 0, {
            tag: "h2",
            properties: { innerHTML: `目录 "${selectedCollection.name}" 的内容` },
          });

        // 添加子目录部分
        if (subCollectionNames.length > 0) {
          dialogHelper.addCell(1, 0, {
            tag: "h3",
            properties: { innerHTML: `子目录 (${subCollectionNames.length}):` },
          });

          subCollectionNames.forEach((name, index) => {
            dialogHelper.addCell(index + 2, 0, {
              tag: "div",
              properties: { innerHTML: `• ${name}` },
              styles: {
                padding: "2px 5px",
                color: "#2d8ac7",
                fontWeight: "bold"
              }
            });
          });

          // 添加分隔行
          dialogHelper.addCell(subCollectionNames.length + 2, 0, {
            tag: "hr",
            styles: {
              margin: "10px 0"
            }
          });
        }

        // 添加论文部分
        dialogHelper.addCell(subCollectionNames.length + 3, 0, {
          tag: "h3",
          properties: { innerHTML: `论文 (${itemTitles.length}):` },
        });

        if (itemTitles.length > 0) {
          itemTitles.forEach((title, index) => {
            dialogHelper.addCell(subCollectionNames.length + index + 4, 0, {
              tag: "div",
              properties: { innerHTML: `${index + 1}. ${title}` },
              styles: {
                padding: "2px 5px",
                borderBottom: index < itemTitles.length - 1 ? "1px solid #eee" : "none"
              }
            });
          });
        } else {
          dialogHelper.addCell(subCollectionNames.length + 4, 0, {
            tag: "div",
            properties: { innerHTML: "没有论文" },
            styles: {
              padding: "2px 5px",
              fontStyle: "italic",
              color: "#888"
            }
          });
        }

        dialogHelper
          .addButton("关闭", "close")
          .setDialogData(dialogData)
          .open("目录内容");
      } else {
        // 内容较少，直接使用alert显示
        ztoolkit.getGlobal("alert")(message);
      }
    } catch (error: any) {
      ztoolkit.log("读取目录内容时出错:", error);
      ztoolkit.getGlobal("alert")(`读取目录内容时出错: ${error.message || error}`);
    }
  }


  /**
   * 获取当前选中条目的所有附件名称并显示，并复制第一个PDF附件到设置的文件夹
   */
  static async exportpdf() {
    try {
      // 获取当前选中的条目
      const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();

      if (!items || items.length === 0) {
        ztoolkit.getGlobal("alert")("未选择任何条目");
        return;
      }

      const progressWindow = new ztoolkit.ProgressWindow(addon.data.config.addonName)
        .createLine({
          text: `正在处理附件...`,
          type: "default",
          progress: 0
        })
        .show();

      // 获取设置的全局文件夹路径
      const { getFolderPath } = require("../utils/prefs");
      const targetFolderPath = getFolderPath();

      if (!targetFolderPath) {
        progressWindow.changeLine({
          text: "请先在首选项中设置文件夹路径",
          type: "error",
          progress: 100
        });
        return;
      }

      // 检查目标文件夹是否存在
      const targetDir = (Components.classes as any)["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      targetDir.initWithPath(targetFolderPath);

      if (!targetDir.exists() || !targetDir.isDirectory()) {
        progressWindow.changeLine({
          text: `文件夹不存在: ${targetFolderPath}`,
          type: "error",
          progress: 100
        });
        return;
      }

      // 遍历每个选中的条目，获取所有附件名称并复制PDF
      let allAttachments = [];
      let copiedFiles = 0;

      progressWindow.changeLine({
        text: `处理 ${items.length} 个附件...`,
        type: "default",
        progress: 20
      });

      for (const item of items) {
        const attachments = await item.getAttachments();
        let found = 0;
        if (attachments && attachments.length > 0) {
          const itemTitle = item.getField("title");
          const attachmentNames = [];


          for (const attachmentID of attachments) {
            let safeItemTitle = itemTitle;
            // 使用条目标题作为文件名，替换掉非法字符
            if (found > 0) {
              safeItemTitle = itemTitle.replace(/[\\/:*?"<>|]/g, "_") + `_${found}`;
            } else {
              safeItemTitle = itemTitle.replace(/[\\/:*?"<>|]/g, "_");
            }
            found++;
            const attachment = await Zotero.Items.getAsync(attachmentID);

            if (attachment && attachment.isAttachment()) {
              const attachmentName = attachment.getField("title");
              attachmentNames.push(attachmentName);
              //打印附件的源文件名称，包括文件后缀名
              try {
                // 获取附件的文件路径
                const attachmentFilePath = await attachment.getFilePathAsync();
                ztoolkit.log(`附件 ${attachmentName} 的文件路径: ${attachmentFilePath}`, "");
                if (attachmentFilePath && typeof attachmentFilePath === 'string' && attachmentFilePath.endsWith(".pdf")) {
                  // 创建源文件对象
                  const sourceFile = (Components.classes as any)["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsIFile);
                  sourceFile.initWithPath(attachmentFilePath);

                  // 创建目标文件对象
                  const targetFile = targetDir.clone();
                  targetFile.append(`${safeItemTitle}.pdf`);

                  // 检查目标文件是否已存在
                  if (targetFile.exists()) {
                    targetFile.remove(false); // 删除已存在的文件
                  }

                  // 复制文件
                  sourceFile.copyTo(targetDir, `${safeItemTitle}.pdf`);
                  copiedFiles++;
                }
              } catch (e) {
                ztoolkit.log(`复制附件时出错: ${e}`, "error");
              }

            }
          }

          if (attachmentNames.length > 0) {
            allAttachments.push({
              itemTitle: itemTitle,
              attachmentNames: attachmentNames
            });
          }
        }
      }

      progressWindow.changeLine({
        text: `复制了 ${copiedFiles} 个PDF文件`,
        type: "success",
        progress: 100
      });
    } catch (error: any) {
      ztoolkit.log("获取附件信息时出错:", error);
      ztoolkit.getGlobal("alert")(`获取附件信息时出错: ${error.message || error}`);
    }
  }
  /**
   * 打开文件夹，遍历其中的所有文件并打印文件名
   */
  static async istlFilesInFolder() {
    try {
      const { getFolderPath } = require("../utils/prefs");
      let folderPath = getFolderPath();

      // 如果未设置文件夹路径，则提示用户选择一个文件夹
      if (!folderPath) {
        ztoolkit.getGlobal("alert")("未设置文件夹路径，请先选择一个文件夹");
        const folderPicker = new ztoolkit.FilePicker(
          "选择要遍历的文件夹",
          "folder"
        );
        folderPath = await folderPicker.open();

        if (!folderPath) {
          ztoolkit.getGlobal("alert")("您没有选择文件夹，操作取消");
          return;
        }
      }

      // 创建进度窗口
      const progressWindow = new ztoolkit.ProgressWindow(addon.data.config.addonName)
        .createLine({
          text: `正在读取文件夹: ${folderPath}`,
          type: "default",
          progress: 0
        })
        .show();

      // 使用 nsIFile 接口来读取文件夹
      const directory = (Components.classes as any)["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      directory.initWithPath(folderPath);

      // 检查路径是否存在且是文件夹
      if (!directory.exists()) {
        ztoolkit.getGlobal("alert")(`指定的路径 "${folderPath}" 不存在`);
        return;
      }

      if (!directory.isDirectory()) {
        ztoolkit.getGlobal("alert")(`指定的路径 "${folderPath}" 不是一个文件夹`);
        return;
      }

      // 获取文件夹中的所有文件和子文件夹
      const fileList: string[] = [];
      const entries = directory.directoryEntries;

      while (entries.hasMoreElements()) {
        const entry = entries.getNext().QueryInterface(Components.interfaces.nsIFile);
        const isDirectory = entry.isDirectory();
        fileList.push(`${isDirectory ? "[目录] " : "[文件] "}${entry.leafName}`);
      }

      // 更新进度窗口
      progressWindow.changeLine({
        text: `找到 ${fileList.length} 个文件/目录`,
        progress: 100
      });

      // 显示结果
      if (fileList.length > 0) {
        // 创建一个对话框来展示所有文件
        const dialogData = {
          fileList: fileList,
          folderPath: folderPath,
          loadCallback: () => {
            ztoolkit.log("文件列表对话框已打开");
          }
        };

        const dialogHelper = new ztoolkit.Dialog(Math.min(fileList.length + 3, 20), 1)
          .addCell(0, 0, {
            tag: "h2",
            properties: { innerHTML: `文件夹 "${folderPath}" 中的文件列表` },
          })
          .addCell(1, 0, {
            tag: "p",
            properties: { innerHTML: `共有 ${fileList.length} 个文件/目录:` },
          });

        // 添加每个文件到对话框
        fileList.forEach((file, index) => {
          dialogHelper.addCell(index + 2, 0, {
            tag: "div",
            properties: { innerHTML: file },
            styles: {
              padding: "2px 5px",
              borderBottom: index < fileList.length - 1 ? "1px solid #ddd" : "none"
            }
          });
        });

        dialogHelper
          .addButton("关闭", "close")
          .setDialogData(dialogData)
          .open("文件列表");

      } else {
        ztoolkit.getGlobal("alert")(`文件夹 "${folderPath}" 是空的`);
      }

    } catch (error: any) {
      ztoolkit.log("遍历文件夹时出错:", error);
      ztoolkit.getGlobal("alert")(`遍历文件夹时出错: ${error.message || error}`);
    }
  }

  /*
   * 显示用户在首选项中设置的文件夹路径
   */
  static showSelectedFolderPath() {
    const { getFolderPath } = require("../utils/prefs");
    const folderPath = getFolderPath();

    if (folderPath) {
      ztoolkit.getGlobal("alert")(`选择的文件夹路径: ${folderPath}`);
    } else {
      ztoolkit.getGlobal("alert")("您尚未设置文件夹路径。请在插件首选项中设置。");
    }
  }

  @example
  static registerWindowMenuWithSeparator() {
    ztoolkit.Menu.register("menuFile", {
      tag: "menuseparator",
    });
    // menu->File menuitem
    ztoolkit.Menu.register("menuFile", {
      tag: "menuitem",
      label: getString("menuitem-filemenulabel"),
      oncommand: "alert('Hello World! File Menuitem.')",
    });
  }

  @example
  static async registerExtraColumn() {
    const field = "test1";
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "text column",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        return field + String(item.id);
      },
      iconPath: "chrome://zotero/skin/cross.png",
    });
  }

  @example
  static async registerExtraColumnWithCustomCell() {
    const field = "test2";
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "custom column",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        return field + String(item.id);
      },
      renderCell(index, data, column) {
        ztoolkit.log("Custom column cell is rendered!");
        const span = Zotero.getMainWindow().document.createElementNS(
          "http://www.w3.org/1999/xhtml",
          "span",
        );
        span.className = `cell ${column.className}`;
        span.style.background = "#0dd068";
        span.innerText = "⭐" + data;
        return span;
      },
    });
  }

  @example
  static registerItemPaneCustomInfoRow() {
    Zotero.ItemPaneManager.registerInfoRow({
      rowID: "example",
      pluginID: addon.data.config.addonID,
      editable: true,
      label: {
        l10nID: getLocaleID("item-info-row-example-label"),
      },
      position: "afterCreators",
      onGetData: ({ item }) => {
        return item.getField("title");
      },
      onSetData: ({ item, value }) => {
        item.setField("title", value);
      },
    });
  }

  @example
  static registerItemPaneSection() {
    Zotero.ItemPaneManager.registerSection({
      paneID: "example",
      pluginID: addon.data.config.addonID,
      header: {
        l10nID: getLocaleID("item-section-example1-head-text"),
        icon: "chrome://zotero/skin/16/universal/book.svg",
      },
      sidenav: {
        l10nID: getLocaleID("item-section-example1-sidenav-tooltip"),
        icon: "chrome://zotero/skin/20/universal/save.svg",
      },
      onRender: ({ body, item, editable, tabType }) => {
        body.textContent = JSON.stringify({
          id: item?.id,
          editable,
          tabType,
        });
      },
    });
  }

  @example
  static async registerReaderItemPaneSection() {
    Zotero.ItemPaneManager.registerSection({
      paneID: "reader-example",
      pluginID: addon.data.config.addonID,
      header: {
        l10nID: getLocaleID("item-section-example2-head-text"),
        // Optional
        l10nArgs: `{"status": "Initialized"}`,
        // Can also have a optional dark icon
        icon: "chrome://zotero/skin/16/universal/book.svg",
      },
      sidenav: {
        l10nID: getLocaleID("item-section-example2-sidenav-tooltip"),
        icon: "chrome://zotero/skin/20/universal/save.svg",
      },
      // Optional
      bodyXHTML:
        '<html:h1 id="test">THIS IS TEST</html:h1><browser disableglobalhistory="true" remote="true" maychangeremoteness="true" type="content" flex="1" id="browser" style="width: 180%; height: 280px"/>',
      // Optional, Called when the section is first created, must be synchronous
      onInit: ({ item }) => {
        ztoolkit.log("Section init!", item?.id);
      },
      // Optional, Called when the section is destroyed, must be synchronous
      onDestroy: (props) => {
        ztoolkit.log("Section destroy!");
      },
      // Optional, Called when the section data changes (setting item/mode/tabType/inTrash), must be synchronous. return false to cancel the change
      onItemChange: ({ item, setEnabled, tabType }) => {
        ztoolkit.log(`Section item data changed to ${item?.id}`);
        setEnabled(tabType === "reader");
        return true;
      },
      // Called when the section is asked to render, must be synchronous.
      onRender: ({
        body,
        item,
        setL10nArgs,
        setSectionSummary,
        setSectionButtonStatus,
      }) => {
        ztoolkit.log("Section rendered!", item?.id);
        const title = body.querySelector("#test") as HTMLElement;
        title.style.color = "red";
        title.textContent = "LOADING";
        setL10nArgs(`{ "status": "Loading" }`);
        setSectionSummary("loading!");
        setSectionButtonStatus("test", { hidden: true });
      },
      // Optional, can be asynchronous.
      onAsyncRender: async ({
        body,
        item,
        setL10nArgs,
        setSectionSummary,
        setSectionButtonStatus,
      }) => {
        ztoolkit.log("Section secondary render start!", item?.id);
        await Zotero.Promise.delay(1000);
        ztoolkit.log("Section secondary render finish!", item?.id);
        const title = body.querySelector("#test") as HTMLElement;
        title.style.color = "green";
        title.textContent = item.getField("title");
        setL10nArgs(`{ "status": "Loaded" }`);
        setSectionSummary("rendered!");
        setSectionButtonStatus("test", { hidden: false });
      },
      // Optional, Called when the section is toggled. Can happen anytime even if the section is not visible or not rendered
      onToggle: ({ item }) => {
        ztoolkit.log("Section toggled!", item?.id);
      },
      // Optional, Buttons to be shown in the section header
      sectionButtons: [
        {
          type: "test",
          icon: "chrome://zotero/skin/16/universal/empty-trash.svg",
          l10nID: getLocaleID("item-section-example2-button-tooltip"),
          onClick: ({ item, paneID }) => {
            ztoolkit.log("Section clicked!", item?.id);
            Zotero.ItemPaneManager.unregisterSection(paneID);
          },
        },
      ],
    });
  }
}

export class PromptExampleFactory {
  @example
  static registerNormalCommandExample() {
    ztoolkit.Prompt.register([
      {
        name: "Normal Command Test",
        label: "Plugin Template",
        callback(prompt) {
          ztoolkit.getGlobal("alert")("Command triggered!");
        },
      },
    ]);
  }

  @example
  static registerAnonymousCommandExample(window: Window) {
    ztoolkit.Prompt.register([
      {
        id: "search",
        callback: async (prompt) => {
          // https://github.com/zotero/zotero/blob/7262465109c21919b56a7ab214f7c7a8e1e63909/chrome/content/zotero/integration/quickFormat.js#L589
          function getItemDescription(item: Zotero.Item) {
            const nodes = [];
            let str = "";
            let author,
              authorDate = "";
            if (item.firstCreator) {
              author = authorDate = item.firstCreator;
            }
            let date = item.getField("date", true, true) as string;
            if (date && (date = date.substr(0, 4)) !== "0000") {
              authorDate += " (" + parseInt(date) + ")";
            }
            authorDate = authorDate.trim();
            if (authorDate) nodes.push(authorDate);

            const publicationTitle = item.getField(
              "publicationTitle",
              false,
              true,
            );
            if (publicationTitle) {
              nodes.push(`<i>${publicationTitle}</i>`);
            }
            let volumeIssue = item.getField("volume");
            const issue = item.getField("issue");
            if (issue) volumeIssue += "(" + issue + ")";
            if (volumeIssue) nodes.push(volumeIssue);

            const publisherPlace = [];
            let field;
            if ((field = item.getField("publisher")))
              publisherPlace.push(field);
            if ((field = item.getField("place"))) publisherPlace.push(field);
            if (publisherPlace.length) nodes.push(publisherPlace.join(": "));

            const pages = item.getField("pages");
            if (pages) nodes.push(pages);

            if (!nodes.length) {
              const url = item.getField("url");
              if (url) nodes.push(url);
            }

            // compile everything together
            for (let i = 0, n = nodes.length; i < n; i++) {
              const node = nodes[i];

              if (i != 0) str += ", ";

              if (typeof node === "object") {
                const label =
                  Zotero.getMainWindow().document.createElement("label");
                label.setAttribute("value", str);
                label.setAttribute("crop", "end");
                str = "";
              } else {
                str += node;
              }
            }
            if (str.length) str += ".";
            return str;
          }
          function filter(ids: number[]) {
            ids = ids.filter(async (id) => {
              const item = (await Zotero.Items.getAsync(id)) as Zotero.Item;
              return item.isRegularItem() && !(item as any).isFeedItem;
            });
            return ids;
          }
          const text = prompt.inputNode.value;
          prompt.showTip("Searching...");
          const s = new Zotero.Search();
          s.addCondition("quicksearch-titleCreatorYear", "contains", text);
          s.addCondition("itemType", "isNot", "attachment");
          let ids = await s.search();
          // prompt.exit will remove current container element.
          // @ts-ignore ignore
          prompt.exit();
          const container = prompt.createCommandsContainer();
          container.classList.add("suggestions");
          ids = filter(ids);
          console.log(ids.length);
          if (ids.length == 0) {
            const s = new Zotero.Search();
            const operators = [
              "is",
              "isNot",
              "true",
              "false",
              "isInTheLast",
              "isBefore",
              "isAfter",
              "contains",
              "doesNotContain",
              "beginsWith",
            ];
            let hasValidCondition = false;
            let joinMode = "all";
            if (/\s*\|\|\s*/.test(text)) {
              joinMode = "any";
            }
            text.split(/\s*(&&|\|\|)\s*/g).forEach((conditinString: string) => {
              const conditions = conditinString.split(/\s+/g);
              if (
                conditions.length == 3 &&
                operators.indexOf(conditions[1]) != -1
              ) {
                hasValidCondition = true;
                s.addCondition(
                  "joinMode",
                  joinMode as _ZoteroTypes.Search.Operator,
                  "",
                );
                s.addCondition(
                  conditions[0] as string,
                  conditions[1] as _ZoteroTypes.Search.Operator,
                  conditions[2] as string,
                );
              }
            });
            if (hasValidCondition) {
              ids = await s.search();
            }
          }
          ids = filter(ids);
          console.log(ids.length);
          if (ids.length > 0) {
            ids.forEach((id: number) => {
              const item = Zotero.Items.get(id);
              const title = item.getField("title");
              const ele = ztoolkit.UI.createElement(window.document, "div", {
                namespace: "html",
                classList: ["command"],
                listeners: [
                  {
                    type: "mousemove",
                    listener: function () {
                      // @ts-ignore ignore
                      prompt.selectItem(this);
                    },
                  },
                  {
                    type: "click",
                    listener: () => {
                      prompt.promptNode.style.display = "none";
                      ztoolkit.getGlobal("Zotero_Tabs").select("zotero-pane");
                      ztoolkit.getGlobal("ZoteroPane").selectItem(item.id);
                    },
                  },
                ],
                styles: {
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "start",
                },
                children: [
                  {
                    tag: "span",
                    styles: {
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                    properties: {
                      innerText: title,
                    },
                  },
                  {
                    tag: "span",
                    styles: {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                    properties: {
                      innerHTML: getItemDescription(item),
                    },
                  },
                ],
              });
              container.appendChild(ele);
            });
          } else {
            // @ts-ignore ignore
            prompt.exit();
            prompt.showTip("Not Found.");
          }
        },
      },
    ]);
  }

  @example
  static registerConditionalCommandExample() {
    ztoolkit.Prompt.register([
      {
        name: "Conditional Command Test",
        label: "Plugin Template",
        // The when function is executed when Prompt UI is woken up by `Shift + P`, and this command does not display when false is returned.
        when: () => {
          const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
          return items.length > 0;
        },
        callback(prompt) {
          prompt.inputNode.placeholder = "Hello World!";
          const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
          ztoolkit.getGlobal("alert")(
            `You select ${items.length} items!\n\n${items
              .map(
                (item, index) =>
                  String(index + 1) + ". " + item.getDisplayTitle(),
              )
              .join("\n")}`,
          );
        },
      },
    ]);
  }
}

export class HelperExampleFactory {
  @example
  static async dialogExample() {
    const dialogData: { [key: string | number]: any } = {
      inputValue: "test",
      checkboxValue: true,
      loadCallback: () => {
        ztoolkit.log(dialogData, "Dialog Opened!");
      },
      unloadCallback: () => {
        ztoolkit.log(dialogData, "Dialog closed!");
      },
    };
    const dialogHelper = new ztoolkit.Dialog(10, 2)
      .addCell(0, 0, {
        tag: "h1",
        properties: { innerHTML: "Helper Examples" },
      })
      .addCell(1, 0, {
        tag: "h2",
        properties: { innerHTML: "Dialog Data Binding" },
      })
      .addCell(2, 0, {
        tag: "p",
        properties: {
          innerHTML:
            "Elements with attribute 'data-bind' are binded to the prop under 'dialogData' with the same name.",
        },
        styles: {
          width: "200px",
        },
      })
      .addCell(3, 0, {
        tag: "label",
        namespace: "html",
        attributes: {
          for: "dialog-checkbox",
        },
        properties: { innerHTML: "bind:checkbox" },
      })
      .addCell(
        3,
        1,
        {
          tag: "input",
          namespace: "html",
          id: "dialog-checkbox",
          attributes: {
            "data-bind": "checkboxValue",
            "data-prop": "checked",
            type: "checkbox",
          },
          properties: { label: "Cell 1,0" },
        },
        false,
      )
      .addCell(4, 0, {
        tag: "label",
        namespace: "html",
        attributes: {
          for: "dialog-input",
        },
        properties: { innerHTML: "bind:input" },
      })
      .addCell(
        4,
        1,
        {
          tag: "input",
          namespace: "html",
          id: "dialog-input",
          attributes: {
            "data-bind": "inputValue",
            "data-prop": "value",
            type: "text",
          },
        },
        false,
      )
      .addCell(5, 0, {
        tag: "h2",
        properties: { innerHTML: "Toolkit Helper Examples" },
      })
      .addCell(
        6,
        0,
        {
          tag: "button",
          namespace: "html",
          attributes: {
            type: "button",
          },
          listeners: [
            {
              type: "click",
              listener: (e: Event) => {
                addon.hooks.onDialogEvents("clipboardExample");
              },
            },
          ],
          children: [
            {
              tag: "div",
              styles: {
                padding: "2.5px 15px",
              },
              properties: {
                innerHTML: "example:clipboard",
              },
            },
          ],
        },
        false,
      )
      .addCell(
        7,
        0,
        {
          tag: "button",
          namespace: "html",
          attributes: {
            type: "button",
          },
          listeners: [
            {
              type: "click",
              listener: (e: Event) => {
                addon.hooks.onDialogEvents("filePickerExample");
              },
            },
          ],
          children: [
            {
              tag: "div",
              styles: {
                padding: "2.5px 15px",
              },
              properties: {
                innerHTML: "example:filepicker",
              },
            },
          ],
        },
        false,
      )
      .addCell(
        8,
        0,
        {
          tag: "button",
          namespace: "html",
          attributes: {
            type: "button",
          },
          listeners: [
            {
              type: "click",
              listener: (e: Event) => {
                addon.hooks.onDialogEvents("progressWindowExample");
              },
            },
          ],
          children: [
            {
              tag: "div",
              styles: {
                padding: "2.5px 15px",
              },
              properties: {
                innerHTML: "example:progressWindow",
              },
            },
          ],
        },
        false,
      )
      .addCell(
        9,
        0,
        {
          tag: "button",
          namespace: "html",
          attributes: {
            type: "button",
          },
          listeners: [
            {
              type: "click",
              listener: (e: Event) => {
                addon.hooks.onDialogEvents("vtableExample");
              },
            },
          ],
          children: [
            {
              tag: "div",
              styles: {
                padding: "2.5px 15px",
              },
              properties: {
                innerHTML: "example:virtualized-table",
              },
            },
          ],
        },
        false,
      )
      .addButton("Confirm", "confirm")
      .addButton("Cancel", "cancel")
      .addButton("Help", "help", {
        noClose: true,
        callback: (e) => {
          dialogHelper.window?.alert(
            "Help Clicked! Dialog will not be closed.",
          );
        },
      })
      .setDialogData(dialogData)
      .open("Dialog Example");
    addon.data.dialog = dialogHelper;
    await dialogData.unloadLock.promise;
    addon.data.dialog = undefined;
    if (addon.data.alive)
      ztoolkit.getGlobal("alert")(
        `Close dialog with ${dialogData._lastButtonId}.\nCheckbox: ${dialogData.checkboxValue}\nInput: ${dialogData.inputValue}.`,
      );
    ztoolkit.log(dialogData);
  }

  @example
  static clipboardExample() {
    new ztoolkit.Clipboard()
      .addText(
        "![Plugin Template](https://github.com/windingwind/zotero-plugin-template)",
        "text/unicode",
      )
      .addText(
        '<a href="https://github.com/windingwind/zotero-plugin-template">Plugin Template</a>',
        "text/html",
      )
      .copy();
    ztoolkit.getGlobal("alert")("Copied!");
  }

  @example
  static async filePickerExample() {
    const path = await new ztoolkit.FilePicker(
      "Import File",
      "open",
      [
        ["PNG File(*.png)", "*.png"],
        ["Any", "*.*"],
      ],
      "image.png",
    ).open();
    ztoolkit.getGlobal("alert")(`Selected ${path}`);
  }

  @example
  static progressWindowExample() {
    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: "ProgressWindow Example!",
        type: "success",
        progress: 100,
      })
      .show();
  }

  @example
  static vtableExample() {
    ztoolkit.getGlobal("alert")("See src/modules/preferenceScript.ts");
  }
}
