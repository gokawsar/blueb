import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import ExcelJS from 'exceljs';

export const maxDuration = 60;

// Helper function to format date in MM/DD/YYYY format (hardcoded)
function formatDateMMDDYYYY(date: Date | string | null): string {
    if (!date) return '-';
    const d = new Date(date);
    // MM/DD/YYYY format
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

// GET - Export topsheet to Excel with A4 page layout
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

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Billing ERP';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Topsheet', {
            properties: {
                tabColor: { argb: '2176C8' },
            },
            pageSetup: {
                paperSize: 9, // A4 = 9
                orientation: 'portrait',
                margins: {
                    left: 0.5,
                    right: 0.5,
                    top: 0.5,
                    bottom: 0.5,
                    header: 0.3,
                    footer: 0.3,
                },
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                horizontalCentered: true,
                verticalCentered: false,
            },
        });

        // Date - Row 1 (right aligned, above title, no prefix, hardcoded MM/DD/YYYY format)
        const dateCell = worksheet.getCell('A1');
        // Hardcoded MM/DD/YYYY format for topsheet date
        const topsheetDate = new Date(topsheet.date);
        const formattedTopsheetDate = `${String(topsheetDate.getMonth() + 1).padStart(2, '0')}/${String(topsheetDate.getDate()).padStart(2, '0')}/${topsheetDate.getFullYear()}`;
        dateCell.value = formattedTopsheetDate;
        dateCell.font = {
            name: 'Calibri',
            size: 11,
            color: { argb: '1f2937' },
        };
        dateCell.alignment = { horizontal: 'right' };
        worksheet.mergeCells('A1:G1');

        // Header - Row 2 (Title)
        const titleCell = worksheet.getCell('A2');
        titleCell.value = 'Topsheet';
        titleCell.font = {
            name: 'Calibri',
            size: 18,
            bold: true,
            color: { argb: '000000' },
        };
        titleCell.alignment = { horizontal: 'center' };
        worksheet.mergeCells('A2:G2');

        // Customer Name - Row 3
        const customerNameCell = worksheet.getCell('A3');
        customerNameCell.value = topsheet.customerName || '';
        customerNameCell.font = {
            name: 'Calibri',
            size: 12,
            bold: true,
            color: { argb: '000000' },
        };
        worksheet.mergeCells('A3:G3');

        // Address Line 1 - Row 4
        const address1Cell = worksheet.getCell('A4');
        address1Cell.value = topsheet.customerAddress1 || '';
        address1Cell.font = {
            name: 'Calibri',
            size: 11,
            color: { argb: '333333' },
        };
        worksheet.mergeCells('A4:G4');

        // Address Line 2 - Row 5
        const address2Cell = worksheet.getCell('A5');
        address2Cell.value = topsheet.customerAddress2 || '';
        address2Cell.font = {
            name: 'Calibri',
            size: 11,
            color: { argb: '333333' },
        };
        worksheet.mergeCells('A5:G5');

        // Empty row 6

        // Subject line - Row 7
        const subjectCell = worksheet.getCell('A7');
        subjectCell.value = `Subject: Topsheet of workings at different places ${topsheet.customerName}`;
        subjectCell.font = {
            name: 'Calibri',
            size: 12,
            bold: true,
            color: { argb: '000000' },
        };
        worksheet.mergeCells('A7:G7');

        // Empty row 8

        // Table header - Row 9
        const headerRow = worksheet.getRow(9);
        headerRow.values = ['Sl.', 'Work Details', 'Work Location', 'Bill No.', 'Challan Date', 'Total', 'BBL Bill No.'];
        headerRow.font = {
            name: 'Calibri',
            size: 11,
            bold: true,
            color: { argb: '1F2937' },
        };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '20dce5' },
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 25;

        // Set column widths
        worksheet.getColumn(1).width = 8;   // Sl.
        worksheet.getColumn(2).width = 50;  // Work Details
        worksheet.getColumn(3).width = 35;   // Work Location
        worksheet.getColumn(4).width = 15;   // Bill No.
        worksheet.getColumn(5).width = 12;   // Challan Date (75 pixels approx = 12 characters width)
        worksheet.getColumn(6).width = 15;    // Total
        worksheet.getColumn(7).width = 15;   // BBL Bill No.

        // Data rows
        let totalAmount = 0;
        let rowNum = 10;  // Data starts at row 10 (header is at row 9)

        for (let i = 0; i < topsheet.jobs.length; i++) {
            const job = topsheet.jobs[i];
            
            // Recalculate job total from items if available
            let jobTotal = 0;
            if (job.items && job.items.length > 0) {
                jobTotal = job.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
            } else {
                jobTotal = Number(job.totalAmount) || 0;
            }
            totalAmount += jobTotal;

            // Format Challan Date in MM/DD/YYYY format
            const challanDateStr = formatDateMMDDYYYY(job.challanDate);

            const row = worksheet.getRow(rowNum);
            row.values = [
                i + 1,
                job.jobDetail || job.subject || '-',
                job.workLocation || '-',
                job.refNumber || '-',
                challanDateStr,
                jobTotal,
                job.bblBillNumber || ' '
            ];

            // Style data cells
            row.font = { name: 'Calibri', size: 10 };
            row.alignment = { vertical: 'middle' };

            // Number columns alignment
            worksheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center' };
            worksheet.getCell(`F${rowNum}`).alignment = { horizontal: 'right' };

            rowNum++;
        }

        // Total row (no blank row before total)
        const totalRow = worksheet.getRow(rowNum);
        totalRow.values = ['Total:', '', '', '', '', totalAmount, ''];
        totalRow.font = {
            name: 'Calibri',
            size: 11,
            bold: true,
            color: { argb: '000000' },
        };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E6F2FF' },
        };
        totalRow.alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`F${rowNum}`).numFmt = '#,##0.00';

        // Add borders to total row
        ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
            worksheet.getCell(`${col}${rowNum}`).border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } },
            };
        });

        // Blank row before In-words
        rowNum++;

        // Amount in words
        const amountInWords = convertNumberToWords(totalAmount);
        const wordsRow = worksheet.getRow(rowNum);
        wordsRow.getCell(1).value = `In-words: ${amountInWords}`;
        wordsRow.getCell(1).font = {
            name: 'Calibri',
            size: 10,
            bold: true,
            italic: true,
        };
        worksheet.mergeCells(`A${rowNum}:G${rowNum}`);

        // Blank row after In-words
        rowNum++;

        // Add signature section
        const signatureRow1 = worksheet.getRow(rowNum);
        signatureRow1.getCell(1).value = 'Prepared By:';
        signatureRow1.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
        worksheet.mergeCells(`A${rowNum}:C${rowNum}`);

        signatureRow1.getCell(4).value = 'Checked By:';
        signatureRow1.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
        worksheet.mergeCells(`D${rowNum}:G${rowNum}`);

        rowNum++;

        const signatureRow2 = worksheet.getRow(rowNum);
        signatureRow2.getCell(1).value = 'Name:';
        signatureRow2.getCell(1).font = { name: 'Calibri', size: 10 };
        worksheet.mergeCells(`A${rowNum}:C${rowNum}`);

        signatureRow2.getCell(4).value = 'Name:';
        signatureRow2.getCell(4).font = { name: 'Calibri', size: 10 };
        worksheet.mergeCells(`D${rowNum}:G${rowNum}`);

        rowNum++;

        const signatureRow3 = worksheet.getRow(rowNum);
        signatureRow3.getCell(1).value = 'Signature:';
        signatureRow3.getCell(1).font = { name: 'Calibri', size: 10 };
        worksheet.mergeCells(`A${rowNum}:C${rowNum}`);

        signatureRow3.getCell(4).value = 'Signature:';
        signatureRow3.getCell(4).font = { name: 'Calibri', size: 10 };
        worksheet.mergeCells(`D${rowNum}:G${rowNum}`);

        // Add borders to table header row (row 9)
        ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
            worksheet.getCell(`${col}9`).border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } },
            };
        });

        // Add borders to data rows (table body only, excluding In-words and signature rows)
        // Table ends at Total row, so we stop borders before the In-words row
        const tableEndRow = rowNum - 3; // Total row is at rowNum - 3 after adding rowNum++ for blank before In-words
        for (let i = 10; i <= tableEndRow; i++) {
            ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
                worksheet.getCell(`${col}${i}`).border = {
                    top: { style: 'thin', color: { argb: '000000' } },
                    left: { style: 'thin', color: { argb: '000000' } },
                    bottom: { style: 'thin', color: { argb: '000000' } },
                    right: { style: 'thin', color: { argb: '000000' } },
                };
            });
        }

        // Add print titles (repeat header on each page)
        worksheet.pageSetup.printTitlesRow = '1:9';

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Return the Excel file
        return new NextResponse(buffer as unknown as Blob, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Topsheet-${topsheet.topsheetNumber}.xlsx"`,
            },
        });
    } catch (error) {
        console.error('Error exporting topsheet:', error);
        return NextResponse.json({ success: false, error: 'Failed to export topsheet' }, { status: 500 });
    }
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
