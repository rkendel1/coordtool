const KNOWN_FORMS: Array<{ pattern: RegExp; capability: string }> = [
  { pattern: /commercial insurance application/i, capability: 'acord.form.125' },
  { pattern: /commercial general liability section/i, capability: 'acord.form.126' },
  { pattern: /workers compensation application/i, capability: 'acord.form.130' },
];

/** Infer a stable capability id from the form itself, preferring an explicit
 * ACORD form number over title and filename heuristics. */
export function inferCapabilityId(fileName: string, pdfText = ''): string {
  const searchable = `${pdfText} ${fileName}`;
  const explicitAcord = searchable.match(/\bACORD\s+(\d{2,4})\b/i);
  if (explicitAcord) return `acord.form.${explicitAcord[1]}`;

  const known = KNOWN_FORMS.find(form => form.pattern.test(searchable));
  if (known) return known.capability;

  const slug = fileName
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return slug ? `form.${slug}` : 'form.unknown';
}
