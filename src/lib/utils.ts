import { CSVInventoryItem, JobItem } from './types';

// Number to words conversion for amount in words
export function numberToWords(n: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numToWords = (num: number): string => {
        if (num === 0) return '';
        if (num < 20) return ones[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numToWords(num % 100) : '');
        if (num < 100000) return numToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numToWords(num % 1000) : '');
        if (num < 10000000) return numToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numToWords(num % 100000) : '');
        return numToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numToWords(num % 10000000) : '');
    };

    const integerPart = Math.floor(n);
    const decimalPart = Math.round((n - integerPart) * 100);

    let words = numToWords(integerPart);

    if (decimalPart > 0) {
        words += ' and ' + numToWords(decimalPart) + ' Paise';
    }

    return words + ' Taka Only';
}

// Parse CSV text to inventory items
export function parseCSVToInventory(csvText: string): CSVInventoryItem[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Skip header row
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const results: CSVInventoryItem[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle CSV parsing with potential commas in quoted fields
        const values = parseCSVLine(line);

        if (values.length >= 4) {
            const item: CSVInventoryItem = {
                sku: values[headers.indexOf('sku')] || `SKU-${i.toString().padStart(4, '0')}`,
                name: values[headers.indexOf('name')] || values[headers.indexOf('item')] || values[0] || `Item ${i}`,
                details: values[headers.indexOf('details')] || values[headers.indexOf('description')] || '',
                unit: values[headers.indexOf('unit')] || 'nos',
                itemType: (values[headers.indexOf('type')] || 'Supply') as 'Supply' | 'Service',
                vatRate: parseFloat(values[headers.indexOf('vat')] || values[headers.indexOf('vat rate')] || values[headers.indexOf('vat%')] || '0') || 0,
                buyPrice: parseFloat(values[headers.indexOf('buy price')] || values[headers.indexOf('cost')] || values[headers.indexOf('purchase price')] || '0') || 0,
                standardPrice: parseFloat(values[headers.indexOf('price')] || values[headers.indexOf('standard price')] || values[headers.indexOf('rate')] || '0') || 0,
                discountedPrice: parseFloat(values[headers.indexOf('discounted price')] || values[headers.indexOf('discount price')] || '0') || undefined,
                stockQuantity: parseFloat(values[headers.indexOf('stock')] || values[headers.indexOf('quantity')] || '0') || 0,
                category: values[headers.indexOf('category')] || '',
                brand: values[headers.indexOf('brand')] || '',
            };
            results.push(item);
        }
    }

    return results;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// Convert inventory items to CSV format
export function inventoryToCSV(items: CSVInventoryItem[]): string {
    const headers = ['sku', 'name', 'details', 'unit', 'type', 'vat rate', 'buy price', 'standard price', 'discounted price', 'stock quantity', 'category', 'brand'];
    const rows = items.map(item => [
        item.sku,
        `"${item.name}"`,
        `"${item.details || ''}"`,
        item.unit,
        item.itemType,
        item.vatRate.toString(),
        item.buyPrice.toString(),
        item.standardPrice.toString(),
        (item.discountedPrice || 0).toString(),
        (item.stockQuantity || 0).toString(),
        item.category || '',
        item.brand || ''
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Calculate line item totals
export function calculateLineItem(item: Partial<JobItem>): JobItem {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const discountPercent = item.discountPercent || 0;
    const vatRate = item.vatRate || 0;

    // Simple calculation: Qty * UnitPrice = Subtotal
    // Then apply discount
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    // For now, no VAT in total (as per user request)
    const vatAmount = 0;
    const total = afterDiscount; // Total = after discount (no VAT)

    return {
        serialNumber: item.serialNumber || 1,
        workDescription: item.workDescription || '',
        details: item.details || '',
        quantity,
        unit: item.unit || 'nos',
        unitPrice,
        discountPercent,
        discountAmount,
        subtotal,
        vatRate,
        vatAmount,
        total,
        buyPrice: item.buyPrice || 0,
        inventoryId: item.inventoryId,
        sku: item.sku,
        skuName: item.skuName,
        widthFeet: item.widthFeet,
        widthInches: item.widthInches,
        heightFeet: item.heightFeet,
        heightInches: item.heightInches,
        calculatedSqft: item.calculatedSqft,
        autoCalculateSqft: item.autoCalculateSqft,
        measurementsJson: item.measurementsJson,
        measurements: item.measurements,
    };
}

// Generate next job reference number
export function generateRefNumber(prefix: string = 'JB'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${year}${month}-${random}`;
}

// Format currency
export function formatCurrency(amount: number, currency: string = '৳'): string {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Validate email
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Generate bill number
export function generateBillNumber(prefix: string = 'INV'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}${month}-${random}`;
}

// Generate challan number
export function generateChallanNumber(prefix: string = 'CHL'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}${month}-${random}`;
}

// Date format types
export type DateFormatType = 'US' | 'BD';

// Interface for date format settings
export interface DateFormatSettings {
    format: DateFormatType;
    showPrefix: boolean;
    prefixText: string;
}

// Format date based on settings
export function formatDate(
    date: Date | string | undefined | null,
    settings?: DateFormatSettings,
    options?: { includePrefix?: boolean }
): string {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    
    // Default settings if not provided
    const format = settings?.format || 'BD';
    const showPrefix = options?.includePrefix ?? settings?.showPrefix ?? true;
    const prefixText = settings?.prefixText || 'Date: ';
    
    // Format based on selected format
    let formattedDate: string;
    if (format === 'US') {
        // US Format: MM/DD/YYYY
        formattedDate = d.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        });
    } else {
        // BD/UK Format: DD/MM/YYYY
        formattedDate = d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }
    
    // Add prefix if enabled
    if (showPrefix) {
        return `${prefixText}${formattedDate}`;
    }
    
    return formattedDate;
}

// Format date short (without prefix) based on settings
export function formatDateShort(
    date: Date | string | undefined | null,
    format: DateFormatType = 'BD'
): string {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    
    if (format === 'US') {
        return d.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        });
    } else {
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }
}

// Format date with month name (e.g., 15 Jan 2024)
export function formatDateWithMonth(
    date: Date | string | undefined | null,
    format: DateFormatType = 'BD'
): string {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    
    if (format === 'US') {
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } else {
        return d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }
}
