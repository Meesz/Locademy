/**
 * @file file-system.d.ts
 * @description Ambient type augmentations for File System Access API usage within Locademy.
 * @author Meesz
 */

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  values(): AsyncIterableIterator<FileSystemHandle>
  keys(): AsyncIterableIterator<string>
}

interface Window {
  showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>
  showOpenFilePicker: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>
}
