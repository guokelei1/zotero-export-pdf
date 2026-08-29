import { getString } from "../utils/locale";

const MENU_ID = "zotero-export-pdf-item-mineru";
const PYTHON_DIR_NAME = "export-pdf-python";
const SCRIPT_NAME = "mineru_task.py";

type UploadEntry = {
  attachmentId: number;
  parentItemId: number | undefined;
  title: string;
  uploadName: string;
  localPath: string;
};

type CollectFile = {
  name: string;
  local: string;
};

export function registerMineruMenu(win: Window): void {
  unregisterMineruMenu(win);

  const popup = win.document.getElementById("zotero-itemmenu");
  if (!popup) {
    ztoolkit.log(`Menu popup not found: zotero-itemmenu`);
    return;
  }

  const menuItem = win.document.createXULElement("menuitem");
  menuItem.id = MENU_ID;
  menuItem.setAttribute("label", getString("python-run"));
  if (!Zotero.isMac) {
    menuItem.classList.add("menuitem-iconic");
  }
  menuItem.setAttribute(
    "style",
    `list-style-image: url(chrome://${addon.data.config.addonRef}/content/icons/icon.png)`,
  );
  menuItem.addEventListener("command", () => {
    void runMineruTask(win).catch((error) => {
      ztoolkit.log("MinerU task failed", error);
      win.alert(
        getString("python-error", {
          args: {
            message: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    });
  });
  popup.append(menuItem);
}

export function unregisterMineruMenu(win: Window): void {
  win.document.getElementById(MENU_ID)?.remove();
}

/**
 * 弹出模态对话框展示 nvidia-smi 输出，等待用户点选 GPU（1-4 按钮 → GPU 0-3）。
 * 用户直接关闭对话框返回 null，流程中止。
 */
function selectGPU(win: Window, report: string): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: number | null) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    win.openDialog(
      `chrome://${addon.data.config.addonRef}/content/gpu_select.xhtml`,
      "mineru-gpu-select",
      "chrome,centerscreen,modal",
      {
        report,
        title: getString("mineru-gpu-prompt"),
        select: (index: number) => settle(index),
        cancel: () => settle(null),
      },
    );
    // modal 打开方式：走到这里说明窗口已关闭；未点按钮即关闭视为取消
    settle(null);
  });
}

/**
 * 右键触发：把选中条目的 PDF（识别逻辑同"导出PDF"，支持单选/多选）上传到
 * 202 的 /home/gkl/mineru/data/input/<时间戳>/，远程执行 mineru.sh batch 转换，
 * 再把 /home/gkl/mineru/data/markdown/<时间戳>/ 下的同名 .md 下载回来，
 * 一一插入对应条目的附件中。
 */
async function runMineruTask(win: Window): Promise<void> {
  const items = getZoteroPane(win).getSelectedItems();
  if (!items.length) {
    win.alert(getString("error-no-items"));
    return;
  }

  // 第一步：查询 202 的 GPU 占用情况，由用户选择使用哪块 GPU
  const gpuReport = (await runPythonStage(["gpu"], "nvidia-smi")) as {
    report: string;
  };
  const gpu = await selectGPU(win, gpuReport.report);
  if (gpu === null) {
    return;
  }

  const entries = await collectPDFEntries(items);
  if (!entries.length) {
    win.alert(getString("mineru-no-pdf"));
    return;
  }

  const progressWindow = createProgressWindow(
    win,
    getString("mineru-upload", { args: { count: entries.length } }),
  );

  try {
    const task = formatTaskName(new Date());
    const manifestPath = await writeManifest(entries, task);

    await runPythonStage(
      ["upload", task, manifestPath],
      `upload ${entries.length} PDFs`,
    );
    progressWindow.changeLine({
      text: getString("mineru-convert"),
      type: "default",
      progress: 35,
    });

    await runPythonStage(["convert", task, gpu], "run mineru.sh");

    progressWindow.changeLine({
      text: getString("mineru-download"),
      type: "default",
      progress: 75,
    });
    const collectResult = (await runPythonStage(
      ["collect", task],
      "collect markdown",
    )) as { files: CollectFile[] };

    const failures = await importMarkdowns(collectResult.files, entries);
    const imported = collectResult.files.length - failures.length;

    progressWindow.changeLine({
      text: getString("mineru-done", {
        args: { count: imported, errors: entries.length - imported },
      }),
      type: failures.length ? "warning" : "success",
      progress: 100,
    });
    progressWindow.startCloseTimer(5000);
    if (failures.length) {
      win.alert(
        `${getString("mineru-done", {
          args: { count: imported, errors: entries.length - imported },
        })}\n\n${failures.join("\n")}`,
      );
    }
  } catch (error) {
    progressWindow.changeLine({
      text: getString("python-done"),
      type: "warning",
      progress: 100,
    });
    progressWindow.startCloseTimer(3000);
    throw error;
  }
}

