import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { formatCurrency, numberToWords } from '@/lib/utils';
import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    Table, 
    TableRow, 
    TableCell, 
    WidthType, 
    AlignmentType,
    BorderStyle,
    HeadingLevel,
    VerticalAlign
} from 'docx';

interface DocumentOptions {
    docType: 'quotation' | 'challan' | 'bill';
    includePad: boolean;
    includeSignature: boolean;
    refNumber: string;
    fontFamily?: string;
    fontSize?: number;
    fontColor?: string;
    topMargin?: number;
    bottomMargin?: number;
    companyName?: string;
    companyTagline?: string;
    companyEmail?: string;
    companyPhone?: string;
    padEnabled?: boolean;
    padOpacity?: number;
    padImageUrl?: string;
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

// Helper to convert hex color to RGB
function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        red: parseInt(result[1], 16) / 255,
        green: parseInt(result[2], 16) / 255,
        blue: parseInt(result[3], 16) / 255,
    } : { red: 0, green: 0, blue: 0 };
}

async function generateDocxDocument(
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
    const colorRgb = hexToRgb(fontColor);

    // Build document children
    const children: any[] = [];

    // Header - Company Name
    children.push(
        new Paragraph({
            text: companyName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({
                    text: companyName,
                    bold: true,
                    size: 44, // 22pt
                    font: fontFamily,
                    color: fontColor,
                }),
            ],
        })
    );

    // Company Tagline
    children.push(
        new Paragraph({
            text: companyTagline,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({
                    text: companyTagline,
                    size: 18, // 9pt
                    font: fontFamily,
                    color: fontColor,
                }),
            ],
        })
    );

    // Contact Info
    children.push(
        new Paragraph({
            text: `Contact: ${companyPhone} | Email: ${companyEmail}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200, before: 100 },
            children: [
                new TextRun({
                    text: `Contact: ${companyPhone} | Email: ${companyEmail}`,
                    size: 16, // 8pt
                    font: fontFamily,
                    color: fontColor,
                }),
            ],
        })
    );

    // Divider line
    children.push(
        new Paragraph({
            text: '',
            border: {
                bottom: {
                    color: fontColor,
                    space: 0,
                    style: BorderStyle.SINGLE,
                    size: 6,
                },
            },
            spacing: { after: 200 },
        })
    );

    // Document Info Row
    children.push(
        new Table({
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `Doc No: `,
                                            size: 16, // 8pt
                                            font: fontFamily,
                                            color: '666666',
                                        }),
                                        new TextRun({
                                            text: docNumber,
                                            bold: true,
                                            size: 16, // 8pt
                                            font: fontFamily,
                                            color: fontColor,
                                        }),
                                    ],
                                }),
                            ],
                            width: { size: 50, type: WidthType.PERCENTAGE },
                        }),
                        new TableCell({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                        new TextRun({
                                            text: formatDate(documentDate),
                                            bold: true,
                                            size: 18, // 9pt
                                            font: fontFamily,
                                            color: fontColor,
                                        }),
                                    ],
                                }),
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                        new TextRun({
                                            text: `Ref: ${refNumber || 'N/A'}`,
                                            bold: true,
                                            size: 18, // 9pt
                                            font: fontFamily,
                                            color: fontColor,
                                        }),
                                    ],
                                }),
                            ],
                            width: { size: 50, type: WidthType.PERCENTAGE },
                        }),
                    ],
                }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
        })
    );

    // Document Title
    children.push(
        new Paragraph({
            text: titles[docType],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300, before: 200 },
            children: [
                new TextRun({
                    text: titles[docType],
                    bold: true,
                    size: 28, // 14pt
                    font: fontFamily,
                    color: fontColor,
                    allCaps: true,
                }),
            ],
        })
    );

    // Customer Box
    const customerName = job.customer?.name || job.customerName || 'N/A';
    children.push(
        new Table({
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [
                                new Paragraph({
                                    text: 'Bill To:',
                                    spacing: { after: 50 },
                                    children: [
                                        new TextRun({
                                            text: 'Bill To:',
                                            size: 16, // 8pt
                                            font: fontFamily,
                                            color: '666666',
                                            allCaps: true,
                                        }),
                                    ],
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: customerName,
                                            bold: true,
                                            size: 22, // 11pt
                                            font: fontFamily,
                                            color: fontColor,
                                        }),
                                    ],
                                }),
                                ...(customerAddressLine1 ? [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: customerAddressLine1,
                                            size: 18, // 9pt
                                            font: fontFamily,
                                            color: '666666',
                                        }),
                                    ],
                                })] : []),
                                ...(customerAddressLine2 ? [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: customerAddressLine2,
                                            size: 18, // 9pt
                                            font: fontFamily,
                                            color: '666666',
                                        }),
                                    ],
                                })] : []),
                                ...(job.workLocation ? [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: job.workLocation,
                                            size: 18, // 9pt
                                            font: fontFamily,
                                            color: '666666',
                                        }),
                                    ],
                                })] : []),
                            ],
                            shading: {
                                fill: 'F3F4F6',
                            },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                                left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                                right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                            },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 },
                            width: { size: 100, type: WidthType.PERCENTAGE },
                        }),
                    ],
                }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
        })
    );

    // Subject Line
    if (job.jobDetail || job.subject) {
        children.push(
            new Paragraph({
                text: subjectLine,
                spacing: { after: 200 },
                children: [
                    new TextRun({
                        text: `Subject: ${subjectLine}`,
                        size: 18, // 9pt
                        font: fontFamily,
                        color: fontColor,
                    }),
                ],
                border: {
                    left: {
                        color: '3B82F6',
                        space: 4,
                        style: BorderStyle.SINGLE,
                        size: 4,
                    },
                },
            })
        );
    }

    // Items Table Header
    const tableHeaders = [
        new TableCell({
            children: [
                new Paragraph({
                    text: 'Sl.',
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: 'Sl.',
                            bold: true,
                            size: 16, // 8pt
                            font: fontFamily,
                            color: fontColor,
                        }),
                    ],
                }),
            ],
            width: { size: 5, type: WidthType.PERCENTAGE },
            shading: { fill: 'F3F4F6' },
            verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
            children: [
                new Paragraph({
                    text: 'Work Details',
                    children: [
                        new TextRun({
                            text: 'Work Details',
                            bold: true,
                            size: 16, // 8pt
                            font: fontFamily,
                            color: fontColor,
                        }),
                    ],
                }),
            ],
            width: { size: 45, type: WidthType.PERCENTAGE },
            shading: { fill: 'F3F4F6' },
            verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
            children: [
                new Paragraph({
                    text: 'Quantity',
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: 'Quantity',
                            bold: true,
                            size: 16, // 8pt
                            font: fontFamily,
                            color: fontColor,
                        }),
                    ],
                }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: 'F3F4F6' },
            verticalAlign: VerticalAlign.CENTER,
        }),
    ];

    if (showPricing) {
        tableHeaders.push(
            new TableCell({
                children: [
                    new Paragraph({
                        text: 'Unit Price',
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({
                                text: 'Unit Price',
                                bold: true,
                                size: 16, // 8pt
                                font: fontFamily,
                                color: fontColor,
                            }),
                        ],
                    }),
                ],
                width: { size: 15, type: WidthType.PERCENTAGE },
                shading: { fill: 'F3F4F6' },
                verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
                children: [
                    new Paragraph({
                        text: 'Total',
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({
                                text: 'Total',
                                bold: true,
                                size: 16, // 8pt
                                font: fontFamily,
                                color: fontColor,
                            }),
                        ],
                    }),
                ],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: 'F3F4F6' },
                verticalAlign: VerticalAlign.CENTER,
            })
        );
    }

    // Items Table Rows
    const tableRows: TableRow[] = [
        new TableRow({
            children: tableHeaders,
        }),
    ];

    // Add item rows
    if (job.items && job.items.length > 0) {
        job.items.forEach((item: any, index: number) => {
            const rowCells = [
                new TableCell({
                    children: [
                        new Paragraph({
                            text: String(index + 1),
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: String(index + 1),
                                    size: 18, // 9pt
                                    font: fontFamily,
                                    color: fontColor,
                                }),
                            ],
                        }),
                    ],
                    width: { size: 5, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                }),
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: formatWorkDescription(item),
                                    bold: true,
                                    size: 18, // 9pt
                                    font: fontFamily,
                                    color: fontColor,
                                }),
                            ],
                        }),
                        ...(item.details ? [new Paragraph({
                            children: [
                                new TextRun({
                                    text: item.details,
                                    size: 16, // 8pt
                                    font: fontFamily,
                                    color: '666666',
                                }),
                            ],
                        })] : []),
                    ],
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                }),
                new TableCell({
                    children: [
                        new Paragraph({
                            text: formatQuantity(item),
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: formatQuantity(item),
                                    size: 18, // 9pt
                                    font: fontFamily,
                                    color: fontColor,
                                }),
                            ],
                        }),
                    ],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                }),
            ];

            if (showPricing) {
                rowCells.push(
                    new TableCell({
                        children: [
                            new Paragraph({
                                text: formatPrice(item.unitPrice),
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: formatPrice(item.unitPrice),
                                        size: 18, // 9pt
                                        font: fontFamily,
                                        color: fontColor,
                                    }),
                                ],
                            }),
                        ],
                        width: { size: 15, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                text: formatPrice(item.subtotal),
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: formatPrice(item.subtotal),
                                        size: 18, // 9pt
                                        font: fontFamily,
                                        color: fontColor,
                                    }),
                                ],
                            }),
                        ],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                    })
                );
            }

            tableRows.push(new TableRow({ children: rowCells }));
        });
    }

    // Total Row
    if (showPricing) {
        const totalCells = [
            new TableCell({
                children: [
                    new Paragraph({
                        text: '',
                    }),
                ],
                width: { size: 65, type: WidthType.PERCENTAGE },
                shading: { fill: 'E6F2FF' },
            }),
            new TableCell({
                children: [
                    new Paragraph({
                        text: 'Grand Total:',
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({
                                text: 'Grand Total:',
                                bold: true,
                                size: 20, // 10pt
                                font: fontFamily,
                                color: fontColor,
                            }),
                        ],
                    }),
                ],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: 'E6F2FF' },
                verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
                children: [
                    new Paragraph({
                        text: formatCurrency(totalAmount),
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({
                                text: formatCurrency(totalAmount),
                                bold: true,
                                size: 20, // 10pt
                                font: fontFamily,
                                color: fontColor,
                            }),
                        ],
                    }),
                ],
                width: { size: 15, type: WidthType.PERCENTAGE },
                shading: { fill: 'E6F2FF' },
                verticalAlign: VerticalAlign.CENTER,
            }),
        ];
        tableRows.push(new TableRow({ children: totalCells }));
    }

    children.push(
        new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
        })
    );

    // Amount in Words
    if (showPricing) {
        children.push(
            new Paragraph({
                text: `Amount in words: ${amountInWords}`,
                spacing: { after: 200, before: 100 },
                children: [
                    new TextRun({
                        text: `Amount in words: ${amountInWords}`,
                        italics: true,
                        size: 18, // 9pt
                        font: fontFamily,
                        color: fontColor,
                    }),
                ],
                border: {
                    left: {
                        color: '3B82F6',
                        space: 4,
                        style: BorderStyle.SINGLE,
                        size: 4,
                    },
                },
            })
        );
    }

    // Notes and Terms
    if (job.notes || job.termsConditions) {
        if (job.notes) {
            children.push(
                new Paragraph({
                    text: 'Notes',
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: 'Notes',
                            bold: true,
                            size: 16, // 8pt
                            font: fontFamily,
                            color: fontColor,
                            allCaps: true,
                        }),
                    ],
                })
            );
            children.push(
                new Paragraph({
                    text: job.notes,
                    spacing: { after: 150 },
                    children: [
                        new TextRun({
                            text: job.notes,
                            size: 18, // 9pt
                            font: fontFamily,
                            color: fontColor,
                        }),
                    ],
                })
            );
        }

        if (job.termsConditions) {
            children.push(
                new Paragraph({
                    text: 'Terms & Conditions',
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: 'Terms & Conditions',
                            bold: true,
                            size: 16, // 8pt
                            font: fontFamily,
                            color: fontColor,
                            allCaps: true,
                        }),
                    ],
                })
            );
            children.push(
                new Paragraph({
                    text: job.termsConditions,
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: job.termsConditions,
                            size: 18, // 9pt
                            font: fontFamily,
                            color: fontColor,
                        }),
                    ],
                })
            );
        }
    }

    // Signature Section
    children.push(
        new Table({
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    text: '',
                                    spacing: { after: 400 },
                                }),
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: [
                                        new TextRun({
                                            text: 'Received By',
                                            size: 18, // 9pt
                                            font: fontFamily,
                                            color: fontColor,
                                        }),
                                    ],
                                }),
                            ],
                            width: { size: 50, type: WidthType.PERCENTAGE },
                        }),
                        new TableCell({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    text: '',
                                    spacing: { after: 400 },
                                }),
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: [
                                        new TextRun({
                                            text: 'Authorized Signatory',
                                            size: 18, // 9pt
                                            font: fontFamily,
                                            color: fontColor,
                                        }),
                                    ],
                                }),
                            ],
                            width: { size: 50, type: WidthType.PERCENTAGE },
                        }),
                    ],
                }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
        })
    );

    // Create document
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: topMargin * 10, // Convert mm to twips (approx)
                        right: 1440, // 0.5in
                        bottom: bottomMargin * 10,
                        left: 1440, // 0.5in
                    },
                    size: {
                        width: 12240, // A4 width in twips
                        height: 15840, // A4 height in twips
                    },
                },
            },
            children: children,
        }],
    });

    return doc;
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
            fontFamily: fontFamily ?? dbSettings.invoice?.fontFamily ?? 'Segoe UI',
            fontSize: fontSize ?? dbSettings.invoice?.fontSize ?? 11,
            fontColor: fontColor ?? dbSettings.invoice?.fontColor ?? '#1f2937',
            topMargin: topMargin ?? dbSettings.invoice?.topMargin ?? 20,
            bottomMargin: bottomMargin ?? dbSettings.invoice?.bottomMargin ?? 20,
            companyName: companyName ?? dbSettings.company?.name ?? 'AMK Enterprise',
            companyTagline: companyTagline ?? dbSettings.company?.tagline ?? 'General Order & Supplier',
            companyEmail: companyEmail ?? dbSettings.company?.email ?? 'info@amkenterprise.com',
            companyPhone: companyPhone ?? dbSettings.company?.phone ?? '+880 2 222 111 333',
            padEnabled: padEnabled ?? dbSettings.pad?.enabled ?? false,
            padOpacity: padOpacity ?? dbSettings.pad?.opacity ?? 0.15,
            padImageUrl: padImageUrl ?? dbSettings.pad?.imageUrl ?? '/images/AMK_PAD_A4.png',
            signatureEnabled: signatureEnabled ?? dbSettings.signature?.enabled ?? false,
            signatureWidth: signatureWidth ?? dbSettings.signature?.width ?? 120,
            signatureHeight: signatureHeight ?? dbSettings.signature?.height ?? 60,
            signatureImageUrl: signatureImageUrl ?? dbSettings.signature?.imageUrl ?? '/images/Sig_Seal.png',
            dateFormat: {
                format: dbSettings.dateFormat?.format ?? 'BD',
                showPrefix: dbSettings.dateFormat?.showPrefix ?? true,
                prefixText: dbSettings.dateFormat?.prefixText ?? 'Date: ',
            },
        };

        // Generate DOCX document with settings
        const doc = await generateDocxDocument(
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

        // Generate buffer
        const buffer = await Packer.toBuffer(doc);

        // Return as downloadable file
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${docType}_${job.refNumber || job.id}.docx"`,
            },
        });
    } catch (error) {
        console.error('Error generating DOCX:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
