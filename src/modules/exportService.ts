import { getString } from "../utils/locale";
import { getFolderPath, getNoteFolderPath } from "../utils/prefs";

const MENU_IDS = [
  "zotero-export-pdf-item-pdf",
  "zotero-export-pdf-item-notes",
  "zotero-export-pdf-collection-pdf",
  "zotero-export-pdf-collection-notes",
] as const;

type ExportStats = {
  exported: number;
  errors: number;
};

export function registerExportMenus(win: Window): void {
  unregisterExportMenus(win);

  addMenuItem(
    win,
    "zotero-itemmenu",
    MENU_IDS[0],
    getString("export-pdf"),
    () => exportSelectedPDFs(win),
  );
  addMenuItem(
    win,
    "zotero-itemmenu",
    MENU_IDS[1],
    getString("export-note"),
    () => exportSelectedNotes(win),
  );
  addMenuItem(
    win,
    "zotero-collectionmenu",
    MENU_IDS[2],
    getString("export-pdf"),
    () => exportCollectionPDFs(win),
  );
  addMenuItem(
    win,
    "zotero-collectionmenu",
    MENU_IDS[3],
    getString("export-note"),
    () => exportCollectionNotes(win),
  );
}

export function unregisterExportMenus(win: Window): void {
  for (const id of MENU_IDS) {
    win.document.getElementById(id)?.remove();
  }
}

function addMenuItem(
  win: Window,
  popupID: string,
  id: string,
  label: string,
  command: () => Promise<void>,
): void {
  const popup = win.document.getElementById(popupID);
  if (!popup) {
    ztoolkit.log(`Menu popup not found: ${popupID}`);
    return;
  }

  const menuItem = win.document.createXULElement("menuitem");
  menuItem.id = id;
  menuItem.setAttribute("label", label);
  if (!Zotero.isMac) {
    menuItem.classList.add("menuitem-iconic");
  }
  menuItem.setAttribute(
    "style",
    `list-style-image: url(chrome://${addon.data.config.addonRef}/content/icons/icon.png)`,
  );
  menuItem.addEventListener("command", () => {
    void command().catch((error) => {
      ztoolkit.log("Export command failed", error);
      win.alert(
        getString("error-export", {
          args: { message: getErrorMessage(error) },
        }),
      );
    });
  });
  popup.append(menuItem);
}

async function exportSelectedPDFs(win: Window): Promise<void> {
  const items = getZoteroPane(win).getSelectedItems();
  if (!items.length) {
    win.alert(getString("error-no-items"));
    return;
  }

  await runPDFExport(win, items, getFolderPath());
}

async function exportCollectionPDFs(win: Window): Promise<void> {
  const collection = getZoteroPane(win).getSelectedCollection();
  if (!collection) {
    win.alert(getString("error-no-collection"));
    return;
  }

  const items = collection
    .getChildItems()
    .filter((item) => item.isRegularItem());
  if (!items.length) {
    win.alert(getString("error-empty-collection"));
    return;
  }

  await runPDFExport(win, items, getFolderPath());
}

async function runPDFExport(
  win: Window,
  items: Zotero.Item[],
  targetDirectory: string,
): Promise<void> {
  if (!targetDirectory) {
    win.alert(getString("error-no-pdf-folder"));
    return;
  }

  try {
    await assertDirectory(targetDirectory);
  } catch (error) {
    win.alert(
      getString("error-invalid-folder", { args: { path: targetDirectory } }),
    );
    ztoolkit.log("Invalid PDF export folder", error);
    return;
  }

  const progressWindow = createProgressWindow(
    win,
    getString("pdf-progress-start", { args: { total: items.length } }),
  );

  const stats: ExportStats = { exported: 0, errors: 0 };
  const usedNames = new Set<string>();
  const seenAttachments = new Set<number>();

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    try {
      const attachments = await getPDFAttachments(item);
      const baseName = sanitizeFilename(getItemTitle(item));

      for (let pdfIndex = 0; pdfIndex < attachments.length; pdfIndex++) {
        const attachment = attachments[pdfIndex];
        if (seenAttachments.has(attachment.id)) {
          continue;
        }
        seenAttachments.add(attachment.id);

        try {
          const sourcePath = await attachment.getFilePathAsync();
          if (!sourcePath) {
            throw new Error("Attachment has no local file");
          }

          const numberedName =
            pdfIndex === 0 ? baseName : `${baseName}_${pdfIndex}`;
          const fileName = reserveFilename(numberedName, ".pdf", usedNames);
          await IOUtils.copy(
            sourcePath,
            PathUtils.join(targetDirectory, fileName),
            { noOverwrite: false },
          );
          stats.exported++;
        } catch (error) {
          stats.errors++;
          ztoolkit.log(`Failed to export attachment ${attachment.id}`, error);
        }
      }
    } catch (error) {
      stats.errors++;
      ztoolkit.log(`Failed to process item ${item.id}`, error);
    }

    progressWindow.changeLine({
      text: getString("pdf-progress", {
        args: {
          current: index + 1,
          total: items.length,
          count: stats.exported,
        },
      }),
      type: "default",
      progress: Math.round(((index + 1) / items.length) * 100),
    });
  }

  finishProgress(
    progressWindow,
    getString("pdf-done", {
      args: { count: stats.exported, errors: stats.errors },
    }),
    stats.errors,
  );
}

async function getPDFAttachments(item: Zotero.Item): Promise<Zotero.Item[]> {
  if (item.isPDFAttachment()) {
    return [item];
  }
  if (!item.isRegularItem()) {
    return [];
  }

  const attachments = await Zotero.Items.getAsync(item.getAttachments());
  return attachments.filter((attachment) => attachment.isPDFAttachment());
}

