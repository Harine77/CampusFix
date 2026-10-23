const stopWords = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'was', 'were', 'with']);
// Rejected complaints are invalid/out of scope; resolved reports can still be
// useful matches when an issue recurs, so they remain eligible for a warning.
const excludedStatuses = new Set(['Rejected']);

export function normalizeKeywords(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));
}

function jaccardSimilarity(left, right) {
  const first = new Set(normalizeKeywords(left));
  const second = new Set(normalizeKeywords(right));
  if (!first.size || !second.size) return 0;
  let intersection = 0;
  for (const token of first) if (second.has(token)) intersection += 1;
  return intersection / (first.size + second.size - intersection);
}

export function findSimilarComplaints(input, candidates, limit = 5) {
  const incomingText = `${input.title} ${input.description}`;
  return candidates
    .filter((candidate) => candidate.category === input.category && !excludedStatuses.has(candidate.status))
    .map((candidate) => {
      const locationSimilarity = jaccardSimilarity(input.location, candidate.location);
      const titleSimilarity = jaccardSimilarity(input.title, candidate.title);
      const descriptionSimilarity = jaccardSimilarity(incomingText, `${candidate.title} ${candidate.description}`);
      const score = locationSimilarity * 0.4 + titleSimilarity * 0.35 + descriptionSimilarity * 0.25;
      return { candidate, locationSimilarity, titleSimilarity, descriptionSimilarity, score };
    })
    .filter(({ locationSimilarity, titleSimilarity, descriptionSimilarity }) => locationSimilarity >= 0.35 && Math.max(titleSimilarity, descriptionSimilarity) >= 0.2)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    // Deliberately expose only a safe preview, never reporter identity/description.
    .map(({ candidate, score }) => ({ id: candidate.id, title: candidate.title, location: candidate.location, status: candidate.status, similarity: Number(score.toFixed(2)) }));
}

export function duplicateDecision(matches, confirmed) {
  return matches.length > 0 && !confirmed ? 'warn' : 'create';
}
