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
const { validateDeleteTargetName, isAllowedRootPath, deleteEntry } = await jiti.import("./file-delete.ts");

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pi-web-delete-"));
}

test("validateDeleteTargetName rejects traversal and empty names", () => {
  assert.equal(validateDeleteTargetName("a.txt"), null);
  assert.equal(validateDeleteTargetName(".hidden"), null);
  assert.notEqual(validateDeleteTargetName(".."), null);
  assert.notEqual(validateDeleteTargetName("."), null);
  assert.notEqual(validateDeleteTargetName(""), null);
  assert.notEqual(validateDeleteTargetName("a/b"), null);
  assert.notEqual(validateDeleteTargetName("a\\b"), null);
  assert.notEqual(validateDeleteTargetName("a\0b"), null);
});

test("isAllowedRootPath matches case- and separator-insensitively", () => {
  const roots = new Set(["C:/work/repo"]);
  if (process.platform === "win32") {
    assert.equal(isAllowedRootPath("c:\\work\\repo", roots), true);
    assert.equal(isAllowedRootPath("C:/work/repo/sub", roots), false);
  } else {
    assert.equal(isAllowedRootPath("/work/repo", roots), false);
  }
  assert.equal(isAllowedRootPath("/other", new Set(["/other"])), true);
});

test("deleteEntry removes a plain file", () => {
  const root = makeTempRoot();
  const file = path.join(root, "note.txt");
  fs.writeFileSync(file, "x");
  const outcome = deleteEntry(file, fs.lstatSync(file));
  assert.deepEqual(outcome, { ok: true });
  assert.equal(fs.existsSync(file), false);
});

test("deleteEntry removes a directory tree", () => {
  const root = makeTempRoot();
  const dir = path.join(root, "sub");
  fs.mkdirSync(path.join(dir, "nested"), { recursive: true });
  fs.writeFileSync(path.join(dir, "nested", "f.txt"), "x");
  const outcome = deleteEntry(dir, fs.lstatSync(dir));
  assert.deepEqual(outcome, { ok: true });
  assert.equal(fs.existsSync(dir), false);
});

test("deleteEntry unlinks a symlink instead of following it", (t) => {
  const root = makeTempRoot();
  const realDir = path.join(root, "real");
  fs.mkdirSync(realDir);
  fs.writeFileSync(path.join(realDir, "keep.txt"), "x");
  const link = path.join(root, "link");
  try {
    fs.symlinkSync(realDir, link, "dir");
  } catch {
    // Creating symlinks needs privileges on Windows without developer mode.
    t.skip("symlink creation not permitted on this platform");
    return;
  }
  const outcome = deleteEntry(link, fs.lstatSync(link));
  assert.deepEqual(outcome, { ok: true });
  assert.equal(fs.existsSync(link), false);
  // The link target's contents survive.
  assert.equal(fs.existsSync(path.join(realDir, "keep.txt")), true);
});

test("deleteEntry reports a missing target as not found", () => {
  const root = makeTempRoot();
  const missing = path.join(root, "gone.txt");
  const outcome = deleteEntry(missing, fs.statSync(root));
  assert.equal(outcome.ok, false);
  assert.equal(outcome.notFound, true);
});
