import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Tea Bhatti Expense Tracker...');

  // 1. Create or update primary demo shop owner account
  const mobile = '9009149694';
  const passwordHash = await bcrypt.hash('12345678', 10);

  const shop = await prisma.shop.upsert({
    where: { mobile },
    update: {
      passwordHash,
      name: 'Tea Bhatti',
      ownerName: 'Shivansh',
    },
    create: {
      name: 'Tea Bhatti',
      ownerName: 'Shivansh',
      mobile,
      email: 'owner@teabhatti.com',
      passwordHash,
    },
  });
  console.log(`✅ Upserted demo shop: ${shop.name} (Mobile: ${mobile})`);

  const shopId = shop.id;

  // Clear existing transactions for clean deterministic demo state
  await prisma.sale.deleteMany({ where: { shopId } });
  await prisma.materialExpense.deleteMany({ where: { shopId } });
  await prisma.shopExpense.deleteMany({ where: { shopId } });
  await prisma.miscExpense.deleteMany({ where: { shopId } });
  await prisma.withdrawal.deleteMany({ where: { shopId } });
  await prisma.auditLog.deleteMany({ where: { shopId } });

  console.log('🧹 Cleaned existing transaction tables for shop');

  const now = new Date();

  // Helper to generate date N days ago
  const daysAgo = (n: number, hour = 12) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    return d;
  };

  // ── 2. Seed Sales Data (Past 30 Days) ──
  const salesData = [];
  for (let i = 29; i >= 0; i--) {
    // 2 to 4 cash sales per day
    const cashCount = 2 + Math.floor(Math.random() * 3);
    for (let c = 0; c < cashCount; c++) {
      const amt = Math.floor(250 + Math.random() * 650);
      salesData.push({
        shopId,
        type: 'CASH' as const,
        amount: amt,
        note: c === 0 ? 'Morning counter cash' : c === 1 ? 'Afternoon counter cash' : 'Evening tea & snacks',
        saleDate: daysAgo(i, 8 + c * 4),
        createdBy: shopId,
      });
    }

    // 2 to 3 online sales per day
    const onlineCount = 2 + Math.floor(Math.random() * 2);
    for (let o = 0; o < onlineCount; o++) {
      const amt = Math.floor(300 + Math.random() * 750);
      salesData.push({
        shopId,
        type: 'ONLINE' as const,
        amount: amt,
        paymentMethod: o === 0 ? 'UPI - PhonePe' : o === 1 ? 'UPI - GPay' : 'Paytm QR',
        note: 'Scan & pay sales',
        saleDate: daysAgo(i, 9 + o * 4),
        createdBy: shopId,
      });
    }
  }

  await prisma.sale.createMany({ data: salesData });
  console.log(`✅ Inserted ${salesData.length} sales records`);

  // ── 3. Seed Material Expenses ──
  const materialExpenses = [
    { category: 'Amul Milk & Dairy', mode: 'ONLINE' as const, amount: 4800, note: 'Weekly milk delivery (80L)', days: 28 },
    { category: 'Assam Special Tea Dust', mode: 'CASH' as const, amount: 2200, note: '10kg premium tea leaves', days: 25 },
    { category: 'Coffee Powder & Cocoa', mode: 'ONLINE' as const, amount: 1400, note: '5kg Roasted Coffee beans', days: 22 },
    { category: 'Sugar & Spices (Elaichi/Ginger)', mode: 'CASH' as const, amount: 1850, note: 'Monthly spice stock', days: 20 },
    { category: 'Amul Milk & Dairy', mode: 'ONLINE' as const, amount: 5200, note: 'Weekly milk delivery (85L)', days: 14 },
    { category: 'Paper Cups & Packaging', mode: 'CASH' as const, amount: 1650, note: '5000 small & large takeaway cups', days: 12 },
    { category: 'Amul Milk & Dairy', mode: 'ONLINE' as const, amount: 4950, note: 'Weekly milk delivery (82L)', days: 7 },
    { category: 'Assam Special Tea Dust', mode: 'ONLINE' as const, amount: 2400, note: '10kg premium tea leaves refill', days: 3 },
    { category: 'Amul Milk & Dairy', mode: 'CASH' as const, amount: 1800, note: 'Fresh morning milk batch', days: 1 },
  ];

  for (const item of materialExpenses) {
    await prisma.materialExpense.create({
      data: {
        shopId,
        category: item.category,
        mode: item.mode,
        amount: item.amount,
        note: item.note,
        expDate: daysAgo(item.days, 10),
        createdBy: shopId,
      },
    });
  }
  console.log(`✅ Inserted ${materialExpenses.length} material expense records`);

  // ── 4. Seed Shop Expenses (Including Loan Repayment) ──
  const shopExpenses = [
    { category: 'Rent', mode: 'ONLINE' as const, amount: 12000, note: 'Monthly Shop Rent to Landlord', isRecurring: true, days: 28 },
    { category: 'Electricity', mode: 'ONLINE' as const, amount: 2450, note: 'State Electricity Board Bill', isRecurring: true, days: 24 },
    { category: 'Internet', mode: 'ONLINE' as const, amount: 799, note: 'Airtel Fiber Broadband', isRecurring: true, days: 22 },
    { category: 'Salary', mode: 'CASH' as const, amount: 8000, note: 'Helper Staff Salary (Rahul)', isRecurring: true, days: 15 },
    { category: 'Loan Repayment', mode: 'ONLINE' as const, amount: 4500, note: 'HDFC Business Loan Monthly EMI', isRecurring: true, days: 10 },
    { category: 'Maintenance', mode: 'CASH' as const, amount: 1200, note: 'Pest control & chimney deep cleaning', isRecurring: false, days: 5 },
    { category: 'Loan Repayment', mode: 'CASH' as const, amount: 4500, note: 'Equipment Finance EMI Payment', isRecurring: true, days: 2 },
  ];

  for (const item of shopExpenses) {
    await prisma.shopExpense.create({
      data: {
        shopId,
        category: item.category,
        mode: item.mode,
        amount: item.amount,
        note: item.note,
        isRecurring: item.isRecurring,
        expDate: daysAgo(item.days, 11),
        createdBy: shopId,
      },
    });
  }
  console.log(`✅ Inserted ${shopExpenses.length} shop expense records (including Loan Repayments)`);

  // ── 5. Seed Misc Expenses ──
  const miscExpenses = [
    { name: 'Commercial Gas Cylinder Refill', mode: 'CASH' as const, amount: 1150, note: '19kg Commercial LPG', days: 26 },
    { name: 'Cleaning Sprays & Mops', mode: 'CASH' as const, amount: 350, note: 'Disinfectant & kitchen towels', days: 18 },
    { name: 'Gas Stove Burner Repair', mode: 'CASH' as const, amount: 450, note: 'Nozzle replacement & servicing', days: 9 },
    { name: 'Commercial Gas Cylinder Refill', mode: 'ONLINE' as const, amount: 1150, note: '19kg Commercial LPG refill', days: 2 },
  ];

  for (const item of miscExpenses) {
    await prisma.miscExpense.create({
      data: {
        shopId,
        name: item.name,
        mode: item.mode,
        amount: item.amount,
        note: item.note,
        expDate: daysAgo(item.days, 14),
        createdBy: shopId,
      },
    });
  }
  console.log(`✅ Inserted ${miscExpenses.length} misc expense records`);

  // ── 6. Seed Owner Withdrawals ──
  const withdrawals = [
    { mode: 'CASH' as const, amount: 3000, note: 'Personal household groceries drawing', days: 20 },
    { mode: 'ONLINE' as const, amount: 2000, note: 'Personal insurance premium transfer', days: 10 },
    { mode: 'CASH' as const, amount: 1500, note: 'Personal cash drawing', days: 4 },
  ];

  for (const item of withdrawals) {
    await prisma.withdrawal.create({
      data: {
        shopId,
        mode: item.mode,
        amount: item.amount,
        note: item.note,
        wDate: daysAgo(item.days, 16),
        createdBy: shopId,
      },
    });
  }
  console.log(`✅ Inserted ${withdrawals.length} owner withdrawal records`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Login Mobile:    9009149694');
  console.log('Login Password:  12345678');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seed script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
