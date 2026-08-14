import puppeteer, { Browser } from 'puppeteer';
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

let cachedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.connected) {
    return cachedBrowser;
  }
  if (cachedBrowser) {
    try {
      await cachedBrowser.close();
    } catch {}
    cachedBrowser = null;
  }

  cachedBrowser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
    ],
  });
  return cachedBrowser;
}

/**
 * Primary Engine: Pixel-Perfect HTML-to-PDF via Puppeteer
 * Matching exact Tea Bhatti Coral theme (#EF5A34), modern fonts, and print layouts
 */
async function generatePuppeteerPdf(data: ReportExportData): Promise<Buffer> {
  const s = data.summary;
  const fromStr = formatDateDDMMYYYY(data.from);
  const toStr = formatDateDDMMYYYY(data.to);
  const cat = data.category || 'ALL';

  const categoryTitleMap: Record<string, string> = {
    ALL: 'Complete Financial Statement',
    SALES: 'Sales Revenue Log',
    MATERIAL_EXPENSES: 'Raw Material Expenses (COGS)',
    SHOP_EXPENSES: 'Shop Operational Expenses',
    MISC_EXPENSES: 'Miscellaneous Expenses',
    WITHDRAWALS: 'Owner Cash & Online Drawings',
  };

  const showSales = cat === 'ALL' || cat === 'SALES';
  const showMaterial = cat === 'ALL' || cat === 'MATERIAL_EXPENSES';
  const showShop = cat === 'ALL' || cat === 'SHOP_EXPENSES';
  const showMisc = cat === 'ALL' || cat === 'MISC_EXPENSES';
  const showWithdrawals = cat === 'ALL' || cat === 'WITHDRAWALS';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${categoryTitleMap[cat] || 'Financial Report'} — ${data.shopName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        @page {
          size: A4;
          margin: 12mm 12mm 16mm 12mm;
        }

        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1e293b;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.4;
        }

        .header-banner {
          background: linear-gradient(135deg, #EF5A34 0%, #d94b27 100%);
          color: #ffffff;
          padding: 20px 24px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(239, 90, 52, 0.15);
        }

        .brand-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0 0 4px 0;
        }

        .brand-subtitle {
          font-size: 12px;
          color: #ffedd5;
          margin: 0;
          font-weight: 500;
        }

        .meta-box {
          text-align: right;
        }

        .meta-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #ffffff;
        }

        .meta-sub {
          font-size: 11px;
          color: #ffedd5;
          margin: 0;
        }

        .section-header {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          margin: 20px 0 10px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 6px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px;
        }

        .card-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }

        .card-value {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          font-family: monospace;
        }

        .val-orange { color: #EF5A34; }
        .val-green { color: #10b981; }
        .val-blue { color: #3b82f6; }
        .val-purple { color: #8b5cf6; }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
          padding: 8px 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        td {
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 11px;
          color: #334155;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:nth-child(even) {
          background: #fafafa;
        }

        .text-right { text-align: right; }
        .font-mono { font-family: monospace; font-weight: 700; }

        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .badge-cash { background: #dcfce7; color: #15803d; }
        .badge-online { background: #dbeafe; color: #1e40af; }

        .footer {
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          font-weight: 500;
        }
      </style>
    </head>
    <body>

      <!-- Header Banner -->
      <div class="header-banner">
        <div>
          <h1 class="brand-title">${data.shopName}</h1>
          <p class="brand-subtitle">Shop Owner: ${data.ownerName}</p>
        </div>
        <div class="meta-box">
          <div class="meta-title">${categoryTitleMap[cat] || 'Financial Report'}</div>
          <div class="meta-sub">Period: ${fromStr} to ${toStr}</div>
          <div class="meta-sub">Generated: ${formatDateDDMMYYYY(new Date())}</div>
        </div>
      </div>

      <!-- Financial Executive Summary -->
      <div class="section-header">Financial Executive Summary</div>
      <div class="summary-grid">
        <div class="card">
          <div class="card-label">Total Sales Revenue</div>
          <div class="card-value val-orange">Rs. ${fmt(s.totalSales.toNumber())}</div>
        </div>
        <div class="card">
          <div class="card-label">Gross Profit</div>
          <div class="card-value val-green">Rs. ${fmt(s.grossProfit.toNumber())}</div>
        </div>
        <div class="card">
          <div class="card-label">Net Profit / (Loss)</div>
          <div class="card-value ${s.netProfit.toNumber() >= 0 ? 'val-green' : 'val-orange'}">Rs. ${fmt(s.netProfit.toNumber())}</div>
        </div>
        <div class="card">
          <div class="card-label">Closing Cash Balance</div>
          <div class="card-value val-green">Rs. ${fmt(s.cashBalance.toNumber())}</div>
        </div>
        <div class="card">
          <div class="card-label">Closing Bank Balance</div>
          <div class="card-value val-blue">Rs. ${fmt(s.onlineBalance.toNumber())}</div>
        </div>
        <div class="card">
          <div class="card-label">Total Liquidity</div>
          <div class="card-value val-purple">Rs. ${fmt(s.remainingBusinessBalance.toNumber())}</div>
        </div>
      </div>

      ${
        showSales
          ? `
      <div class="section-header">Sales Revenue Log (${data.records.sales.length} entries)</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Method</th>
            <th>Note / Details</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.records.sales.length === 0
              ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding: 16px;">No sales records found in selected period</td></tr>'
              : data.records.sales
                  .map(
                    (r) => `
            <tr>
              <td>${formatDateDDMMYYYY(r.saleDate)}</td>
              <td><span class="badge ${r.type === 'CASH' ? 'badge-cash' : 'badge-online'}">${r.type}</span></td>
              <td>${r.paymentMethod || 'Cash'}</td>
              <td>${r.note || '—'}</td>
              <td class="text-right font-mono">Rs. ${fmt(r.amount)}</td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>
      `
          : ''
      }

      ${
        showMaterial
          ? `
      <div class="section-header">Raw Material Expenses (COGS) (${data.records.materialExpenses.length} entries)</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Mode</th>
            <th>Note / Vendor</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.records.materialExpenses.length === 0
              ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding: 16px;">No material expense records found in selected period</td></tr>'
              : data.records.materialExpenses
                  .map(
                    (r) => `
            <tr>
              <td>${formatDateDDMMYYYY(r.expDate)}</td>
              <td><strong>${r.category}</strong></td>
              <td><span class="badge ${r.mode === 'CASH' ? 'badge-cash' : 'badge-online'}">${r.mode}</span></td>
              <td>${r.note || '—'}</td>
              <td class="text-right font-mono">Rs. ${fmt(r.amount)}</td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>
      `
          : ''
      }

      ${
        showShop
          ? `
      <div class="section-header">Shop Operational Expenses (${data.records.shopExpenses.length} entries)</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Mode</th>
            <th>Recurring</th>
            <th>Note / Payee</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.records.shopExpenses.length === 0
              ? '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding: 16px;">No shop expense records found in selected period</td></tr>'
              : data.records.shopExpenses
                  .map(
                    (r) => `
            <tr>
              <td>${formatDateDDMMYYYY(r.expDate)}</td>
              <td><strong>${r.category}</strong></td>
              <td><span class="badge ${r.mode === 'CASH' ? 'badge-cash' : 'badge-online'}">${r.mode}</span></td>
              <td>${r.isRecurring ? 'Yes' : 'No'}</td>
              <td>${r.note || '—'}</td>
              <td class="text-right font-mono">Rs. ${fmt(r.amount)}</td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>
      `
          : ''
      }

      ${
        showMisc
          ? `
      <div class="section-header">Miscellaneous Expenses (${data.records.miscExpenses.length} entries)</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Expense Name</th>
            <th>Mode</th>
            <th>Note</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.records.miscExpenses.length === 0
              ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding: 16px;">No misc expense records found in selected period</td></tr>'
              : data.records.miscExpenses
                  .map(
                    (r) => `
            <tr>
              <td>${formatDateDDMMYYYY(r.expDate)}</td>
              <td><strong>${r.name}</strong></td>
              <td><span class="badge ${r.mode === 'CASH' ? 'badge-cash' : 'badge-online'}">${r.mode}</span></td>
              <td>${r.note || '—'}</td>
              <td class="text-right font-mono">Rs. ${fmt(r.amount)}</td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>
      `
          : ''
      }

      ${
        showWithdrawals
          ? `
      <div class="section-header">Owner Cash & Online Drawings (${data.records.withdrawals.length} entries)</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Mode</th>
            <th>Note / Reason</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.records.withdrawals.length === 0
              ? '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding: 16px;">No withdrawal records found in selected period</td></tr>'
              : data.records.withdrawals
                  .map(
                    (r) => `
            <tr>
              <td>${formatDateDDMMYYYY(r.wDate)}</td>
              <td><span class="badge ${r.mode === 'CASH' ? 'badge-cash' : 'badge-online'}">${r.mode}</span></td>
              <td>${r.note || '—'}</td>
              <td class="text-right font-mono">Rs. ${fmt(r.amount)}</td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>
      `
          : ''
      }

      <div class="footer">
        Tea Bhatti Cafe Expense Tracker — Official Financial Statement
      </div>
    </body>
    </html>
  `;

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      printBackground: true,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * High-Performance Native PDFKit Fallback
 * Formatted with clean ASCII text (Rs. instead of broken Rupee symbol),
 * Tea Bhatti Coral (#EF5A34) branding, exact table alignments, and zero garbled emojis!
 */
function generatePdfKitReport(data: ReportExportData): Promise<Buffer> {
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

      // ── Header Banner (#EF5A34 Coral Brand Color) ──
      doc.rect(36, 36, 523, 60).fill('#EF5A34');
      doc.fillColor('#ffffff').fontSize(18).text(data.shopName, 48, 46, { bold: true } as any);
      doc.fontSize(9).fillColor('#ffedd5').text(`Owner: ${data.ownerName} | Statement Period: ${fromStr} to ${toStr}`);
      doc.fontSize(8).fillColor('#ffedd5').text(`Generated: ${formatDateDDMMYYYY(new Date())}`, 48, 76);

      doc.y = 110;

      // ── Financial Executive Summary ──
      doc.fontSize(12).fillColor('#1e293b').text('Financial Executive Summary', 36, doc.y);
      doc.moveDown(0.4);

      const netProfitVal = s.netProfit.toNumber();
      const grossProfitVal = s.grossProfit.toNumber();
      const totalSalesVal = s.totalSales.toNumber();

      const summaryGrid = [
        { label: 'TOTAL SALES REVENUE', val: `Rs. ${fmt(totalSalesVal)}`, color: '#EF5A34' },
        { label: 'GROSS PROFIT', val: `Rs. ${fmt(grossProfitVal)}`, color: '#10b981' },
        { label: 'NET PROFIT / (LOSS)', val: `Rs. ${fmt(netProfitVal)}`, color: netProfitVal >= 0 ? '#16a34a' : '#dc2626' },
        { label: 'CLOSING CASH BALANCE', val: `Rs. ${fmt(s.cashBalance.toNumber())}`, color: '#10b981' },
        { label: 'CLOSING BANK BALANCE', val: `Rs. ${fmt(s.onlineBalance.toNumber())}`, color: '#3b82f6' },
        { label: 'TOTAL LIQUIDITY', val: `Rs. ${fmt(s.remainingBusinessBalance.toNumber())}`, color: '#8b5cf6' },
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

        doc.rect(cardX, cardY, cardW, cardH).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(7.5).text(card.label, cardX + 8, cardY + 6);
        doc.fillColor(card.color).fontSize(11).text(card.val, cardX + 8, cardY + 20, { bold: true } as any);

        cardX += cardW + 9;
      });

      doc.y = cardY + cardH + 18;

      // ── Helper to render clean data tables without emojis ──
      const renderTable = (
        title: string,
        items: any[],
        headers: string[],
        widths: number[],
        rowMapper: (item: any) => string[]
      ) => {
        if (items.length === 0) return;

        if (doc.y > 680) doc.addPage();

        doc.fontSize(11).fillColor('#1e293b').text(`${title} (${items.length} entries)`, 36, doc.y);
        doc.moveDown(0.3);

        let currentY = doc.y;

        // Table Header
        doc.rect(36, currentY, 523, 18).fill('#EF5A34');
        let currentX = 40;
        headers.forEach((h, i) => {
          doc.fillColor('#ffffff').fontSize(8).text(h, currentX, currentY + 4, { width: widths[i], align: i === headers.length - 1 ? 'right' : 'left' });
          currentX += widths[i];
        });

        currentY += 18;

        // Table Rows
        items.forEach((item, rIdx) => {
          if (currentY > 750) {
            doc.addPage();
            currentY = 40;
          }

          const bgColor = rIdx % 2 === 0 ? '#ffffff' : '#fafafa';
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

      // 1. Sales Log Table
      if (showSales) {
        renderTable(
          'Sales Revenue Log',
          data.records.sales,
          ['Date', 'Type', 'Method', 'Note / Details', 'Amount'],
          [80, 70, 100, 180, 85],
          (r) => [formatDateDDMMYYYY(r.saleDate), r.type, r.paymentMethod || 'Cash', r.note || '—', `Rs. ${fmt(r.amount)}`]
        );
      }

      // 2. Material Expenses Table
      if (showMaterial) {
        renderTable(
          'Raw Material Expenses (COGS)',
          data.records.materialExpenses,
          ['Date', 'Category', 'Mode', 'Note / Vendor', 'Amount'],
          [80, 110, 60, 180, 85],
          (r) => [formatDateDDMMYYYY(r.expDate), r.category, r.mode, r.note || '—', `Rs. ${fmt(r.amount)}`]
        );
      }

      // 3. Shop Expenses Table
      if (showShop) {
        renderTable(
          'Shop Operational Expenses',
          data.records.shopExpenses,
          ['Date', 'Category', 'Mode', 'Recurring', 'Note / Payee', 'Amount'],
          [70, 95, 55, 55, 155, 85],
          (r) => [formatDateDDMMYYYY(r.expDate), r.category, r.mode, r.isRecurring ? 'Yes' : 'No', r.note || '—', `Rs. ${fmt(r.amount)}`]
        );
      }

      // 4. Misc Expenses Table
      if (showMisc) {
        renderTable(
          'Miscellaneous Expenses',
          data.records.miscExpenses,
          ['Date', 'Expense Name', 'Mode', 'Note', 'Amount'],
          [80, 120, 60, 170, 85],
          (r) => [formatDateDDMMYYYY(r.expDate), r.name, r.mode, r.note || '—', `Rs. ${fmt(r.amount)}`]
        );
      }

      // 5. Withdrawals Table
      if (showWithdrawals) {
        renderTable(
          'Owner Cash & Online Drawings',
          data.records.withdrawals,
          ['Date', 'Mode', 'Note / Reason', 'Amount'],
          [90, 70, 270, 85],
          (r) => [formatDateDDMMYYYY(r.wDate), r.mode, r.note || '—', `Rs. ${fmt(r.amount)}`]
        );
      }

      // Footer
      doc.fontSize(8).fillColor('#94a3b8').text('Tea Bhatti Cafe Expense Tracker — Official Financial Statement', 36, 800, { align: 'center', width: 523 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Main PDF Generator: Tries Puppeteer first for HTML/CSS PDF rendering,
 * and falls back to PDFKit with clean ASCII formatting & Tea Bhatti theme!
 */
export async function generatePdfReport(data: ReportExportData): Promise<Buffer> {
  try {
    return await generatePuppeteerPdf(data);
  } catch (err) {
    console.warn('⚠️ Puppeteer PDF engine unavailable. Switching to PDFKit theme generator:', err);
    return await generatePdfKitReport(data);
  }
}
