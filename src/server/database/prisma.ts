import 'server-only';
import { PrismaClient } from '../../../prisma/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';

const cached = globalThis as unknown as { corePrisma?: PrismaClient };
function createClient() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL de execução ausente.');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
}
export const prisma = cached.corePrisma ?? createClient();
if (process.env.NODE_ENV !== 'production') cached.corePrisma = prisma;
