import * as chrono from 'chrono-node';

export interface ExtractedSlots {
  dateRange: { from: Date; to: Date };
  category?: string;
  rangeLabel: string;
}

const CATEGORY_ALIASES: Record<string, string> = {
  rent: 'Rent',
  kiraya: 'Rent',
  electricity: 'Electricity',
  bijli: 'Electricity',
  light: 'Electricity',
  internet: 'Internet',
  wifi: 'Internet',
  broadband: 'Internet',
  salary: 'Salary',
  tankhwah: 'Salary',
  salaries: 'Salary',
  maintenance: 'Maintenance',
  repair: 'Maintenance',
  loan: 'Loan Repayment',
  emi: 'Loan Repayment',
  repayment: 'Loan Repayment',
  kist: 'Loan Repayment',
  misc: 'Misc',
};

export function extractSlots(question: string): ExtractedSlots {
  const now = new Date();
  const lower = question.toLowerCase();

  // 1. Category extraction
  let category: string | undefined = undefined;
  for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias)) {
      category = cat;
      break;
    }
  }

  // 2. Date extraction using local chrono-node
  const parsedDates = chrono.parse(question);

  let from: Date;
  let to: Date;
  let rangeLabel = 'Aaj ka';

  if (lower.includes('this month') || lower.includes('is mahine') || lower.includes('is mahina')) {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    rangeLabel = 'Is mahine ka';
  } else if (lower.includes('last month') || lower.includes('pichhle mahine') || lower.includes('pichhla mahina')) {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    rangeLabel = 'Pichhle mahine ka';
  } else if (lower.includes('last week') || lower.includes('pichhle hafte')) {
    const day = now.getDay();
    const diff = now.getDate() - day - 6;
    from = new Date(now.getFullYear(), now.getMonth(), diff);
    to = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
    rangeLabel = 'Pichhle hafte ka';
  } else if (lower.includes('yesterday') || lower.includes('kal')) {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    rangeLabel = 'Kal ka';
  } else if (parsedDates.length > 0 && parsedDates[0].start) {
    from = parsedDates[0].start.date();
    to = parsedDates[0].end ? parsedDates[0].end.date() : new Date(from.getFullYear(), from.getMonth(), from.getDate(), 23, 59, 59, 999);
    rangeLabel = `${from.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ka`;
  } else {
    // Default: today
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  return {
    dateRange: { from, to },
    category,
    rangeLabel,
  };
}
