import { StockMaster } from '@/lib/db';

export function createId(prefix: string): string {
  if (typeof window === 'undefined') return `${prefix}-ssr`;
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function getPackagingBreakdown(qty: number, unitsPerBox: number, boxesPerPack: number, smallestUnitName: string) {
  qty = isNaN(qty) ? 0 : qty;
  unitsPerBox = isNaN(unitsPerBox) ? 1 : unitsPerBox;
  boxesPerPack = isNaN(boxesPerPack) ? 1 : boxesPerPack;
  const unitsPerPack = unitsPerBox * boxesPerPack;
  let remaining = qty;
  const packs = Math.floor(remaining / unitsPerPack);
  remaining = remaining % unitsPerPack;
  const boxes = Math.floor(remaining / unitsPerBox);
  const pieces = remaining % unitsPerBox;
  return { packs, boxes, pieces };
}

// Levenshtein distance for typo-tolerant fuzzy matching
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  return dp[m][n];
}

// Fuzzy search logic matching name/description or article number
export function fuzzySearch(query: string, items: StockMaster[]): Array<{ item: StockMaster; score: number }> {
  if (!query.trim()) return [];
  const cleanQuery = query.toLowerCase().trim();
  
  const results = items.map(item => {
    const desc = (item.description || '').toLowerCase();
    const artNum = (item.article_number || '').toLowerCase();
    const barcode = (item.barcode || '').toLowerCase();
    
    let score = 0;
    
    // Direct matching
    if (artNum === cleanQuery || barcode === cleanQuery) {
      score += 1000;
    } else if (artNum.includes(cleanQuery)) {
      score += 500;
    } else if (desc.includes(cleanQuery)) {
      score += 400;
    }
    
    // Split query and search by words
    const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
    const descWords = desc.split(/[\s\-_]+/).filter(Boolean);
    
    let matchedWordsCount = 0;
    queryWords.forEach(qw => {
      // Direct word containment
      if (desc.includes(qw)) {
        score += 100;
        matchedWordsCount++;
        return;
      }
      
      // Fuzzy word matching
      let bestWordScore = 0;
      descWords.forEach(dw => {
        const dist = levenshteinDistance(qw, dw);
        const maxLen = Math.max(qw.length, dw.length);
        if (maxLen > 0) {
          const similarity = (maxLen - dist) / maxLen;
          if (similarity >= 0.6) { // typo tolerance threshold
            const wordScore = similarity * 50;
            if (wordScore > bestWordScore) {
              bestWordScore = wordScore;
            }
          }
        }
      });
      if (bestWordScore > 0) {
        score += bestWordScore;
        matchedWordsCount++;
      }
    });
    
    // Penalty if query has words but none matched
    if (queryWords.length > 0 && matchedWordsCount === 0) {
      score = 0;
    }
    
    return { item, score };
  });
  
  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
