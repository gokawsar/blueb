'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Job, JobItem, Measurement } from '@/lib/types';
import { formatCurrency, numberToWords } from '@/lib/utils';
import { useSettings } from '@/lib/settingsContext';
import { generatePDFBlob } from '@/components/jobs/DocumentPDF';

export default function JobDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const jobId = params.id ? parseInt(params.id as string) : null;

    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
    // Separate pad/signature states for each document type
    const [includePadQuotation, setIncludePadQuotation] = useState(false);
    const [includeSignatureQuotation, setIncludeSignatureQuotation] = useState(false);
    const [includePadChallan, setIncludePadChallan] = useState(false);
    const [includeSignatureChallan, setIncludeSignatureChallan] = useState(false);
    const [includePadBill, setIncludePadBill] = useState(false);
    const [includeSignatureBill, setIncludeSignatureBill] = useState(false);
    const { settings } = useSettings();

    const quotationRef = useRef<HTMLDivElement>(null);
    const challanRef = useRef<HTMLDivElement>(null);
    const billRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (jobId) {
            fetchJob();
        }
    }, [jobId]);

    const fetchJob = async () => {
        try {
            const response = await fetch(`/api/jobs?id=${jobId}`);
            const result = await response.json();

            if (result.success && result.data) {
                setJob(result.data);
            } else {
                alert('Job not found');
                router.push('/jobs');
            }
        } catch (error) {
            console.error('Error fetching job:', error);
            alert('Failed to load job');
            router.push('/jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        router.push(`/jobs/edit/${jobId}`);
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/jobs?id=${jobId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (result.success) {
                alert('Job deleted successfully');
                router.push('/jobs');
            } else {
                alert('Failed to delete job: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        }
    };

    // Calculate totals
    const subtotal = job?.items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
    const discountAmount = subtotal * ((job?.discountPercent || 0) / 100);
    const totalAmount = subtotal - discountAmount;
    const amountInWords = numberToWords(totalAmount);

    // Format date for documents
    const formatDate = (date: string | Date | null | undefined) => {
        if (!date) return 'N/A';
        
        // Get date format settings
        const dateFormat = settings?.dateFormat?.format || 'BD';
        const showPrefix = settings?.dateFormat?.showPrefix ?? true;
        const prefixText = settings?.dateFormat?.prefixText || 'Date: ';
        
        const d = new Date(date);
        let formattedDate: string;
        
        if (dateFormat === 'US') {
            formattedDate = d.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
            });
        } else {
            formattedDate = d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        }
        
        return showPrefix ? `${prefixText}${formattedDate}` : formattedDate;
    };

    // Download DOCX
    const downloadDocx = async (docType: 'quotation' | 'challan' | 'bill', includePad: boolean, includeSignature: boolean) => {
        if (!job) return;
        setDownloadingDoc(docType);

        try {
            const response = await fetch('/api/documents/docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: job.id,
                    docType,
                    includePad,
                    includeSignature,
                    refNumber: job.refNumber
                }),
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${docType}_${job.refNumber || job.id}.doc`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Failed to generate DOCX');
            }
        } catch (error) {
            console.error('Error downloading DOCX:', error);
            alert('Failed to download DOCX');
        } finally {
            setDownloadingDoc(null);
        }
    };

    // Download PDF - Uses @react-pdf/renderer for selectable text
    const downloadPdf = async (docType: 'quotation' | 'challan' | 'bill', includePad: boolean, includeSignature: boolean) => {
        if (!job) return;
        setDownloadingDoc(docType);

        try {
            // Get the appropriate date for this document type
            const docDates = {
                quotation: job.quotationDate,
                challan: job.challanDate,
                bill: job.billDate
            };
            const showDate = docDates[docType];
            
            // Prepare settings for PDF
            const pdfSettings = {
                company: {
                    name: settings?.company?.name || 'AMK Enterprise',
                    tagline: settings?.company?.tagline || 'General Order & Supplier',
                    email: settings?.company?.email || 'info@amkenterprise.com',
                    phone: settings?.company?.phone || '+880 2 222 111 333',
                },
                invoice: settings?.invoice || {},
                signature: {
                    enabled: includeSignature,
                    imageUrl: '/images/Sig_Seal.png',
                    size: settings?.signature?.size || 60,
                },
                dateFormat: {
                    format: settings?.dateFormat?.format || 'BD',
                    showPrefix: settings?.dateFormat?.showPrefix ?? true,
                    prefixText: settings?.dateFormat?.prefixText || 'Date: ',
                },
            };
            
            // Generate PDF using @react-pdf/renderer
            const blob = await generatePDFBlob(job, docType, {
                showDate: showDate ? String(showDate) : null,
                includePad,
                includeSignature,
                settings: pdfSettings,
            });
            
            // Download the blob
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${docType}_${job.refNumber || job.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF');
        } finally {
            setDownloadingDoc(null);
        }
    };

    // Print document - Opens print dialog with properly styled content
    const printDocument = (docType: 'quotation' | 'challan' | 'bill', includePad: boolean = false, includeSignature: boolean = false) => {
        const refs = {
            quotation: quotationRef,
            challan: challanRef,
            bill: billRef,
        };

        const content = refs[docType].current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the document');
            return;
        }

        const topMargin = settings?.invoice?.topMargin || 20;
        const bottomMargin = settings?.invoice?.bottomMargin || 20;
        const fontFamily = settings?.invoice?.fontFamily || 'Segoe UI';
        const fontSize = settings?.invoice?.fontSize || 12;
        const fontColor = settings?.invoice?.fontColor || '#1f2937';
        
        // Build inline styles - use the exact same approach as preview
        const padStyle = includePad ? `
            background-image: url('/images/AMK_PAD_A4.png');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
        ` : '';

        // Get the inner HTML content
        const innerContent = content.innerHTML;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${docType.charAt(0).toUpperCase() + docType.slice(1)} - ${job?.refNumber || job?.id}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    html, body {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0;
                        padding: 0;
                    }
                    body { 
                        font-family: '${fontFamily}', Tahoma, Geneva, Verdana, sans-serif; 
                        font-size: ${fontSize}px; 
                        line-height: 1.5; 
                        color: ${fontColor}; 
                        padding: ${topMargin}mm 20mm ${bottomMargin}mm 20mm; 
                        background: white;
                        ${padStyle}
                    }
                    .doc-container { 
                        width: 100%; 
                        max-width: 100%;
                        position: relative;
                        z-index: 1;
                    }
                    .doc-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid ${fontColor}; padding-bottom: 15px; }
                    .company-name { font-size: 22px; font-weight: bold; color: ${fontColor}; margin-bottom: 4px; }
                    .company-tagline { font-size: 11px; color: ${fontColor}; opacity: 0.7; margin-bottom: 8px; }
                    .company-address { font-size: 10px; color: ${fontColor}; opacity: 0.7; }
                    .doc-title { font-size: 18px; font-weight: bold; color: ${fontColor}; text-align: center; text-transform: uppercase; letter-spacing: 2px; }
                    .doc-info { display: flex; justify-content: space-between; margin-bottom: 15px; }
                    .doc-info-left, .doc-info-right { font-size: 11px; }
                    .doc-info-row { margin-bottom: 4px; }
                    .doc-info-label { color: ${fontColor}; opacity: 0.7; }
                    .doc-info-value { font-weight: 500; }
                    .customer-box { border: 0px solid #ffffffff; padding: 12px; margin-bottom: 15px; background: #f9fafb; }
                    .customer-label { font-size: 10px; color: ${fontColor}; text-transform: uppercase; margin-bottom: 4px; opacity: 0.7; }
                    .customer-name { font-size: 13px; font-weight: 600; }
                    .customer-address { font-size: 11px; color: ${fontColor}; opacity: 0.7; margin-top: 2px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 10px; vertical-align: top; line-height: 1.4; }
                    th { background: #f3f4f6; font-weight: 600; text-transform: uppercase; font-size: 9px; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .text-xs { font-size: 10px; }
                    .text-sm { font-size: 11px; }
                    .font-medium { font-weight: 500; }
                    .font-bold { font-weight: 700; }
                    .font-semibold { font-weight: 600; }
                    .italic { font-style: italic; }
                    .uppercase { text-transform: uppercase; }
                    .flex { display: flex; }
                    .flex-col { flex-direction: column; }
                    .justify-between { justify-content: space-between; }
                    .justify-end { justify-content: flex-end; }
                    .items-center { align-items: center; }
                    .w-40 { width: 160px; }
                    .w-48 { width: 192px; }
                    .w-8 { width: 32px; }
                    .w-20 { width: 80px; }
                    .w-24 { width: 96px; }
                    .h-16 { height: 64px; }
                    .p-2 { padding: 8px; }
                    .p-3 { padding: 12px; }
                    .py-2 { padding-top: 8px; padding-bottom: 8px; }
                    .pt-2 { padding-top: 8px; }
                    .pt-4 { padding-top: 16px; }
                    .px-2 { padding-left: 8px; padding-right: 8px; }
                    .mb-2 { margin-bottom: 8px; }
                    .mb-4 { margin-bottom: 16px; }
                    .mb-6 { margin-bottom: 24px; }
                    .mt-12 { margin-top: 48px; }
                    .mt-auto { margin-top: auto; }
                    .ml-auto { margin-left: auto; }
                    .mx-auto { margin-left: auto; margin-right: auto; }
                    .border { border-width: 1px; }
                    .border-2 { border-width: 2px; }
                    .border-t { border-top-width: 1px; }
                    .border-t-2 { border-top-width: 2px; }
                    .border-b-2 { border-bottom-width: 2px; }
                    .border-l-4 { border-left-width: 4px; }
                    .border-gray-300 { border-color: #d1d5db; }
                    .border-gray-800 { border-color: #1f2937; }
                    .border-blue-500 { border-color: #3b82f6; }
                    .bg-gray-50 { background-color: #f9fafb; }
                    .bg-gray-100 { background-color: #f3f4f6; }
                    .bg-white { background-color: white; }
                    .text-gray-500 { color: #6b7280; }
                    .text-gray-600 { color: #4b5563; }
                    .text-gray-900 { color: #111827; }
                    .text-green-600 { color: #059669; }
                    .bg-green-600 { background-color: #059669; }
                    .object-contain { object-fit: contain; }
                    .summary-section { margin-left: auto; width: 250px; margin-bottom: 15px; }
                    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
                    .summary-row.total { font-weight: bold; font-size: 13px; border-bottom: 2px solid #1f2937; }
                    .amount-words { font-size: 10px; color: ${fontColor}; margin-bottom: 15px; font-style: italic; background: #f9fafb; padding: 8px 12px; border-left: 3px solid #3b82f6; }
                    .notes-section { margin-top: 15px; padding: 12px; border: 1px solid #e5e7eb; font-size: 10px; background: #f9fafb; }
                    .notes-title { font-weight: 600; margin-bottom: 6px; text-transform: uppercase; font-size: 9px; }
                    .notes-content { white-space: pre-line; }
                    .terms-list { margin: 0; padding-left: 16px; }
                    .terms-list li { margin-bottom: 4px; }
                    .signature-section { margin-top: 40px; padding-top: 20px; display: flex; justify-content: space-between; position: relative; z-index: 1; }
                    .signature-box { text-align: center; width: 180px; }
                    .signature-line { border-top: 1px solid ${fontColor}; margin-top: 35px; padding-top: 6px; font-size: 9px; color: ${fontColor}; opacity: 0.7; }
                    .doc-footer { margin-top: auto; padding-top: 15px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 9px; color: ${fontColor}; opacity: 0.7; position: relative; z-index: 1; }
                    @media print {
                        body { 
                            padding: ${topMargin}mm 20mm ${bottomMargin}mm 20mm; 
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        @page { margin: 0; size: A4; }
                    }
                </style>
            </head>
            <body>
                <div class="doc-container">
                    ${innerContent}
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    // Document Preview Component
    const DocumentPreview = ({
        type,
        title,
        refEl,
        showDate,
        includePad,
        setIncludePad,
        includeSignature,
        setIncludeSignature
    }: {
        type: 'quotation' | 'challan' | 'bill';
        title: string;
        refEl: React.RefObject<HTMLDivElement>;
        showDate: string | null;
        includePad: boolean;
        setIncludePad: (value: boolean) => void;
        includeSignature: boolean;
        setIncludeSignature: (value: boolean) => void;
    }) => {
        const docNumberPrefix = {
            quotation: 'QT',
            challan: 'CH',
            bill: 'INV'
        };

        // Generate document number with date
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const day = String(new Date().getDate()).padStart(2, '0');
        const docNumber = `${docNumberPrefix[type]}-${year}-${month}${day}`;

        // Determine if we show pricing columns (not for Challan)
        const showPricing = type !== 'challan';

        // Get customer address
        const customerAddressLine1 = job?.customer?.addressLine1 || job?.customer?.address || '';
        const customerAddressLine2 = job?.customer?.addressLine2 || '';

        // Subject line format
        const subjectLine = `${title} for ${job?.jobDetail || job?.subject || 'N/A'} at ${job?.customer?.name || 'N/A'}, ${job?.workLocation || ''}`;

        return (
            <div className="mb-8">
                {/* Document Options Bar */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-blue-200 dark:border-gray-600 p-4 mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Document Options</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={includePad}
                                        onChange={(e) => setIncludePad(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    📋 Include Pad
                                </span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={includeSignature}
                                        onChange={(e) => setIncludeSignature(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    ✍️ Include Signature
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Document Preview Frame - No border for clean document */}
                <div
                    ref={refEl}
                    className="bg-white text-gray-900 max-w-[210mm] mx-auto"
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        aspectRatio: '210/297',
                        backgroundImage: includePad ? 'url(/images/AMK_PAD_A4.png)' : 'none',
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        padding: '0',
                        fontFamily: settings?.invoice?.fontFamily || 'Segoe UI',
                        fontSize: `${settings?.invoice?.fontSize || 12}px`,
                        color: settings?.invoice?.fontColor || '#1f2937',
                        position: 'relative',
                    }}
                >
                    {/* Document Content with proper margins */}
                    <div style={{ 
                        padding: `${settings?.invoice?.topMargin || 20}mm 20mm ${settings?.invoice?.bottomMargin || 20}mm 20mm`,
                        position: 'relative',
                        zIndex: 1,
                    }}>

                    {/* Ref Number (Left) and Date (Right) - Above Title */}
                    <div className="flex justify-between mb-4 text-xs">
                        <div>
                            <p className="font-medium">Ref: {job?.refNumber || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(showDate || job?.date)}</span></p>
                        </div>
                    </div>

                    {/* Document Title */}
                    <h2 className="text-lg font-bold text-center text-gray-900 uppercase mb-6 tracking-wider">
                        {title}
                    </h2>

                    {/* Customer Info - Only Name and Address */}
                    <div className="border border-gray-300 p-3 mb-4">
                        <p className="font-semibold text-sm">{job?.customer?.name || 'N/A'}</p>
                        {customerAddressLine1 && (
                            <p className="text-xs text-gray-600">{customerAddressLine1}</p>
                        )}
                        {customerAddressLine2 && (
                            <p className="text-xs text-gray-600">{customerAddressLine2}</p>
                        )}
                    </div>

                    {/* Subject */}
                    {(job?.subject || job?.jobDetail) && (
                        <div className="my-4 p-2 bg-gray-100 border-l-4 border-blue-500 text-xs">
                            <span className="font-medium">Subject:</span> {subjectLine}
                        </div>
                    )}

                    {/* Items Table with Grand Total inside */}
                    <table className="w-full text-xs border-collapse mb-4">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-2 text-left w-8">Sl.</th>
                                <th className="border border-gray-300 p-2 text-left">Work Details</th>
                                <th className="border border-gray-300 p-2 text-center w-20">Quantity</th>
                                {showPricing && (
                                    <>
                                        <th className="border border-gray-300 p-2 text-right w-20">Unit Price</th>
                                        <th className="border border-gray-300 p-2 text-right w-24">Total</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {job?.items?.map((item: JobItem, index: number) => (
                                <tr key={item.id || index}>
                                    <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                                    <td className="border border-gray-300 p-2">
                                        <div className="font-medium">{item.workDescription}</div>
                                        {item.details && (
                                            <div className="text-gray-500 text-xs">{item.details}</div>
                                        )}
                                        {item.measurements && item.measurements.length > 0 && (
                                            <div className="text-xs mt-1 italic" style={{ color: settings?.invoice?.measurementColor || '#059669' }}>
                                                {item.measurements.map((m: Measurement, mIdx: number) => (
                                                    <div key={mIdx}>
                                                        {m.widthFeet}'{m.widthInches}" x {m.heightFeet}'{m.heightInches}" ({m.quantity} pcs) = {(m.calculatedSqft || 0).toFixed(2)} sft
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 p-2 text-center">
                                        {item.unit === 'sqft' ? `${Number(item.quantity).toFixed(2)} sqft` : `${item.quantity} ${item.unit}`}
                                    </td>
                                    {showPricing && (
                                        <>
                                            <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                            <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.subtotal)}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        {/* Grand Total Row inside table */}
                        {showPricing && (
                            <tfoot>
                                <tr className="bg-gray-100 font-bold">
                                    <td colSpan={3} className="border border-gray-300 p-2 text-right">Grand Total:</td>
                                    <td colSpan={2} className="border border-gray-300 p-2 text-right">{formatCurrency(totalAmount)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>

                    {/* Amount in Words */}
                    {showPricing && (
                        <div className="text-xs text-gray-600 italic mb-4 p-2 bg-gray-50 border-l-4 border-blue-500">
                            <strong>Amount in words:</strong> {amountInWords}
                        </div>
                    )}

                    {/* Notes & Terms */}
                    {(job?.notes || job?.termsConditions) && (
                        <div className="border border-gray-300 p-3 mb-4 text-xs">
                            {job?.notes && (
                                <>
                                    <p className="font-semibold mb-2">Notes</p>
                                    <p className="mb-2">{job.notes}</p>
                                </>
                            )}
                            {job?.termsConditions && (
                                <div className="text-gray-600">
                                    <p className="font-semibold mb-1">Terms & Conditions:</p>
                                    <p className="whitespace-pre-line">{job.termsConditions}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Signature Section */}
                    {includeSignature && (
                        <div className="flex justify-between mt-12 pt-4" style={{ position: 'relative', zIndex: 1 }}>
                            <div className="text-center w-40">
                                <div className="h-16"></div>
                                <div className="border-t border-gray-800 pt-2">
                                    <p className="text-xs text-gray-500">Received By</p>
                                </div>
                            </div>
                            <div className="text-center w-40">
                                <img
                                    src="/images/Sig_Seal.png"
                                    alt="Signature"
                                    className="h-16 mx-auto mb-2 object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div className="border-t border-gray-800 pt-2">
                                    <p className="text-xs text-gray-500">Authorized Signatory</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {!includeSignature && (
                        <div className="flex justify-between mt-12 pt-4">
                            <div className="text-center w-40">
                                <div className="border-t border-gray-800 pt-2">
                                    <p className="text-xs text-gray-500">Received By</p>
                                </div>
                            </div>
                            <div className="text-center w-40">
                                <div className="border-t border-gray-800 pt-2">
                                    <p className="text-xs text-gray-500">Authorized Signatory</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer with Doc No - Bottom Left */}
                    <div className="text-xs text-gray-500 mt-auto pt-4" style={{ position: 'relative', zIndex: 1, fontSize: '9px' }}>
                        <p>Doc No: {docNumber}</p>
                    </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-3 mt-4">
                    <button
                        onClick={() => downloadDocx(type, includePad, includeSignature)}
                        disabled={downloadingDoc === type}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {downloadingDoc === type ? 'Generating...' : 'Download DOCX'}
                    </button>
                    <button
                        onClick={() => downloadPdf(type, includePad, includeSignature)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Save as PDF
                    </button>
                    <button
                        onClick={() => printDocument(type, includePad, includeSignature)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <DashboardLayout title="Loading...">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading job details...</div>
                </div>
            </DashboardLayout>
        );
    }

    if (!job) {
        return (
            <DashboardLayout title="Job Not Found">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Job not found</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={`Job #${job.refNumber || jobId}`}>
            <div className="p-2 sm:p-3 lg:p-4">
                {/* Page Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Job #{job.refNumber || jobId}
                            </h1>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {job.jobDetail || job.subject || 'Job Documents'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push('/jobs')}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Jobs
                        </button>
                        <button
                            onClick={handleEdit}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Job
                        </button>
                        <button
                            onClick={handleDelete}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>

                {/* Workflow Status */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Document Status</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className={`p-4 rounded-lg border-2 ${job.quotationDate ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${job.quotationDate ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                <span className="font-medium text-gray-900 dark:text-white">Quotation</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {job.quotationDate ? `Created: ${formatDate(job.quotationDate)}` : 'Not created'}
                            </p>
                        </div>
                        <div className={`p-4 rounded-lg border-2 ${job.challanDate ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${job.challanDate ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                <span className="font-medium text-gray-900 dark:text-white">Challan</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {job.challanDate ? `Created: ${formatDate(job.challanDate)}` : 'Not created'}
                            </p>
                        </div>
                        <div className={`p-4 rounded-lg border-2 ${job.billDate ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${job.billDate ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                <span className="font-medium text-gray-900 dark:text-white">Bill</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {job.billDate ? `Created: ${formatDate(job.billDate)}` : 'Not created'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Document Previews */}
                <div className="space-y-8">
                    {/* Quotation Preview */}
                    <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                            📄 Quotation Preview
                        </h3>
                        <DocumentPreview
                            type="quotation"
                            title="Quotation"
                            refEl={quotationRef}
                            showDate={job.quotationDate ? formatDate(job.quotationDate) : null}
                            includePad={includePadQuotation}
                            setIncludePad={setIncludePadQuotation}
                            includeSignature={includeSignatureQuotation}
                            setIncludeSignature={setIncludeSignatureQuotation}
                        />
                    </div>

                    {/* Challan Preview */}
                    <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                            📦 Challan Preview
                        </h3>
                        <DocumentPreview
                            type="challan"
                            title="Chalan"
                            refEl={challanRef}
                            showDate={job.challanDate ? formatDate(job.challanDate) : null}
                            includePad={includePadChallan}
                            setIncludePad={setIncludePadChallan}
                            includeSignature={includeSignatureChallan}
                            setIncludeSignature={setIncludeSignatureChallan}
                        />
                    </div>

                    {/* Bill Preview */}
                    <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                            💰 Bill / Invoice Preview
                        </h3>
                        <DocumentPreview
                            type="bill"
                            title="Bill"
                            refEl={billRef}
                            showDate={job.billDate ? formatDate(job.billDate) : null}
                            includePad={includePadBill}
                            setIncludePad={setIncludePadBill}
                            includeSignature={includeSignatureBill}
                            setIncludeSignature={setIncludeSignatureBill}
                        />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
