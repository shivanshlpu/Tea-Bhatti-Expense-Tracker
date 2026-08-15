import PDFDocument from 'pdfkit';
import { ReportExportData } from './excelGenerator';

function fmt(val: any): string {
  const num = typeof val === 'number' ? val : parseFloat(val || '0');
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function formatDateDDMMYYYY(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Enterprise-Grade Financial Statement & P&L PDF Generator
 * Built natively with PDFKit for 100% reliable serverless / Linux container generation.
 * Features:
 * - Executive Corporate Dual-Tone Header
 * - Formal Statement of Profit & Loss (P&L Income Statement)
 * - Mode-Wise Categorized Payment Matrix (Cash vs Online/UPI)
 * - Cash Drawer & Bank Liquidity Summary Grid
 * - Itemized Transaction Ledgers with Zebra Striping & Subtotals
 * - Smart Multi-Page Pagination with Zero Text Overlaps & Running Footers
 */
export function generatePdfKitReport(data: ReportExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        autoFirstPage: true,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        // Multi-page header and footer stamping
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);

          // Running Header (Pages 2+)
          if (i > 0) {
            doc.save();
            doc.fontSize(7.5).fillColor('#64748b');
            doc.text(`${data.shopName.toUpperCase()} — FINANCIAL STATEMENT & P&L REPORT`, 36, 18, { width: 350 });
            doc.text(`PERIOD: ${fromStr} TO ${toStr}`, 350, 18, { align: 'right', width: 209 });
            doc.moveTo(36, 28).lineTo(559, 28).strokeColor('#e2e8f0').lineWidth(0.75).stroke();
            doc.restore();
          }

          // Running Footer on every page
          doc.save();
          doc.moveTo(36, 804).lineTo(559, 804).strokeColor('#e2e8f0').lineWidth(0.75).stroke();
          doc.fontSize(7.5).fillColor('#94a3b8');
          doc.text('Tea Bhatti Cafe Expense Tracker — Confidential Management Statement', 36, 810, { width: 350 });
          doc.text(`Page ${i + 1} of ${range.count}`, 350, 810, { align: 'right', width: 209 });
          doc.restore();
        }
        doc.flushPages();
        resolve(Buffer.concat(buffers));
      });

      const s = data.summary;
      const fromStr = formatDateDDMMYYYY(data.from);
      const toStr = formatDateDDMMYYYY(data.to);
      const cat = data.category || 'ALL';

      const showSales = cat === 'ALL' || cat === 'SALES';
      const showMaterial = cat === 'ALL' || cat === 'MATERIAL_EXPENSES';
      const showShop = cat === 'ALL' || cat === 'SHOP_EXPENSES';
      const showMisc = cat === 'ALL' || cat === 'MISC_EXPENSES';
      const showWithdrawals = cat === 'ALL' || cat === 'WITHDRAWALS';
      const showLoans = cat === 'ALL' || cat === 'LOANS';

      // ── Smart Pagination Guard Helper ──
      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > 780) {
          doc.addPage();
          doc.y = 44; // Start below running header
        }
      };

      // ── Financial Numbers ──
      const totalSales = s.totalSales.toNumber();
      const totalCashSales = s.totalCashSales.toNumber();
      const totalOnlineSales = s.totalOnlineSales.toNumber();

      const openingCash = s.openingCashVal.toNumber();
      const openingBank = s.openingBankVal.toNumber();
      const totalOpening = s.totalOpeningVal.toNumber();
      const effectiveSales = s.effectiveTotalSales.toNumber();

      const totalMaterialExp = s.totalMaterialExpenses.toNumber();
      const cashMaterialExp = s.cashMaterialExpenses.toNumber();
      const onlineMaterialExp = s.onlineMaterialExpenses.toNumber();

      const totalShopExp = s.totalShopExpenses.toNumber();
      const cashShopExp = s.cashShopExpenses.toNumber();
      const onlineShopExp = s.onlineShopExpenses.toNumber();

      const totalMiscExp = s.totalMiscExpenses.toNumber();
      const cashMiscExp = s.cashMiscExpenses.toNumber();
      const onlineMiscExp = s.onlineMiscExpenses.toNumber();

      const totalDrawings = s.totalDrawings.toNumber();
      const cashDrawings = s.cashWithdrawals.toNumber();
      const onlineDrawings = s.onlineWithdrawals.toNumber();

      const grossProfit = s.grossProfit.toNumber();
      const netProfit = s.netProfit.toNumber();

      const cashBalance = s.cashBalance.toNumber();
      const onlineBalance = s.onlineBalance.toNumber();
      const totalLiquidity = s.remainingBusinessBalance.toNumber();

      const pendingLoanTaken = s.pendingLoanTaken.toNumber();
      const pendingLoanGiven = s.pendingLoanGiven.toNumber();

      const grossMarginPct = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
      const netMarginPct = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      // Mode-Wise Sub-Profits
      const cashEffectiveSales = totalCashSales + openingCash;
      const onlineEffectiveSales = totalOnlineSales + openingBank;
      const cashGrossProfit = cashEffectiveSales - cashMaterialExp;
      const onlineGrossProfit = onlineEffectiveSales - onlineMaterialExp;
      const cashNetProfit = cashGrossProfit - (cashShopExp + cashMiscExp) - cashDrawings;
      const onlineNetProfit = onlineGrossProfit - (onlineShopExp + onlineMiscExp) - onlineDrawings;

      // ==========================================
      // 1. EXECUTIVE CORPORATE HEADER
      // ==========================================
      doc.rect(36, 36, 523, 68).fill('#0F172A');
      doc.rect(36, 102, 523, 3).fill('#EF5A34'); // Brand Orange Accent Line

      doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text(data.shopName.toUpperCase(), 48, 46);
      doc.fontSize(8.5).font('Helvetica').fillColor('#94A3B8').text('OFFICIAL FINANCIAL STATEMENT & PROFIT/LOSS REPORT', 48, 66);
      doc.fontSize(8).fillColor('#CBD5E1').text(`Proprietor: ${data.ownerName}  |  Currency: INR (Rs.)`, 48, 80);

      // Header Meta Badge (Right Side)
      doc.rect(370, 44, 180, 48).fillAndStroke('#1E293B', '#334155');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#EF5A34').text('STATEMENT PERIOD', 378, 50);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF').text(`${fromStr} to ${toStr}`, 378, 62);
      doc.fontSize(7).font('Helvetica').fillColor('#94A3B8').text(`Generated: ${formatDateDDMMYYYY(new Date())}`, 378, 76);

      doc.y = 118;

      // ==========================================
      // 2. STATEMENT OF PROFIT & LOSS (INCOME STATEMENT)
      // ==========================================
      ensureSpace(160);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text('1. STATEMENT OF PROFIT & LOSS (P&L)', 36, doc.y);
      doc.moveDown(0.3);

      const pnlTableY = doc.y;
      const pnlW = 523;

      // Table Header Row
      doc.rect(36, pnlTableY, pnlW, 16).fill('#F1F5F9');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155');
      doc.text('FINANCIAL LINE ITEM', 44, pnlTableY + 4);
      doc.text('CALCULATION BASIS', 240, pnlTableY + 4);
      doc.text('AMOUNT (RS.)', 430, pnlTableY + 4, { align: 'right', width: 120 });

      let curPnlY = pnlTableY + 16;

      const pnlRows: Array<{ label: string; basis: string; val: number; isSubtotal?: boolean; isHighlight?: boolean; isNegative?: boolean }> = [
        { label: 'Counter Cash Sales Revenue', basis: 'Recorded physical cash transactions', val: totalCashSales },
        { label: 'Online / UPI Sales Revenue', basis: 'GPay, PhonePe, QR & Bank credits', val: totalOnlineSales },
        { label: 'Opening Capital Revenue Baseline', basis: 'Starting Cash + Bank balance', val: totalOpening },
        { label: 'TOTAL EFFECTIVE TRADING REVENUE', basis: 'Recorded Sales + Opening Capital', val: effectiveSales, isSubtotal: true },
        { label: 'Cost of Goods Sold (Raw Material COGS)', basis: 'Milk, Tea Leaves, Sugar, Gas, Snacks', val: totalMaterialExp, isNegative: true },
        { label: 'GROSS TRADING PROFIT', basis: `Gross Margin: ${grossMarginPct.toFixed(1)}% of Sales`, val: grossProfit, isHighlight: true },
        { label: 'Shop Operating Overhead Expenses', basis: 'Shop Rent, Electricity & Staff Wages', val: totalShopExp, isNegative: true },
        { label: 'Miscellaneous Expenses', basis: 'Daily maintenance, repairs & consumables', val: totalMiscExp, isNegative: true },
        { label: 'Owner Drawings & Loan Repayments', basis: 'Cash/Online personal withdrawals & debt repaid', val: totalDrawings, isNegative: true },
        { label: 'NET BUSINESS PROFIT / (LOSS)', basis: `Net Margin: ${netMarginPct.toFixed(1)}% of Sales`, val: netProfit, isHighlight: true, isSubtotal: true },
      ];

      pnlRows.forEach((row, i) => {
        const rowH = 15;
        if (row.isHighlight) {
          doc.rect(36, curPnlY, pnlW, rowH).fill(row.val >= 0 ? '#DCFCE7' : '#FEE2E2');
        } else if (row.isSubtotal) {
          doc.rect(36, curPnlY, pnlW, rowH).fill('#F8FAFC');
        } else if (i % 2 === 1) {
          doc.rect(36, curPnlY, pnlW, rowH).fill('#FAFAFA');
        }

        doc.moveTo(36, curPnlY + rowH).lineTo(559, curPnlY + rowH).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

        doc.fontSize(7.5);
        if (row.isHighlight) {
          doc.font('Helvetica-Bold').fillColor(row.val >= 0 ? '#15803D' : '#B91C1C');
        } else if (row.isSubtotal) {
          doc.font('Helvetica-Bold').fillColor('#0F172A');
        } else {
          doc.font('Helvetica').fillColor('#334155');
        }

        doc.text(row.label, 44, curPnlY + 3.5);
        doc.font('Helvetica').fillColor('#64748B').text(row.basis, 240, curPnlY + 3.5);

        const valPrefix = row.isNegative && row.val > 0 ? '-Rs. ' : 'Rs. ';
        const valColor = row.isHighlight ? (row.val >= 0 ? '#15803D' : '#B91C1C') : (row.isNegative ? '#DC2626' : '#0F172A');
        doc.font('Helvetica-Bold').fillColor(valColor).text(`${valPrefix}${fmt(row.val)}`, 430, curPnlY + 3.5, { align: 'right', width: 120 });

        curPnlY += rowH;
      });

      doc.y = curPnlY + 12;

      // ==========================================
      // 3. CATEGORIZED PAYMENT BREAKDOWN MATRIX
      // ==========================================
      ensureSpace(140);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text('2. CATEGORIZED PAYMENT METHOD BREAKDOWN (CASH vs ONLINE)', 36, doc.y);
      doc.moveDown(0.3);

      const matrixY = doc.y;
      doc.rect(36, matrixY, pnlW, 16).fill('#0F172A');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
      doc.text('FINANCIAL COMPONENT', 44, matrixY + 4);
      doc.text('CASH STREAM (RS.)', 210, matrixY + 4, { align: 'right', width: 100 });
      doc.text('ONLINE / UPI (RS.)', 325, matrixY + 4, { align: 'right', width: 100 });
      doc.text('CONSOLIDATED TOTAL', 440, matrixY + 4, { align: 'right', width: 110 });

      let curMatrixY = matrixY + 16;

      const matrixRows = [
        { label: 'Opening Capital Baseline', cash: openingCash, online: openingBank, total: totalOpening },
        { label: 'Sales Revenue Inflow', cash: totalCashSales, online: totalOnlineSales, total: totalSales },
        { label: 'Raw Material Expenses (COGS)', cash: -cashMaterialExp, online: -onlineMaterialExp, total: -totalMaterialExp },
        { label: 'Calculated Gross Profit', cash: cashGrossProfit, online: onlineGrossProfit, total: grossProfit, isSubtotal: true },
        { label: 'Operating Overheads & Misc', cash: -(cashShopExp + cashMiscExp), online: -(onlineShopExp + onlineMiscExp), total: -(totalShopExp + totalMiscExp) },
        { label: 'Owner Drawings / Withdrawals', cash: -cashDrawings, online: -onlineDrawings, total: -totalDrawings },
        { label: 'Estimated Net Profit', cash: cashNetProfit, online: onlineNetProfit, total: netProfit, isHighlight: true },
        { label: 'Closing Drawer & Bank Balance', cash: cashBalance, online: onlineBalance, total: totalLiquidity, isHighlight: true, isBalance: true },
      ];

      matrixRows.forEach((row, i) => {
        const rowH = 15;
        if (row.isHighlight) {
          doc.rect(36, curMatrixY, pnlW, rowH).fill(row.isBalance ? '#EFF6FF' : '#F0FDF4');
        } else if (row.isSubtotal) {
          doc.rect(36, curMatrixY, pnlW, rowH).fill('#F8FAFC');
        } else if (i % 2 === 1) {
          doc.rect(36, curMatrixY, pnlW, rowH).fill('#FAFAFA');
        }

        doc.moveTo(36, curMatrixY + rowH).lineTo(559, curMatrixY + rowH).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

        doc.fontSize(7.5);
        if (row.isHighlight) {
          doc.font('Helvetica-Bold').fillColor(row.isBalance ? '#1E40AF' : '#15803D');
        } else if (row.isSubtotal) {
          doc.font('Helvetica-Bold').fillColor('#0F172A');
        } else {
          doc.font('Helvetica').fillColor('#334155');
        }

        doc.text(row.label, 44, curMatrixY + 3.5);

        const renderCell = (val: number, x: number, w: number, color?: string) => {
          const formatted = `${val < 0 ? '-' : ''}Rs. ${fmt(Math.abs(val))}`;
          doc.font('Helvetica-Bold').fillColor(color || (val < 0 ? '#DC2626' : (row.isHighlight ? '#15803D' : '#0F172A')));
          doc.text(formatted, x, curMatrixY + 3.5, { align: 'right', width: w });
        };

        renderCell(row.cash, 210, 100, row.isHighlight ? '#15803D' : undefined);
        renderCell(row.online, 325, 100, row.isHighlight ? '#2563EB' : undefined);
        renderCell(row.total, 440, 110, row.isHighlight ? (row.isBalance ? '#1E40AF' : '#15803D') : undefined);

        curMatrixY += rowH;
      });

      doc.y = curMatrixY + 12;

      // ==========================================
      // 4. LIQUIDITY & LOANS LEDGER BOXES
      // ==========================================
      ensureSpace(60);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text('3. LIQUIDITY & LOANS SUMMARY', 36, doc.y);
      doc.moveDown(0.3);

      const kpiBoxes = [
        { label: 'CASH DRAWER', val: `Rs. ${fmt(cashBalance)}`, color: '#16A34A', sub: 'Physical Cash' },
        { label: 'BANK ACCOUNT', val: `Rs. ${fmt(onlineBalance)}`, color: '#2563EB', sub: 'Online / UPI' },
        { label: 'TOTAL LIQUIDITY', val: `Rs. ${fmt(totalLiquidity)}`, color: '#7C3AED', sub: 'Drawer + Bank' },
        { label: 'LOANS PAYABLE', val: `Rs. ${fmt(pendingLoanTaken)}`, color: '#DC2626', sub: 'We Owe' },
        { label: 'LOANS RECEIVABLE', val: `Rs. ${fmt(pendingLoanGiven)}`, color: '#15803D', sub: 'Owed to Us' },
      ];

      const boxW = 100;
      const boxH = 38;
      const startX = 36;
      let kpiX = startX;
      const kpiY = doc.y;

      kpiBoxes.forEach((box) => {
        doc.rect(kpiX, kpiY, boxW, boxH).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.rect(kpiX, kpiY, boxW, 2.5).fill(box.color);

        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#64748B').text(box.label, kpiX + 6, kpiY + 6);
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(box.color).text(box.val, kpiX + 6, kpiY + 16);
        doc.fontSize(6.5).font('Helvetica').fillColor('#94A3B8').text(box.sub, kpiX + 6, kpiY + 28);

        kpiX += boxW + 5.7;
      });

      doc.y = kpiY + boxH + 16;

      // ==========================================
      // 5. ITEMIZED TRANSACTION LEDGER TABLES
      // ==========================================
      const renderLedgerTable = (
        title: string,
        columns: Array<{ header: string; width: number; align?: 'left' | 'right' | 'center' }>,
        rows: Array<Array<{ text: string; bold?: boolean; color?: string; align?: 'left' | 'right' | 'center' }>>,
        totalAmount?: number,
        badgeText?: string
      ) => {
        ensureSpace(60);

        // Section Title & Badge
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A').text(title, 36, doc.y);
        if (badgeText) {
          const titleW = doc.widthOfString(title);
          doc.rect(42 + titleW, doc.y - 10, 70, 12).fill('#F1F5F9');
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#475569').text(badgeText, 46 + titleW, doc.y - 8);
        }
        doc.moveDown(0.3);

        const tableY = doc.y;
        const totalW = columns.reduce((acc, c) => acc + c.width, 0);

        // Table Column Headers
        doc.rect(36, tableY, totalW, 14).fill('#F1F5F9');
        let colX = 36;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#334155');

        columns.forEach((c) => {
          doc.text(c.header, colX + 4, tableY + 3.5, {
            width: c.width - 8,
            align: c.align || 'left',
          });
          colX += c.width;
        });

        let curY = tableY + 14;

        if (rows.length === 0) {
          doc.rect(36, curY, totalW, 16).fill('#FFFFFF');
          doc.fontSize(7.5).font('Helvetica').fillColor('#94A3B8').text('No transaction records found in selected statement period', 36, curY + 4, { align: 'center', width: totalW });
          curY += 16;
        } else {
          rows.forEach((row, rIdx) => {
            ensureSpace(14);
            if (curY > 780) {
              doc.addPage();
              curY = 44;
            }

            const rowH = 13.5;
            if (rIdx % 2 === 1) {
              doc.rect(36, curY, totalW, rowH).fill('#F8FAFC');
            }

            doc.moveTo(36, curY + rowH).lineTo(36 + totalW, curY + rowH).strokeColor('#F1F5F9').lineWidth(0.5).stroke();

            let cellX = 36;
            row.forEach((cell, cIdx) => {
              const col = columns[cIdx];
              doc.fontSize(7).font(cell.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(cell.color || '#334155');
              doc.text(cell.text, cellX + 4, curY + 3, {
                width: col.width - 8,
                align: cell.align || col.align || 'left',
              });
              cellX += col.width;
            });

            curY += rowH;
          });
        }

        // Subtotal Footer Row
        if (totalAmount !== undefined) {
          doc.rect(36, curY, totalW, 15).fill('#F8FAFC');
          doc.moveTo(36, curY).lineTo(36 + totalW, curY).strokeColor('#CBD5E1').lineWidth(0.75).stroke();
          doc.moveTo(36, curY + 15).lineTo(36 + totalW, curY + 15).strokeColor('#CBD5E1').lineWidth(0.75).stroke();

          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0F172A');
          doc.text(`TOTAL (${rows.length} records):`, 44, curY + 3.5);
          doc.text(`Rs. ${fmt(totalAmount)}`, 36 + totalW - 120, curY + 3.5, { align: 'right', width: 112 });
          curY += 15;
        }

        doc.y = curY + 14;
      };

      // ── Table A: Sales Revenue ──
      if (showSales) {
        const salesCols: Array<{ header: string; width: number; align?: 'left' | 'right' | 'center' }> = [
          { header: 'DATE', width: 65 },
          { header: 'TYPE', width: 60 },
          { header: 'METHOD', width: 80 },
          { header: 'NOTES / DETAILS', width: 208 },
          { header: 'AMOUNT (RS.)', width: 110, align: 'right' },
        ];

        const salesRows = data.records.sales.map((r) => [
          { text: formatDateDDMMYYYY(r.saleDate) },
          { text: r.type, bold: true, color: r.type === 'CASH' ? '#15803D' : '#2563EB' },
          { text: r.paymentMethod || (r.type === 'CASH' ? 'Cash' : 'UPI/Online') },
          { text: r.note || '—' },
          { text: `Rs. ${fmt(r.amount)}`, bold: true, align: 'right' as const },
        ]);

        const salesTotal = data.records.sales.reduce((acc, r) => acc + parseFloat(r.amount || '0'), 0);
        renderLedgerTable('SALES REVENUE TRANSACTIONS', salesCols, salesRows, salesTotal, `${salesRows.length} Entries`);
      }

      // ── Table B: Raw Material Expenses (COGS) ──
      if (showMaterial) {
        const matCols: Array<{ header: string; width: number; align?: 'left' | 'right' | 'center' }> = [
          { header: 'DATE', width: 65 },
          { header: 'ITEM CATEGORY', width: 120 },
          { header: 'MODE', width: 60 },
          { header: 'VENDOR / NOTES', width: 168 },
          { header: 'AMOUNT (RS.)', width: 110, align: 'right' },
        ];

        const matRows = data.records.materialExpenses.map((r) => [
          { text: formatDateDDMMYYYY(r.expDate) },
          { text: r.category, bold: true },
          { text: r.mode, bold: true, color: r.mode === 'CASH' ? '#15803D' : '#2563EB' },
          { text: r.note || '—' },
          { text: `Rs. ${fmt(r.amount)}`, bold: true, color: '#DC2626', align: 'right' as const },
        ]);

        const matTotal = data.records.materialExpenses.reduce((acc, r) => acc + parseFloat(r.amount || '0'), 0);
        renderLedgerTable('RAW MATERIAL EXPENSES (COGS)', matCols, matRows, matTotal, `${matRows.length} Entries`);
      }

      // ── Table C: Shop Operating Expenses ──
      if (showShop) {
        const shopCols: Array<{ header: string; width: number; align?: 'left' | 'right' | 'center' }> = [
          { header: 'DATE', width: 65 },
          { header: 'EXPENSE CATEGORY', width: 110 },
          { header: 'MODE', width: 55 },
          { header: 'RECURRING', width: 55 },
          { header: 'PAYEE / NOTES', width: 128 },
          { header: 'AMOUNT (RS.)', width: 110, align: 'right' },
        ];

        const shopRows = data.records.shopExpenses.map((r) => [
          { text: formatDateDDMMYYYY(r.expDate) },
          { text: r.category, bold: true },
          { text: r.mode, bold: true, color: r.mode === 'CASH' ? '#15803D' : '#2563EB' },
          { text: r.isRecurring ? 'Yes' : 'No' },
          { text: r.note || '—' },
          { text: `Rs. ${fmt(r.amount)}`, bold: true, color: '#DC2626', align: 'right' as const },
        ]);

        const shopTotal = data.records.shopExpenses.reduce((acc, r) => acc + parseFloat(r.amount || '0'), 0);
        renderLedgerTable('SHOP OPERATIONAL OVERHEAD EXPENSES', shopCols, shopRows, shopTotal, `${shopRows.length} Entries`);
      }

      // ── Table D: Miscellaneous Expenses ──
      if (showMisc) {
        const miscCols: Array<{ header: string; width: number; align?: 'left' | 'right' | 'center' }> = [
          { header: 'DATE', width: 65 },
          { header: 'EXPENSE ITEM', width: 140 },
          { header: 'MODE', width: 60 },
          { header: 'NOTES / DETAILS', width: 148 },
          { header: 'AMOUNT (RS.)', width: 110, align: 'right' },
        ];

        const miscRows = data.records.miscExpenses.map((r) => [
          { text: formatDateDDMMYYYY(r.expDate) },
          { text: r.name, bold: true },
          { text: r.mode, bold: true, color: r.mode === 'CASH' ? '#15803D' : '#2563EB' },
          { text: r.note || '—' },
          { text: `Rs. ${fmt(r.amount)}`, bold: true, color: '#DC2626', align: 'right' as const },
        ]);

        const miscTotal = data.records.miscExpenses.reduce((acc, r) => acc + parseFloat(r.amount || '0'), 0);
        renderLedgerTable('MISCELLANEOUS EXPENSES', miscCols, miscRows, miscTotal, `${miscRows.length} Entries`);
      }

      // ── Table E: Owner Drawings / Withdrawals ──
      if (showWithdrawals) {
        const wCols: Array<{ header: string; width: number; align?: 'left' | 'right' | 'center' }> = [
          { header: 'DATE', width: 75 },
          { header: 'WITHDRAWAL MODE', width: 100 },
          { header: 'PURPOSE / NOTE', width: 238 },
          { header: 'AMOUNT (RS.)', width: 110, align: 'right' },
        ];

        const wRows = data.records.withdrawals.map((r) => [
          { text: formatDateDDMMYYYY(r.wDate) },
          { text: r.mode, bold: true, color: r.mode === 'CASH' ? '#15803D' : '#2563EB' },
          { text: r.note || 'Owner Personal Withdrawal' },
          { text: `Rs. ${fmt(r.amount)}`, bold: true, color: '#DC2626', align: 'right' as const },
        ]);

        const wTotal = data.records.withdrawals.reduce((acc, r) => acc + parseFloat(r.amount || '0'), 0);
        renderLedgerTable('OWNER DRAWINGS & WITHDRAWALS', wCols, wRows, wTotal, `${wRows.length} Entries`);
      }

      // ── Table F: Loans & Debt Ledger ──
      if (showLoans && data.records.loans && data.records.loans.length > 0) {
        const loanCols: Array<{ header: string; width: number; align?: 'left' | 'right' | 'center' }> = [
          { header: 'DATE', width: 60 },
          { header: 'TYPE', width: 55 },
          { header: 'PARTY NAME', width: 100 },
          { header: 'MODE', width: 50 },
          { header: 'PRINCIPAL', width: 85, align: 'right' },
          { header: 'RETURNED', width: 85, align: 'right' },
          { header: 'PENDING', width: 88, align: 'right' },
        ];

        const loanRows = data.records.loans.map((r) => [
          { text: formatDateDDMMYYYY(r.date) },
          { text: r.type, bold: true, color: r.type === 'TAKEN' ? '#DC2626' : '#15803D' },
          { text: r.personName },
          { text: r.paymentMode || 'CASH' },
          { text: `Rs. ${fmt(r.amount)}`, align: 'right' as const },
          { text: `Rs. ${fmt(r.returnedAmount)}`, color: '#15803D', align: 'right' as const },
          { text: `Rs. ${fmt(r.pendingAmount)}`, bold: true, color: parseFloat(r.pendingAmount) > 0 ? '#DC2626' : '#15803D', align: 'right' as const },
        ]);

        renderLedgerTable('LOANS & DEBT LEDGER', loanCols, loanRows, undefined, `${loanRows.length} Records`);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Main PDF Generator function for Reports & Statements.
 */
export async function generatePdfReport(data: ReportExportData): Promise<Buffer> {
  return await generatePdfKitReport(data);
}
