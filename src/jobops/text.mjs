const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'in', 'into', 'is', 'it', 'of', 'on', 'or', 'our', 'that', 'the', 'their',
  'this', 'to', 'with', 'you', 'your', 'we', 'will',
]);

export function stripHtml(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function normalizeText(value = '') {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(value = '') {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function slugify(value = '') {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'item';
}

export function keywordSet(values = []) {
  return new Set(values.flatMap((value) => tokenize(value)));
}

export function containsAny(haystack = '', needles = []) {
  const haystackText = normalizeText(haystack);
  return needles.some((needle) => haystackText.includes(normalizeText(needle)));
}
