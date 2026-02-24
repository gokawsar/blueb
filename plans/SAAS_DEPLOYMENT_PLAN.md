# Billing ERP - SaaS Deployment & Commercialization Plan

## Executive Summary

This document outlines a comprehensive plan to transform the current Billing ERP application into a production-ready, commercially viable SaaS product. The plan covers technical preparation for Vercel deployment, database migration to PlanetScale, authentication implementation, multi-tenancy, and payment integration.

---

## Phase 1: Production Readiness Checklist

### 1.1 Environment & Configuration

**Current State Assessment:**

- Development environment uses XAMPP with local MySQL
- Next.js 14 with App Router
- Prisma ORM with local database

**Required Changes:**

| Item                  | Current              | Required for Production         |
| --------------------- | -------------------- | ------------------------------- |
| Environment Variables | `.env` local only    | `.env.production`, `.env.local` |
| Database              | Local MySQL (XAMPP)  | PlanetScale (MySQL-compatible)  |
| API Keys              | Hardcoded or missing | Environment variables           |
| Error Handling        | Console.log only     | Structured logging + monitoring |
| Build Output          | Development build    | Optimized production build      |

**Action Items:**

1. Create `.env.example` with all required variables documented
2. Move sensitive configurations to environment variables
3. Set up PlanetScale database and get connection string
4. Configure Prisma for PlanetScale compatibility

### 1.2 Prisma Configuration for PlanetScale

```prisma
// prisma/schema.prisma - Add PlanetScale support
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"  // Required for PlanetScale
}

// Add @db.DateTime where needed instead of DateTime
// Remove @@index on relation fields for PlanetScale
```

**Critical Prisma Changes:**

1. Add `relationMode = "prisma"` to datasource
2. Replace `DateTime` with `@db.DateTime`
3. Remove composite indexes on foreign keys
4. Use `@db.VarChar` instead of `String` for fixed-length fields

### 1.3 Environment Variables Setup

```
# Database
DATABASE_URL='mysql://xxx:xxx@aws.connect.psdb.cloud/billing-erp?sslaccept=strict'

# Authentication
NEXTAUTH_SECRET='your-secret-key-here'
NEXTAUTH_URL='https://your-domain.vercel.app'

# Application
NEXT_PUBLIC_APP_URL='https://your-domain.vercel.app'

# Stripe (Future)
STRIPE_SECRET_KEY='sk_test_xxx'
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_xxx'
STRIPE_WEBHOOK_SECRET='whsec_xxx'

# Upload (if using cloud storage)
NEXT_PUBLIC_UPLOAD_PRESET='xxx'
NEXT_PUBLIC_CLOUD_NAME='xxx'
```

---

## Phase 2: GitHub Integration & CI/CD

### 2.1 GitHub Repository Setup

1. **Create GitHub Repository:**

   ```bash
   # Initialize git (if not done)
   git init
   git add .
   git commit -m "Initial commit"

   # Create repository on GitHub, then
   git remote add origin https://github.com/yourusername/billing-erp.git
   git push -u origin main
   ```

2. **GitHub Actions Workflow for Vercel:**

   Create `.github/workflows/deploy.yml`:

   ```yaml
   name: Deploy to Vercel
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: amondnet/vercel-action@v20
           with:
             vercel-token: ${{ secrets.VERCEL_TOKEN }}
             vercel-org-id: ${{ secrets.ORG_ID }}
             vercel-project-id: ${{ secrets.PROJECT_ID }}
             vercel-args: "--prod"
   ```

### 2.2 Vercel Configuration

1. **Connect Vercel to GitHub:**
   - Create Vercel account
   - Import GitHub repository
   - Configure environment variables in Vercel dashboard

2. **Vercel Configuration File** (`vercel.json`):
   ```json
   {
     "framework": "nextjs",
     "buildCommand": "prisma generate && next build",
     "installCommand": "npm install"
   }
   ```

---

## Phase 3: Authentication System

### 3.1 Technology Stack

| Component       | Technology        | Reason                      |
| --------------- | ----------------- | --------------------------- |
| Auth            | NextAuth.js v5    | Built for Next.js, flexible |
| Session         | JWT               | Stateless, scales well      |
| Password        | bcryptjs          | Secure hashing              |
| Role Management | Custom middleware | Full control                |

### 3.2 User Model & Roles

```prisma
// Add to schema.prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String?
  role          Role      @default(USER)
  tenantId      String?   @db.VarChar(255)
  tenant        Tenant?   @relation(fields: [tenantId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum Role {
  ADMIN      // Full access, can manage tenants
  MANAGER    // Can manage all data within tenant
  USER       // Limited access within tenant
  VIEWER     // Read-only access
}

model Tenant {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  plan        Plan     @default(FREE)
  stripeId    String?  @db.VarChar(255)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       User[]
}

enum Plan {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}
```

### 3.3 NextAuth Implementation

**File Structure:**

