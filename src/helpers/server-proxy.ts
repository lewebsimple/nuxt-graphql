/**
 * Remove file extension from path
 *
 * @param filePath File path
 * @returns File path without its extension
 */
export function removeFileExtension(filePath: string): string {
  return filePath.replace(/\.[^/.]+$/, "");
}

/**
 * Generate generic server proxy content
 *
 * @param modulePath Module path to export from
 * @returns Proxy content
 */
export function getGenericServerProxy(modulePath: string): string {
  return `export * from ${JSON.stringify(removeFileExtension(modulePath))};`;
}
