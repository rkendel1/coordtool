/** Infer a neutral, stable capability id without assuming any industry or
 * document standard. The filename is the only deterministic identifier. */
export function inferCapabilityId(fileName: string, _pdfText = ''): string {
  const slug = fileName
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return slug ? `document.${slug}` : 'document.unknown';
}
