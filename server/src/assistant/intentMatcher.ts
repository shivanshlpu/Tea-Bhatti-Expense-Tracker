/**
 * Section 6.2 Intent Table — covers every sample question from SRS.
 * Deterministic intent matching with keyword/pattern scoring. Zero AI cost.
 */

export interface IntentDef {
  id: string;
  keywords: string[];
  needsRange?: boolean;
  needsCategory?: boolean;
}

export const INTENTS: IntentDef[] = [
  { id: 'TOTAL_SALES', keywords: ['total sale', 'total sales', 'kitni sale', 'total bikri', 'bikri', 'sales'], needsRange: true },
  { id: 'CASH_SALES', keywords: ['cash sale', 'cash sales', 'cash mein kitna', 'cash bikri', 'nagad'], needsRange: true },
  { id: 'ONLINE_SALES', keywords: ['online sale', 'online sales', 'online kitna', 'upi sale', 'digital sale'], needsRange: true },
  { id: 'GROSS_PROFIT', keywords: ['gross profit', 'gross profit kitna', 'material ke baad profit'], needsRange: true },
  { id: 'NET_PROFIT', keywords: ['net profit', 'profit kitna', 'munafa', 'shuddh munafa', 'fayda', 'profit'], needsRange: true },
  { id: 'MATERIAL_EXPENSE', keywords: ['material expense', 'material kharch', 'raw material', 'kaccha maal'], needsRange: true },
  { id: 'CATEGORY_EXPENSE', keywords: ['rent', 'electricity', 'internet', 'bijli', 'salary', 'maintenance', 'kiraya', 'wifi'], needsRange: true, needsCategory: true },
  { id: 'LAST_RANGE_REPORT', keywords: ['last week', 'last month report', 'pichhle hafte', 'pichhle mahine'] },
  { id: 'BEST_MONTH', keywords: ['highest profit', 'best month', 'sabse zyada profit', 'sabse achha mahina'] },
  { id: 'AVERAGE_DAILY', keywords: ['average daily sale', 'average sale', 'osat sale', 'daily average', 'औसत'] },
  { id: 'COMPARE_MONTHS', keywords: ['compare this month', 'compare last month', 'tulamna', 'farq'] },
  { id: 'CASH_AVAILABLE', keywords: ['cash available', 'kitna cash hai', 'cash balance', 'hath mein cash', 'gullak'] },
  { id: 'ONLINE_AVAILABLE', keywords: ['online available', 'online balance', 'bank balance', 'upi balance'] },
  { id: 'WITHDRAWN', keywords: ['withdrawn', 'nikala', 'withdrawal kitna', 'drawing', 'personal use'], needsRange: true },
  { id: 'TOP_INCREASING_CAT', keywords: ['increasing the most', 'sabse zyada badha', 'badhne wala expense'] },
  { id: 'PREDICT_PROFIT', keywords: ['predict', 'expected profit', 'anumaan', 'est profit', 'kya lagta hai profit'] },
];

export interface MatchResult {
  intent: IntentDef | null;
  score: number;
}

export function matchIntent(question: string): MatchResult {
  const normalized = question.toLowerCase().replace(/[^\w\s\u0900-\u097F]/gi, ' ');
  let bestIntent: IntentDef | null = null;
  let maxScore = 0;

  for (const intent of INTENTS) {
    let score = 0;
    for (const keyword of intent.keywords) {
      if (normalized.includes(keyword)) {
        score += keyword.length; // Weight longer keyword matches higher
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestIntent = intent;
    }
  }

  // Minimum score threshold
  if (maxScore < 3) {
    return { intent: null, score: 0 };
  }

  return { intent: bestIntent, score: maxScore };
}
