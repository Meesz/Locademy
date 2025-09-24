/**
 * @file browser.ts
 * @description Feature detection helpers for the File System Access API surface.
 * @author Meesz
 */

export function hasDirectoryPicker(
  win: Window & typeof globalThis,
): win is Window & typeof globalThis & {
  showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>
} {
  return 'showDirectoryPicker' in win
}

export function hasFilePicker(
  win: Window & typeof globalThis,
): win is Window & typeof globalThis & {
  showOpenFilePicker: (options?: unknown) => Promise<FileSystemFileHandle[]>
} {
  return 'showOpenFilePicker' in win
}
