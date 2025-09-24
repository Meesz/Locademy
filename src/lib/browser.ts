/**
 * @file browser.ts
 * @description Feature detection helpers for the File System Access API surface.
 * @author Meesz
 */

export function supportsDirectoryHandles(
  win: Window & typeof globalThis = window,
): win is Window & typeof globalThis & {
  showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>
} {
  return typeof win.showDirectoryPicker === 'function'
}

export function supportsFilePicker(win: Window & typeof globalThis = window): boolean {
  if (typeof win.showOpenFilePicker === 'function') return true
  // Firefox lacks showOpenFilePicker but still supports traditional file inputs.
  return typeof win.File === 'function' && typeof win.HTMLInputElement === 'function'
}

// Backwards-compatible helpers (scheduled for removal once call sites are migrated).
export const hasDirectoryPicker = supportsDirectoryHandles

export function hasFilePicker(
  win: Window & typeof globalThis,
): win is Window & typeof globalThis & {
  showOpenFilePicker: (options?: unknown) => Promise<FileSystemFileHandle[]>
} {
  return typeof win.showOpenFilePicker === 'function'
}
