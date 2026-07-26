import { StockMaster } from './db';

// Levenshtein distance for typo-tolerant fuzzy matching
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = s1[i - 1] === s2[j - 1]
        ? dp[i - 1][j - 1]
        : Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
    }
  }
  return dp[m][n];
}

export function fuzzySearch(query: string, items: StockMaster[]): Array<{ item: StockMaster; score: number }> {
  const normalizedQuery = query.toLowerCase();
  
  return items
    .map(item => {
      const description = item.description.toLowerCase();
      const articleNumber = item.article_number.toLowerCase();
      const barcode = item.barcode.toLowerCase();
      
      const distance = Math.min(
        levenshteinDistance(normalizedQuery, description.slice(0, normalizedQuery.length)),
        levenshteinDistance(normalizedQuery, articleNumber),
        levenshteinDistance(normalizedQuery, barcode)
      );
      
      return { item, score: distance };
    })
    .filter(result => result.score <= 3) // Threshold for fuzzy match
    .sort((a, b) => a.score - b.score);
}
