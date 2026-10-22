/**
 * Fuzzy comparison between the account name a merchant typed and the name the bank holds.
 * Moved here from PaystackService so every provider uses the same rule.
 * Normalises case, spacing and punctuation, accepts "typed name is part of the bank's name", and
 * otherwise requires at least 80% Levenshtein similarity.
 */
const normalize = (name: string): string =>
  String(name || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^A-Z\s]/g, "");

const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
};

export const compareNames = (providedName: string, actualName: string): boolean => {
  const provided = normalize(providedName);
  const actual = normalize(actualName);

  if (!provided || !actual) return false;
  if (provided === actual) return true;
  if (actual.includes(provided)) return true;

  const longer = provided.length > actual.length ? provided : actual;
  const shorter = provided.length > actual.length ? actual : provided;
  const similarity = (longer.length - levenshtein(longer, shorter)) / longer.length;
  return similarity >= 0.8;
};
