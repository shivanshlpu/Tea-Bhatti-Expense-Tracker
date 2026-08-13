import { PrismaClient } from '@prisma/client';
import { env } from './env';

const basePrisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const prisma = basePrisma.$extends({
  query: {
    $allOperations: async ({ operation, model, args, query }) => {
      let retries = 3;
      while (retries > 0) {
        try {
          return await query(args);
        } catch (error: any) {
          retries--;
          const isConnError =
            error?.name === 'PrismaClientInitializationError' ||
            error?.code === 'P1001' ||
            error?.code === 'P1002' ||
            (error?.message && error.message.includes("Can't reach database server"));

          if (isConnError && retries > 0) {
            console.warn(`⚠️ Database connection attempt failed (${error?.message?.split('\n')[0]}). Retrying in 1.5s... (${retries} retries left)`);
            await new Promise((res) => setTimeout(res, 1500));
            continue;
          }
          throw error;
        }
      }
    },
  },
});

export default prisma as unknown as PrismaClient;

