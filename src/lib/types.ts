// Customer Types
export interface Customer {
    id: number;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string; // Legacy field
    addressLine1?: string; // New: House/Road/Area
    addressLine2?: string; // New: City/District
    location?: string;
    vatNumber?: string;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Inventory Types
export interface Inventory {
    id: number;
    sku: string;
    name: string;
    details?: string;
    unit: string;
    itemType: 'Supply' | 'Service';
    vatRate: number;
    buyPrice: number;
    standardPrice: number;
    discountedPrice: number;
    stockQuantity: number;
    minStock: number;
    category?: string;
    brand?: string;
    model?: string;
    color?: string;
    size?: string;
    weight?: number;
    dimensions?: string;
    supplier?: string;
    origin?: string;
    barcode?: string;
    hsnCode?: string;
    wholesalePrice?: number;
    retailPrice?: number;
    onlinePrice?: number;
    unitRateExVat?: number;
    vatAmount?: number;
    finalRate?: number;
    maxUnitRate?: number;
    discountPercentCsv?: number;
    discountAmountCsv?: number;
    isActive: boolean;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Job Status Types
export type JobStatus = 'QUOTATION' | 'CHALLAN' | 'BILL';

// Measurement Types (stored in separate table)
export interface Measurement {
    id?: number;
    jobItemId?: number;
    widthFeet: number;
    widthInches: number;
    heightFeet: number;
    heightInches: number;
    quantity: number;  // Number of pieces with this measurement
    calculatedSqft: number;
    description?: string;
    sortOrder?: number;
}

// Job Item Types
export interface JobItem {
    id?: number;
    serialNumber: number;
    workDescription: string;
    details?: string; // Details from inventory
    quantity: number;
    unit: string;
    // Size measurements (for Size Noter functionality)
    widthFeet?: number;
    widthInches?: number;
    heightFeet?: number;
    heightInches?: number;
    calculatedSqft?: number;
    autoCalculateSqft?: boolean; // Toggle to auto-calculate quantity from sqft
    measurementsJson?: string; // JSON array of measurements (legacy)
    measurements?: Measurement[]; // Related measurements from separate table
    inventoryId?: number;
    sku?: string;
    skuName?: string;
    unitPrice: number;
    buyPrice: number;
    discountedPrice?: number;
    discountPercent: number;
    discountAmount: number;
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    total: number;
}

// Job Types
export interface Job {
    id?: number;
    refNumber: string;
    subject: string;
    jobDetail?: string;
    date: Date | string;
    status: JobStatus;
    topsheetId?: number | null;
    customerId: number;
    customer?: Customer;
    workLocation?: string;
    subtotal: number;
    totalVat: number;
    totalAmount: number;
    discountPercent: number;
    discountAmount: number;
    amountInWords?: string;
    billNumber?: string;
    bblBillNumber?: string;
    challanNumber?: string;
    billDate?: Date | string;
    challanDate?: Date | string;
    quotationDate?: Date | string;
    notes?: string;
    termsConditions?: string;
    items?: JobItem[];
    expenses?: JobExpense[];
    totalExpenses?: number;
    expectedProfit?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// CSV Import Types
export interface CSVInventoryItem {
    sku: string;
    name: string;
    details?: string;
    unit: string;
    itemType: 'Supply' | 'Service';
    vatRate: number;
    buyPrice: number;
    standardPrice: number;
    discountedPrice?: number;
    stockQuantity?: number;
    category?: string;
    brand?: string;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Pagination Types
export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Form Data Types for Inventory
export interface InventoryFormData {
    sku: string;
    name: string;
    details: string;
    unit: string;
    itemType: 'Supply' | 'Service';
    vatRate: number;
    buyPrice: number;
    standardPrice: number;
    discountedPrice: number;
    stockQuantity: number;
    minStock: number;
    category: string;
    brand: string;
}

// Default form data
export const defaultInventoryFormData: InventoryFormData = {
    sku: '',
    name: '',
    details: '',
    unit: 'nos',
    itemType: 'Supply',
    vatRate: 0,
    buyPrice: 0,
    standardPrice: 0,
    discountedPrice: 0,
    stockQuantity: 0,
    minStock: 0,
    category: '',
    brand: ''
};

// Job Expense Types
export interface JobExpense {
    id?: number;
    jobId: number;
    description: string;
    category: 'Material' | 'Labor' | 'Transport' | 'Other';
    amount: number;
    createdAt?: Date;
    updatedAt?: Date;
}
