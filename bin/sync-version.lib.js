export function applyVersionPattern(content, pattern, version, file) {
  if (!pattern.test(content)) {
    throw new Error(`Version pattern not found in ${file}`);
  }

  return content.replace(pattern, `$1${version}`);
}
