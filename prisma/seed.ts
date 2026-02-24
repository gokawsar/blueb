import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding subscription plans...');

  // Get the free plan first
  let freePlan = await prisma.subscriptionPlan.findUnique({
    where: { slug: 'free' }
  });

  if (!freePlan) {
    // Create subscription plans
    const plans = [
      {
        name: 'Free',
        slug: 'free',
        description: 'Perfect for small businesses getting started',
        price: 0,
        yearlyPrice: 0,
        maxUsers: 1,
        maxCustomers: 10,
        maxJobs: 50,
        maxInventory: 25,
        hasAdvancedReports: false,
        hasApiAccess: false,
        hasCustomBranding: false,
        hasPrioritySupport: false,
        isActive: true,
        isFeatured: false,
        sortOrder: 1
      },
      {
        name: 'Basic',
        slug: 'basic',
        description: 'For growing businesses with more needs',
        price: 29,
        yearlyPrice: 290,
        maxUsers: 3,
        maxCustomers: 100,
        maxJobs: 500,
        maxInventory: 200,
        hasAdvancedReports: false,
        hasApiAccess: false,
        hasCustomBranding: false,
        hasPrioritySupport: false,
        isActive: true,
        isFeatured: false,
        sortOrder: 2
      },
      {
        name: 'Pro',
        slug: 'pro',
        description: 'Advanced features for established businesses',
        price: 79,
        yearlyPrice: 790,
        maxUsers: 10,
        maxCustomers: 500,
        maxJobs: 2000,
        maxInventory: 1000,
        hasAdvancedReports: true,
        hasApiAccess: true,
        hasCustomBranding: false,
        hasPrioritySupport: false,
        isActive: true,
        isFeatured: true,
        sortOrder: 3
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Full features for large organizations',
        price: 199,
        yearlyPrice: 1990,
        maxUsers: 50,
        maxCustomers: -1,
        maxJobs: -1,
        maxInventory: -1,
        hasAdvancedReports: true,
        hasApiAccess: true,
        hasCustomBranding: true,
        hasPrioritySupport: true,
        isActive: true,
        isFeatured: false,
        sortOrder: 4
      }
    ];

    for (const plan of plans) {
      await prisma.subscriptionPlan.create({
        data: plan
      });
      console.log(`Created plan: ${plan.name}`);
    }

    freePlan = await prisma.subscriptionPlan.findUnique({
      where: { slug: 'free' }
    });
  }

  console.log('Seeding admin user...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@amkbilling.com' },
    update: {},
    create: {
      email: 'admin@amkbilling.com',
      password: adminPassword,
      name: 'System Admin',
      companyName: 'AMK Billing',
      phone: '+8801234567890',
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log(`Admin user: ${adminUser.email} (password: admin123)`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
