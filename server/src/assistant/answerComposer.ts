import { computeFinanceSummary, getMonthlyProfitTrend, getExpenseBreakdown } from '../finance/financeEngine';
import { ExtractedSlots } from './slotExtractor';
import { IntentDef } from './intentMatcher';
import { Decimal } from 'decimal.js';

export interface AssistantAnswer {
  answer: string;
  figures: Record<string, string>;
  matchedIntent: string;
}

function fmt(val: Decimal | number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : typeof val === 'object' ? val.toNumber() : val;
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

export async function composeAnswer(
  shopId: string,
  intent: IntentDef,
  slots: ExtractedSlots
): Promise<AssistantAnswer> {
  const summary = await computeFinanceSummary(shopId, slots.dateRange);
  const label = slots.rangeLabel; // e.g. "Today's", "This week's", "This month's"

  switch (intent.id) {
    case 'TOTAL_SALES':
      return {
        answer: `For ${label.toLowerCase()}, total sales reached ₹${fmt(summary.totalSales)}. This includes ₹${fmt(summary.totalCashSales)} in cash and ₹${fmt(summary.totalOnlineSales)} via online payments.`,
        figures: {
          'Total Sales': `₹${fmt(summary.totalSales)}`,
          'Cash Sales': `₹${fmt(summary.totalCashSales)}`,
          'Online Sales': `₹${fmt(summary.totalOnlineSales)}`,
        },
        matchedIntent: intent.id,
      };

    case 'CASH_SALES':
      return {
        answer: `For ${label.toLowerCase()}, total cash sales recorded amount to ₹${fmt(summary.totalCashSales)}.`,
        figures: {
          'Cash Sales': `₹${fmt(summary.totalCashSales)}`,
          'Total Sales': `₹${fmt(summary.totalSales)}`,
        },
        matchedIntent: intent.id,
      };

    case 'ONLINE_SALES':
      return {
        answer: `For ${label.toLowerCase()}, total online/digital sales recorded amount to ₹${fmt(summary.totalOnlineSales)}.`,
        figures: {
          'Online Sales': `₹${fmt(summary.totalOnlineSales)}`,
          'Total Sales': `₹${fmt(summary.totalSales)}`,
        },
        matchedIntent: intent.id,
      };

    case 'GROSS_PROFIT':
      return {
        answer: `For ${label.toLowerCase()}, Gross Profit is ₹${fmt(summary.grossProfit)} (Total Sales ₹${fmt(summary.totalSales)} minus Raw Material Costs ₹${fmt(summary.totalMaterialExpenses)}).`,
        figures: {
          'Total Sales': `₹${fmt(summary.totalSales)}`,
          'Material Expenses': `₹${fmt(summary.totalMaterialExpenses)}`,
          'Gross Profit': `₹${fmt(summary.grossProfit)}`,
        },
        matchedIntent: intent.id,
      };

    case 'NET_PROFIT':
      return {
        answer: `For ${label.toLowerCase()}, Net Profit is ₹${fmt(summary.netProfit)} after deducting all material, shop, and miscellaneous operating expenses.`,
        figures: {
          'Gross Profit': `₹${fmt(summary.grossProfit)}`,
          'Shop Expenses': `₹${fmt(summary.totalShopExpenses)}`,
          'Misc Expenses': `₹${fmt(summary.totalMiscExpenses)}`,
          'Net Profit': `₹${fmt(summary.netProfit)}`,
        },
        matchedIntent: intent.id,
      };

    case 'MATERIAL_EXPENSE':
      return {
        answer: `For ${label.toLowerCase()}, total raw material and inventory expenses are ₹${fmt(summary.totalMaterialExpenses)}.`,
        figures: {
          'Material Expenses': `₹${fmt(summary.totalMaterialExpenses)}`,
          'Cash Portion': `₹${fmt(summary.cashMaterialExpenses)}`,
          'Online Portion': `₹${fmt(summary.onlineMaterialExpenses)}`,
        },
        matchedIntent: intent.id,
      };

    case 'CATEGORY_EXPENSE': {
      const cat = slots.category || 'Rent';
      const breakdown = await getExpenseBreakdown(shopId, slots.dateRange);
      const found = breakdown.shop.find((s) => s.category.toLowerCase() === cat.toLowerCase());
      const amt = found ? found.amount : '0.00';
      return {
        answer: `For ${label.toLowerCase()}, total expenses logged under "${cat}" are ₹${fmt(amt)}.`,
        figures: {
          'Category': cat,
          'Amount Spent': `₹${fmt(amt)}`,
        },
        matchedIntent: intent.id,
      };
    }

    case 'CASH_AVAILABLE':
      return {
        answer: `Your current net cash drawer balance is ₹${fmt(summary.cashBalance)}.`,
        figures: {
          'Cash Sales': `₹${fmt(summary.totalCashSales)}`,
          'Cash Expenses': `₹${fmt(summary.totalCashExpenses)}`,
          'Cash Withdrawals': `₹${fmt(summary.cashWithdrawals)}`,
          'Net Cash Balance': `₹${fmt(summary.cashBalance)}`,
        },
        matchedIntent: intent.id,
      };

    case 'ONLINE_AVAILABLE':
      return {
        answer: `Your current net online bank balance is ₹${fmt(summary.onlineBalance)}.`,
        figures: {
          'Online Sales': `₹${fmt(summary.totalOnlineSales)}`,
          'Online Expenses': `₹${fmt(summary.totalOnlineExpenses)}`,
          'Online Withdrawals': `₹${fmt(summary.onlineWithdrawals)}`,
          'Net Online Balance': `₹${fmt(summary.onlineBalance)}`,
        },
        matchedIntent: intent.id,
      };

    case 'WITHDRAWN':
      return {
        answer: `For ${label.toLowerCase()}, total personal drawings/withdrawals from shop accounts amount to ₹${fmt(summary.totalWithdrawals)}.`,
        figures: {
          'Cash Withdrawals': `₹${fmt(summary.cashWithdrawals)}`,
          'Online Withdrawals': `₹${fmt(summary.onlineWithdrawals)}`,
          'Total Withdrawn': `₹${fmt(summary.totalWithdrawals)}`,
        },
        matchedIntent: intent.id,
      };

    case 'PREDICT_PROFIT': {
      const now = new Date();
      const daysElapsed = Math.max(1, now.getDate());
      const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentNet = summary.netProfit;
      const estProfit = currentNet.dividedBy(daysElapsed).times(totalDays);

      return {
        answer: `Based on your run-rate over the past ${daysElapsed} days, estimated month-end Net Profit is projected to reach ₹${fmt(estProfit)}.`,
        figures: {
          'Profit So Far': `₹${fmt(currentNet)}`,
          'Days Elapsed': `${daysElapsed} of ${totalDays} days`,
          'Estimated Month Profit': `₹${fmt(estProfit)}`,
        },
        matchedIntent: intent.id,
      };
    }

    case 'BEST_MONTH': {
      const trend = await getMonthlyProfitTrend(shopId, 12);
      if (trend.length === 0) {
        return {
          answer: 'Insufficient financial data to determine the best month.',
          figures: {},
          matchedIntent: intent.id,
        };
      }
      const sorted = [...trend].sort((a, b) => parseFloat(b.netProfit) - parseFloat(a.netProfit));
      const best = sorted[0];
      return {
        answer: `Over the past 12 months, your top performing month was ${best.label} with a Net Profit of ₹${fmt(best.netProfit)}.`,
        figures: {
          'Best Month': best.label,
          'Total Revenue': `₹${fmt(best.totalSales)}`,
          'Net Profit': `₹${fmt(best.netProfit)}`,
        },
        matchedIntent: intent.id,
      };
    }

    case 'AVERAGE_DAILY': {
      const days = Math.max(1, Math.ceil((slots.dateRange.to.getTime() - slots.dateRange.from.getTime()) / (1000 * 3600 * 24)));
      const avg = summary.totalSales.dividedBy(days);
      return {
        answer: `For ${label.toLowerCase()}, average sales per day were ₹${fmt(avg)} across ${days} days.`,
        figures: {
          'Total Period Sales': `₹${fmt(summary.totalSales)}`,
          'Total Days': `${days} days`,
          'Average Per Day': `₹${fmt(avg)}`,
        },
        matchedIntent: intent.id,
      };
    }

    default:
      return {
        answer: `For ${label.toLowerCase()}, financial summary: Total Sales ₹${fmt(summary.totalSales)}, Net Profit ₹${fmt(summary.netProfit)}, Cash Balance ₹${fmt(summary.cashBalance)}.`,
        figures: {
          'Total Sales': `₹${fmt(summary.totalSales)}`,
          'Net Profit': `₹${fmt(summary.netProfit)}`,
          'Cash Balance': `₹${fmt(summary.cashBalance)}`,
          'Online Balance': `₹${fmt(summary.onlineBalance)}`,
        },
        matchedIntent: intent.id,
      };
  }
}

export function getFallbackAnswer(): AssistantAnswer {
  return {
    answer: "I didn't quite catch that query. Please try asking like: 'What is today's total sale?' or select one of the suggestion chips below.",
    figures: {},
    matchedIntent: 'FALLBACK',
  };
}
