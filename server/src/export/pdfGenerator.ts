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
      '--no-default-browser-check',
    ],
  });

  return cachedBrowser;
}

/**
 * Primary PDF Generation Engine using Puppeteer
 */
async function generatePuppeteerPdf(data: ReportExportData): Promise<Buffer> {
  const s = data.summary;
  const fromStr = formatDateDDMMYYYY(data.from);
  const toStr = formatDateDDMMYYYY(data.to);
  const cat = data.category || 'ALL';

  const categoryTitleMap: Record<string, string> = {
    ALL: 'Complete Financial Statement (All Categories)',
    SALES: 'Sales Revenue Report',
    MATERIAL_EXPENSES: 'Raw Material Expenses (COGS) Report',
    SHOP_EXPENSES: 'Shop Operational Expenses Report',
    MISC_EXPENSES: 'Miscellaneous Expenses Report',
    WITHDRAWALS: 'Owner Cash & Online Drawings Report',
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
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 2rem; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 1rem; margin-bottom: 1.5rem; }
        .brand { font-size: 1.75rem; font-weight: 700; color: #0f766e; }
        .meta { text-align: right; font-size: 0.875rem; color: #64748b; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; background: #f8fafc; }
        .card-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 0.25rem; }
        .card-value { font-size: 1.35rem; font-weight: 700; font-family: monospace; }
        .value-green { color: #16a34a; }
        .value-teal { color: #0f766e; }
        .value-indigo { color: #4338ca; }
        .section-title { margin-top: 2rem; margin-bottom: 0.5rem; font-size: 1.1rem; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.85rem; }
        th { background: #0f766e; color: #fff; text-align: left; padding: 0.5rem 0.75rem; font-weight: 600; }
        td { border-bottom: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; }
        .text-right { text-align: right; }
        .badge { display: inline-block; padding: 0.15rem 0.4rem; font-size: 0.7rem; font-weight: 600; border-radius: 4px; background: #e2e8f0; color: #334155; }
        .footer { margin-top: 3rem; pt: 1rem; border-top: 1px solid #e2e8f0; text-align: center; font-size: 0.75rem; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">${data.shopName}</div>
          <div style="font-size: 0.875rem; color: #64748b;">Owner: ${data.ownerName}</div>
        </div>
        <div class="meta">
          <div><strong>${categoryTitleMap[cat] || 'Financial Statement'}</strong></div>
          <div>Period: ${fromStr} to ${toStr}</div>
          <div>Generated: ${formatDateDDMMYYYY(new Date())}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-title">Total Sales Revenue</div>
          <div class="card-value value-teal">₹${fmt(s.totalSales.toNumber())}</div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Cash: ₹${fmt(s.totalCashSales.toNumber())} | Online: ₹${fmt(s.totalOnlineSales.toNumber())}</div>
        </div>
        <div class="card">
          <div class="card-title">Gross Profit</div>
          <div class="card-value">₹${fmt(s.grossProfit.toNumber())}</div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">After Material Costs: ₹${fmt(s.totalMaterialExpenses.toNumber())}</div>
        </div>
        <div class="card">
          <div class="card-title">Net Profit / (Loss)</div>
          <div class="card-value value-green">₹${fmt(s.netProfit.toNumber())}</div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">After All Expenses: ₹${fmt(s.totalExpenses.toNumber())}</div>
        </div>
        <div class="card">
          <div class="card-title">Cash Balance</div>
          <div class="card-value value-teal">₹${fmt(s.cashBalance.toNumber())}</div>
        </div>
        <div class="card">
          <div class="card-title">Online Balance</div>
          <div class="card-value value-indigo">₹${fmt(s.onlineBalance.toNumber())}</div>
        </div>
        <div class="card">
          <div class="card-title">Remaining Business Balance</div>
          <div class="card-value value-green">₹${fmt(s.remainingBusinessBalance.toNumber())}</div>
        </div>
      </div>

      ${
        showSales
          ? `
      <h3 class="section-title">Sales Revenue Entries (${data.records.sales.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Method</th>
            <th>Note / Order</th>
            <th class="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.records.sales.length === 0
              ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No sales records in period</td></tr>'
              : data.records.sales
                  .map(
                    (r) => `
            <tr>
              <td>${formatDateDDMMYYYY(r.saleDate)}</td>
              <td><span class="badge">${r.type}</span></td>
              <td>${r.paymentMethod || 'Cash'}</td>
              <td>${r.note || '—'}</td>
              <td class="text-right">₹${fmt(r.amount)}</td>
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
      <h3 class="section-title">Material Expenses (COGS) (${data.records.materialExpenses.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Mode</th>
            <th>Note / Vendor</th>
            <th class="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.records.materialExpenses.length === 0
              ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No material expense records in period</td></tr>'
              : data.records.materialExpenses
                  .map(
                    (r) => `
            <tr>
              <td>${formatDateDDMMYYYY(r.expDate)}</td>
              <td>${r.category}</td>
              <td><span class="badge">${r.mode}</span></td>
              <td>${r.note || '—'}</td>
              <td class="text-right">₹${fmt(r.amount)}</td>
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
      <h3 class="section-title">Shop Operational Expenses (${data.records.shopExpenses.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Mode</th>
            <th>Recurring</th>
            <th>Note / Payee</th>
            <th class="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.records.shopExpenses.length === 0
              ? '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No shop expense records in period</td></tr>'
              : data.records.shopExpenses
                  .map(
                    (r) => `
            <tr>
              <td>${formatDateDDMMYYYY(r.expDate)}</td>
              <td>${r.category}</td>
              <td><span class="badge">${r.mode}</span></td>
              <td>${r.isRecurring ? 'Yes' : 'No'}</td>
              <td>${r.note || '—'}</td>
              <td class="text-right">₹${fmt(r.amount)}</td>
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
      <h3 class="section-title">Miscellaneous Expenses (${data.records.miscExpenses.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Expense Name</th>
            <th>Mode</th>
            <th>Note</th>
            <th class="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.records.miscExpenses.length === 0
              ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No misc expense records in period</td></tr>'
              : data.records.miscExpenses
                  .map(
                    (r) => `
            <tr>
              <td>${formatDateDDMMYYYY(r.expDate)}</td>
              <td>${r.name}</td>
              <td><span class="badge">${r.mode}</span></td>
              <td>${r.note || '—'}</td>
              <td class="text-right">₹${fmt(r.amount)}</td>
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
      <h3 class="section-title">Owner Drawings & Withdrawals (${data.records.withdrawals.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Mode</th>
            <th>Note / Reason</th>
            <th class="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.records.withdrawals.length === 0
              ? '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No withdrawal records in period</td></tr>'
              : data.records.withdrawals
                  .map(
                    (r) => `
            <tr>
              <td>${formatDateDDMMYYYY(r.wDate)}</td>
              <td><span class="badge">${r.mode}</span></td>
              <td>${r.note || '—'}</td>
              <td class="text-right">₹${fmt(r.amount)}</td>
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
        Official Financial Statement — Generated by Shop Finance Management System
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
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      printBackground: true,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Bulletproof Zero-Dependency PDF Engine Fallback using PDFKit
 */
function generatePdfKitReport(data: ReportExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const s = data.summary;
      const fromStr = formatDateDDMMYYYY(data.from);
      const toStr = formatDateDDMMYYYY(data.to);

      // Header
      doc.fillColor('#0f766e').fontSize(20).text(data.shopName, { underline: false });
      doc.fontSize(10).fillColor('#64748b').text(`Owner: ${data.ownerName}`);
      doc.moveDown(0.5);

      doc.fontSize(14).fillColor('#0f766e').text('Official Financial Report');
      doc.fontSize(9).fillColor('#64748b').text(`Period: ${fromStr} to ${toStr} | Generated: ${formatDateDDMMYYYY(new Date())}`);
      doc.moveDown(1);

      // Financial Summary Box
      doc.fontSize(12).fillColor('#0f766e').text('Financial Executive Summary');
      doc.moveDown(0.3);

      doc.fontSize(10).fillColor('#1e293b');
      doc.text(`Total Sales Revenue: INR ${fmt(s.totalSales.toNumber())} (Cash: INR ${fmt(s.totalCashSales.toNumber())} | Online: INR ${fmt(s.totalOnlineSales.toNumber())})`);
      doc.text(`Gross Profit: INR ${fmt(s.grossProfit.toNumber())} (Material Costs: INR ${fmt(s.totalMaterialExpenses.toNumber())})`);
      doc.text(`Net Profit / (Loss): INR ${fmt(s.netProfit.toNumber())} (Total Expenses: INR ${fmt(s.totalExpenses.toNumber())})`);
      doc.text(`Closing Cash Balance: INR ${fmt(s.cashBalance.toNumber())}`);
      doc.text(`Closing Bank Balance: INR ${fmt(s.onlineBalance.toNumber())}`);
      doc.text(`Total Cash Available: INR ${fmt(s.remainingBusinessBalance.toNumber())}`);
      doc.moveDown(1.5);

      // Function to render table
      const renderSection = (title: string, items: any[], headers: string[], rowMapper: (item: any) => string[]) => {
        if (items.length === 0) return;
        doc.fontSize(11).fillColor('#0f766e').text(`${title} (${items.length})`);
        doc.moveDown(0.3);

        doc.fontSize(9).fillColor('#475569');
        items.slice(0, 50).forEach((item) => {
          const rowText = rowMapper(item).join(' | ');
          doc.text(`• ${rowText}`);
        });
        doc.moveDown(1);
      };

      renderSection('Sales Records', data.records.sales, [], (r) => [
        formatDateDDMMYYYY(r.saleDate),
        r.type,
        r.paymentMethod || 'Cash',
        `INR ${fmt(r.amount)}`,
        r.note || '',
      ]);

      renderSection('Material Expenses (COGS)', data.records.materialExpenses, [], (r) => [
        formatDateDDMMYYYY(r.expDate),
        r.category,
        r.mode,
        `INR ${fmt(r.amount)}`,
        r.note || '',
      ]);

      renderSection('Shop Operational Expenses', data.records.shopExpenses, [], (r) => [
        formatDateDDMMYYYY(r.expDate),
        r.category,
        r.mode,
        `INR ${fmt(r.amount)}`,
        r.note || '',
      ]);

      renderSection('Miscellaneous Expenses', data.records.miscExpenses, [], (r) => [
        formatDateDDMMYYYY(r.expDate),
        r.name,
        r.mode,
        `INR ${fmt(r.amount)}`,
        r.note || '',
      ]);

      renderSection('Owner Drawings', data.records.withdrawals, [], (r) => [
        formatDateDDMMYYYY(r.wDate),
        r.mode,
        `INR ${fmt(r.amount)}`,
        r.note || '',
      ]);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Main Export Function with Automatic Fallback
 */
export async function generatePdfReport(data: ReportExportData): Promise<Buffer> {
  try {
    return await generatePuppeteerPdf(data);
  } catch (err) {
    console.warn('⚠️ Puppeteer PDF generation failed. Using PDFKit fallback engine:', err);
    return await generatePdfKitReport(data);
  }
}
