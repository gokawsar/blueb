'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { Job, JobItem, Measurement } from '@/lib/types';

// PDF Styles - matches preview exactly
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
    backgroundColor: '#ffffff',
  },
  // Pad background container
  padContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  padImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  // Inner content container with margins
  contentContainer: {
    padding: '20mm 20mm',
    minHeight: '297mm',
    position: 'relative',
    zIndex: 1,
  },
  // Top row - Ref and Date
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    fontSize: 10,
  },
  // Document title
  docTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Customer box
  customerBox: {
    borderWidth: 1,
    borderColor: '#ffffffff',
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#ffffffff',
  },
  customerName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 9,
    color: '#000000ff',
  },
  // Subject line
  subjectLine: {
    backgroundColor: '#f3f4f6',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    padding: 6,
    marginBottom: 12,
    fontSize: 9,
  },
  // Table styles
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    padding: 6,
    fontSize: 9,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  slNo: {
    width: 32,
    textAlign: 'center',
  },
  workDetails: {
    flex: 1,
  },
  quantity: {
    width: 60,
    textAlign: 'center',
  },
  unitPrice: {
    width: 70,
    textAlign: 'right',
  },
  total: {
    width: 80,
    textAlign: 'right',
  },
  measurements: {
    fontSize: 8,
    color: '#059669',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemDetails: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  // Grand total inside table
  grandTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  grandTotalLabel: {
    flex: 1,
    padding: 16,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  grandTotalValue: {
    width: 80,
    padding: 16,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  // Amount in words
  amountWords: {
    backgroundColor: '#f9fafb',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    padding: 8,
    marginBottom: 12,
    fontSize: 9,
    fontStyle: 'italic',
  },
  // Notes section
  notesSection: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  notesContent: {
    fontSize: 9,
    whiteSpace: 'pre-wrap',
  },
  // Signature section
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 10,
  },
  signatureBox: {
    width: 150,
    textAlign: 'center',
  },
  signatureImage: {
    height: 40,
    marginBottom: 2,
    objectFit: 'contain',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    marginTop: 0,
    paddingTop: 3,
    fontSize: 8,
    color: '#6b7280',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 8,
    color: '#6b7280',
  },
});

// Types
interface DocumentPDFProps {
  job: Job;
  docType: 'quotation' | 'challan' | 'bill';
  showDate?: string | null;
  includePad?: boolean;
  includeSignature?: boolean;
  settings?: {
    company?: {
      name?: string;
      tagline?: string;
      email?: string;
      phone?: string;
    };
    invoice?: {
      fontFamily?: string;
      fontSize?: number;
      fontColor?: string;
      topMargin?: number;
      bottomMargin?: number;
      footerBottom?: number;
      measurementColor?: string;
      tableBorderColor?: string;
      tableBorderThickness?: number;
      footerPosition?: number;
      customerBoxBorderColor?: string;
      customerBoxBorderThickness?: number;
    };
    signature?: {
      enabled?: boolean;
      imageUrl?: string;
      size?: number;
    };
    dateFormat?: {
      format?: 'US' | 'BD';
      showPrefix?: boolean;
      prefixText?: string;
    };
  };
}

