import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const maxDuration = 60;

// Default settings
const defaultSettings = {
    dateFormat: {
        format: 'BD',
        showPrefix: true,
        prefixText: 'Date: ',
    },
};

// Fetch settings from database
async function getSettings() {
    try {
        const setting = await prisma.settings.findUnique({
            where: { key: 'appSettings' },
        });
        
        if (setting) {
            return { ...defaultSettings, ...JSON.parse(setting.value) };
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
    }
    return defaultSettings;
}

// Helper function to convert number to words
function convertNumberToWords(num: number): string {
    const amount = Math.floor(num);
    if (amount === 0) return 'Zero Taka Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertChunk = (n: number): string => {
        if (n === 0) return '';
        if (n < 20) return ones[n] || '';
        if (n < 100) return (tens[Math.floor(n / 10)] || '') + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
        if (n < 100000) return convertChunk(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convertChunk(n % 1000) : '');
        if (n < 10000000) return convertChunk(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convertChunk(n % 100000) : '');
        return convertChunk(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convertChunk(n % 10000000) : '');
    };

    return convertChunk(amount) + ' Taka Only.';
}

// Format currency
const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Generate PDF HTML
async function generateTopsheetPdfHtml(
    topsheet: any,
    dateFormatOptions?: { format: 'US' | 'BD'; showPrefix: boolean; prefixText: string }
) {
    // Recalculate total amount from job items
    const totalAmount = topsheet.jobs?.reduce((sum: number, job: any) => {
        let jobTotal = 0;
        if (job.items && job.items.length > 0) {
            jobTotal = job.items.reduce((itemSum: number, item: any) => itemSum + (Number(item.total) || 0), 0);
        } else {
            jobTotal = Number(job.totalAmount) || 0;
        }
        return sum + jobTotal;
    }, 0) || 0;
    const amountInWords = convertNumberToWords(totalAmount);

    // Format date based on settings
    const formatDate = (dateStr: string | Date | null | undefined) => {
        if (!dateStr) return 'N/A';
        const dateFormat = dateFormatOptions || { format: 'BD', showPrefix: true, prefixText: 'Date: ' };
        const locale = dateFormat.format === 'US' ? 'en-US' : 'en-GB';
        return new Date(dateStr).toLocaleDateString(locale, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    // Format Challan Date based on settings
    const formatChallanDate = (dateStr: string | Date | null | undefined) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const dateFormat = dateFormatOptions || { format: 'BD', showPrefix: true, prefixText: 'Date: ' };
        
        if (dateFormat.format === 'US') {
            // US format: MM/DD/YYYY
            return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
        } else {
            // BD format: DD/MM/YYYY
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }
    };

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Topsheet - ${topsheet.topsheetNumber}</title>
            <style>
                @page { 
                    size: A4; 
                    margin: 15mm 10mm;
                }
                * { 
                    margin: 0; 
                    padding: 0; 
                    box-sizing: border-box; 
                }
                body { 
                    font-family: 'Segoe UI', Arial, Helvetica, sans-serif; 
                    font-size: 10pt; 
                    line-height: 1.4; 
                    color: #000000;
                    background: white;
                }
                
                .header { 
                    text-align: center; 
                    font-size: 18pt;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                
                .customer-info {
                    margin-bottom: 5px;
                }
                .customer-name {
                    font-size: 12pt;
                    font-weight: bold;
                }
                .address {
                    font-size: 11pt;
                    color: #333333;
                }
                
                .empty-row {
                    height: 15px;
                }
                
                .subject {
                    font-size: 12pt;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 10px; 
                }
                th, td { 
                    border: 1px solid #000000; 
                    padding: 6px 8px; 
                    text-align: left; 
                    vertical-align: top;
                }
                th { 
                    background: #2176C8; 
                    color: #FFFFFF;
                    font-weight: bold;
                    font-size: 9pt;
                    text-transform: uppercase;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                
                .total-row {
                    background-color: #E6F2FF;
                    font-weight: bold;
                }
                
                .amount-words {
                    font-size: 10pt;
                    font-style: italic;
                    font-weight: bold;
                    margin-top: 10px;
                    margin-bottom: 10px;
                }
                
                .signature-section { 
                    margin-top: 40px; 
                    display: flex; 
                    justify-content: space-between; 
                }
                .signature-box { 
                    text-align: center; 
                    width: 150px; 
                }
                .signature-line { 
                    border-top: 1px solid #000000; 
                    margin-top: 35px; 
                    padding-top: 5px; 
                    font-size: 9pt;
                }
            </style>
        </head>
        <body>
            <!-- Header -->
            <div class="header">Topsheet</div>
            
            <!-- Customer Info -->
            <div class="customer-info">
                <div class="customer-name">${topsheet.customerName || ''}</div>
                ${topsheet.customerAddress1 ? `<div class="address">${topsheet.customerAddress1}</div>` : ''}
                ${topsheet.customerAddress2 ? `<div class="address">${topsheet.customerAddress2}</div>` : ''}
            </div>
            
            <!-- Empty row -->
            <div class="empty-row"></div>
            
            <!-- Subject -->
            <div class="subject">Subject: Topsheet of workings at different places ${topsheet.customerName}</div>
            
            <!-- Empty row -->
            <div class="empty-row"></div>
            
            <!-- Table -->
            <table>
                <thead>
                    <tr>
                        <th style="width: 30px;">Sl.</th>
                        <th>Work Details</th>
                        <th style="width: 100px;">Work Location</th>
                        <th style="width: 50px;">Bill No.</th>
                        <th style="width: 50px;">Challan Date</th>
                        <th style="width: 60px;">Total</th>
                        <th style="width: 50px;">BBL Bill No.</th>
                    </tr>
                </thead>
                <tbody>
                    ${topsheet.jobs?.map((job: any, index: number) => {
                        // Recalculate job total from items
                        let jobTotal = 0;
                        if (job.items && job.items.length > 0) {
                            jobTotal = job.items.reduce((itemSum: number, item: any) => itemSum + (Number(item.total) || 0), 0);
                        } else {
                            jobTotal = Number(job.totalAmount) || 0;
                        }
                        return `
                        <tr>
                            <td class="text-center">${index + 1}</td>
                            <td>${job.jobDetail || job.subject || '-'}</td>
                            <td>${job.workLocation || '-'}</td>
                            <td class="text-center">${job.refNumber || '-'}</td>
                            <td class="text-center">${formatChallanDate(job.challanDate)}</td>
                            <td class="text-right">${formatCurrency(jobTotal)}</td>
                            <td class="text-center">${job.bblBillNumber || ' '}</td>
                        </tr>
                    `}).join('') || ''}
                    <tr class="total-row">
                        <td colspan="4" class="text-right" style="background-color: #E6F2FF;">Total:</td>
                        <td colspan="1" class="text-right" style="background-color: #E6F2FF;">${formatCurrency(totalAmount)}</td>
                        <td style="background-color: #E6F2FF;"></td>
                    </tr>
                </tbody>
            </table>
            
            <!-- Amount in Words -->
            <div class="amount-words">In-words: ${amountInWords}</div>
            
            <!-- Signature Section -->
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line">Prepared By</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line">Checked By</div>
                </div>
            </div>
        </body>
        </html>
    `;

    return htmlContent;
}

// GET - Export topsheet to PDF
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Topsheet ID is required' }, { status: 400 });
        }

        // Fetch topsheet with all jobs and their items
        const topsheet = await prisma.topsheet.findUnique({
            where: { id: parseInt(id) },
            include: {
                customer: true,
                jobs: {
                    include: {
                        items: true
                    },
                    orderBy: { id: 'asc' },
                },
            },
        });

        if (!topsheet) {
            return NextResponse.json({ success: false, error: 'Topsheet not found' }, { status: 404 });
        }

        // Fetch settings from database
        const dbSettings = await getSettings();
        const dateFormatOptions = {
            format: dbSettings.dateFormat?.format ?? 'BD',
            showPrefix: dbSettings.dateFormat?.showPrefix ?? true,
            prefixText: dbSettings.dateFormat?.prefixText ?? 'Date: ',
        };

        // Generate PDF HTML
        const pdfHtml = await generateTopsheetPdfHtml(topsheet, dateFormatOptions);

        // Return HTML
        return new NextResponse(pdfHtml, {
            headers: {
                'Content-Type': 'text/html',
            },
        });
    } catch (error) {
        console.error('Error exporting topsheet PDF:', error);
        return NextResponse.json({ success: false, error: 'Failed to export topsheet PDF' }, { status: 500 });
    }
}
