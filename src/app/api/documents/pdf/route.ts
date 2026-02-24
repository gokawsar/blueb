import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { formatCurrency, numberToWords } from '@/lib/utils';

interface DocumentOptions {
    docType: 'quotation' | 'challan' | 'bill';
    includePad: boolean;
    includeSignature: boolean;
    refNumber: string;
    // Font settings
    fontFamily?: string;
    fontSize?: number;
    fontColor?: string;
    // Margin settings
    topMargin?: number;
    bottomMargin?: number;
    // Company settings
    companyName?: string;
    companyTagline?: string;
    companyEmail?: string;
    companyPhone?: string;
    // Pad settings
    padEnabled?: boolean;
    padOpacity?: number;
    padImageUrl?: string;
    // Signature settings
    signatureEnabled?: boolean;
    signatureWidth?: number;
    signatureHeight?: number;
    signatureImageUrl?: string;
}

// Default settings
const defaultSettings = {
    invoice: {
        fontFamily: 'Segoe UI',
        fontSize: 11,
        fontColor: '#1f2937',
        topMargin: 20,
        bottomMargin: 20,
    },
    company: {
        name: 'AMK Enterprise',
        tagline: 'General Order & Supplier',
        email: 'info@amkenterprise.com',
        phone: '+880 2 222 111 333',
    },
    pad: {
        enabled: false,
        opacity: 0.15,
        imageUrl: '/images/AMK_PAD_A4.png',
    },
    signature: {
        enabled: false,
        width: 120,
        height: 60,
        imageUrl: '/images/Sig_Seal.png',
    },
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

async function generatePdfHtml(
    job: any,
    options: DocumentOptions,
    customerAddressLine1?: string,
    customerAddressLine2?: string,
    dateFormatOptions?: { format: 'US' | 'BD'; showPrefix: boolean; prefixText: string }
) {
    const { 
        docType, 
        includePad = false, 
        includeSignature = false, 
        refNumber,
        fontFamily = 'Segoe UI',
        fontSize = 11,
        fontColor = '#1f2937',
        topMargin = 20,
        bottomMargin = 20,
        companyName = 'AMK Enterprise',
        companyTagline = 'General Order & Supplier',
        companyEmail = 'info@amkenterprise.com',
        companyPhone = '+880 2 222 111 333',
        padEnabled = false,
        padOpacity = 0.15,
        padImageUrl = '/images/AMK_PAD_A4.png',
        signatureEnabled = false,
        signatureWidth = 120,
        signatureHeight = 60,
        signatureImageUrl = '/images/Sig_Seal.png',
    } = options;

    // Generate document number based on type and ref
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');

    const docNumberPrefix = {
        quotation: 'QT',
        challan: 'CH',
        bill: 'INV'
    };

    const docNumber = `${docNumberPrefix[docType]}-${year}-${month}${day}`;

    const titles: Record<string, string> = {
        quotation: 'QUOTATION',
        challan: 'DELIVERY CHALLAN',
        bill: 'TAX INVOICE'
    };

    // Calculate totals
    const subtotal = job.items?.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0) || 0;
    const discountAmount = subtotal * ((job.discountPercent || 0) / 100);
    const afterDiscount = subtotal - discountAmount;
    const totalVat = job.items?.reduce((sum: number, item: any) => sum + (item.vatAmount || 0), 0) || 0;
    const totalAmount = afterDiscount + totalVat;
    const amountInWords = numberToWords(totalAmount);

    const formatDate = (date: string | Date | null | undefined) => {
        if (!date) return 'N/A';
        const dateF = dateFormatOptions || { format: 'BD', showPrefix: true, prefixText: 'Date: ' };
        const locale = dateF.format === 'US' ? 'en-US' : 'en-GB';
        const formattedDate = new Date(date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
        return dateF.showPrefix ? `${dateF.prefixText}${formattedDate}` : formattedDate;
    };

    // Format quantity with unit
    const formatQuantity = (item: any) => {
        if (item.unit === 'sqft' && item.quantity) {
            return `${Number(item.quantity).toFixed(2)} sqft`;
        }
        return `${item.quantity} ${item.unit}`;
    };

    // Format work description with measurements
    const formatWorkDescription = (item: any) => {
        let description = item.workDescription || '';

        if (item.details) {
            description += ` - ${item.details}`;
        }

        const measurements = item.measurements;
        if (measurements && measurements.length > 0) {
            const measurementText = measurements.map((m: any) => {
                const widthFeet = Math.floor(m.widthFeet || 0);
                const widthInches = m.widthInches || 0;
                const heightFeet = Math.floor(m.heightFeet || 0);
                const heightInches = m.heightInches || 0;

                let dim = '';
                if (widthFeet > 0) dim += `${widthFeet}'`;
                if (widthInches > 0) dim += `${widthInches}"`;
                dim += ' x ';
                if (heightFeet > 0) dim += `${heightFeet}'`;
                if (heightInches > 0) dim += `${heightInches}"`;

                return `${dim} (${m.quantity || 1} pcs) = ${(m.calculatedSqft || 0).toFixed(2)} sft`;
            }).join(', ');

            if (measurementText) {
                description += ` [${measurementText}]`;
            }
        }

        if (item.autoCalculateSqft && item.calculatedSqft) {
            description += ` [${item.calculatedSqft.toFixed(2)} sqft]`;
        }

        return description;
    };

    const formatPrice = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const documentDate = docType === 'quotation'
        ? job.quotationDate
        : docType === 'challan'
            ? job.challanDate
            : job.billDate;

    const subjectLine = `${titles[docType]} for ${job.jobDetail || job.subject || 'N/A'} at ${job.customer?.name || job.customerName || 'N/A'}, ${job.workLocation || ''}`;

    const showPricing = docType !== 'challan';

    // Pad background style - Using actual img tag instead of background-image
    // because CSS background-image doesn't print in most browsers
    const padStyle = includePad && padEnabled ? `
        .pad-background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            pointer-events: none;
        }
        .pad-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            opacity: ${padOpacity};
        }
        @media print {
            .pad-background {
                position: fixed;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            .pad-image {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    ` : '';

    // Signature style
    const signatureStyle = includeSignature && signatureEnabled ? `
        .signature-image {
            max-width: ${signatureWidth}px;
            max-height: ${signatureHeight}px;
            margin-bottom: 5px;
        }
    ` : `
        .signature-image {
            display: none;
        }
    `;

    // Generate HTML content
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${titles[docType]} - ${refNumber}</title>
            <style>
                @page { 
                    size: A4; 
                    margin: ${topMargin}mm 0.5in ${bottomMargin}mm 0.5in;
                    @bottom-right {
                        content: "Page " counter(page) " of " counter(pages);
                        font-size: 8pt;
                        font-family: '${fontFamily}', Arial, sans-serif;
                    }
                }
                * { 
                    margin: 0; 
                    padding: 0; 
                    box-sizing: border-box; 
                }
                html {
                    font-family: '${fontFamily}', Arial, Helvetica, sans-serif;
                }
                body { 
                    font-family: '${fontFamily}', Arial, Helvetica, sans-serif; 
                    font-size: ${fontSize}pt; 
                    line-height: 1.4; 
                    color: ${fontColor};
                    background: white;
                    min-height: 100vh;
                }
                
                /* Print-specific fixes */
                @media print {
                    body {
                        min-height: auto;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .pad-background {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: -1;
                    }
                    @page {
                        size: A4;
                        margin: ${topMargin}mm 0.5in ${bottomMargin}mm 0.5in;
                    }
                }
                
                ${padStyle}
                
                .doc-container {
                    position: relative;
                    z-index: 1;
                    max-width: 100%;
                }
                
                .header { 
                    text-align: center; 
                    border-bottom: 2px solid ${fontColor}; 
                    padding-bottom: 15px; 
                    margin-bottom: 20px; 
                }
                .company-name { 
                    font-size: 22pt; 
                    font-weight: bold; 
                    color: ${fontColor}; 
                    margin-bottom: 5px; 
                }
                .company-tagline { 
                    font-size: 9pt; 
                    color: ${fontColor}; 
                    opacity: 0.7;
                    margin-bottom: 4px; 
                }
                .company-address { 
                    font-size: 8pt; 
                    color: ${fontColor}; 
                    opacity: 0.7;
                }
                
                .doc-title { 
                    font-size: 14pt; 
                    font-weight: bold; 
                    text-align: center; 
                    margin: 15px 0; 
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                
                .doc-info { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 15px; 
                    font-size: 9pt; 
                }
                .doc-info-left, .doc-info-right {
                    width: 48%;
                }
                .doc-info-right {
                    text-align: right;
                }
                .info-row {
                    margin-bottom: 3px;
                }
                .info-label {
                    color: ${fontColor};
                    opacity: 0.7;
                }
                .doc-no-small {
                    font-size: 8pt;
                    color: ${fontColor};
                    opacity: 0.7;
                }
                
                .customer-box { 
                    border: 1px solid #e5e7eb; 
                    padding: 10px; 
                    margin-bottom: 15px; 
                    background: #f9fafb;
                }
                .customer-label { 
                    font-size: 8pt; 
                    color: ${fontColor};
                    text-transform: uppercase; 
                    margin-bottom: 4px; 
                    opacity: 0.7;
                }
                .customer-name { 
                    font-size: 11pt; 
                    font-weight: 600; 
                    color: ${fontColor};
                }
                .customer-address {
                    font-size: 9pt;
                    color: ${fontColor};
                    opacity: 0.7;
                    margin-top: 2px;
                }
                
                .subject-line {
                    margin-bottom: 15px;
                    font-size: 9pt;
                    padding: 8px;
                    background: #f3f4f6;
                    border-left: 3px solid #3b82f6;
                }
                
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 15px; 
                    font-size: ${fontSize}pt; 
                }
                th, td { 
                    border: 1px solid #e5e7eb; 
                    padding: 6px 8px; 
                    text-align: left; 
                    vertical-align: top;
                }
                th { 
                    background: #f3f4f6; 
                    font-weight: 600; 
                    text-transform: uppercase;
                    font-size: 8pt;
                    color: ${fontColor};
                }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .item-description {
                    font-weight: 500;
                }
                .item-details {
                    font-size: 8pt;
                    color: ${fontColor};
                    opacity: 0.7;
                    margin-top: 2px;
                }
                .item-measurements {
                    font-size: 8pt;
                    color: #059669;
                    font-style: italic;
                    margin-top: 2px;
                }
                
                .summary-section { 
                    margin-left: auto; 
                    width: 250px; 
                    margin-bottom: 15px; 
                }
                .summary-row { 
                    display: flex; 
                    justify-content: space-between; 
                    padding: 4px 0; 
                    border-bottom: 1px solid #e5e7eb; 
                    font-size: 9pt; 
                }
                .summary-row.total { 
                    font-weight: bold; 
                    font-size: 11pt; 
                    border-top: 2px solid ${fontColor}; 
                    border-bottom: 2px solid ${fontColor};
                    margin-top: 4px;
                    padding: 6px 0;
                }
                .summary-row-total {
                    font-weight: bold;
                    background-color: #f3f4f6;
                }
                .amount-words { 
                    font-size: 9pt; 
                    color: ${fontColor};
                    margin-bottom: 15px; 
                    font-style: italic; 
                    background: #f9fafb;
                    padding: 8px 12px;
                    border-left: 3px solid #3b82f6;
                }
                
                .notes-section { 
                    margin-top: 15px; 
                    padding: 10px; 
                    border: 1px solid #e5e7eb; 
                    font-size: 9pt;
                    background: #f9fafb;
                }
                .notes-title { 
                    font-weight: 600; 
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    font-size: 8pt;
                    color: ${fontColor};
                }
                .notes-content {
                    color: ${fontColor};
                    white-space: pre-line;
                }
                .terms-list {
                    margin: 0;
                    padding-left: 15px;
                }
                .terms-list li {
                    margin-bottom: 3px;
                }
                
                .signature-section { 
                    margin-top: 40px; 
                    display: flex; 
                    justify-content: space-between; 
                }
                .signature-box { 
                    text-align: center; 
                    width: 180px; 
                }
                ${signatureStyle}
                .signature-line { 
                    border-top: 1px solid ${fontColor}; 
                    margin-top: 35px; 
                    padding-top: 6px; 
                    font-size: 8pt;
                    color: ${fontColor};
                    opacity: 0.7;
                }
                
                .footer {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 10px 20px;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    font-size: 8pt;
                    color: ${fontColor};
                    opacity: 0.7;
                }

                /* First page only elements */
                @page :first {
                    @bottom-left {
                        content: "";
                    }
                    @bottom-right {
                        content: "";
                    }
                }
            </style>
        </head>
        <body>
            ${(includePad && padEnabled) ? `
            <div class="pad-background">
                <img src="${padImageUrl}" class="pad-image" alt="Company Pad" />
            </div>` : ''}
            <div class="doc-container">
                <div class="header">
                    <div class="company-name">${companyName}</div>
                    <div class="company-tagline">${companyTagline}</div>
                    <div class="company-address">Contact: ${companyPhone} | Email: ${companyEmail}</div>
                </div>

                <div class="doc-info">
                    <div class="doc-info-left">
                        <div class="info-row">
                            <span class="doc-no-small">Doc No: </span>
                            <strong>${docNumber}</strong>
                        </div>
                    </div>
                    <div class="doc-info-right">
                        <div class="info-row">
                            <span class="info-label"></span>
                            <strong>${formatDate(documentDate)}</strong>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Ref: </span>
                            <strong>${refNumber || 'N/A'}</strong>
                        </div>
                    </div>
                </div>

                <div class="doc-title">${titles[docType]}</div>

                <div class="customer-box">
                    <div class="customer-name">${job.customer?.name || job.customerName || 'N/A'}</div>
                    ${customerAddressLine1 ? `<div class="customer-address">${customerAddressLine1}</div>` : ''}
                    ${customerAddressLine2 ? `<div class="customer-address">${customerAddressLine2}</div>` : ''}
                    ${job.workLocation ? `<div class="customer-address">${job.workLocation}</div>` : ''}
                </div>

                ${job.jobDetail || job.subject ? `
                    <div class="subject-line">
                        <strong>Subject:</strong> ${subjectLine}
                    </div>
                ` : ''}

                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">Sl.</th>
                            <th>Work Details</th>
                            <th style="width: 100px;">Quantity</th>
                            ${showPricing ? `
                            <th style="width: 80px;">Unit Price</th>
                            <th style="width: 90px;">Total</th>
                            ` : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${job.items?.map((item: any, index: number) => `
                            <tr>
                                <td class="text-center">${index + 1}</td>
                                <td>
                                    <div class="item-description">${formatWorkDescription(item)}</div>
                                    ${item.details ? `<div class="item-details">${item.details}</div>` : ''}
                                    ${(item.measurements && item.measurements.length > 0) ? `
                                        <div class="item-measurements">
                                            ${item.measurements.map((m: any) =>
        `${(m.widthFeet || 0)}'${(m.widthInches || 0)}" × ${(m.heightFeet || 0)}'${(m.heightInches || 0)}" (${m.quantity} pcs) = ${(m.calculatedSqft || 0).toFixed(2)} sft`
    ).join('; ')}
                                        </div>
                                    ` : ''}
                                </td>
                                <td class="text-center">${formatQuantity(item)}</td>
                                ${showPricing ? `
                                <td class="text-right">${formatPrice(item.unitPrice)}</td>
                                <td class="text-right">${formatPrice(item.subtotal)}</td>
                                ` : ''}
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="text-center">No items</td></tr>'}
                    </tbody>
                </table>

                ${showPricing ? `
                <table>
                    <tr class="summary-row-total">
                        <td colspan="3" style="text-align: right; font-weight: bold;">Grand Total:</td>
                        <td style="text-align: right; font-weight: bold;">${formatCurrency(totalAmount)}</td>
                    </tr>
                </table>

                <div class="amount-words">
                    <strong>Amount in words:</strong> ${amountInWords}
                </div>
                ` : ''}

                ${job.notes || job.termsConditions ? `
                <div class="notes-section">
                    ${job.notes ? `
                        <div class="notes-title">Notes</div>
                        <div class="notes-content">${job.notes}</div>
                    ` : ''}
                    ${job.termsConditions ? `
                        <div class="notes-title" style="margin-top: ${job.notes ? '12px' : '0'}">Terms & Conditions</div>
                        <div class="notes-content">${job.termsConditions}</div>
                    ` : ''}
                </div>
                ` : ''}

                <div class="signature-section" style="margin-top: auto; padding-top: 40px;">
                    <div class="signature-box">
                        ${(includeSignature && signatureEnabled) ? `<img src="${signatureImageUrl}" class="signature-image" alt="Signature" style="height: 50px;" />` : '<div style="height: 50px;"></div>'}
                        <div class="signature-line">Received By</div>
                    </div>
                    <div class="signature-box">
                        ${(includeSignature && signatureEnabled) ? `<img src="${signatureImageUrl}" class="signature-image" alt="Signature" style="height: 50px;" />` : '<div style="height: 50px;"></div>'}
                        <div class="signature-line">Authorized Signatory</div>
                    </div>
                </div>

                <div class="footer">
                    <div style="text-align: left;">Doc No: ${docNumber}</div>
                    <div style="text-align: right;">This is a computer generated document. For any queries, please contact us at ${companyEmail}</div>
                </div>
            </div>
        </body>
        </html>
    `;

    return htmlContent;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { 
            jobId, 
            docType, 
            includePad = false, 
            includeSignature = false, 
            refNumber = '',
            // Allow per-request overrides
            fontFamily,
            fontSize,
            fontColor,
            topMargin,
            bottomMargin,
            companyName,
            companyTagline,
            companyEmail,
            companyPhone,
            padEnabled,
            padOpacity,
            padImageUrl,
            signatureEnabled,
            signatureWidth,
            signatureHeight,
            signatureImageUrl,
        } = body;

        if (!jobId || !docType) {
            return NextResponse.json({ error: 'Missing jobId or docType' }, { status: 400 });
        }

        // Fetch job with all related data
        const job = await prisma.job.findUnique({
            where: { id: Number(jobId) },
            include: {
                customer: true,
                items: {
                    include: {
                        measurements: true,
                    },
                },
            },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // Get customer address lines
        const customerAddressLine1 = job.customer?.addressLine1 || job.customer?.address || '';
        const customerAddressLine2 = job.customer?.addressLine2 || '';

        // Fetch settings from database
        const dbSettings = await getSettings();

        // Merge settings: database defaults + request overrides
        const settings = {
            // Font settings
            fontFamily: fontFamily ?? dbSettings.invoice?.fontFamily ?? 'Segoe UI',
            fontSize: fontSize ?? dbSettings.invoice?.fontSize ?? 11,
            fontColor: fontColor ?? dbSettings.invoice?.fontColor ?? '#1f2937',
            // Margin settings
            topMargin: topMargin ?? dbSettings.invoice?.topMargin ?? 20,
            bottomMargin: bottomMargin ?? dbSettings.invoice?.bottomMargin ?? 20,
            // Company settings
            companyName: companyName ?? dbSettings.company?.name ?? 'AMK Enterprise',
            companyTagline: companyTagline ?? dbSettings.company?.tagline ?? 'General Order & Supplier',
            companyEmail: companyEmail ?? dbSettings.company?.email ?? 'info@amkenterprise.com',
            companyPhone: companyPhone ?? dbSettings.company?.phone ?? '+880 2 222 111 333',
            // Pad settings
            padEnabled: padEnabled ?? dbSettings.pad?.enabled ?? false,
            padOpacity: padOpacity ?? dbSettings.pad?.opacity ?? 0.15,
            padImageUrl: padImageUrl ?? dbSettings.pad?.imageUrl ?? '/images/AMK_PAD_A4.png',
            // Signature settings
            signatureEnabled: signatureEnabled ?? dbSettings.signature?.enabled ?? false,
            signatureWidth: signatureWidth ?? dbSettings.signature?.width ?? 120,
            signatureHeight: signatureHeight ?? dbSettings.signature?.height ?? 60,
            signatureImageUrl: signatureImageUrl ?? dbSettings.signature?.imageUrl ?? '/images/Sig_Seal.png',
            // Date format settings
            dateFormat: {
                format: dbSettings.dateFormat?.format ?? 'BD',
                showPrefix: dbSettings.dateFormat?.showPrefix ?? true,
                prefixText: dbSettings.dateFormat?.prefixText ?? 'Date: ',
            },
        };

        // Generate PDF HTML content with settings
        const pdfHtml = await generatePdfHtml(
            job,
            { 
                docType, 
                includePad, 
                includeSignature, 
                refNumber: refNumber || job.refNumber,
                ...settings,
            },
            customerAddressLine1,
            customerAddressLine2,
            settings.dateFormat
        );

        // Return HTML with PDF content type for client-side PDF generation
        return new NextResponse(pdfHtml, {
            headers: {
                'Content-Type': 'text/html',
            },
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}
