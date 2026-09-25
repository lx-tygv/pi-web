import fs from "fs";
import path from "path";
import { samePath } from "./paths";

// ============================================================================
// File/directory deletion helpers shared by the /api/files DELETE handler.
//
// Deletion is destructive and unrecoverable, so every guard lives here where
// it can be unit-tested against a real filesystem:
//
//   1. The target's basename must be a plain entry name (no traversal).
//   2. The target must never be an allowed root itself — those back every
//      session cwd and the file browser, so deleting one orphans sessions.
//   3. Symlinks are unlinked, never followed: authorization for a symlink
//      happens where the link lives (its parent directory), not where it
//      points, so a link inside an allowed root cannot be used to reach — or
//      be reached through — a path outside every root.
// ============================================================================

export function validateDeleteTargetName(name: string): string | null {
  if (!name || name === "." || name === ".." || name.includes("\0")) {
    return `Invalid entry name: ${name || "(empty)"}`;
  }
  if (name.includes("/") || name.includes("\\") || path.basename(name) !== name) {
    return `Entry name must not contain a path: ${name}`;
  }
  return null;
}

/** Whether the target path is one of the browsable roots themselves. */
export function isAllowedRootPath(target: string, allowedRoots: Set<string>): boolean {
  for (const root of allowedRoots) {
    if (samePath(target, root)) return true;
  }
  return false;
}

export type DeleteOutcome =
  | { ok: true }
  | { ok: false; notFound?: boolean; error: string };

/**
 * Delete one filesystem entry. `lstat` must come from the caller so the
 * route can authorize before mutating; symlinks are removed as links.
 */
export function deleteEntry(targetPath: string, lstat: fs.Stats): DeleteOutcome {
  try {
    if (lstat.isSymbolicLink()) {
      fs.unlinkSync(targetPath);
      return { ok: true };
    }
    if (lstat.isDirectory()) {
      // rmSync removes junctions/symlinks encountered inside without
      // following them, so a linked directory cannot pull the walk outside.
      fs.rmSync(targetPath, { recursive: true, force: false });
      return { ok: true };
    }
    fs.unlinkSync(targetPath);
    return { ok: true };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { ok: false, notFound: true, error: "Not found" };
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
