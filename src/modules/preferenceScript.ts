import { getString } from "../utils/locale";
import { setPref } from "../utils/prefs";

export function registerPrefsScripts(win: Window): void {
  bindFolderPicker(
    win,
    "select-folder",
    "folderPath",
    "folderPath",
    getString("pick-pdf-folder"),
  );
  bindFolderPicker(
    win,
    "select-note-folder",
    "noteFolderPath",
    "noteFolderPath",
    getString("pick-note-folder"),
  );
  bindFolderPicker(
    win,
    "select-md-folder",
    "mdFolderPath",
    "mdFolderPath",
    getString("pick-md-folder"),
  );
}

function bindFolderPicker(
  win: Window,
  buttonSuffix: string,
  inputSuffix: string,
  pref: "folderPath" | "noteFolderPath" | "mdFolderPath",
  title: string,
): void {
  const prefix = `zotero-prefpane-${addon.data.config.addonRef}`;
  const button = win.document.getElementById(`${prefix}-${buttonSuffix}`);
  const input = win.document.getElementById(
    `${prefix}-${inputSuffix}`,
  ) as HTMLInputElement | null;

  button?.addEventListener("command", async () => {
    try {
      const folderPath = await new ztoolkit.FilePicker(title, "folder").open();
      if (!folderPath) {
        return;
      }

      setPref(pref, folderPath);
      if (input) {
        input.value = folderPath;
      }
    } catch (error) {
      ztoolkit.log(`Failed to select ${pref}`, error);
      win.alert(
        getString("error-folder-picker", {
          args: { message: getErrorMessage(error) },
        }),
      );
    }
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
