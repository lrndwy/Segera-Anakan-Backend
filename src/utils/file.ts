export const sanitizeFileName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildStorageKey = (prefix: string, fileName: string) => {
  const safeName = sanitizeFileName(fileName || 'file');
  return `${prefix}/${Date.now()}-${safeName}`;
};
