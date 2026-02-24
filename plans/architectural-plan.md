# Billing ERP System - Architectural Plan

## Overview

This document outlines the complete architectural design for a professional SAAS-ready billing ERP system built with Next.js, MySQL, and Tailwind CSS.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (React) | UI and Server Components |
| **Styling** | Tailwind CSS | Responsive, mobile-first design |
| **Database** | MySQL (XAMPP local, PlanetScale/Railway cloud) | Primary data storage |
| **ORM** | Prisma | Type-safe database access |
| **PDF Generation** | @react-pdf/renderer | Professional document generation |
| **Excel Export** | SheetJS (xlsx) | Topsheet and data export |
| **Language** | TypeScript | Type safety and better DX |

---

## System Architecture

```mermaid
graph TB
    subgraph Client Layer
        UI[React UI Components]
        State[State Management]
    end
    
    subgraph Next.js Server
        API[API Routes /api/*]
        Auth[Authentication]
        Val[Validation]
    end
    
    subgraph Business Logic
        SVC[Services Layer]
        REP[Repository Pattern]
    end
    
    subgraph Data Layer
        PRisma[Prisma ORM]
        DB[(MySQL Database)]
    end
    
    subgraph External Services
        PDF[PDF Generation]
        Excel[Excel Export]
        LLM[LLM API - Future]
    end
    
    UI --> State
    State --> API
    API --> Val
    Val --> SVC
    SVC --> REP
    REP --> PRisma
    PRisma --> DB
    
    SVC --> PDF
    SVC --> Excel
    SVC --> LLM
```

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    Customer ||--o{ Job : "has many"
    
    Customer {
        int id PK
        string name
        string address
        string email
        string phone
        datetime createdAt
        datetime updatedAt
    }
    
    Job ||--o{ JobItem : "contains"
    Job ||--o{ Document : "generates"
    Customer ||--o{ Job : "orders"
    
    Job {
        int id PK
        string refNumber UK
        string subject
        date jobDate
        int customerId FK
        string customerAddress
        string workLocation
        string status
        string billNo
        date billDate
        string quotationNo
        date quotationDate
        string challanNo
        date challanDate
        decimal totalAmount
        string amountInWords
        string bblBillNo
        decimal subTotal
        decimal discount
        decimal vat
        datetime createdAt
        datetime updatedAt
    }
    
    JobItem ||--o{ Inventory : "references"
    
    JobItem {
        int id PK
        int jobId FK
        int inventoryId FK
        string serialNo
        string workDescription
        decimal quantity
        string unit
        decimal unitPrice
        decimal totalAmount
        datetime createdAt
    }
    
    Inventory {
        int id PK
        string skuId UK
        string itemName
        string details
        string unit
        string itemType
        decimal vatPercentage
        decimal finalRate
        decimal discount
        datetime createdAt
        datetime updatedAt
    }
    
    Document {
        int id PK
        int jobId FK
        string type
        string filePath
        date generatedAt
    }
```

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Customer {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(255)
  address   String?  @db.Text
  email     String?  @db.VarChar(255)
  phone     String?  @db.VarChar(50)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  jobs      Job[]
  
  @@map("customers")
}

model Inventory {
  id           Int      @id @default(autoincrement())
  skuId        String   @unique @db.VarChar(50)
  itemName     String   @db.VarChar(255)
  details      String?  @db.Text
  unit         String   @db.VarChar(20)
  itemType     String   @db.VarChar(50) // Supply/Service
  vatPercentage Decimal @db.Decimal(5,2)
  finalRate    Decimal  @db.Decimal(10,2)
  discount     Decimal? @db.Decimal(10,2)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  jobItems     JobItem[]
  
  @@map("inventory")
}

model Job {
  id             Int       @id @default(autoincrement())
  refNumber      String    @unique @db.VarChar(20)
  subject        String    @db.VarChar(255)
  jobDate        DateTime
  customerId     Int
  customerAddress String?   @db.Text
  workLocation   String?   @db.Text
  
  status         String    @default("QUOTATION") @db.VarChar(20)
  
  // Bill details
  billNo         String?   @db.VarChar(50)
  billDate       DateTime?
  
  // Quotation details
  quotationNo    String?   @db.VarChar(50)
  quotationDate  DateTime?
  
  // Challan details
  challanNo      String?   @db.VarChar(50)
  challanDate    DateTime?
  
  // Financials
  subTotal       Decimal   @db.Decimal(12,2)
  discount       Decimal?  @db.Decimal(12,2)
  discountType   String?   @db.VarChar(10) // PERCENTAGE/FIXED
  vat            Decimal?  @db.Decimal(12,2)
  totalAmount    Decimal   @db.Decimal(12,2)
  amountInWords  String?   @db.Text
  
  // External reference
  bblBillNo      String?   @db.VarChar(50)
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  customer       Customer  @relation(fields: [customerId], references: [id])
  items          JobItem[]
  
  @@map("jobs")
}

model JobItem {
  id              Int       @id @default(autoincrement())
  jobId           Int
  inventoryId     Int?
  serialNo        String    @db.VarChar(10)
  workDescription String    @db.Text
  quantity        Decimal   @db.Decimal(10,2)
  unit            String    @db.VarChar(20)
  unitPrice       Decimal   @db.Decimal(10,2)
  totalAmount     Decimal   @db.Decimal(12,2)
  createdAt       DateTime  @default(now())
  
  job             Job       @relation(fields: [jobId], references: [id], onDelete: Cascade)
  inventory       Inventory? @relation(fields: [inventoryId], references: [id])
  
  @@map("job_items")
}
```

---

## API Routes Structure

```
/api
  ├── /customers
  │   ├── GET          # List customers (with pagination, search)
  │   ├── POST         # Create customer
  │   ├── PUT          # Bulk operations
  │   └── /[id]
  │       ├── GET      # Get single customer
  │       ├── PUT      # Update customer
  │       └── DELETE   # Delete customer
  │
  ├── /inventory
  │   ├── GET          # List inventory items
  │   ├── POST         # Create inventory item
  │   └── /import
  │       └── POST     # Import from CSV
  │
  ├── /jobs
  │   ├── GET          # List jobs (with filters, pagination)
  │   ├── POST         # Create job
  │   └── /[id]
  │       ├── GET      # Get job details
  │       ├── PUT      # Update job
  │       └── DELETE   # Delete job
  │
  ├── /jobs/bulk
  │   ├── POST         # Generate PDFs for selected jobs
  │   └── /topsheet
  │       └── POST     # Generate topsheet for selected jobs
  │
  └── /dashboard
      └── /stats
          └── GET      # Get dashboard statistics
```

---

## Frontend Folder Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Dashboard page
│   ├── globals.css             # Global styles
│   ├── api/                    # API route types (if needed)
│   │
│   ├── customers/
│   │   ├── page.tsx           # Customers listing
│   │   └── [id]/page.tsx      # Customer details/edit
│   │
│   ├── inventory/
│   │   ├── page.tsx           # Inventory listing
│   │   └── import/page.tsx    # CSV import page
│   │
│   ├── jobs/
│   │   ├── page.tsx           # Jobs listing with multi-select
│   │   ├── create/page.tsx    # Create new job
│   │   └── [id]/page.tsx      # Job details/edit
│   │
│   └── reports/
│       └── topsheet/page.tsx  # Topsheet generation
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Badge.tsx
│   │   └── Loading.tsx
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   │
│   ├── jobs/
│   │   ├── JobRow.tsx
│   │   ├── JobForm.tsx
│   │   ├── JobStatusBadge.tsx
│   │   └── JobItemRow.tsx
│   │
│   ├── customers/
│   │   ├── CustomerForm.tsx
│   │   └── CustomerSelect.tsx
│   │
│   ├── inventory/
│   │   ├── SKUList.tsx
│   │   └── SKUItem.tsx
│   │
│   ├── dashboard/
│   │   ├── RevenueCard.tsx
│   │   ├── GrowthChart.tsx
│   │   └── PendingBillsCard.tsx
│   │
│   └── reports/
│       ├── TopsheetGenerator.tsx
│       └── DocumentGenerator.tsx
│
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── db.ts                  # Database utilities
│   ├── utils.ts               # Helper functions
│   ├── formatter.ts           # Currency/date formatters
│   ├── pdf/
│   │   ├── BillPDF.tsx
│   │   ├── QuotationPDF.tsx
│   │   └── ChallanPDF.tsx
│   └── excel/
│       └── topsheet.ts        # Excel export utilities
│
├── types/
│   ├── customer.ts
│   ├── job.ts
│   ├── inventory.ts
│   └── common.ts
│
└── hooks/
    ├── useJobs.ts
    ├── useCustomers.ts
    └── useInventory.ts
```

---

## Dashboard Widgets

### 1. Total Revenue Card
- **Data Source**: Sum of all `totalAmount` from completed jobs
- **Calculation**: `SELECT SUM(totalAmount) FROM jobs WHERE status = 'BILL'`
- **Display**: Currency format with growth indicator

### 2. Monthly Growth Card
- **Data Source**: Jobs grouped by month
- **Calculation**: Compare current month vs previous month revenue
- **Visual**: Bar chart or percentage indicator

### 3. Pending Bills Card
- **Data Source**: Jobs with `status = 'QUOTATION'` (no bill generated)
- **Count**: Number of pending jobs
- **Action**: Link to filter view of pending jobs

---

## Job Status Flow

```mermaid
stateDiagram-v2
    [*] --> QUOTATION : Create Job
    QUOTATION --> BILL : Generate Bill
    QUOTATION --> CHALLAN : Generate Challan
    BILL --> CHALLAN : Also generate Challan
    CHALLAN --> COMPLETED : Job Done
    BILL --> COMPLETED : Job Done
    
    state QUOTATION {
        [*]
        HasQuotation
    }
    
    state BILL {
        [*]
        HasBillNo
        BillDate
    }
    
    state CHALLAN {
        [*]
        HasChallanNo
        ChallanDate
    }
```

---

## Document Generation

### PDF Templates

#### Bill PDF Structure
```
┌─────────────────────────────────────┐
│         Company Header              │
│    Name, Logo, Address, Contact     │
├─────────────────────────────────────┤
│ Bill No: [Auto-generated]          │
│ Date: [Current Date]               │
├─────────────────────────────────────┤
│ Customer Details                   │
│ Name: [Customer Name]              │
│ Address: [Customer Address]        │
├─────────────────────────────────────┤
│ Job Reference: [Ref Number]        │
│ Work Location: [Location]          │
├─────────────────────────────────────┤
│ Line Items Table                   │
│ S.No | Description | Qty | Rate | Amt │
├─────────────────────────────────────┤
│ Subtotal: [Amount]                 │
│ Discount: [Amount]                 │
│ VAT: [Amount]                      │
│ TOTAL: [Final Amount]              │
├─────────────────────────────────────┤
│ Amount in Words: [Text]            │
├─────────────────────────────────────┤
│          Authorized Signature       │
└─────────────────────────────────────┘
```

### Topsheet Excel Structure

| Serial | Work Location | Total Job Amount | BBL Bill No | Bill No | Challan Date |
|--------|---------------|-----------------|-------------|---------|--------------|
| 1 | Mirpur | 50,000 | BBL-001 | BL-2024-001 | 2024-01-15 |
| 2 | Dhanmondi | 75,000 | BBL-002 | BL-2024-002 | 2024-01-16 |

---

## Key Features

### 1. Multi-Selection Job Table
- Checkbox column for each job row
- Select all / Deselect all functionality
- Bulk action toolbar (appears when items selected)
- Actions: Generate Prints, Generate Topsheet

### 2. CSV Import for Inventory
- Read `upc_25.csv` file
- Parse columns: SKU ID, Item Name, Details, Unit, Type, VAT %, Rate, Discount
- Insert into Inventory table using Prisma
- Skip duplicates based on SKU ID

### 3. PDF Generation Flow
```
User selects jobs
    ↓
Click "Generate Prints"
    ↓
Show dropdown (Bill/Quotation/Challan)
    ↓
User selects document type
    ↓
System generates PDF(s)
    ↓
Browser downloads/opens PDF(s)
```

---

## Environment Variables

```env
# .env.local (Development)
DATABASE_URL="mysql://root:password@localhost:3306/billing_erp"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# .env.production (Vercel)
DATABASE_URL="mysql://user:password@aws.connect.psdb.cloud/billing_erp?sslaccept=verify_full"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
```

---

## Development Workflow

### 1. Start Development Server
```bash
npm run dev
# Server runs at http://localhost:3000
```

### 2. Database Management
```bash
# Create migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# View database in GUI
npx prisma studio

# Push schema changes (development only)
npx prisma db push
```

### 3. Run Tests
```bash
npm run test        # Run all tests
npm run test:watch # Watch mode
npm run test:coverage # Coverage report
```

---

## Future Enhancements

### AI Integration (Phase 2)
- Upload job description (text/image)
- LLM parses into structured fields
- Auto-match with inventory SKUs
- Suggest unit prices

### Authentication
- User login/signup
- Role-based access (Admin, Staff, Viewer)
- Session management

### Multi-Company Support
- Company settings table
- Switch between companies
- Company-specific invoices

### Email Integration
- Send PDFs via email
- Email templates
- Automated reminders

---

## Success Criteria

1. ✅ All CRUD operations working for Customers, Inventory, Jobs
2. ✅ Dashboard displays accurate metrics
3. ✅ Multi-selection table with bulk actions
4. ✅ PDF generation matches professional standards
5. ✅ Excel topsheet export includes all required columns
6. ✅ CSV import populates inventory correctly
7. ✅ Responsive design works on mobile/tablet
8. ✅ Code is documented and maintainable
9. ✅ Ready for Vercel deployment
10. ✅ SAAS-ready architecture

---

## Notes

- **Prerequisites**: Node.js 18+, XAMPP with MySQL running
- **Browser Support**: Chrome, Firefox, Safari, Edge
- **Performance**: Target 90+ Lighthouse score
- **Security**: Validate all inputs, use prepared statements via Prisma
- **Backup**: Regular database backups recommended

---

*Plan created: February 2025*
*Version: 1.0*