/** 与"导出PDF"完全相同的 PDF 识别逻辑，外加确定上传文件名。 */
async function collectPDFEntries(items: Zotero.Item[]): Promise<UploadEntry[]> {
  const entries: UploadEntry[] = [];
  const usedNames = new Set<string>();
  const seenAttachments = new Set<number>();

  for (const item of items) {
    const attachments = await getPDFAttachments(item);
    for (const attachment of attachments) {
      if (seenAttachments.has(attachment.id)) {
        continue;
      }
      seenAttachments.add(attachment.id);

      const sourcePath = await attachment.getFilePathAsync();
      if (!sourcePath) {
        ztoolkit.log(`Attachment ${attachment.id} has no local file, skipped`);
        continue;
      }

      const base = sanitizeUploadName(getItemTitle(item));
      let suffix = 0;
      let uploadName = base;
      while (usedNames.has(uploadName)) {
        suffix++;
        uploadName = `${base}_${suffix}`;
      }
      usedNames.add(uploadName);

      const parent = attachment.parentItem;
      entries.push({
        attachmentId: attachment.id,
        parentItemId: (parent?.isRegularItem() ? parent : item).id,
        title: getItemTitle(item),
        uploadName,
        localPath: sourcePath,
      });
    }
  }
  return entries;
}

async function writeManifest(
  entries: UploadEntry[],
  task: string,
): Promise<string> {
  const pythonDir = PathUtils.join(Zotero.DataDirectory.dir, PYTHON_DIR_NAME);
  await IOUtils.makeDirectory(pythonDir);
  const manifestPath = PathUtils.join(pythonDir, `upload_${task}.json`);
  const manifest = entries.map((entry) => ({
    local: entry.localPath,
    name: `${entry.uploadName}.pdf`,
  }));
  await IOUtils.writeUTF8(
    manifestPath,
    JSON.stringify(manifest, undefined, 2),
    { mode: "overwrite" },
  );
  return manifestPath;
}

/**
 * 运行一个阶段并解析 stdout 末尾的 JSON 结果。
 * 阶段内远端的详细输出只进 debug log；进度窗由 JS 在阶段间更新。
 */
async function runPythonStage(
  args: (string | number)[],
  stageLabel: string,
): Promise<unknown> {
  const scriptPath = await ensureScriptOnDisk();
  const { Subprocess } = (ChromeUtils as any).importESModule(
    "resource://gre/modules/Subprocess.sys.mjs",
  );
  const command = await findPythonCommand(Subprocess);
  const proc = await Subprocess.call({
    command,
    arguments: [scriptPath, ...args.map(String)],
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    proc.stdout?.readString(),
    proc.stderr?.readString(),
  ]);
  // Subprocess 的 wait() 解析为 { exitCode } 对象
  const { exitCode } = await proc.wait();

  ztoolkit.log(
    `[mineru:${stageLabel}] exit=${exitCode} stderr=${stderr?.slice(-500) || "-"}`,
  );

  const jsonLine = stdout
    ?.trim()
    .split(/\r?\n/)
    .reverse()
    .find((line: string) => line.startsWith("{"));
  if (!jsonLine) {
    throw new Error(`Python produced no result (exit ${exitCode})`);
  }
  const payload = JSON.parse(jsonLine) as { ok: boolean; error?: string };
  if (!payload.ok) {
    throw new Error(payload.error || `stage ${stageLabel} failed`);
  }
  return payload;
}

