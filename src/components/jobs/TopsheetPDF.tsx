'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { Job } from '@/lib/types';

// PDF Styles - matches Excel export layout
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    padding: '15mm 15mm',
    minHeight: '297mm',
    position: 'relative',
  },
  // Header section
  headerSection: {
    marginBottom: 10,
  },
  // Date row - right aligned at top
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  topsheetDate: {
    fontSize: 10,
    textAlign: 'right',
    color: '#1f2937',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  customerName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 1,
  },
  subjectLine: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 10,
  },
  // Table styles
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2176C8',
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    borderWidth: 0.5,
    borderColor: '#000000',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    padding: 5,
    fontSize: 9,
    borderWidth: 0.5,
    borderColor: '#000000',
  },
  slNo: {
    width: 25,
    textAlign: 'center',
  },
  workDetails: {
    flex: 2,
  },
  workLocation: {
    flex: 1.5,
  },
  billNo: {
    width: 50,
    textAlign: 'center',
  },
  challanDate: {
    width: 75,
    textAlign: 'center',
  },
  total: {
    width: 55,
    textAlign: 'right',
  },
  bblBillNo: {
    width: 55,
    textAlign: 'center',
  },
  // Total row
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#E6F2FF',
    fontWeight: 'bold',
  },
  totalLabel: {
    flex: 1,
    padding: 5,
    textAlign: 'right',
    borderWidth: 0.5,
    borderColor: '#000000',
  },
  totalValue: {
    width: 55,
    padding: 5,
    textAlign: 'right',
    borderWidth: 0.5,
    borderColor: '#000000',
  },
  // Amount in words
  amountWords: {
    marginTop: 8,
    marginBottom: 15,
    fontSize: 9,
    fontStyle: 'italic',
  },
  // Signature section
  signatureSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: 120,
    textAlign: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    marginTop: 30,
    paddingTop: 4,
    fontSize: 8,
  },
});

// Types
interface TopsheetJobItem {
  id?: number;
  total: number | null;
}

interface TopsheetJob {
  id?: number;
  refNumber: string | null;
  jobDetail: string | null;
  subject: string | null;
  workLocation: string | null;
  totalAmount: number | null;
  challanDate: string | Date | null;
  bblBillNumber: string | null;
  items?: TopsheetJobItem[];
}

interface Topsheet {
  id: number;
  topsheetNumber: string;
  date: string | Date;
  customerName: string;
  customerAddress1: string | null;
  customerAddress2: string | null;
  jobDetail: string | null;
  jobs: TopsheetJob[];
}

interface TopsheetPDFProps {
  topsheet: Topsheet;
  settings?: {
    company?: {
      name?: string;
      tagline?: string;
    };
    dateFormat?: {
      format?: 'US' | 'BD';
      showPrefix?: boolean;
      prefixText?: string;
    };
  };
}

// Format date with settings support
const formatDate = (date: string | Date | null | undefined, settings?: TopsheetPDFProps['settings']) => {
  if (!date) return '-';
  const d = new Date(date);
  
  // Get date format settings
  const dateFormat = settings?.dateFormat?.format || 'BD';
  
  if (dateFormat === 'US') {
    // US Format: MM/DD/YYYY
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  } else {
    // BD/UK Format: DD/MM/YYYY
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
};

// Format currency
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '0.00';
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Number to words converter
function getAmountInWords(amount: number): string {
  if (amount === 0) return 'Zero Taka Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numToWords = (n: number): string => {
    if (n === 0) return '';
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
  return numToWords(rupees) + ' Taka Only';
}

// Main PDF Document Component
const TopsheetPDF: React.FC<TopsheetPDFProps> = ({ topsheet, settings }) => {
  // Calculate total amount - recalculate from job items
  const totalAmount = topsheet.jobs?.reduce((sum, job) => {
    let jobTotal = 0;
    if (job.items && job.items.length > 0) {
      jobTotal = job.items.reduce((itemSum, item) => itemSum + (item.total || 0), 0);
    } else {
      jobTotal = job.totalAmount || 0;
    }
    return sum + jobTotal;
  }, 0) || 0;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.contentContainer}>
          {/* Date Row - Right aligned at top, above title */}
          <View style={styles.dateRow}>
            <Text style={styles.topsheetDate}>{formatDate(topsheet.date, settings)}</Text>
          </View>
          
          {/* Header Section */}
          <View style={styles.headerSection}>
            {/* Title */}
            <Text style={styles.title}>Topsheet</Text>
            
            {/* Customer Name */}
            <Text style={styles.customerName}>{topsheet.customerName || 'N/A'}</Text>
            
            {/* Customer Address */}
            {topsheet.customerAddress1 && (
              <Text style={styles.customerAddress}>{topsheet.customerAddress1}</Text>
            )}
            {topsheet.customerAddress2 && (
              <Text style={styles.customerAddress}>{topsheet.customerAddress2}</Text>
            )}
            
            {/* Subject Line */}
            <Text style={styles.subjectLine}>
              Subject: Topsheet of workings at different places {topsheet.customerName}
            </Text>
          </View>
          
          {/* Jobs Table */}
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.slNo]}>Sl.</Text>
              <Text style={[styles.tableHeaderCell, styles.workDetails]}>Work Details</Text>
              <Text style={[styles.tableHeaderCell, styles.workLocation]}>Work Location</Text>
              <Text style={[styles.tableHeaderCell, styles.billNo]}>Bill No.</Text>
              <Text style={[styles.tableHeaderCell, styles.challanDate]}>Challan Date</Text>
              <Text style={[styles.tableHeaderCell, styles.total]}>Total</Text>
              <Text style={[styles.tableHeaderCell, styles.bblBillNo]}>BBL Bill No.</Text>
            </View>
            
            {/* Table Rows */}
            {topsheet.jobs?.map((job, index) => {
              // Recalculate job total from items
              let jobTotal = 0;
              if (job.items && job.items.length > 0) {
                jobTotal = job.items.reduce((itemSum, item) => itemSum + (item.total || 0), 0);
              } else {
                jobTotal = job.totalAmount || 0;
              }
              return (
              <View key={job.id || index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.slNo]}>{index + 1}</Text>
                <Text style={[styles.tableCell, styles.workDetails]}>
                  {job.jobDetail || job.subject || '-'}
                </Text>
                <Text style={[styles.tableCell, styles.workLocation]}>
                  {job.workLocation || '-'}
                </Text>
                <Text style={[styles.tableCell, styles.billNo]}>
                  {job.refNumber || '-'}
                </Text>
                <Text style={[styles.tableCell, styles.challanDate]}>
                  {formatDate(job.challanDate, settings)}
                </Text>
                <Text style={[styles.tableCell, styles.total]}>
                  {formatCurrency(jobTotal)}
                </Text>
                <Text style={[styles.tableCell, styles.bblBillNo]}>
                  {job.bblBillNumber || ' '}
                </Text>
              </View>
              );})}
            
            {/* Total Row */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
          
          {/* Amount in Words */}
          <View>
            <Text style={styles.amountWords}>
              In-words: {getAmountInWords(totalAmount)}
            </Text>
          </View>
          
          {/* Signature Section */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>Prepared By</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>Checked By</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Function to generate PDF blob
export const generateTopsheetPDFBlob = async (
  topsheet: Topsheet,
  options?: {
    settings?: TopsheetPDFProps['settings'];
  }
): Promise<Blob> => {
  const blob = await pdf(
    <TopsheetPDF 
      topsheet={topsheet}
      settings={options?.settings}
    />
  ).toBlob();
  
  return blob;
};

export default TopsheetPDF;
