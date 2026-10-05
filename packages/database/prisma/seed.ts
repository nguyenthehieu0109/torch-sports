import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test accounts...');
  
  const passwordHash = await bcrypt.hash('password123', 12);
  
  const users = [
    {
      email: 'admin@torch.test',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      passwordHash,
      isActive: true,
      isVerified: true
    },
    {
      email: 'customer@torch.test',
      firstName: 'Customer',
      lastName: 'User',
      role: 'CUSTOMER',
      passwordHash,
      isActive: true,
      isVerified: true
    },
    {
      email: 'staff@torch.test',
      firstName: 'Staff',
      lastName: 'User',
      role: 'STAFF',
      passwordHash,
      isActive: true,
      isVerified: true
    },
    {
      email: 'warehouse@torch.test',
      firstName: 'Warehouse',
      lastName: 'Manager',
      role: 'WAREHOUSE_MANAGER',
      passwordHash,
      isActive: true,
      isVerified: true
    },
    {
      email: 'supplier@torch.test',
      firstName: 'Supplier',
      lastName: 'Vendor',
      role: 'SUPPLIER',
      passwordHash,
      isActive: true,
      isVerified: true
    },
    {
      email: 'content@torch.test',
      firstName: 'Content',
      lastName: 'Creator',
      role: 'CONTENT_CREATOR',
      passwordHash,
      isActive: true,
      isVerified: true
    }
  ];

  for (const user of users) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (!existing) {
      // @ts-ignore
      await prisma.user.create({ data: user });
      console.log(`Created test account: ${user.email} with role ${user.role}`);
    } else {
      console.log(`User already exists: ${user.email}`);
    }
  }
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
