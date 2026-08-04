import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Cleaning old data and setting up official account for Tea Bhatti Expense Tracker...');

  // 1. Delete all existing transaction records
  await prisma.sale.deleteMany({});
  await prisma.materialExpense.deleteMany({});
  await prisma.shopExpense.deleteMany({});
  await prisma.miscExpense.deleteMany({});
  await prisma.withdrawal.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('🧹 Cleared all sales, expenses, withdrawals, audit logs, and users.');

  // 2. Delete all existing shop accounts (including old 9009149694 account)
  await prisma.shop.deleteMany({});
  console.log('🧹 Removed all old user accounts.');

  // 3. Create the single official owner account
  const mobile = '7000748920';
  const ownerName = 'Bhagwat Prasad Tiwari';
  const rawPassword = 'Bhagwat@2001';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const shop = await prisma.shop.create({
    data: {
      name: 'Tea Bhatti',
      ownerName,
      mobile,
      email: 'bhagwat@teabhatti.com',
      passwordHash,
    },
  });

  console.log(`✅ Created official owner account: ${ownerName} (Mobile: ${mobile})`);
  console.log('\n🎉 Clean setup completed successfully!');
  console.log('----------------------------------------------------');
  console.log(`Login Mobile:    ${mobile}`);
  console.log(`Login Password:  ${rawPassword}`);
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
