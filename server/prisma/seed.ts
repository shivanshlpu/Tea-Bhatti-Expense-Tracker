import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Cleaning old data and setting up official account for Tea Bhatti Expense Tracker...');

  // Read credentials securely from environment variables with fallbacks
  const mobile = process.env.SEED_OWNER_MOBILE || '7000748920';
  const ownerName = process.env.SEED_OWNER_NAME || 'Bhagwat Prasad Tiwari';
  const rawPassword = process.env.SEED_OWNER_PASSWORD || 'Bhagwat@2001';

  // Securely hash password using salted multi-round bcrypt
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Delete all existing transaction records
  await prisma.sale.deleteMany({});
  await prisma.materialExpense.deleteMany({});
  await prisma.shopExpense.deleteMany({});
  await prisma.miscExpense.deleteMany({});
  await prisma.withdrawal.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('🧹 Cleared all sales, expenses, withdrawals, audit logs, and users.');

  // 2. Delete all existing shop accounts
  await prisma.shop.deleteMany({});
  console.log('🧹 Removed all old user accounts.');

  // 3. Create the single official owner account
  const shop = await prisma.shop.create({
    data: {
      name: 'Tea Bhatti',
      ownerName,
      mobile,
      email: 'bhagwat@teabhatti.com',
      passwordHash,
    },
  });

  const user = await prisma.user.create({
    data: {
      shopId: shop.id,
      role: 'OWNER',
      mobile,
      passwordHash,
      isActive: true,
    },
  });

  console.log(`✅ Created official owner account & user record: ${ownerName} (UserID: ${user.id})`);
  console.log('🎉 Clean setup completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
