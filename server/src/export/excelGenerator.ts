import ExcelJS from 'exceljs';
import { FinanceSummary } from '../finance/financeEngine';

export interface ReportExportData {
  shopName: string;
  ownerName: string;
  from: Date;
  to: Date;
  category?: string;
  summary: FinanceSummary;
  records: {
    sales: any[];
    materialExpenses: any[];
    shopExpenses: any[];
    miscExpenses: any[];
    withdrawals: any[];
    loans?: any[];
  };
}

function formatDateDDMMYYYY(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function generateExcelReport(data: ReportExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Shop Finance Management System';
  workbook.created = new Date();

  const cat = data.category || 'ALL';

  // Color theme
  const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F766E' }, // Teal
  };
  const HEADER_FONT: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  // 1. Summary Sheet
  const summarySheet = workbook.addWorksheet('Financial Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 32 },
    { header: 'Amount (₹)', key: 'amount', width: 20 },
  ];

  summarySheet.getRow(1).eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  const s = data.summary;
  summarySheet.addRows([
    { metric: 'Shop Name', amount: data.shopName },
    { metric: 'Report Period', amount: `${formatDateDDMMYYYY(data.from)} to ${formatDateDDMMYYYY(data.to)}` },
    { metric: 'Filtered Category', amount: cat },
    { metric: '', amount: '' },
    { metric: 'Total Cash Sales', amount: parseFloat(s.totalCashSales.toFixed(2)) },
    { metric: 'Total Online Sales', amount: parseFloat(s.totalOnlineSales.toFixed(2)) },
    { metric: 'Total Sales Revenue', amount: parseFloat(s.totalSales.toFixed(2)) },
    { metric: '', amount: '' },
    { metric: 'Material Expenses (COGS)', amount: parseFloat(s.totalMaterialExpenses.toFixed(2)) },
    { metric: 'Gross Profit', amount: parseFloat(s.grossProfit.toFixed(2)) },
    { metric: '', amount: '' },
    { metric: 'Shop Operational Expenses', amount: parseFloat(s.totalShopExpenses.toFixed(2)) },
    { metric: 'Miscellaneous Expenses', amount: parseFloat(s.totalMiscExpenses.toFixed(2)) },
    { metric: 'Net Profit / (Loss)', amount: parseFloat(s.netProfit.toFixed(2)) },
    { metric: '', amount: '' },
    { metric: 'Cash Withdrawals', amount: parseFloat(s.cashWithdrawals.toFixed(2)) },
    { metric: 'Online Withdrawals', amount: parseFloat(s.onlineWithdrawals.toFixed(2)) },
    { metric: 'Total Withdrawals', amount: parseFloat(s.totalWithdrawals.toFixed(2)) },
    { metric: '', amount: '' },
    { metric: 'Cash Balance Available', amount: parseFloat(s.cashBalance.toFixed(2)) },
    { metric: 'Online Balance Available', amount: parseFloat(s.onlineBalance.toFixed(2)) },
    { metric: 'Remaining Business Balance', amount: parseFloat(s.remainingBusinessBalance.toFixed(2)) },
  ]);

  summarySheet.eachRow((row, rowNumber) => {
    if (rowNumber > 4 && row.getCell(2).value && typeof row.getCell(2).value === 'number') {
      row.getCell(2).numFmt = '₹#,##0.00';
    }
  });

  // 2. Sales Sheet
  if (cat === 'ALL' || cat === 'SALES') {
    const salesSheet = workbook.addWorksheet('Sales Entries');
    salesSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Payment Method', key: 'method', width: 18 },
      { header: 'Amount (₹)', key: 'amount', width: 16 },
      { header: 'Note', key: 'note', width: 30 },
    ];
    salesSheet.getRow(1).eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
    });

    data.records.sales.forEach((sale) => {
      salesSheet.addRow({
        date: formatDateDDMMYYYY(sale.saleDate),
        type: sale.type,
        method: sale.paymentMethod || 'Cash',
        amount: parseFloat(sale.amount),
        note: sale.note || '',
      });
    });
    salesSheet.getColumn(4).numFmt = '₹#,##0.00';
  }

  // 3. Material Expenses Sheet
  if (cat === 'ALL' || cat === 'MATERIAL_EXPENSES') {
    const matSheet = workbook.addWorksheet('Material Expenses');
    matSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Payment Mode', key: 'mode', width: 15 },
      { header: 'Amount (₹)', key: 'amount', width: 16 },
      { header: 'Note / Item', key: 'note', width: 30 },
    ];
    matSheet.getRow(1).eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
    });

    data.records.materialExpenses.forEach((exp) => {
      matSheet.addRow({
        date: formatDateDDMMYYYY(exp.expDate),
        category: exp.category,
        mode: exp.mode,
        amount: parseFloat(exp.amount),
        note: exp.note || '',
      });
    });
    matSheet.getColumn(4).numFmt = '₹#,##0.00';
  }

  // 4. Shop Expenses Sheet
  if (cat === 'ALL' || cat === 'SHOP_EXPENSES') {
    const shopSheet = workbook.addWorksheet('Shop Expenses');
    shopSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Payment Mode', key: 'mode', width: 15 },
      { header: 'Recurring', key: 'recurring', width: 12 },
      { header: 'Amount (₹)', key: 'amount', width: 16 },
      { header: 'Note / Payee', key: 'note', width: 30 },
    ];
    shopSheet.getRow(1).eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
    });

    data.records.shopExpenses.forEach((exp) => {
      shopSheet.addRow({
        date: formatDateDDMMYYYY(exp.expDate),
        category: exp.category,
        mode: exp.mode,
        recurring: exp.isRecurring ? 'Yes' : 'No',
        amount: parseFloat(exp.amount),
        note: exp.note || '',
      });
    });
    shopSheet.getColumn(5).numFmt = '₹#,##0.00';
  }

  // 5. Misc Expenses Sheet
  if (cat === 'ALL' || cat === 'MISC_EXPENSES') {
    const miscSheet = workbook.addWorksheet('Misc Expenses');
    miscSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Expense Name', key: 'name', width: 28 },
      { header: 'Payment Mode', key: 'mode', width: 15 },
      { header: 'Amount (₹)', key: 'amount', width: 16 },
      { header: 'Note', key: 'note', width: 30 },
    ];
    miscSheet.getRow(1).eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
    });

    data.records.miscExpenses.forEach((exp) => {
      miscSheet.addRow({
        date: formatDateDDMMYYYY(exp.expDate),
        name: exp.name,
        mode: exp.mode,
        amount: parseFloat(exp.amount),
        note: exp.note || '',
      });
    });
    miscSheet.getColumn(4).numFmt = '₹#,##0.00';
  }

  // 6. Withdrawals Sheet
  if (cat === 'ALL' || cat === 'WITHDRAWALS') {
    const withSheet = workbook.addWorksheet('Owner Withdrawals');
    withSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Payment Mode', key: 'mode', width: 15 },
      { header: 'Amount (₹)', key: 'amount', width: 16 },
      { header: 'Note / Reason', key: 'note', width: 35 },
    ];
    withSheet.getRow(1).eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
    });

    data.records.withdrawals.forEach((w) => {
      withSheet.addRow({
        date: formatDateDDMMYYYY(w.wDate),
        mode: w.mode,
        amount: parseFloat(w.amount),
        note: w.note || '',
      });
    });
    withSheet.getColumn(3).numFmt = '₹#,##0.00';
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
