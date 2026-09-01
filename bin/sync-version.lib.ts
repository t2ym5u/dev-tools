export function applyVersionPattern(
  content: string,
  pattern: RegExp,
  version: string,
  file: string,
): string {
  if (!pattern.test(content)) {
    throw new Error(`Version pattern not found in ${file}`);
  }

  return content.replace(pattern, `$1${version}`);
}
