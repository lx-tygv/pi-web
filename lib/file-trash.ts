import trash from "trash";

// ============================================================================
// Trash-mode deletion for the /api/files DELETE handler.
//
// Deletion defaults to moving the entry to the OS trash/recycle bin — the
// recoverable choice. Permanent (unrecoverable) deletion is opt-in and must
// be requested explicitly with ?permanent=1.
// ============================================================================

export type DeleteMode = "trash" | "permanent";

/** `?permanent=1` opts into unrecoverable deletion; anything else is trash. */
export function parseDeleteMode(value: string | null): DeleteMode {
  return value === "1" || value === "true" || value === "permanent"
    ? "permanent"
    : "trash";
}

/** Move one filesystem entry to the OS trash/recycle bin. */
export async function moveToTrash(targetPath: string): Promise<void> {
  await trash([targetPath]);
}