// Format date for PDF
const formatDate = (date: string | Date | null | undefined, settings?: DocumentPDFProps['settings']) => {
  if (!date) return 'N/A';
  
  // Get date format settings
  const dateFormat = settings?.dateFormat?.format || 'BD';
  const showPrefix = settings?.dateFormat?.showPrefix ?? true;
  const prefixText = settings?.dateFormat?.prefixText || 'Date: ';
  
  const d = new Date(date);
  let formattedDate: string;
  
  if (dateFormat === 'US') {
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
  
  return showPrefix ? `${prefixText}${formattedDate}` : formattedDate;
};

// Format quantity
const formatQuantity = (item: JobItem) => {
  if (item.unit === 'sqft' && item.quantity) {
    return `${Number(item.quantity).toFixed(2)} sqft`;
  }
  return `${item.quantity} ${item.unit}`;
};

// Format currency without currency symbol
const formatCurrencyNoSymbol = (amount: number): string => {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Main PDF Document Component
const DocumentPDF: React.FC<DocumentPDFProps> = ({ 
  job, 
  docType, 
  showDate,
  includePad = false,
  includeSignature = false,
  settings 
}) => {
  // Document config
  const docConfig = {
    quotation: { prefix: 'QT', title: 'QUOTATION' },
    challan: { prefix: 'CH', title: 'CHALLAN' },
    bill: { prefix: 'INV', title: 'BILL' },
  };
  
  const { prefix, title } = docConfig[docType];
  
  // Generate document number
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const day = String(new Date().getDate()).padStart(2, '0');
  const docNumber = `${prefix}-${year}-${month}${day}`;
  
  // Get footer bottom margin from settings (default 15mm)
  const footerBottom = settings?.invoice?.footerPosition || 15;
  
  // Pricing visibility - hidden for Challan
  const showPricing = docType !== 'challan';
  
  // Calculate totals
  const subtotal = job.items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
  const discountAmount = subtotal * ((job.discountPercent || 0) / 100);
  const totalAmount = subtotal - discountAmount;
  
  // Get customer address
  const customerAddressLine1 = job.customer?.addressLine1 || job.customer?.address || '';
  const customerAddressLine2 = job.customer?.addressLine2 || '';
  
  // Subject line
  const subjectLine = docType === 'challan' 
    ? `${job.jobDetail || job.subject || 'N/A'}${job.workLocation ? `\n${job.workLocation}` : ''}`
    : `${title} for ${job.jobDetail || job.subject || 'N/A'} at ${job.customer?.name || 'N/A'}${job.workLocation ? `, ${job.workLocation}` : ''}`;
  
  // Get margins from settings
  const topMargin = settings?.invoice?.topMargin || 20;
  const bottomMargin = settings?.invoice?.bottomMargin || 20;
  
  // Get measurement color from settings (default green)
  const measurementColor = settings?.invoice?.measurementColor || '#059669';
  
  // Get table border settings from settings (defaults)
  const tableBorderColor = settings?.invoice?.tableBorderColor || '#d1d5db';
  const tableBorderThickness = settings?.invoice?.tableBorderThickness || 1;
  
  // Get customer box border settings from settings (defaults)
  const customerBoxBorderColor = settings?.invoice?.customerBoxBorderColor || '#d1d5db';
  const customerBoxBorderThickness = settings?.invoice?.customerBoxBorderThickness || 1;
  
  // Dynamic styles based on settings
  const dynamicStyles = {
    tableHeaderCell: {
      borderWidth: tableBorderThickness,
      borderColor: tableBorderColor,
    },
    tableCell: {
      borderWidth: tableBorderThickness,
      borderColor: tableBorderColor,
    },
    grandTotalLabel: {
      borderWidth: tableBorderThickness,
      borderColor: tableBorderColor,
    },
    grandTotalValue: {
      borderWidth: tableBorderThickness,
      borderColor: tableBorderColor,
    },
    customerBox: {
      borderWidth: customerBoxBorderThickness,
      borderColor: customerBoxBorderColor,
    },
    notesSection: {
      borderWidth: tableBorderThickness,
      borderColor: tableBorderColor,
    },
    measurements: {
      color: measurementColor,
    },
  };
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Pad Background Image */}
        {includePad && (
          <View style={styles.padContainer} fixed>
            <Image src="/images/AMK_PAD_A4.png" style={styles.padImage} />
          </View>
        )}
        
        {/* Content Container with Margins */}
        <View style={{ padding: `${topMargin}mm 20mm ${bottomMargin}mm 20mm`, minHeight: '297mm', position: 'relative', zIndex: 1 }}>
        
          {/* Top Row - Ref and Date */}
          <View style={styles.topRow}>
            <View>
              <Text>Ref: {job.refNumber || 'N/A'}</Text>
            </View>
            <View>
              <Text>{formatDate(showDate || job.date, settings)}</Text>
            </View>
          </View>
          
          {/* Document Title */}
          <Text style={styles.docTitle}>{title}</Text>
          
          {/* Customer Box */}
          <View style={[styles.customerBox, dynamicStyles.customerBox]}>
            <Text style={styles.customerName}>{job.customer?.name || 'N/A'}</Text>
            {customerAddressLine1 && <Text style={styles.customerAddress}>{customerAddressLine1}</Text>}
            {customerAddressLine2 && <Text style={styles.customerAddress}>{customerAddressLine2}</Text>}
          </View>
          
          {/* Subject Line */}
          {(job.subject || job.jobDetail) && (
            <View style={styles.subjectLine}>
              <Text style={docType === 'challan' ? { textAlign: 'center' } : {}}>{docType === 'challan' ? subjectLine : `Subject: ${subjectLine}`}</Text>
            </View>
          )}
          
          {/* Items Table */}
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.slNo, dynamicStyles.tableHeaderCell]}>Sl.</Text>
              <Text style={[styles.tableHeaderCell, styles.workDetails, dynamicStyles.tableHeaderCell]}>Work Details</Text>
              <Text style={[styles.tableHeaderCell, styles.quantity, dynamicStyles.tableHeaderCell]}>Quantity</Text>
              {showPricing && (
                <>
                  <Text style={[styles.tableHeaderCell, styles.unitPrice, dynamicStyles.tableHeaderCell]}>Unit Price</Text>
                  <Text style={[styles.tableHeaderCell, styles.total, dynamicStyles.tableHeaderCell]}>Total</Text>
                </>
              )}
            </View>
            
            {/* Table Rows */}
            {job.items?.map((item, index) => (
              <View key={item.id || index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.slNo, dynamicStyles.tableCell]}>{index + 1}</Text>
                <View style={[styles.tableCell, styles.workDetails, dynamicStyles.tableCell]}>
                  <Text>{item.workDescription}</Text>
                  {item.details && (
                    <Text style={styles.itemDetails}>{item.details}</Text>
                  )}
                  {item.measurements && item.measurements.length > 0 && (
                    <>
                      {item.measurements.map((m: Measurement, mIdx: number) => (
                        <Text key={mIdx} style={[styles.measurements, dynamicStyles.measurements]}>
                          {m.widthFeet}'{m.widthInches}" x {m.heightFeet}'{m.heightInches}" ({m.quantity} pcs) = {(m.calculatedSqft || 0).toFixed(2)} sft
                        </Text>
                      ))}
                    </>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.quantity, dynamicStyles.tableCell]}>
                  {formatQuantity(item)}
                </Text>
                {showPricing && (
                  <>
                    <Text style={[styles.tableCell, styles.unitPrice, dynamicStyles.tableCell]}>
                      {formatCurrencyNoSymbol(item.unitPrice)}
                    </Text>
                    <Text style={[styles.tableCell, styles.total, dynamicStyles.tableCell]}>
                      {formatCurrencyNoSymbol(item.subtotal)}
                    </Text>
                  </>
                )}
              </View>
            ))}
            
            {/* Grand Total Row - Inside Table */}
            {showPricing && (
              <View style={styles.grandTotalRow}>
                <Text style={[styles.grandTotalLabel, dynamicStyles.grandTotalLabel]}>Grand Total:</Text>
                <Text style={[styles.grandTotalValue, dynamicStyles.grandTotalValue]}>{formatCurrencyNoSymbol(totalAmount)}</Text>
              </View>
            )}
          </View>
          
          {/* Amount in Words */}
          {showPricing && totalAmount > 0 && (
            <View style={styles.amountWords}>
              <Text><Text style={{ fontWeight: 'bold' }}>Amount in words:</Text> {getAmountInWords(totalAmount)}</Text>
            </View>
          )}
          
          {/* Notes & Terms */}
          {(job.notes || job.termsConditions) && (
            <View style={[styles.notesSection, dynamicStyles.notesSection]}>
              {job.notes && (
                <>
                  <Text style={styles.notesTitle}>Notes</Text>
                  <Text style={styles.notesContent}>{job.notes}</Text>
                </>
              )}
              {job.termsConditions && (
                <>
                  <Text style={[styles.notesTitle, { marginTop: job.notes ? 8 : 0 }]}>Terms & Conditions</Text>
                  <Text style={styles.notesContent}>{job.termsConditions}</Text>
                </>
              )}
            </View>
          )}
          
          {/* Signature Section - Always at consistent level with safe distance from table */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              {/* Left side - Received By - always maintain same space as right side */}
              <View style={{ height: 35 }} />
              <Text style={styles.signatureLine}>Received By</Text>
            </View>
            <View style={styles.signatureBox}>
              {/* Right side - Authorized Signature */}
              {includeSignature && settings?.signature?.enabled ? (
                <>
                  <Image 
                    src={settings?.signature?.imageUrl || '/images/Sig_Seal.png'} 
                    style={{ 
                      height: (settings?.signature?.size || 60) * 0.5, 
                      width: settings?.signature?.size || 60,
                      marginBottom: -5,
                      objectFit: 'contain' 
                    }} 
                  />
                  <Text style={styles.signatureLine}>Authorized Signature</Text>
                </>
              ) : (
                <>
                  <View style={{ height: 35 }} />
                  <Text style={styles.signatureLine}>Authorized Signature</Text>
                </>
              )}
            </View>
          </View>
          
          {/* Footer - Always visible */}
          <View style={{ ...styles.footer, position: 'absolute', bottom: footerBottom, left: 20, right: 20 }}>
            <Text>Doc No: {docNumber}</Text>
          </View>
          
        </View>
      </Page>
    </Document>
  );
};

