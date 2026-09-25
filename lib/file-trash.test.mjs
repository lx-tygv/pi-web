import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { "@": process.cwd() },
  interopDefault: true,
  moduleCache: false,
});
const { parseDeleteMode, moveToTrash } = await jiti.import("./file-trash.ts");

test("parseDeleteMode defaults to trash and opts in with permanent", () => {
  assert.equal(parseDeleteMode(null), "trash");
  assert.equal(parseDeleteMode(""), "trash");
  assert.equal(parseDeleteMode("0"), "trash");
  assert.equal(parseDeleteMode("anything"), "trash");
  assert.equal(parseDeleteMode("1"), "permanent");
  assert.equal(parseDeleteMode("true"), "permanent");
  assert.equal(parseDeleteMode("permanent"), "permanent");
});

test("moveToTrash removes the entry from its original location", async (t) => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-web-trash-"));
  const file = path.join(root, "note.txt");
  await fs.promises.writeFile(file, "x");
  try {
    await moveToTrash(file);
  } catch (error) {
    const code = typeof error === "object" && error !== null ? error.code : undefined;
    if (code === "EPERM" || /powershell|osascript|gio/i.test(String(error))) {
      t.skip(`trash backend unavailable on this platform: ${String(error)}`);
      return;
    }
    throw error;
  }
  assert.equal(fs.existsSync(file), false);
});