/** 把下载回来的 .md 按上传文件名一一插入对应条目，返回失败的描述。 */
async function importMarkdowns(
  files: CollectFile[],
  entries: UploadEntry[],
): Promise<string[]> {
  const byUploadName = new Map(
    entries.map((entry) => [entry.uploadName, entry]),
  );
  const failures: string[] = [];

  for (const file of files) {
    const baseName = file.name.replace(/\.md$/i, "");
    const entry = byUploadName.get(baseName);
    if (!entry) {
      failures.push(`${file.name}: no matching item`);
      continue;
    }
    try {
      await Zotero.Attachments.importFromFile({
        file: file.local,
        parentItemID: entry.parentItemId,
        title: `${entry.title}.md`,
        contentType: "text/markdown",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ztoolkit.log(`Failed to import markdown ${file.name}`, error);
      failures.push(`${file.name}: ${message}`);
    }
  }
  return failures;
}

/**
 * 把随插件打包的 Python 脚本写到 Zotero 数据目录下再执行。
 * 不能直接执行插件安装目录里的脚本：开发模式是文件路径，打包安装后是 jar 包内路径，
 * 通过 chrome 协议读内容再落盘，两种情况都能工作。
 */
async function ensureScriptOnDisk(): Promise<string> {
  const scriptURL = `chrome://${addon.data.config.addonRef}/content/python/${SCRIPT_NAME}`;
  const contents = await Zotero.File.getResourceAsync(scriptURL);
  const targetDirectory = PathUtils.join(
    Zotero.DataDirectory.dir,
    PYTHON_DIR_NAME,
  );
  await IOUtils.makeDirectory(targetDirectory);
  const scriptPath = PathUtils.join(targetDirectory, SCRIPT_NAME);
  await IOUtils.writeUTF8(scriptPath, contents, { mode: "overwrite" });
  return scriptPath;
}

/**
 * Firefox 的 Subprocess 要求可执行文件是绝对路径，
 * 所以先用 where/which（绝对路径，系统自带）在 PATH 里定位 Python；
 * PATH 上找不到时再探测常见安装位置。
 */
async function findPythonCommand(Subprocess: any): Promise<string> {
  const attempts: string[] = [];

  const candidates = Zotero.isWin
    ? ["python", "python3", "py"]
    : ["python3", "python"];
  const whereCmd = Zotero.isWin
    ? "C:\\Windows\\System32\\where.exe"
    : "/usr/bin/which";

  for (const name of candidates) {
    try {
      const proc = await Subprocess.call({
        command: whereCmd,
        arguments: [name],
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, { exitCode }] = await Promise.all([
        proc.stdout?.readString(),
        proc.stderr?.readString(),
        proc.wait(),
      ]);
      const found = stdout?.trim().split(/\r?\n/)[0]?.trim();
      if (exitCode === 0 && found) {
        return found;
      }
      attempts.push(
        `${name}: exit=${exitCode} out=${stdout?.trim().slice(0, 60) || "-"} err=${stderr?.trim().slice(0, 60) || "-"}`,
      );
    } catch (error) {
      attempts.push(`${name}: threw ${error}`);
    }
  }

  for (const path of await commonPythonLocations()) {
    try {
      if (await IOUtils.exists(path)) {
        return path;
      }
      attempts.push(`${path}: not exists`);
    } catch (error) {
      attempts.push(`${path}: threw ${error}`);
    }
  }

  throw new Error(`Python not found. Attempts: ${attempts.join(" | ")}`);
}

async function commonPythonLocations(): Promise<string[]> {
  if (!Zotero.isWin) {
    return ["/usr/local/bin/python3", "/opt/homebrew/bin/python3"];
  }
  const env = Services.env;
  const localAppData = env?.get("LOCALAPPDATA") || "";
  const programData = env?.get("ProgramData") || "C:\\ProgramData";
  return [
    PathUtils.join(programData, "miniconda3", "python.exe"),
    PathUtils.join(programData, "anaconda3", "python.exe"),
    PathUtils.join(
      localAppData,
      "Programs",
      "Python",
      "Python312",
      "python.exe",
    ),
    PathUtils.join(
      localAppData,
      "Programs",
      "Python",
      "Python311",
      "python.exe",
    ),
    "C:\\Windows\\py.exe",
  ];
}

function getZoteroPane(win: Window): _ZoteroTypes.ZoteroPane {
  return (win as Window & { ZoteroPane: _ZoteroTypes.ZoteroPane }).ZoteroPane;
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

function getItemTitle(item: Zotero.Item): string {
  const parent = item.parentItem;
  const titleItem = parent?.isRegularItem() ? parent : item;
  return titleItem.getField("title") || getString("untitled-item");
}

function createProgressWindow(win: Window, text: string) {
  return new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    window: win,
  })
    .createLine({ text, type: "default", progress: 0 })
    .show();
}

function sanitizeUploadName(value: string): string {
  // 上传文件名把空格换成下划线（远端 ls/find 按行解析更稳），其余规则同导出 PDF
  return sanitizeFilename(value).replace(/\s+/g, "_");
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

function formatTaskName(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