// Simple number to words converter
function getAmountInWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numToWords = (n: number): string => {
    if (n === 0) return 'Zero';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  };
  
  const rupees = Math.floor(amount);
  const paisa = Math.round((amount - rupees) * 100);
  
  if (paisa > 0) {
    return numToWords(rupees) + ' Taka and ' + numToWords(paisa) + ' Paisa';
  }
  return numToWords(rupees) + ' Taka';
}

// Function to generate PDF blob
export const generatePDFBlob = async (
  job: Job,
  docType: 'quotation' | 'challan' | 'bill',
  options?: {
    showDate?: string | null;
    includePad?: boolean;
    includeSignature?: boolean;
    settings?: DocumentPDFProps['settings'];
  }
): Promise<Blob> => {
  const blob = await pdf(
    <DocumentPDF 
      job={job} 
      docType={docType}
      showDate={options?.showDate}
      includePad={options?.includePad}
      includeSignature={options?.includeSignature}
      settings={options?.settings}
    />
  ).toBlob();
  
  return blob;
};

// Bulk PDF Document Component - Renders multiple jobs in one PDF
const BulkDocumentPDF: React.FC<{
  jobs: Job[];
  docType: 'quotation' | 'challan' | 'bill';
  showDate?: string | null;
  includePad?: boolean;
  includeSignature?: boolean;
  settings?: DocumentPDFProps['settings'];
}> = ({ jobs, docType, showDate, includePad, includeSignature, settings }) => {
  // Document config
  const docConfig = {
    quotation: { prefix: 'QT', title: 'QUOTATION' },
    challan: { prefix: 'CH', title: 'CHALLAN' },
    bill: { prefix: 'INV', title: 'BILL' },
  };
  
  const { prefix, title } = docConfig[docType];
  
  // Generate document number
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const day = String(new Date().getDate()).padStart(2, '0');
  
  // Get settings
  const topMargin = settings?.invoice?.topMargin || 20;
  const bottomMargin = settings?.invoice?.bottomMargin || 20;
  const footerBottom = settings?.invoice?.footerPosition || 15;
  const measurementColor = settings?.invoice?.measurementColor || '#059669';
  const tableBorderColor = settings?.invoice?.tableBorderColor || '#d1d5db';
  const tableBorderThickness = settings?.invoice?.tableBorderThickness || 1;
  
  // Get customer box border settings from settings (defaults)
  const customerBoxBorderColor = settings?.invoice?.customerBoxBorderColor || '#d1d5db';
  const customerBoxBorderThickness = settings?.invoice?.customerBoxBorderThickness || 1;
  
  const showPricing = docType !== 'challan';
  
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
  
  const formatCurrencyNoSymbol = (amount: number): string => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const formatQuantity = (item: JobItem) => {
    if (item.unit === 'sqft' && item.quantity) {
      return `${Number(item.quantity).toFixed(2)} sqft`;
    }
    return `${item.quantity} ${item.unit}`;
  };
  
  const getAmountInWords = (amount: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const numToWords = (n: number): string => {
      if (n === 0) return 'Zero';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
      if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
      if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
      return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
    };
    
    const rupees = Math.floor(amount);
    const paisa = Math.round((amount - rupees) * 100);
    
    if (paisa > 0) {
      return numToWords(rupees) + ' Taka and ' + numToWords(paisa) + ' Paisa';
    }
    return numToWords(rupees) + ' Taka';
  };
  
  const dynamicStyles = {
    tableHeaderCell: { borderWidth: tableBorderThickness, borderColor: tableBorderColor },
    tableCell: { borderWidth: tableBorderThickness, borderColor: tableBorderColor },
    grandTotalLabel: { borderWidth: tableBorderThickness, borderColor: tableBorderColor },
    grandTotalValue: { borderWidth: tableBorderThickness, borderColor: tableBorderColor },
    customerBox: { borderWidth: customerBoxBorderThickness, borderColor: customerBoxBorderColor },
    notesSection: { borderWidth: tableBorderThickness, borderColor: tableBorderColor },
    measurements: { color: measurementColor },
  };
  
  return (
    <Document>
      {jobs.map((job, jobIndex) => {
        const docNumber = `${prefix}-${year}-${month}${day}-${jobIndex + 1}`;
        const subtotal = job.items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
        const discountAmount = subtotal * ((job.discountPercent || 0) / 100);
        const totalAmount = subtotal - discountAmount;
        const customerAddressLine1 = job.customer?.addressLine1 || job.customer?.address || '';
        const customerAddressLine2 = job.customer?.addressLine2 || '';
        const subjectLine = docType === 'challan' 
          ? `${job.jobDetail || job.subject || 'N/A'}${job.workLocation ? `\n${job.workLocation}` : ''}`
          : `${title} for ${job.jobDetail || job.subject || 'N/A'} at ${job.customer?.name || 'N/A'}${job.workLocation ? `, ${job.workLocation}` : ''}`;
        
        return (
          <Page key={job.id || jobIndex} size="A4" style={styles.page}>
            {includePad && (
              <View style={styles.padContainer} fixed>
                <Image src="/images/AMK_PAD_A4.png" style={styles.padImage} />
              </View>
            )}
            
            <View style={{ padding: `${topMargin}mm 20mm ${bottomMargin}mm 20mm`, minHeight: '297mm', position: 'relative', zIndex: 1 }}>
              <View style={styles.topRow}>
                <View>
                  <Text>Ref: {job.refNumber || 'N/A'}</Text>
                </View>
                <View>
                  <Text>{formatDate(showDate || job.date)}</Text>
                </View>
              </View>
              
              <Text style={styles.docTitle}>{title}</Text>
              
              <View style={[styles.customerBox, dynamicStyles.customerBox]}>
                <Text style={styles.customerName}>{job.customer?.name || 'N/A'}</Text>
                {customerAddressLine1 && <Text style={styles.customerAddress}>{customerAddressLine1}</Text>}
                {customerAddressLine2 && <Text style={styles.customerAddress}>{customerAddressLine2}</Text>}
              </View>
              
              {(job.subject || job.jobDetail) && (
                <View style={styles.subjectLine}>
                  <Text style={docType === 'challan' ? { textAlign: 'center' } : {}}>{docType === 'challan' ? subjectLine : `Subject: ${subjectLine}`}</Text>
                </View>
              )}
              
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, styles.slNo, dynamicStyles.tableHeaderCell]}>Sl.</Text>
                  <Text style={[styles.tableHeaderCell, styles.workDetails, dynamicStyles.tableHeaderCell]}>Work Details</Text>
                  <Text style={[styles.tableHeaderCell, styles.quantity, dynamicStyles.tableHeaderCell]}>Quantity</Text>
                  {showPricing && (
                    <>
                      <Text style={[styles.tableHeaderCell, styles.unitPrice, dynamicStyles.tableHeaderCell]}>Unit Price</Text>
                      <Text style={[styles.tableHeaderCell, styles.total, dynamicStyles.tableHeaderCell]}>Total</Text>
                    </>
                  )}
                </View>
                
                {job.items?.map((item, index) => (
                  <View key={item.id || index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.slNo, dynamicStyles.tableCell]}>{index + 1}</Text>
                    <View style={[styles.tableCell, styles.workDetails, dynamicStyles.tableCell]}>
                      <Text>{item.workDescription}</Text>
                      {item.details && (
                        <Text style={styles.itemDetails}>{item.details}</Text>
                      )}
                      {item.measurements && item.measurements.length > 0 && (
                        <>
                          {item.measurements.map((m: Measurement, mIdx: number) => (
                            <Text key={mIdx} style={[styles.measurements, dynamicStyles.measurements]}>
                              {m.widthFeet}'{m.widthInches}" x {m.heightFeet}'{m.heightInches}" ({m.quantity} pcs) = {(m.calculatedSqft || 0).toFixed(2)} sft
                            </Text>
                          ))}
                        </>
                      )}
                    </View>
                    <Text style={[styles.tableCell, styles.quantity, dynamicStyles.tableCell]}>
                      {formatQuantity(item)}
                    </Text>
                    {showPricing && (
                      <>
                        <Text style={[styles.tableCell, styles.unitPrice, dynamicStyles.tableCell]}>
                          {formatCurrencyNoSymbol(item.unitPrice)}
                        </Text>
                        <Text style={[styles.tableCell, styles.total, dynamicStyles.tableCell]}>
                          {formatCurrencyNoSymbol(item.subtotal)}
                        </Text>
                      </>
                    )}
                  </View>
                ))}
                
                {showPricing && (
                  <View style={styles.grandTotalRow}>
                    <Text style={[styles.grandTotalLabel, dynamicStyles.grandTotalLabel]}>Grand Total:</Text>
                    <Text style={[styles.grandTotalValue, dynamicStyles.grandTotalValue]}>{formatCurrencyNoSymbol(totalAmount)}</Text>
                  </View>
                )}
              </View>
              
              {showPricing && totalAmount > 0 && (
                <View style={styles.amountWords}>
                  <Text><Text style={{ fontWeight: 'bold' }}>Amount in words:</Text> {getAmountInWords(totalAmount)}</Text>
                </View>
              )}
              
              {(job.notes || job.termsConditions) && (
                <View style={[styles.notesSection, dynamicStyles.notesSection]}>
                  {job.notes && (
                    <>
                      <Text style={styles.notesTitle}>Notes</Text>
                      <Text style={styles.notesContent}>{job.notes}</Text>
                    </>
                  )}
                  {job.termsConditions && (
                    <>
                      <Text style={[styles.notesTitle, { marginTop: job.notes ? 8 : 0 }]}>Terms & Conditions</Text>
                      <Text style={styles.notesContent}>{job.termsConditions}</Text>
                    </>
                  )}
                </View>
              )}
              
              <View style={styles.signatureSection}>
                <View style={styles.signatureBox}>
                  <View style={{ height: 35 }} />
                  <Text style={styles.signatureLine}>Received By</Text>
                </View>
                <View style={styles.signatureBox}>
                  {includeSignature && settings?.signature?.enabled ? (
                    <>
                      <Image 
                        src={settings?.signature?.imageUrl || '/images/Sig_Seal.png'} 
                        style={{ 
                          height: (settings?.signature?.size || 60) * 0.5, 
                          width: settings?.signature?.size || 60,
                          marginBottom: -5,
                          objectFit: 'contain' 
                        }} 
                      />
                      <Text style={styles.signatureLine}>Authorized Signature</Text>
                    </>
                  ) : (
                    <>
                      <View style={{ height: 35 }} />
                      <Text style={styles.signatureLine}>Authorized Signature</Text>
                    </>
                  )}
                </View>
              </View>
              
              <View style={{ ...styles.footer, position: 'absolute', bottom: footerBottom, left: 20, right: 20 }}>
                <Text>Doc No: {docNumber}</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

// Function to generate bulk PDF blob for multiple jobs
export const generateBulkPDFBlob = async (
  jobs: Job[],
  docType: 'quotation' | 'challan' | 'bill',
  options?: {
    showDate?: string | null;
    includePad?: boolean;
    includeSignature?: boolean;
    settings?: DocumentPDFProps['settings'];
  }
): Promise<Blob> => {
  const blob = await pdf(
    <BulkDocumentPDF 
      jobs={jobs} 
      docType={docType}
      showDate={options?.showDate}
      includePad={options?.includePad}
      includeSignature={options?.includeSignature}
      settings={options?.settings}
    />
  ).toBlob();
  
  return blob;
};

export default DocumentPDF;