async function exportSelectedNotes(win: Window): Promise<void> {
  const items = getZoteroPane(win).getSelectedItems();
  if (!items.length) {
    win.alert(getString("error-no-items"));
    return;
  }

  await runNoteExport(win, items, getNoteFolderPath());
}

async function exportCollectionNotes(win: Window): Promise<void> {
  const collection = getZoteroPane(win).getSelectedCollection();
  if (!collection) {
    win.alert(getString("error-no-collection"));
    return;
  }

  const items = collection
    .getChildItems()
    .filter((item) => item.isRegularItem());
  if (!items.length) {
    win.alert(getString("error-empty-collection"));
    return;
  }

  await runNoteExport(win, items, getNoteFolderPath());
}

async function runNoteExport(
  win: Window,
  items: Zotero.Item[],
  targetDirectory: string,
): Promise<void> {
  if (!targetDirectory) {
    win.alert(getString("error-no-note-folder"));
    return;
  }

  try {
    await assertDirectory(targetDirectory);
  } catch (error) {
    win.alert(
      getString("error-invalid-folder", { args: { path: targetDirectory } }),
    );
    ztoolkit.log("Invalid note export folder", error);
    return;
  }

  const timestamp = formatTimestamp(new Date());
  const outputDirectory = await IOUtils.createUniqueDirectory(
    targetDirectory,
    timestamp,
  );
  const progressWindow = createProgressWindow(
    win,
    getString("note-progress-start", { args: { total: items.length } }),
  );

  const stats: ExportStats = { exported: 0, errors: 0 };
  const usedNames = new Set<string>();
  const seenNotes = new Set<number>();

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    try {
      const notes = await getNotes(item);
      const title = getItemTitle(item);
      const baseName = sanitizeFilename(title);

      for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) {
        const note = notes[noteIndex];
        if (seenNotes.has(note.id)) {
          continue;
        }
        seenNotes.add(note.id);

        try {
          const numberedName =
            notes.length === 1 ? baseName : `${baseName}_note${noteIndex + 1}`;
          const fileName = reserveFilename(numberedName, ".md", usedNames);
          const content = `# ${title}\n\n${htmlToMarkdown(note.getNote())}`;
          await IOUtils.writeUTF8(
            PathUtils.join(outputDirectory, fileName),
            content,
            { mode: "overwrite" },
          );
          stats.exported++;
        } catch (error) {
          stats.errors++;
          ztoolkit.log(`Failed to export note ${note.id}`, error);
        }
      }
    } catch (error) {
      stats.errors++;
      ztoolkit.log(`Failed to process item ${item.id}`, error);
    }

    progressWindow.changeLine({
      text: getString("note-progress", {
        args: {
          current: index + 1,
          total: items.length,
          count: stats.exported,
        },
      }),
      type: "default",
      progress: Math.round(((index + 1) / items.length) * 100),
    });
  }

  finishProgress(
    progressWindow,
    getString("note-done", {
      args: {
        count: stats.exported,
        errors: stats.errors,
        folder: PathUtils.filename(outputDirectory),
      },
    }),
    stats.errors,
  );
}

async function getNotes(item: Zotero.Item): Promise<Zotero.Item[]> {
  if (item.isNote()) {
    return [item];
  }
  if (!item.isRegularItem()) {
    return [];
  }
  return Zotero.Items.getAsync(item.getNotes());
}

function getItemTitle(item: Zotero.Item): string {
  const parent = item.parentItem;
  const titleItem = parent?.isRegularItem() ? parent : item;
  return titleItem.getField("title") || getString("untitled-item");
}

function getZoteroPane(win: Window): _ZoteroTypes.ZoteroPane {
  return (win as Window & { ZoteroPane: _ZoteroTypes.ZoteroPane }).ZoteroPane;
}

async function assertDirectory(path: string): Promise<void> {
  const info = await IOUtils.stat(path);
  if (info.type !== "directory") {
    throw new Error(`${path} is not a directory`);
  }
}

function createProgressWindow(win: Window, text: string) {
  return new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    window: win,
  })
    .createLine({ text, type: "default", progress: 0 })
    .show();
}

function finishProgress(
  progressWindow: ReturnType<typeof createProgressWindow>,
  text: string,
  errors: number,
): void {
  progressWindow.changeLine({
    text,
    type: errors ? "warning" : "success",
    progress: 100,
  });
  progressWindow.startCloseTimer(3000);
}

function sanitizeFilename(value: string): string {
  const withoutControlCharacters = Array.from(value, (character) =>
    character.charCodeAt(0) < 32 ? "_" : character,
  ).join("");
  const sanitized = withoutControlCharacters
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 180);
  return sanitized || getString("untitled-item");
}

function reserveFilename(
  baseName: string,
  extension: string,
  usedNames: Set<string>,
): string {
  let suffix = 0;
  let fileName = `${baseName}${extension}`;
  while (usedNames.has(fileName.toLocaleLowerCase())) {
    suffix++;
    fileName = `${baseName}_${suffix}${extension}`;
  }
  usedNames.add(fileName.toLocaleLowerCase());
  return fileName;
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function htmlToMarkdown(html: string): string {
  let markdown = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "\n##### $1\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "\n###### $1\n")
    .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*")
    .replace(/<(del|s)[^>]*>(.*?)<\/\1>/gi, "~~$2~~")
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n");
  markdown = markdown.trim();
  return markdown;
}
