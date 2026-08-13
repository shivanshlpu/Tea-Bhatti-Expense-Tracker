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
 * Bulletproof, High-Performance PDF Generator using PDFKit
 * Works on Render, Vercel, AWS, Linux, Windows, and local dev with zero Chrome/Puppeteer dependencies.
 */
export function generatePdfReport(data: ReportExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 36, size: 'A4', autoFirstPage: true });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const s = data.summary;
      const fromStr = formatDateDDMMYYYY(data.from);
      const toStr = formatDateDDMMYYYY(data.to);
      const cat = data.category || 'ALL';

      const showSales = cat === 'ALL' || cat === 'SALES';
      const showMaterial = cat === 'ALL' || cat === 'MATERIAL_EXPENSES';
      const showShop = cat === 'ALL' || cat === 'SHOP_EXPENSES';
      const showMisc = cat === 'ALL' || cat === 'MISC_EXPENSES';
      const showWithdrawals = cat === 'ALL' || cat === 'WITHDRAWALS';

      // ── Header Banner ──
      doc.rect(36, 36, 523, 60).fill('#0f766e');
      doc.fillColor('#ffffff').fontSize(18).text(data.shopName, 48, 46, { bold: true } as any);
      doc.fontSize(9).fillColor('#ccfbf1').text(`Owner: ${data.ownerName} | Statement Period: ${fromStr} to ${toStr}`);
      doc.fontSize(8).fillColor('#99f6e4').text(`Generated: ${formatDateDDMMYYYY(new Date())}`, 48, 76);

      doc.y = 110;

      // ── Summary Cards Grid ──
      doc.fontSize(12).fillColor('#0f766e').text('📊 Financial Executive Summary', 36, doc.y);
      doc.moveDown(0.4);

      const netProfitVal = s.netProfit.toNumber();
      const grossProfitVal = s.grossProfit.toNumber();
      const totalSalesVal = s.totalSales.toNumber();

      const summaryGrid = [
        { label: 'Total Sales Revenue', val: `Rs. ${fmt(totalSalesVal)}`, color: '#0f766e' },
        { label: 'Gross Profit', val: `Rs. ${fmt(grossProfitVal)}`, color: '#0d9488' },
        { label: 'Net Profit / (Loss)', val: `Rs. ${fmt(netProfitVal)}`, color: netProfitVal >= 0 ? '#16a34a' : '#dc2626' },
        { label: 'Closing Cash Balance', val: `Rs. ${fmt(s.cashBalance.toNumber())}`, color: '#0284c7' },
        { label: 'Closing Bank Balance', val: `Rs. ${fmt(s.onlineBalance.toNumber())}`, color: '#4338ca' },
        { label: 'Total Cash Available', val: `Rs. ${fmt(s.remainingBusinessBalance.toNumber())}`, color: '#059669' },
      ];

      let cardX = 36;
      let cardY = doc.y;
      const cardW = 168;
      const cardH = 42;

      summaryGrid.forEach((card, idx) => {
        if (idx > 0 && idx % 3 === 0) {
          cardX = 36;
          cardY += cardH + 8;
        }

        doc.rect(cardX, cardY, cardW, cardH).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#64748b').fontSize(7.5).text(card.label.toUpperCase(), cardX + 8, cardY + 6);
        doc.fillColor(card.color).fontSize(11).text(card.val, cardX + 8, cardY + 20, { bold: true } as any);

        cardX += cardW + 9;
      });

      doc.y = cardY + cardH + 18;

      // ── Helper to draw data tables ──
      const renderTable = (
        title: string,
        items: any[],
        headers: string[],
        widths: number[],
        rowMapper: (item: any) => string[]
      ) => {
        if (items.length === 0) return;

        if (doc.y > 680) doc.addPage();

        doc.fontSize(11).fillColor('#0f766e').text(`${title} (${items.length} records)`, 36, doc.y);
        doc.moveDown(0.3);

        const startY = doc.y;
        let currentY = startY;

        // Draw Table Header
        doc.rect(36, currentY, 523, 18).fill('#0f766e');
        let currentX = 40;
        headers.forEach((h, i) => {
          doc.fillColor('#ffffff').fontSize(8).text(h, currentX, currentY + 4, { width: widths[i], align: i === headers.length - 1 ? 'right' : 'left' });
          currentX += widths[i];
        });

        currentY += 18;

        // Draw Table Rows
        items.forEach((item, rIdx) => {
          if (currentY > 750) {
            doc.addPage();
            currentY = 40;
          }

          const bgColor = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(36, currentY, 523, 16).fillAndStroke(bgColor, '#f1f5f9');

          const rowVals = rowMapper(item);
          let cellX = 40;
          rowVals.forEach((val, i) => {
            doc.fillColor('#334155').fontSize(7.5).text(val, cellX, currentY + 3, {
              width: widths[i],
              align: i === headers.length - 1 ? 'right' : 'left',
            });
            cellX += widths[i];
          });

          currentY += 16;
        });

        doc.y = currentY + 14;
      };

      // 1. Sales Records Table
      if (showSales) {
        renderTable(
          '💵 Sales Revenue Entries',
          data.records.sales,
          ['Date', 'Type', 'Method', 'Note / Order', 'Amount'],
          [80, 70, 100, 180, 85],
          (r) => [formatDateDDMMYYYY(r.saleDate), r.type, r.paymentMethod || 'Cash', r.note || '—', `Rs. ${fmt(r.amount)}`]
        );
      }

      // 2. Material Expenses Table
      if (showMaterial) {
        renderTable(
          '🥛 Material Expenses (COGS)',
          data.records.materialExpenses,
          ['Date', 'Category', 'Mode', 'Note / Vendor', 'Amount'],
          [80, 110, 60, 180, 85],
          (r) => [formatDateDDMMYYYY(r.expDate), r.category, r.mode, r.note || '—', `Rs. ${fmt(r.amount)}`]
        );
      }

      // 3. Shop Expenses Table
      if (showShop) {
        renderTable(
          '🏬 Shop Operational Expenses',
          data.records.shopExpenses,
          ['Date', 'Category', 'Mode', 'Recurring', 'Note / Payee', 'Amount'],
          [70, 95, 55, 55, 155, 85],
          (r) => [formatDateDDMMYYYY(r.expDate), r.category, r.mode, r.isRecurring ? 'Yes' : 'No', r.note || '—', `Rs. ${fmt(r.amount)}`]
        );
      }

      // 4. Misc Expenses Table
      if (showMisc) {
        renderTable(
          '📦 Miscellaneous Expenses',
          data.records.miscExpenses,
          ['Date', 'Expense Name', 'Mode', 'Note', 'Amount'],
          [80, 120, 60, 170, 85],
          (r) => [formatDateDDMMYYYY(r.expDate), r.name, r.mode, r.note || '—', `Rs. ${fmt(r.amount)}`]
        );
      }

      // 5. Withdrawals Table
      if (showWithdrawals) {
        renderTable(
          '🏧 Owner Cash & Online Drawings',
          data.records.withdrawals,
          ['Date', 'Mode', 'Note / Reason', 'Amount'],
          [90, 70, 270, 85],
          (r) => [formatDateDDMMYYYY(r.wDate), r.mode, r.note || '—', `Rs. ${fmt(r.amount)}`]
        );
      }

      // Footer
      doc.fontSize(8).fillColor('#94a3b8').text('Tea Bhatti Cafe Management System — Confidential Financial Report', 36, 800, { align: 'center', width: 523 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
