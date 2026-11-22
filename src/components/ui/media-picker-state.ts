export function currentMediaPaths(paths: string[]): string[] {
  return paths.filter((path) => typeof path === "string" && path.trim().length > 0);
}

export function canSelectMediaFiles(paths: string[], selectedCount: number, maxFiles: number): boolean {
  if (maxFiles === 1 && selectedCount === 1) return true;
  return currentMediaPaths(paths).length + selectedCount <= maxFiles;
}

export function mergeUploadedMediaPaths(paths: string[], uploaded: string[], maxFiles: number): string[] {
  return maxFiles === 1 ? uploaded : [...currentMediaPaths(paths), ...uploaded];
}
