/**
 * Receipt Generator Utility
 * Generates professional PDF receipts for donations
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface ReceiptData {
  // Donation Details
  donationId: string;
  transactionId: string;
  amount: number;
  donatedAt: string;
  paymentMethod: string;
  status: string;

  // Donor Details
  donorName: string;
  donorEmail: string;
  isAnonymous?: boolean;

  // Campaign Details
  campaignTitle: string;
  charityName: string;

  // Optional
  message?: string;
}

/**
 * Generate a PDF receipt for a donation
 */
export const generateDonationReceipt = (data: ReceiptData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const textColor: [number, number, number] = [51, 51, 51]; // Dark gray
  const lightGray: [number, number, number] = [245, 245, 245];

  let yPosition = 20;

  // ===== HEADER =====
  // Logo/Title
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ClearCause', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Donation Receipt', pageWidth / 2, 30, { align: 'center' });

  yPosition = 55;

  // ===== RECEIPT INFO =====
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Receipt Date
  const receiptDate = format(new Date(), 'MMMM dd, yyyy');
  doc.text(`Receipt Date: ${receiptDate}`, 15, yPosition);
  yPosition += 7;

  // Receipt Number
  doc.text(`Receipt #: ${data.donationId.substring(0, 8).toUpperCase()}`, 15, yPosition);
  yPosition += 15;

  // ===== THANK YOU MESSAGE =====
  doc.setFillColor(...lightGray);
  doc.rect(15, yPosition, pageWidth - 30, 25, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Thank you for your generous donation!', pageWidth / 2, yPosition + 10, {
    align: 'center',
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(
    'Your contribution makes a real difference in creating positive change.',
    pageWidth / 2,
    yPosition + 18,
    { align: 'center' }
  );

  yPosition += 35;

  // ===== DONATION DETAILS =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Donation Details', 15, yPosition);
  yPosition += 8;

  // Table data
  const donationDetails = [
    ['Donation Amount', `₱${data.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Transaction ID', data.transactionId || 'N/A'],
    ['Payment Method', formatPaymentMethod(data.paymentMethod)],
    ['Date & Time', format(new Date(data.donatedAt), 'MMMM dd, yyyy \'at\' h:mm a')],
    ['Status', data.status.charAt(0).toUpperCase() + data.status.slice(1)],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: donationDetails,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 15, right: 15 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ===== CAMPAIGN DETAILS =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Campaign Details', 15, yPosition);
  yPosition += 8;

  const campaignDetails = [
    ['Campaign', data.campaignTitle],
    ['Organization', data.charityName],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: campaignDetails,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 15, right: 15 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ===== DONOR DETAILS =====
  if (!data.isAnonymous) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Donor Information', 15, yPosition);
    yPosition += 8;

    const donorDetails = [
      ['Name', data.donorName],
      ['Email', data.donorEmail],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: donorDetails,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 15, right: 15 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // ===== PERSONAL MESSAGE (if any) =====
  if (data.message) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Your Message', 15, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const messageLines = doc.splitTextToSize(`"${data.message}"`, pageWidth - 40);
    doc.text(messageLines, 20, yPosition);
    yPosition += messageLines.length * 5 + 10;
  }

  // ===== TAX INFORMATION =====
  yPosition = Math.max(yPosition, pageHeight - 80);

  doc.setFillColor(...lightGray);
  doc.rect(15, yPosition, pageWidth - 30, 30, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Tax Deduction Notice', 20, yPosition + 8);

  doc.setFont('helvetica', 'normal');
  const taxNotice = doc.splitTextToSize(
    'This receipt may be used for tax deduction purposes. Please consult with your tax advisor regarding the deductibility of your donation. Keep this receipt for your records.',
    pageWidth - 50
  );
  doc.text(taxNotice, 20, yPosition + 14);

  yPosition += 40;

  // ===== FOOTER =====
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text('ClearCause - Transparent Charity Donation Platform', pageWidth / 2, pageHeight - 20, {
    align: 'center',
  });
  doc.text('For questions, contact support@clearcause.org', pageWidth / 2, pageHeight - 15, {
    align: 'center',
  });
  doc.text(
    `Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  return doc;
};

/**
 * Download a receipt as PDF
 */
export const downloadReceipt = (data: ReceiptData): void => {
  const doc = generateDonationReceipt(data);
  const fileName = `ClearCause_Receipt_${data.donationId.substring(0, 8)}_${format(
    new Date(data.donatedAt),
    'yyyyMMdd'
  )}.pdf`;
  doc.save(fileName);
};

/**
 * Get receipt as blob (for email attachments, etc.)
 */
export const getReceiptBlob = (data: ReceiptData): Blob => {
  const doc = generateDonationReceipt(data);
  return doc.output('blob');
};

/**
 * Get receipt as base64 string
 */
export const getReceiptBase64 = (data: ReceiptData): string => {
  const doc = generateDonationReceipt(data);
  return doc.output('dataurlstring');
};

/**
 * Helper: Format payment method name
 */
function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    gcash: 'GCash',
    paymaya: 'PayMaya',
    credit_card: 'Credit Card',
    debit_card: 'Debit Card',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
  };

  return methodMap[method.toLowerCase()] || method;
}

/**
 * Preview receipt in new window
 */
export const previewReceipt = (data: ReceiptData): void => {
  const doc = generateDonationReceipt(data);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};