```
src/
  app/
    api/
      auth/
        [...nextauth]/
          route.ts
  lib/
    auth.ts
    permissions.ts
```

**Core Files:**

1. **Authentication Configuration** (`src/lib/auth.ts`):

   ```typescript
   import NextAuth from "next-auth";
   import Credentials from "next-auth/providers/credentials";
   import { compare } from "bcryptjs";
   import { prisma } from "@/lib/prisma";

   export const { handlers, signIn, signOut, auth } = NextAuth({
     providers: [
       Credentials({
         credentials: {
           email: { label: "Email", type: "email" },
           password: { label: "Password", type: "password" },
         },
         authorize: async (credentials) => {
           const user = await prisma.user.findUnique({
             where: { email: credentials.email as string },
           });

           if (
             !user ||
             !(await compare(credentials.password as string, user.password))
           ) {
             return null;
           }

           return {
             id: user.id,
             email: user.email,
             name: user.name,
             role: user.role,
             tenantId: user.tenantId,
           };
         },
       }),
     ],
     callbacks: {
       async jwt({ token, user }) {
         if (user) {
           token.role = user.role;
           token.tenantId = user.tenantId;
         }
         return token;
       },
       async session({ session, token }) {
         session.user.role = token.role;
         session.user.tenantId = token.tenantId;
         return session;
       },
     },
     pages: {
       signIn: "/login",
     },
   });
   ```

2. **API Route** (`src/app/api/auth/[...nextauth]/route.ts`):

   ```typescript
   import { handlers } from "@/lib/auth";
   export const { GET, POST } = handlers;
   ```

3. **Login Page** (`src/app/login/page.tsx`):
   - Email/password form
   - Company/tenant selection (if multi-tenant)
   - Remember me option

### 3.4 Role-Based Access Control

**Permission System** (`src/lib/permissions.ts`):

```typescript
type Permission =
  | "jobs:create"
  | "jobs:read"
  | "jobs:update"
  | "jobs:delete"
  | "customers:create"
  | "customers:read"
  | "customers:update"
  | "customers:delete"
  | "topsheets:create"
  | "topsheets:read"
  | "topsheets:update"
  | "topsheets:delete"
  | "reports:read"
  | "settings:manage"
  | "users:manage";

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: ["*"], // All permissions
  MANAGER: [
    "jobs:create",
    "jobs:read",
    "jobs:update",
    "jobs:delete",
    "customers:create",
    "customers:read",
    "customers:update",
    "customers:delete",
    "topsheets:create",
    "topsheets:read",
    "topsheets:update",
    "topsheets:delete",
    "reports:read",
    "settings:manage",
  ],
  USER: [
    "jobs:create",
    "jobs:read",
    "jobs:update",
    "customers:read",
    "topsheets:create",
    "topsheets:read",
    "topsheets:update",
    "reports:read",
  ],
  VIEWER: ["jobs:read", "customers:read", "topsheets:read", "reports:read"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === "ADMIN") return true;
  return (
    rolePermissions[role].includes(permission) ||
    rolePermissions[role].includes("*" as Permission)
  );
}
```

---

## Phase 4: Multi-Tenancy Implementation

### 4.1 Tenant Isolation

