import { StockMaster } from '@/lib/db';

export function createId(prefix: string): string {
  if (typeof window === 'undefined') return `${prefix}-ssr`;
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Convert various date representations (ISO, Excel numbers, slash/dash strings, Date objects) to DD-MMM-YY format (e.g. 01-Aug-26)
export function parseAndFormatDateToDDMMMYY(val: any, fallbackVal?: string): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatFromComponents = (dayNum: number, monthIdx: number, yearNum: number): string => {
    if (isNaN(dayNum) || isNaN(monthIdx) || isNaN(yearNum) || monthIdx < 0 || monthIdx > 11 || dayNum < 1 || dayNum > 31) {
      return '';
    }
    const dd = String(dayNum).padStart(2, '0');
    const mmm = MONTHS[monthIdx];
    let yy = String(yearNum);
    if (yy.length === 4) {
      yy = yy.slice(-2);
    } else if (yy.length === 1) {
      yy = '0' + yy;
    }
    return `${dd}-${mmm}-${yy}`;
  };

  const formatDateObj = (d: Date): string => {
    if (!d || isNaN(d.getTime())) return '';
    return formatFromComponents(d.getDate(), d.getMonth(), d.getFullYear());
  };

  if (val === null || val === undefined || val === '') {
    if (fallbackVal) return parseAndFormatDateToDDMMMYY(fallbackVal);
    return '';
  }

  if (val instanceof Date) {
    const res = formatDateObj(val);
    if (res) return res;
  }

  // Handle Excel serial date numbers (e.g. 46236)
  if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && !val.includes('-') && !val.includes('/') && !val.includes('.'))) {
    const num = Number(val);
    if (num > 1000 && num < 100000) {
      // Excel epoch starts at 1899-12-30 (accounting for Excel 1900 leap year bug)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const jsDate = new Date(excelEpoch.getTime() + num * 86400 * 1000);
      const res = formatFromComponents(jsDate.getUTCDate(), jsDate.getUTCMonth(), jsDate.getUTCFullYear());
      if (res) return res;
    }
  }

  const str = String(val).trim();
  if (!str) {
    if (fallbackVal) return parseAndFormatDateToDDMMMYY(fallbackVal);
    return '';
  }

  // Already DD-MMM-YY or DD-MMM-YYYY (e.g. "01-Aug-26", "1-Aug-2026", "01/AUG/26")
  const ddMmmYyRegex = /^(\d{1,2})[-/\.\s]([A-Za-z]{3,})[-/\.\s](\d{2,4})$/;
  const matchDdMmm = str.match(ddMmmYyRegex);
  if (matchDdMmm) {
    const day = parseInt(matchDdMmm[1], 10);
    const monthStr = matchDdMmm[2].toLowerCase();
    let year = parseInt(matchDdMmm[3], 10);
    if (matchDdMmm[3].length === 2) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    const monthIdx = MONTHS.findIndex(m => m.toLowerCase() === monthStr.slice(0, 3));
    if (monthIdx !== -1) {
      const res = formatFromComponents(day, monthIdx, year);
      if (res) return res;
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const yyyyMmDdRegex = /^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$/;
  const matchYmd = str.match(yyyyMmDdRegex);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const monthIdx = parseInt(matchYmd[2], 10) - 1;
    const day = parseInt(matchYmd[3], 10);
    const res = formatFromComponents(day, monthIdx, year);
    if (res) return res;
  }

  // DD-MM-YYYY or DD/MM/YYYY or MM/DD/YYYY
  const ddMmYyyyRegex = /^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{2,4})$/;
  const matchDmy = str.match(ddMmYyyyRegex);
  if (matchDmy) {
    const p1 = parseInt(matchDmy[1], 10);
    const p2 = parseInt(matchDmy[2], 10);
    let year = parseInt(matchDmy[3], 10);
    if (matchDmy[3].length === 2) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    let day = p1;
    let monthIdx = p2 - 1;
    if (p1 <= 12 && p2 > 12) {
      day = p2;
      monthIdx = p1 - 1;
    }
    const res = formatFromComponents(day, monthIdx, year);
    if (res) return res;
  }

  // Standard JS Date parse fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const res = formatDateObj(d);
    if (res) return res;
  }

  if (fallbackVal) {
    return parseAndFormatDateToDDMMMYY(fallbackVal);
  }

  return str;
}

export function addDaysToDDMMMYY(dateStr: string, days: number): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let d: Date | null = null;

  const matchDdMmm = dateStr.match(/^(\d{1,2})[-/\.\s]([A-Za-z]{3,})[-/\.\s](\d{2,4})$/);
  if (matchDdMmm) {
    const day = parseInt(matchDdMmm[1], 10);
    const monthStr = matchDdMmm[2].toLowerCase();
    let year = parseInt(matchDdMmm[3], 10);
    if (matchDdMmm[3].length === 2) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    const monthIdx = MONTHS.findIndex(m => m.toLowerCase() === monthStr.slice(0, 3));
    if (monthIdx !== -1) {
      d = new Date(year, monthIdx, day);
    }
  }

  if (!d || isNaN(d.getTime())) {
    d = new Date(dateStr);
  }

  if (isNaN(d.getTime())) {
    d = new Date();
  }

  d.setDate(d.getDate() + days);
  return parseAndFormatDateToDDMMMYY(d);
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
