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

  // Fee breakdown (optional)
  platformFee?: number;
  tipAmount?: number;
  netAmount?: number;
  totalCharge?: number;

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

// ClearCause Brand Colors
const COLORS = {
  primary: '#1d4ed8', // Blue 700
  secondary: '#0284c7', // Blue 600
  accent: '#0284c7',
  text: '#334155', // Slate 700
  textLight: '#64748b', // Slate 500
  background: '#f8fafc', // Slate 50
  white: '#ffffff',
  border: '#e2e8f0', // Slate 200
};

/**
 * Helper: Fetch logo and convert to base64
 */
const getLogoBase64 = async (): Promise<string | null> => {
  try {
    // Try to fetch the logo first
    const response = await fetch('/CLEARCAUSE-logo.svg');
    if (!response.ok) throw new Error('Logo not found');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Set canvas size to match image or a reasonable fixed size for the receipt
        // We use a multiplier to ensure good resolution on the PDF
        const scale = 4; 
        // Default to 200x50 aspect ratio if natural dimensions are missing
        const width = (img.width || 200) * scale;
        const height = (img.height || 50) * scale;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const pngData = canvas.toDataURL('image/png');
          resolve(pngData);
        } else {
          resolve(null);
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = (e) => {
        console.warn('Error loading SVG image for receipt', e);
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch (error) {
    console.warn('Could not load logo for receipt:', error);
    return null;
  }
};

/**
 * Generate a PDF receipt for a donation
 */
export const generateDonationReceipt = async (data: ReceiptData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Load Logo
  const logoBase64 = await getLogoBase64();

  // ===== HEADER BACKGROUND =====
  // Add a subtle top colored bar
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 6, 'F');

  let yPosition = 25;

  // ===== LOGO & BRANDING =====
  if (logoBase64) {
    try {
      // Add logo at top left
      doc.addImage(logoBase64, 'PNG', margin, 15, 30, 12); // Adjust aspect ratio as needed
    } catch (e) {
      // Fallback text if image fails
      doc.setTextColor(COLORS.primary);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('ClearCause', margin, 22);
    }
  } else {
    doc.setTextColor(COLORS.primary);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ClearCause', margin, 22);
  }

  // Company Info (Below Logo)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textLight);
  doc.text('Transparent Charity Donation Platform', margin, 32);
  doc.text('www.clearcause.org', margin, 37);

  // ===== RECEIPT HEADER (Right Side) =====
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary);
  doc.text('RECEIPT', pageWidth - margin, 25, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.text);
  doc.text(`Receipt #: ${data.donationId.substring(0, 8).toUpperCase()}`, pageWidth - margin, 35, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textLight);
  const receiptDate = format(new Date(), 'MMMM dd, yyyy');
  doc.text(`Date: ${receiptDate}`, pageWidth - margin, 40, { align: 'right' });

  yPosition = 55;

  // ===== DIVIDER =====
  doc.setDrawColor(COLORS.border);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // ===== MAIN CONTENT: DONOR & SUMMARY =====
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.textLight);
  doc.text('RECEIVED FROM', margin, yPosition);
  
  doc.text('AMOUNT RECEIVED', pageWidth / 2 + 10, yPosition);

  yPosition += 7;

  // Donor Name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.text);
  doc.text(data.isAnonymous ? 'Anonymous Donor' : data.donorName, margin, yPosition);

  // Amount (Large)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary);
  doc.text(`₱${data.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth / 2 + 10, yPosition + 2);

  yPosition += 10;
  if (!data.isAnonymous && data.donorEmail) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.textLight);
    doc.text(data.donorEmail, margin, yPosition);
  }

  yPosition += 20;

  // ===== DONATION DETAILS TABLE =====
  const detailsBody = [
    ['Transaction ID', data.transactionId || 'N/A'],
    ['Payment Method', formatPaymentMethod(data.paymentMethod)],
    ['Date Paid', format(new Date(data.donatedAt), 'MMMM dd, yyyy h:mm a')],
    ['Status', data.status.toUpperCase()],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Payment Details', '']],
    body: donationDetails,
    theme: 'plain', // Cleaner look
    headStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 8,
    },
    bodyStyles: {
      textColor: COLORS.text,
      fontSize: 10,
      cellPadding: 8,
      lineColor: COLORS.border,
      lineWidth: { bottom: 0.1 },
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60, textColor: COLORS.textLight },
      1: { cellWidth: 'auto', fontStyle: 'normal' },
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ===== CAMPAIGN IMPACT =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.text);
  doc.text('Donation Impact', margin, yPosition);
  yPosition += 3;

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: [
      ['Campaign', data.campaignTitle],
      ['Beneficiary Organization', data.charityName],
    ],
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 8,
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60, fillColor: COLORS.background, textColor: COLORS.textLight },
      1: { cellWidth: 'auto', textColor: COLORS.text },
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ===== MESSAGE =====
  if (data.message) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.text);
    doc.text('Message', margin, yPosition);
    yPosition += 6;

    doc.setFillColor(COLORS.background);
    doc.setDrawColor(COLORS.border);
    doc.roundedRect(margin, yPosition, pageWidth - (margin * 2), 20, 2, 2, 'FD');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COLORS.textLight);
    doc.text(`"${data.message}"`, margin + 5, yPosition + 8, { maxWidth: pageWidth - (margin * 2) - 10 });
    
    yPosition += 30;
  } else {
    yPosition += 5;
  }

  // ===== THANK YOU SECTION =====
  // Ensure space at bottom
  if (yPosition > pageHeight - 70) {
    doc.addPage();
    yPosition = 20;
  } else {
    yPosition += 10;
  }

  // Center aligned thank you
  const centerY = yPosition + 10;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary);
  doc.text('Thank You!', pageWidth / 2, centerY, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textLight);
  doc.text(
    'Your generosity helps us create lasting change in our community.',
    pageWidth / 2,
    centerY + 8,
    { align: 'center' }
  );

  // ===== FOOTER (Bottom of page) =====
  const footerY = pageHeight - 25;
  
  doc.setDrawColor(COLORS.border);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(8);
  doc.setTextColor(COLORS.textLight);
  
  const footerText = 'ClearCause Inc. | support@clearcause.org';
  const taxText = 'This is an official receipt for your records. Please consult your tax advisor regarding deductibility.';
  
  doc.text(footerText, margin, footerY + 5);
  doc.text(taxText, margin, footerY + 10);
  
  // Generated timestamp
  doc.text(
    `Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}`,
    pageWidth - margin,
    footerY + 5,
    { align: 'right' }
  );

  return doc;
};

/**
 * Download a receipt as PDF
 */
export const downloadReceipt = async (data: ReceiptData): Promise<void> => {
  const doc = await generateDonationReceipt(data);
  const fileName = `ClearCause_Receipt_${data.donationId.substring(0, 8)}_${format(
    new Date(data.donatedAt),
    'yyyyMMdd'
  )}.pdf`;
  doc.save(fileName);
};

/**
 * Get receipt as blob (for email attachments, etc.)
 */
export const getReceiptBlob = async (data: ReceiptData): Promise<Blob> => {
  const doc = await generateDonationReceipt(data);
  return doc.output('blob');
};

/**
 * Get receipt as base64 string
 */
export const getReceiptBase64 = async (data: ReceiptData): Promise<string> => {
  const doc = await generateDonationReceipt(data);
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
    card: 'Card Payment',
  };

  return methodMap[method.toLowerCase()] || method;
}

/**
 * Preview receipt in new window
 */
export const previewReceipt = async (data: ReceiptData): Promise<void> => {
  const doc = await generateDonationReceipt(data);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};