**Middleware for Tenant Isolation** (`src/middleware.ts`):

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export default auth(async (req) => {
  const session = req.auth;
  const path = req.nextUrl.pathname;

  // Public paths
  if (
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Require authentication
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Get tenant from session
  const tenantId = session.user.tenantId;

  // API routes - add tenant filter
  if (path.startsWith("/api/")) {
    // Tenant-scoped API calls already handled in routes
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 4.2 Database Queries with Tenant Filter

**Pattern for all Prisma queries:**

```typescript
// Instead of
const jobs = await prisma.job.findMany();

// Use
const jobs = await prisma.job.findMany({
  where: {
    tenantId: session.user.tenantId,
  },
});
```

**Create service layer** (`src/lib/services/`):

- `jobService.ts` - All job CRUD operations
- `customerService.ts` - All customer CRUD operations
- `topsheetService.ts` - All topsheet CRUD operations

Each service automatically includes tenantId from session.

---

## Phase 5: Payment & Billing (Stripe Integration)

### 5.1 Stripe Configuration

```typescript
// src/lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
  typescript: true,
});
```

### 5.2 Plans & Pricing

| Plan         | Price      | Features                          |
| ------------ | ---------- | --------------------------------- |
| Free         | $0/month   | 1 user, 100 jobs/month            |
| Starter      | $29/month  | 3 users, 1000 jobs/month          |
| Professional | $79/month  | 10 users, unlimited jobs          |
| Enterprise   | $199/month | Unlimited users, priority support |

### 5.3 Subscription Flow

```
User Signs Up → Free Tier → Upgrade Prompt → Stripe Checkout → Webhook → Plan Updated
```

**Stripe Products Setup:**

1. Create products in Stripe Dashboard
2. Store Price IDs in database
3. Map plans to products

### 5.4 Key Files to Implement

1. **Checkout API** (`src/app/api/stripe/checkout/route.ts`)
2. **Webhook Handler** (`src/app/api/stripe/webhook/route.ts`)
3. **Customer Portal** (`src/app/api/stripe/portal/route.ts`)
4. **Usage Tracking** (`src/app/api/usage/route.ts`)

---

## Phase 6: Security & Performance

### 6.1 Security Checklist

- [ ] HTTPS enforced (Vercel automatic)
- [ ] Rate limiting on API routes
- [ ] Input validation (Zod)
- [ ] XSS protection (Next.js built-in)
- [ ] CSRF protection (NextAuth built-in)
- [ ] SQL injection prevention (Prisma)
- [ ] Secure headers (next.config.js)

### 6.2 Performance Optimizations

- [ ] Image optimization (next/image)
- [ ] Font optimization (next/font)
- [ ] API response caching
- [ ] Database query optimization
- [ ] Lazy loading for heavy components

---

## Phase 7: Deployment Checklist

### Pre-Deployment

1. **Code Quality:**
   - [ ] All TypeScript errors resolved
   - [ ] No console.log in production
   - [ ] Error boundaries implemented
   - [ ] Loading states for all async operations

2. **Testing:**
   - [ ] Manual testing of all flows
   - [ ] Authentication flow tested
   - [ ] Data isolation verified
   - [ ] Payment flow tested (test mode)

3. **Documentation:**
   - [ ] API documentation
   - [ ] User guide
   - [ ] Admin guide
   - [ ] Deployment guide

### Deployment Steps

1. **Database:**

   ```bash
   # Push schema to PlanetScale
   npx prisma db push
   ```

2. **Vercel:**

   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel --prod
   ```

3. **Environment:**
   - Set all environment variables in Vercel
   - Configure Stripe webhook URL
   - Set up custom domain (optional)

---

## Phase 8: Monetization Strategy

### 8.1 Revenue Model

```
┌─────────────────────────────────────────────────────────┐
│                    Revenue Streams                       │
├──────────────────┬──────────────────────────────────────┤
│ Subscription     │ Monthly/Yearly recurring              │
│ Usage Overages   │ Extra jobs beyond limit              │
│ Setup Fee        │ One-time (optional)                 │
│ Custom Features  │ Enterprise customizations           │
└──────────────────┴──────────────────────────────────────┘
```

### 8.2 Launch Strategy

1. **Beta Launch (Free):** 50 users, gather feedback
2. **Public Launch:** Starter at $29/month
3. **Scale:** Add features, increase prices
4. **Enterprise:** Custom pricing

---

## Implementation Roadmap

```
Month 1: Foundation
├── Week 1: Environment setup, PlanetScale migration
├── Week 2: GitHub + Vercel deployment
├── Week 3: NextAuth implementation
└── Week 4: Role-based access control

Month 2: Multi-tenancy
├── Week 1: Tenant model & isolation
├── Week 2: Service layer refactoring
├── Week 3: Middleware implementation
└── Week 4: Testing & bug fixes

Month 3: Payments
├── Week 1: Stripe integration
├── Week 2: Subscription management
├── Week 3: Usage tracking
└── Week 4: Billing portal

Month 4: Launch
├── Week 1: Security audit
├── Week 2: Performance optimization
├── Week 3: Documentation
└── Week 4: Public launch
```

---

## Files to Create/Modify

### New Files to Create:

- `src/lib/auth.ts` - NextAuth configuration
- `src/app/api/auth/[...nextauth]/route.ts` - Auth API routes
- `src/app/login/page.tsx` - Login page
- `src/app/register/page.tsx` - Registration page
- `src/app/dashboard/page.tsx` - Protected dashboard
- `src/middleware.ts` - Auth middleware
- `src/lib/permissions.ts` - Role permissions
- `src/lib/services/*.ts` - Service layer
- `src/app/api/stripe/**/*.ts` - Stripe endpoints
- `.github/workflows/deploy.yml` - CI/CD
- `vercel.json` - Vercel config

### Files to Modify:

- `prisma/schema.prisma` - Add User, Tenant, Role models
- `src/lib/prisma.ts` - Update for multi-tenancy
- `src/app/api/**/*.ts` - Add tenant filtering
- `src/components/**/*` - Add auth checks

---

## Cost Estimation

| Service     | Free Tier       | Paid Tier                    |
| ----------- | --------------- | ---------------------------- |
| Vercel      | $0/mo (Hobby)   | $20+/mo (Pro)                |
| PlanetScale | $0/mo (Starter) | $25+/mo (Scaler)             |
| Stripe      | $0              | 2.9% + $0.30 per transaction |
| Domain      | ~$12/year       | -                            |
| GitHub      | $0              | $0                           |

**Estimated Monthly Cost (Launch):** $45-70/month

---

This plan provides a comprehensive roadmap to transform your Billing ERP into a production-ready SaaS application. Each phase builds upon the previous one, ensuring a solid foundation before adding complexity.
