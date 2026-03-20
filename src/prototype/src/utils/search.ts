import Fuse from 'fuse.js';

type SearchCandidate = { value: string };

/**
 * Match query against multiple text fields — returns true if any field matches.
 */
export function matchesSearchMulti(query: string, ...fields: (string | undefined | null)[]): boolean {
  if (!query || !query.trim()) return true;

  const normalizedQuery = query.trim();
  const normalizedLower = normalizedQuery.toLowerCase();
  const candidates: SearchCandidate[] = fields
    .filter((field): field is string => !!field && field.trim().length > 0)
    .map((value) => ({ value }));

  if (candidates.length === 0) return false;

  // Keep fast substring behavior for tiny queries where fuzzy matching can be noisy.
  if (normalizedLower.length <= 2) {
    return candidates.some((candidate) => candidate.value.toLowerCase().includes(normalizedLower));
  }

  const fuse = new Fuse(candidates, {
    keys: ['value'],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return fuse.search(normalizedQuery, { limit: 1 }).length > 0;
}

